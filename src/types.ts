export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type ReviewStage =
  | 'NEW'
  | 'MIN_30'
  | 'DAY_3'
  | 'DAY_7'
  | 'DAY_21'
  | 'LONG_TERM';

export type StudyAnswer = 'KNOWN' | 'RELEARN';

export interface VocabularyWord {
  id: string;
  level: HskLevel;
  word: string;
  pinyin: string;
  meaningKo: string;
  partOfSpeech?: string;
  exampleZh?: string;
  examplePinyin?: string;
  exampleKo?: string;
}

export interface WordProgress {
  stage: ReviewStage;
  nextReviewAt: string | null;
  lastReviewedAt: string;
  seenCount: number;
  knownCount: number;
  relearnCount: number;
}

export type ProgressMap = Record<string, WordProgress>;

export interface StudySessionResult {
  total: number;
  known: number;
  relearn: number;
  longTermAdded: number;
}
