<script lang="ts">
    import { Note } from "webmidi"
    export let start = 4;
    export let octaves = 1;
    export let highlight: string[] | null = null;
    export let showKeyNames: boolean;
    export let keyPointMap: Map<string, number>;

    const naturalNotes = ["C","D","E","F","G","A","B"];
    const accidentalNotes = ["C#","D#",   "F#","G#","A#"];
    
    type OctaveGroup = { white: Note[], black: Note[] }

    function constructOctaveGroups(start: number, octaves: number) {
        const octaveGroups: OctaveGroup[] = [];

        for (let o = start; o < (start + octaves); o++) {
            const white: Note[] = naturalNotes.map(n => new Note(`${n}${o}`));
            const black: Note[] = accidentalNotes.map(n => new Note(`${n}${o}`));

            octaveGroups.push({
                white,
                black
            })
        }

        return octaveGroups;
    }
    
</script>

<div class="piano">
{#each constructOctaveGroups(start, octaves) as octave}
    <div class="octave">
        <div class="white-container">
        {#each octave.white as key}
            <key 
            class="white" 
            class:highlighted={highlight.includes(key.identifier)}
            style={(() => {
                if(highlight.includes(key.identifier)) return "";
                const percent = (keyPointMap.get(key.identifier) ?? 0) * 100;
                return `background: linear-gradient(to top, #42eb2f 0% ${percent}%, #fefefe ${percent}%);`
            })()}>
                {#if showKeyNames}
                {(octaves != 1 && key.name == "C") ? key.identifier : key.name }
                {/if}
            </key>
        {/each}
        </div>
        <div class="black-container">
        {#each octave.black as key}
            <key 
            class="black"
            class:highlighted={highlight.includes(key.identifier)}
            style={(() => {
                if(highlight.includes(key.identifier)) return "";
                const percent = (keyPointMap.get(key.identifier) ?? 0) * 100;
                return `background: linear-gradient(to top, #196411 0% ${percent}%, #1e1e1e ${percent}%);`
            })()}>
                {#if showKeyNames}
                {key.name + key.accidental}
                {/if}
            </key>
        {/each}
        </div>
    </div>
{/each}
</div>

<style lang="sass">
    $key_size: 3rem
    $key_length: 10rem
    $font_size: 1rem

    .piano
        display: flex

    .octave
        width: calc($key_size*7)
        position: relative

    .white-container, .black-container
        position: absolute
        left: 0
        display: flex
        height: $key_length
        box-sizing: border-box

    key
        display: flex
        align-items: flex-end
        justify-content: center
        width: $key_size
        box-sizing: border-box
        border: solid 1px
        border-radius: 0 0 3px 3px
        

        &.white
            background-color: #fefefe
            color: #111


        &.black
            width: calc($key-size*(3/4))
            height: calc($key_length*(5/7))
            background-color: #1e1e1e
            margin-left: calc($key_size*(3/8))
            font-size: 0.8rem
            
            &:nth-child(5n+3), &:nth-child(5n+1)
                margin-left: calc($key_size*(9/8))

            &:first-child
                margin-left: calc($key_size/2)

        &.highlighted
            background-color: #dd1616
                
                
</style>