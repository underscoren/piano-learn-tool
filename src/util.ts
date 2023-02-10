import type { Note } from "webmidi"

/** Keeps a value between min and max */
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
/** Returns a random value from an array */
export const pickRandom = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
/** Checks if two notes are equal (optionally ignoring octave) */
export const notesEqual = (a: Note, b: Note, ignoreOctave = false) => a.name == b.name && a.accidental == b.accidental && (ignoreOctave ? true : a.octave == b.octave);