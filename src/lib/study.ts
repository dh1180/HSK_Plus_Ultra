import { VocabularyWord, ProgressMap } from '../types';
import { isDue } from './srs';

export interface QueueBreakdown {
  words: VocabularyWord[];
  reviewCount: number;
  newCount: number;
}

export function buildStudyQueue(
  vocabulary: VocabularyWord[],
  progress: ProgressMap,
  target: number,
  now = new Date(),
): QueueBreakdown {
  const due = vocabulary.filter((word) => isDue(progress[word.id], now));
  const unseen = vocabulary.filter((word) => !progress[word.id]);

  // 복습이 밀렸다면 복습을 먼저 채우고, 남는 학습량을 새 단어로 채운다.
  const reviewWords = due.slice(0, target);
  const remaining = Math.max(0, target - reviewWords.length);
  const newWords = unseen.slice(0, remaining);

  return {
    words: [...reviewWords, ...newWords],
    reviewCount: reviewWords.length,
    newCount: newWords.length,
  };
}

export function countLevelStats(vocabulary: VocabularyWord[], progress: ProgressMap) {
  const entries = vocabulary
    .map((word) => progress[word.id])
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    studied: entries.length,
    longTerm: entries.filter((item) => item.stage === 'LONG_TERM').length,
    due: vocabulary.filter((word) => isDue(progress[word.id])).length,
  };
}
