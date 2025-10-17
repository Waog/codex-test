import { Tone } from '../types';

const toneMarks: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ']
};

const vowels = ['a', 'e', 'i', 'o', 'u', 'ü'];

const normalizeBase = (base: string) =>
  base
    .replace('u:', 'ü')
    .replace('v', 'ü');

export const pinyinWithTone = (base: string, tone: Tone): string => {
  const normalized = normalizeBase(base);
  const toneIndex = tone - 1; // 0-based; tone 1 =>0 etc.

  const lower = normalized.toLowerCase();
  let targetVowel = '';

  if (lower.includes('a')) {
    targetVowel = 'a';
  } else if (lower.includes('e')) {
    targetVowel = 'e';
  } else if (lower.includes('ou')) {
    targetVowel = 'o';
  } else {
    for (let i = lower.length - 1; i >= 0; i -= 1) {
      const ch = lower[i];
      if (vowels.includes(ch)) {
        targetVowel = ch;
        break;
      }
    }
  }

  if (!targetVowel) {
    return normalized;
  }

  const marks = toneMarks[targetVowel];
  if (!marks) {
    return normalized;
  }

  const replacement = marks[toneIndex];
  if (!replacement) {
    return normalized;
  }

  const index = lower.indexOf(targetVowel);
  return normalized.slice(0, index) + replacement + normalized.slice(index + 1);
};

export const parseKey = (key: string): { base: string; tone: Tone } => {
  const toneChar = key[key.length - 1];
  const tone = Number(toneChar) as Tone;
  const base = key.slice(0, -1);
  return { base, tone };
};
