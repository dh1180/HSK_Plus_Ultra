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
      // 새 단어의 첫 실패는 3일 단계로 보낸다.
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

/**
 * 한 세션에서 `다시 학습`으로 재출제된 단어의 추가 응답을 기록한다.
 *
 * 재출제 카드에서 `알고 있음`을 누르면 현재 단계와 다음 복습 예약을 유지하고
 * 세션 안의 반복만 종료한다.
 *
 * 재출제 카드에서 다시 `다시 학습`을 누르면 현재 단계 기준으로 한 번 더 하향한다.
 * 예: NEW -> 다시 학습 -> DAY_3 -> 재출제에서 다시 학습 -> MIN_30.
 * MIN_30에서 다시 틀리면 MIN_30을 유지하며 30분 예약을 새로 잡는다.
 */
export function recordSessionRetryAnswer(
  previous: WordProgress,
  answer: StudyAnswer,
  now = new Date(),
): WordProgress {
  if (answer === 'RELEARN') {
    return applyAnswer(previous, answer, now);
  }

  return {
    ...previous,
    lastReviewedAt: now.toISOString(),
    seenCount: previous.seenCount + 1,
    knownCount: previous.knownCount + 1,
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
