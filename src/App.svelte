<script lang="ts">
  import Piano from "./lib/Piano.svelte"
  import { clamp, notesEqual, pickRandom } from "./util"
  import { Synth } from "./synth";
  import { WebMidi, Input, Note } from "webmidi"
  import { onMount } from "svelte";

  // notes
  const naturalNotes = ["C","D","E","F","G","A","B"].map(n => new Note(n+"4"));
  const accidentalNotes = ["C#","D#",   "F#","G#","A#"].map(n => new Note(n+"4"));
  let noteSelection: "natural" | "accidental" | "all" = "natural"
  
  let notesCorrect: Map<string,number> = new Map();
  let notePoints: Map<string, number> = new Map();
  
  // highlights
  const notesDown: Set<string> = new Set();
  let highlighted: string[] = [];
  
  // midi
  let midiDropdownElement: HTMLSelectElement;
  let selectedInput: Input;

  // note elements
  let noteElement: HTMLElement | undefined;
  let smNoteElement: HTMLElement | undefined;
  
  let setup = false;

  let noteToPress: Note = new Note("C4");
  
  // create and setup synth
  const synth = new Synth();
  Synth
    .setupContext()
    .then(() =>{ 
      synth.setupNodes(); 
      synth.volumeNode.gain.value = 0.1;
    });

  // convenience function to await for the next note received from midi device
  const getNextNote = () => new Promise(resolve => {
    selectedInput.addOneTimeListener("noteon", ev => {
      resolve(ev.note);
    });
  }) as Promise<Note>;
  
  // picks a random note from the selected set, and applies it to noteToPress
  const setKey = () => {
    let notes: Note[];
    switch (noteSelection) {
      case "natural":
        notes = naturalNotes
        break;
      case "accidental":
        notes = accidentalNotes;
        break;
      case "all":
        notes = [...naturalNotes, ...accidentalNotes];
        break;
    }
    
    let canPress: Note[] = [];
    for(let o = octaveStart; o < (octaveStart + octaves); o++) {
      canPress.push(...notes.map(n =>
          new Note(`${n.name}${n.accidental ?? ""}${o}`)
        )
      );
    }

    //console.log(canPress);
    noteToPress = pickRandom(canPress)
  };

  // selects and sets up the midi device to listen for note events
  function setInput(index: number) {
    if(selectedInput == WebMidi.inputs[index]) return; // don't bother setting the input twice
    console.log("setting input to",WebMidi.inputs[0].name);
    
    selectedInput?.removeListener();
    selectedInput = WebMidi.inputs[index];
    selectedInput.addListener("noteon", ev => {
      const { note } = ev; 
      console.log(note.name, note.accidental, note.octave);

      notesDown.add(note.identifier);
      highlighted = [...notesDown.values()];
      synth.playNote(note);
    });

    selectedInput.addListener("noteoff", ev => {
      const { note } = ev;
      notesDown.delete(note.identifier);
      highlighted = [...notesDown.values()];
      synth.endNote(note);
    });

    if(!setup) {
      setup = true;
      gameLoop(); // start game loop
    }
  }

  // load web midi and perform setup
  onMount(() => {
    const setupMidiDeviceList = () => {
      const childNodes: HTMLElement[] = [];
      for(const input of WebMidi.inputs) {
        const el = document.createElement("option");
        el.innerText = input.name;

        childNodes.push(el);
      }

      midiDropdownElement.replaceChildren(...childNodes);
      
      if(WebMidi.inputs.length)
        setInput(0);
    }

    WebMidi
    .enable()
    .then(setupMidiDeviceList)
    .catch(console.error)

    WebMidi.addListener("connected", setupMidiDeviceList);
    WebMidi.addListener("disconnected", setupMidiDeviceList);
    WebMidi.addListener("midiaccessgranted", setupMidiDeviceList);

    midiDropdownElement.addEventListener("select", ev => {
      const i = midiDropdownElement.selectedIndex;

      setInput(i);
    });
  });


  // main game loop
  async function gameLoop() {
    while(true) {
      setKey();
      const note = await getNextNote();
      const ignoreOctave = octaves == 1;

      const toggleClassDelayed = (el: HTMLElement, className: string, duration = 500) => {
        console.log(el);
        el.classList.add(className);
        setTimeout(() => el.classList.remove(className), duration);
      }
      
      if (notesEqual(note, noteToPress, ignoreOctave)) {
        const noteid = note.identifier;
        // add points
        notesCorrect.set(noteid, (notesCorrect.get(noteid) ?? 0) + 1);
        notePoints.set(noteid, Math.min((notePoints.get(noteid) ?? 0) + 0.1, 1));
        
        // perform animation
        if(noteElement) toggleClassDelayed(noteElement, "right");
        if(smNoteElement) toggleClassDelayed(smNoteElement, "right");
      } else {
        // deduct points
        const correctKeys = notesCorrect.get(noteToPress.identifier) ?? 0;
        notesCorrect.set(noteToPress.identifier,
          Math.max(correctKeys - 1, 0)
        );

        const correctPoints = notePoints.get(noteToPress.identifier) ?? 0;
        notePoints.set(noteToPress.identifier,
          Math.max(correctPoints - 0.1, 0)
        );

        // perform animation
        if(noteElement) toggleClassDelayed(noteElement, "wrong");
        if(smNoteElement) toggleClassDelayed(smNoteElement, "wrong");
      }

      //assignment required for svelte update
      notePoints = notePoints;
      notesCorrect = notesCorrect;
      console.log(notePoints);
      console.log(notesCorrect);
    }
  }

  // settings

  let showkeys = true;
  
  let sheetmusic = true;
  let showNote = true;

  let octaves = 1;
  let octaveStart = 4;
  
  // note
  function calculateNoteHeight(note: Note, ignoreOctave: boolean) {
    const semitoneHeight = "0.75rem";
    const noteOffset = 6 - naturalNotes.findIndex(n => n.name == note.name);
    
    let octaveOffset = 0;
    if(note.octave == 4) octaveOffset = 6;
    if(note.octave == 5) octaveOffset = -1;

    return ignoreOctave ?
      `calc(${semitoneHeight} * ${noteOffset} + 6 * ${semitoneHeight})` :
      `calc(${semitoneHeight} * ${clamp(noteOffset + octaveOffset, -1, 12)})`;
  }

