import { HskLevel, ProgressMap, StudyAnswer, StudySessionResult } from '../types';
import { applyAnswer, recordSessionRetryAnswer } from './srs';
import { parseProgress } from './progress';

export interface StudySession {
  level: HskLevel;
  originalIds: string[];
  remainingIds: string[];
  answeredIds: string[];
  retryIds: string[];
  result: StudySessionResult;
}
export interface AppData {
  schemaVersion: 2;
  progress: ProgressMap;
  dailyTarget: number;
  session: StudySession | null;
}
export const emptyData = (): AppData => ({ schemaVersion: 2, progress: {}, dailyTarget: 20, session: null });
export const emptyResult = (): StudySessionResult => ({ total: 0, known: 0, relearn: 0, longTermAdded: 0 });
const ranges = [[1,300],[301,500],[501,1000],[1001,2000],[2001,3600],[3601,5400]];
export function validWordId(id: unknown): id is string {
  if (typeof id !== 'string' || !/^hsk[1-6]-\d{4}$/.test(id)) return false;
  const level = Number(id[3]), n = Number(id.slice(5));
  const range = ranges[level - 1]!;
  return n >= range[0]! && n <= range[1]!;
}
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const count = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;

export function parseAppData(raw: string): AppData {
  if (raw.length > 5_000_000) throw new Error('파일 크기는 5MB 이하여야 합니다.');
  const x: unknown = JSON.parse(raw);
  if (!record(x) || x.schemaVersion !== 2 || ![10,20,30].includes(x.dailyTarget as number)) throw new Error('지원하지 않는 기록 형식입니다.');
  const progress = parseProgress(JSON.stringify(x.progress));
  if (Object.keys(progress).length > 5400 || !Object.keys(progress).every(validWordId)) throw new Error('어휘 범위를 벗어난 기록입니다.');
  let session: StudySession | null = null;
  if (x.session !== null) {
    const s = x.session;
    const ids = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 30 && v.every(validWordId) && new Set(v).size === v.length;
    if (!record(s) || ![1,2,3,4,5,6].includes(s.level as number) || !ids(s.originalIds) || !s.originalIds.length ||
      !ids(s.remainingIds) || !s.remainingIds.length || !ids(s.answeredIds) || !ids(s.retryIds) || !record(s.result)) throw new Error('진행 중인 학습 기록이 손상되었습니다.');
    const { originalIds, remainingIds, answeredIds, retryIds } = s;
    const original = new Set(originalIds);
    if (![...remainingIds,...answeredIds,...retryIds].every(id => original.has(id)) ||
      !originalIds.every(id => Number(id[3]) === s.level) ||
      !retryIds.every(id => remainingIds.includes(id) && answeredIds.includes(id)) ||
      !originalIds.every(id => remainingIds.includes(id) || answeredIds.includes(id)) ||
      remainingIds.some(id => answeredIds.includes(id) && !retryIds.includes(id)) ||
      answeredIds.some(id => !progress[id])) throw new Error('학습 큐의 연결이 올바르지 않습니다.');
    const r = s.result;
    if (![r.total,r.known,r.relearn,r.longTermAdded].every(count) || r.total !== s.answeredIds.length ||
      (r.known as number) + (r.relearn as number) < (r.total as number) || (r.longTermAdded as number) > (r.total as number) ||
      r.known !== s.originalIds.length - s.remainingIds.length) throw new Error('학습 집계가 올바르지 않습니다.');
    session = s as unknown as StudySession;
  }
  return { schemaVersion: 2, progress, dailyTarget: x.dailyTarget as number, session };
}
export function beginStudy(data: AppData, level: HskLevel, ids: string[]): AppData {
  if (!ids.length || ids.length > 30 || new Set(ids).size !== ids.length || !ids.every(id => validWordId(id) && Number(id[3]) === level)) throw new Error('학습 대상을 확인해 주세요.');
  return { ...data, session: { level, originalIds: [...ids], remainingIds: [...ids], answeredIds: [], retryIds: [], result: emptyResult() } };
}
export function answerStudy(data: AppData, answer: StudyAnswer, now = new Date()): { data: AppData; result: StudySessionResult } {
  const s = data.session;
  if (!s) throw new Error('진행 중인 학습이 없습니다.');
  const id = s.remainingIds[0]!;
  const previous = data.progress[id];
  const retry = s.retryIds.includes(id);
  const item = retry && previous ? recordSessionRetryAnswer(previous, answer, now) : applyAnswer(previous, answer, now);
  const remainingIds = s.remainingIds.slice(1);
  if (answer === 'RELEARN') remainingIds.push(id);
  const retryIds = s.retryIds.filter(x => x !== id);
  if (answer === 'RELEARN') retryIds.push(id);
  const answeredIds = s.answeredIds.includes(id) ? s.answeredIds : [...s.answeredIds,id];
  const result = { total: answeredIds.length, known: s.result.known + (answer === 'KNOWN' ? 1 : 0), relearn: s.result.relearn + (answer === 'RELEARN' ? 1 : 0), longTermAdded: s.result.longTermAdded + (previous?.stage !== 'LONG_TERM' && item.stage === 'LONG_TERM' ? 1 : 0) };
  return { data: { ...data, progress: { ...data.progress, [id]: item }, session: remainingIds.length ? { ...s, remainingIds, retryIds, answeredIds, result } : null }, result };
}
export function serializeBackup(data: AppData, now = new Date()): string {
  return JSON.stringify({ app: 'HSK Plus Ultra', formatVersion: 1, exportedAt: now.toISOString(), data: parseAppData(JSON.stringify(data)) }, null, 2);
}
export function parseBackup(raw: string): AppData {
  if (raw.length > 5_000_000) throw new Error('파일 크기는 5MB 이하여야 합니다.');
  const x: unknown = JSON.parse(raw);
  if (!record(x) || x.app !== 'HSK Plus Ultra' || x.formatVersion !== 1 || typeof x.exportedAt !== 'string' || !Number.isFinite(Date.parse(x.exportedAt))) throw new Error('HSK Plus Ultra 백업 파일이 아닙니다.');
  return parseAppData(JSON.stringify(x.data));
}
