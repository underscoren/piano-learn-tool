import type { Note } from "webmidi";

export class Synth {
    private setup = false;
    static audioCtx: AudioContext;
    volumeNode: GainNode;
    oscillators: {[key: string]: OscillatorNode};

    /** Sets up audio context  */
    static async setupContext() {
        if(!window.AudioContext)
            throw new Error("Browser does not support Web Audio Context API");
        
        const promisifyEvent = (eventName: keyof DocumentEventMap) => new Promise(resolve => {
            const cleanResolve = () => {
                resolve(); 
                document.removeEventListener(eventName, cleanResolve)
            };
            
            document.addEventListener(eventName, cleanResolve)
        }) as Promise<void>;

        // wait for some kind of user interaction
        await Promise.any([
            promisifyEvent("mousedown"),
            promisifyEvent("mouseup"),
            promisifyEvent("keydown"),
            promisifyEvent("keyup"),
        ]);
        
        Synth.audioCtx = new AudioContext();
        console.log("setup audio context");
    }

    setupNodes() {
        this.volumeNode = Synth.audioCtx.createGain();
        this.volumeNode.connect(Synth.audioCtx.destination);
        this.oscillators = {};
        this.setup = true;
    }

    playNote(note: Note) {
        if(!this.setup) return;
        const osc = Synth.audioCtx.createOscillator();
        const gain = Synth.audioCtx.createGain();
        
        osc.frequency.value = (440 / 32) * (2 ** ((note.number - 9) / 12));
        gain.gain.value = 1.0;

        osc.connect(gain);
        gain.connect(this.volumeNode);
        osc.start();
        (osc as any).gain = gain;
        
        this.oscillators[note.identifier] = osc
    }

    endNote(note: Note) {
        if(!this.setup) return;
        const osc = this.oscillators[note.identifier];
        if(!osc) return;
        const gain = (osc as any).gain as GainNode;

        delete this.oscillators[note.identifier];

        gain.gain.setValueAtTime(gain.gain.value, Synth.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, Synth.audioCtx.currentTime + 0.03);

        // cleanup
        setTimeout(() => {
            osc.stop();
            osc.disconnect();
            gain.disconnect();
        }, 30);
        
    }
}