</script>

<main>
  <div class="options">
    <label for="midiSelect">MIDI Device:</label>
    <select bind:this={midiDropdownElement} name="midiSelect"></select>
    
    <label for="keysSelect">Keys:</label>
    <select bind:value={noteSelection} on:change={() => {setKey()}} name="keysSelect">
      <option value="natural">White Keys / Natural Notes</option>
      <option value="accidental">Black Keys / Accidental Notes</option>
      <option value="all">All</option>
    </select>
    
    <span>Key names: <input type="checkbox" bind:checked={showkeys}></span>
    
    <span>Sheet Music: <input type="checkbox" bind:checked={sheetmusic}></span>
    
    {#if sheetmusic}
    <span>Show note name: <input type="checkbox" bind:checked={showNote}></span>
    {/if}
    
    <label for="octaveStart">Start Octave</label>
    <input type="number" name="octaveStart" bind:value={octaveStart} on:change={() => {setKey()}} min="1" max="6" disabled>
    
    <label for="octabes">Number of Octaves</label>
    <input type="number" name="octaves" bind:value={octaves} on:change={() => {setKey()}} min="1" max="2">
    
    <label for="volume">Volume</label>
    <input type="range" name="volume" on:input={ev => {synth.volumeNode ? synth.volumeNode.gain.value = parseFloat(ev.currentTarget.value) : null}} min="0" max="1" step="0.001">
    
    <button on:click={() => {notesCorrect.clear(); notesCorrect = notesCorrect; notePoints.clear(); notePoints = notePoints}}>Reset score</button>
  </div>
  
  {#if sheetmusic}
  <div class="sheet-music">
    <div class="sm-container">
      <div class="clef">&#x1D11E;</div>
      <div class="lines">
        {#if noteToPress.octave == 5 && (noteToPress.name == "A" || noteToPress.name == "B")}
        <div class="line imaginary"></div>
        {/if}
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
        {#if noteToPress.octave == 4 && noteToPress.name == "C"}
        <div class="line imaginary"></div>
        {/if}
      </div>
      <div class="sm-note-container">
        <div class="sm-note" 
        bind:this={smNoteElement}
        class:sharp={noteToPress.accidental == "#"} 
        style:margin-top={calculateNoteHeight(noteToPress, octaves == 1)}
        >&#x1D158;</div>
      </div>
    </div>
  </div>
  {/if}
  
  {#if showNote || !sheetmusic}
  <h1 bind:this={noteElement} class="note centered">{octaves == 1 ? noteToPress.name + (noteToPress.accidental ?? "" ) : noteToPress.identifier}</h1>
  {/if}
  
  <div class="piano-container">
    <Piano start={octaveStart} octaves={octaves} highlight={highlighted} showKeyNames={showkeys} keyPointMap={notePoints} />
  </div>
</main>

<style lang="sass">
  main
    margin-top: 4rem

    @media screen and (max-width: 1000px)
      margin-top: 1rem

  .options
    position: absolute
    top: 1rem
    right: 0.5rem
    display: flex
    flex-direction: column
    width: 15rem
    border: solid 3px gray
    border-radius: 8px
    padding: 0.5rem

    @media screen and (max-width: 1000px)
      position: unset
      margin-left: auto
      margin-bottom: 1rem

    select, span, input
      margin-bottom: 0.5rem
    
  :global(.right)
    color: green
    transition: color 0s !important
  
  :global(.wrong)
    color: red
    transition: color 0s !important

  .note
    margin-top: 2rem
    font-size: 36pt
    font-family: Arial, Helvetica, sans-serif
    transition: color 0.4s
  
  .centered
    display: flex
    justify-content: center
  
  .piano-container
    display: flex
    width: 100%
    justify-content: center
    margin-top: 3rem

    @media screen and (max-width: 1000px)
      margin-bottom: 15rem

  .sheet-music
    height: 13rem
    color: black
    background-color: #fefefe
    width: max(min(20%, 50rem), 25rem)
    margin: 0 auto
    border-radius: 0.25rem
  
  .sm-container
    position: relative

    $line_margin: 0.25rem
    $top_offset: 2rem

    .lines
      position: absolute
      top: calc($top_offset - 0.25rem)
      width: calc(100% - $line_margin*2)
      height: 11rem
      margin: 0 $line_margin
      display: flex
      flex-direction: column
      justify-content: center

      $line_spacing: 1.4rem
      $line-size: 2px
      .line
        margin-bottom: $line_spacing
        box-sizing: border-box
        border-bottom: solid $line-size black
        width: 100%

        &.imaginary
          width: max(10%, 2.5rem)
          margin-bottom: -$line-size
          margin-left: auto
          margin-right: auto
          
          &:first-child
            position: relative
            top: -$line_spacing
    
    .clef
      position: absolute
      top: $top_offset
      font-size: 9rem
      padding-top: 3.5rem
    
    .sm-note-container
      position: absolute
      top: -0.5rem
      width: 100%

      .sm-note
        font-size: 7rem
        text-align: center
        transition: color 0.4s

        &.sharp::before
          content: "\266F"
          font-size: 3rem
          margin-left: -1.45rem

</style>