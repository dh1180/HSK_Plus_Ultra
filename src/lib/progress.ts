import { ProgressMap, ReviewStage, WordProgress } from '../types';

const stages: ReviewStage[] = ['NEW', 'MIN_30', 'DAY_3', 'DAY_7', 'DAY_21', 'LONG_TERM'];
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Reject invalid data without silently replacing the user's saved history. */
export function parseProgress(raw: string | null): ProgressMap {
  if (raw === null) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('학습 기록 형식이 올바르지 않습니다.');
  }
  for (const [id, entry] of Object.entries(value)) {
    const item = entry as WordProgress | null;
    if (!/^hsk[1-6]-\d{4}$/.test(id) || !item || !stages.includes(item.stage) ||
      !validDate(item.lastReviewedAt) ||
      ![item.seenCount, item.knownCount, item.relearnCount].every(n => Number.isSafeInteger(n) && n >= 0) ||
      item.seenCount !== item.knownCount + item.relearnCount ||
      (['NEW', 'LONG_TERM'].includes(item.stage)
        ? item.nextReviewAt !== null
        : !validDate(item.nextReviewAt))) {
      throw new Error('손상된 학습 기록이 있습니다. 기존 기록은 보존됩니다.');
    }
  }
  return value as ProgressMap;
}

export function createWriteQueue() {
  let tail: Promise<void> = Promise.resolve();
  return (write: () => Promise<void>) => {
    const current = tail.then(write);
    tail = current.catch(() => undefined);
    return current;
  };
}
