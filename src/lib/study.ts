import { VocabularyWord, ProgressMap } from '../types';
import { isDue } from './srs';

export interface QueueBreakdown {
  words: VocabularyWord[];
  reviewCount: number;
  newCount: number;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = result[i]!;
    const target = result[j]!;
    result[i] = target;
    result[j] = current;
  }

  return result;
}

export function buildStudyQueue(
  vocabulary: VocabularyWord[],
  progress: ProgressMap,
  target: number,
  now = new Date(),
): QueueBreakdown {
  const due = vocabulary
    .filter((word) => isDue(progress[word.id], now))
    .sort((a, b) => {
      const aReviewAt = progress[a.id]?.nextReviewAt;
      const bReviewAt = progress[b.id]?.nextReviewAt;
      const aTime = aReviewAt ? new Date(aReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = bReviewAt ? new Date(bReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  const unseen = vocabulary.filter((word) => !progress[word.id]);

  // 복습이 밀렸다면 오래 기다린 복습을 우선 포함하고,
  // 남는 학습량을 새 단어로 채운다.
  const reviewWords = due.slice(0, target);
  const remaining = Math.max(0, target - reviewWords.length);
  const newWords = unseen.slice(0, remaining);

  // 어떤 단어가 선택되는지는 SRS 우선순위를 유지하되,
  // 실제 카드가 나오는 순서는 매 세션마다 섞어서 순서 암기를 막는다.
  return {
    words: shuffle([...reviewWords, ...newWords]),
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
