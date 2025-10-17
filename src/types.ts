export type Tone = 2 | 3;

export interface SyllableEntry {
  key: string; // e.g., ma2
  base: string; // ma
  tone: Tone;
  pinyin: string; // with tone mark
  hanzi: string | null;
}

export interface HistoryMap {
  [key: string]: number[];
}
