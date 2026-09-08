import { ReviewStage, StudyAnswer, WordProgress } from '../types';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const STAGE_LABEL: Record<ReviewStage, string> = {
  NEW: '새 단어',
  MIN_30: '30분 단계',
  DAY_3: '3일 단계',
  DAY_7: '7일 단계',
  DAY_21: '21일 단계',
  LONG_TERM: '장기 기억',
};

function plus(base: Date, milliseconds: number) {
  return new Date(base.getTime() + milliseconds).toISOString();
}

function nextForStage(stage: ReviewStage, now: Date): string | null {
  switch (stage) {
    case 'MIN_30':
      return plus(now, 30 * MINUTE);
    case 'DAY_3':
      return plus(now, 3 * DAY);
    case 'DAY_7':
      return plus(now, 7 * DAY);
    case 'DAY_21':
      return plus(now, 21 * DAY);
    case 'NEW':
    case 'LONG_TERM':
      return null;
  }
}

export function transitionStage(stage: ReviewStage, answer: StudyAnswer): ReviewStage {
  if (answer === 'KNOWN') {
    switch (stage) {
      case 'NEW':
        // 처음 본 단어를 이미 안다면 21일 검증까지 통과한 것으로 취급.
        return 'LONG_TERM';
      case 'MIN_30':
        return 'DAY_3';
      case 'DAY_3':
        return 'DAY_7';
      case 'DAY_7':
        return 'DAY_21';
      case 'DAY_21':
      case 'LONG_TERM':
        return 'LONG_TERM';
    }
  }

  switch (stage) {
    case 'NEW':
      // 새 단어는 21일 단계에 준하는 초기 판정. 모르면 한 단계 아래인 3일로.
      return 'DAY_3';
    case 'MIN_30':
      return 'MIN_30';
    case 'DAY_3':
      return 'MIN_30';
    case 'DAY_7':
      return 'DAY_3';
    case 'DAY_21':
    case 'LONG_TERM':
      return 'DAY_7';
  }
}

export function applyAnswer(
  previous: WordProgress | undefined,
  answer: StudyAnswer,
  now = new Date(),
): WordProgress {
  const currentStage: ReviewStage = previous?.stage ?? 'NEW';
  const stage = transitionStage(currentStage, answer);

  return {
    stage,
    nextReviewAt: nextForStage(stage, now),
    lastReviewedAt: now.toISOString(),
    seenCount: (previous?.seenCount ?? 0) + 1,
    knownCount: (previous?.knownCount ?? 0) + (answer === 'KNOWN' ? 1 : 0),
    relearnCount: (previous?.relearnCount ?? 0) + (answer === 'RELEARN' ? 1 : 0),
  };
}

export function isDue(progress: WordProgress | undefined, now = new Date()) {
  if (!progress || progress.stage === 'LONG_TERM' || !progress.nextReviewAt) return false;
  return new Date(progress.nextReviewAt).getTime() <= now.getTime();
}

export function reviewTimingText(progress: WordProgress | undefined) {
  if (!progress) return '처음 보는 단어';
  if (progress.stage === 'LONG_TERM') return '장기 기억 단어';
  return STAGE_LABEL[progress.stage];
}
