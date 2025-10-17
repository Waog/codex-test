import { HistoryMap } from '../types';

const HISTORY_KEY = 'toneTrainer:histories';
const VOICE_KEY = 'toneTrainer:selectedVoice';

export const loadHistories = (): HistoryMap => {
  if (typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as HistoryMap;
    Object.keys(parsed).forEach((key) => {
      const arr = parsed[key];
      if (!Array.isArray(arr)) {
        delete parsed[key];
      }
    });
    return parsed;
  } catch (error) {
    console.error('Failed to parse histories', error);
    return {};
  }
};

export const saveHistories = (histories: HistoryMap) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(histories));
};

export const loadSelectedVoice = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(VOICE_KEY);
};

export const saveSelectedVoice = (voiceUri: string) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(VOICE_KEY, voiceUri);
};

export const clearAllData = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.clear();
};

export const HISTORY_STORAGE_KEY = HISTORY_KEY;
export const VOICE_STORAGE_KEY = VOICE_KEY;
