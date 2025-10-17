import { HistoryMap } from '../types';

export const MAX_HISTORY = 20;

export const getHistory = (histories: HistoryMap, key: string): number[] => {
  return histories[key] ?? [];
};

export const computeAccuracy = (histories: HistoryMap, key: string): number => {
  const history = getHistory(histories, key);
  if (!history.length) {
    return 0.5;
  }
  const sum = history.reduce((acc, value) => acc + value, 0);
  return sum / history.length;
};

export const computeWeight = (histories: HistoryMap, key: string): number => {
  const accuracy = computeAccuracy(histories, key);
  return Math.max(1 - accuracy, 0.02);
};

export const recordHistory = (
  histories: HistoryMap,
  key: string,
  result: 0 | 1
): HistoryMap => {
  const existing = histories[key] ?? [];
  const nextHistory = [...existing, result].slice(-MAX_HISTORY);
  return {
    ...histories,
    [key]: nextHistory
  };
};
