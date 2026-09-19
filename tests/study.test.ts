import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAnswer, isDue, recordSessionRetryAnswer, transitionStage } from '../src/lib/srs';
import { buildStudyQueue } from '../src/lib/study';
import { parseProgress, createWriteQueue } from '../src/lib/progress';
import { matchesWord } from '../src/lib/search';
import { VOCABULARY, getLevelVocabulary } from '../src/data/vocabulary';
import { ReviewStage, VocabularyWord, WordProgress } from '../src/types';
const now = new Date('2026-09-19T12:00:00Z');
const base: WordProgress = { stage: 'DAY_3', nextReviewAt: now.toISOString(), lastReviewedAt: now.toISOString(), seenCount: 1, knownCount: 0, relearnCount: 1 };
const stages: ReviewStage[] = ['NEW', 'MIN_30', 'DAY_3', 'DAY_7', 'DAY_21', 'LONG_TERM'];

test('all twelve SRS transitions follow the documented policy', () => {
  const known = ['LONG_TERM', 'DAY_3', 'DAY_7', 'DAY_21', 'LONG_TERM', 'LONG_TERM'];
  const relearn = ['DAY_3', 'MIN_30', 'MIN_30', 'DAY_3', 'DAY_7', 'DAY_7'];
  stages.forEach((stage, i) => { assert.equal(transitionStage(stage, 'KNOWN'), known[i]); assert.equal(transitionStage(stage, 'RELEARN'), relearn[i]); });
});
test('new word failure schedules 3 days; retry success cannot promote or postpone it', () => {
  const first = applyAnswer(undefined, 'RELEARN', now);
  assert.equal(first.nextReviewAt, '2026-09-22T12:00:00.000Z');
  const retry = recordSessionRetryAnswer(first, 'KNOWN', new Date('2026-09-19T12:05:00Z'));
  assert.equal(retry.stage, 'DAY_3'); assert.equal(retry.nextReviewAt, first.nextReviewAt); assert.equal(retry.seenCount, 2);
});
test('retry failure demotes again and schedules exactly 30 minutes', () => {
  const retry = recordSessionRetryAnswer(base, 'RELEARN', now);
  assert.equal(retry.stage, 'MIN_30'); assert.equal(retry.nextReviewAt, '2026-09-19T12:30:00.000Z');
  assert.equal(isDue(retry, new Date('2026-09-19T12:29:59Z')), false);
  assert.equal(isDue(retry, new Date('2026-09-19T12:30:00Z')), true);
});
test('overdue reviews have selection priority; future and long-term words are excluded', () => {
  const words = getLevelVocabulary(1).slice(0, 5);
  const [a,b,c,d,e] = words as [VocabularyWord,VocabularyWord,VocabularyWord,VocabularyWord,VocabularyWord];
  const progress = { [a.id]: {...base, nextReviewAt:'2026-09-18T12:00:00Z'}, [b.id]: base, [c.id]: {...base, nextReviewAt:'2026-09-20T12:00:00Z'}, [d.id]: {...base, stage:'LONG_TERM' as const, nextReviewAt:null} };
  const small = buildStudyQueue(words, progress, 1, now);
  assert.deepEqual(small.words.map(w => w.id), [a.id]);
  const full = buildStudyQueue(words, progress, 10, now);
  assert.equal(full.reviewCount, 2); assert.equal(full.newCount, 1);
  assert.deepEqual(new Set(full.words.map(w => w.id)), new Set([a.id,b.id,e.id]));
  assert.equal(buildStudyQueue(words, progress, -1, now).words.length, 0);
});
test('persisted NEW records are still eligible for study', () => {
  const word = VOCABULARY[0]!;
  const queue = buildStudyQueue([word], {[word.id]: {...base, stage:'NEW', nextReviewAt:null}}, 10, now);
  assert.equal(queue.newCount, 1);
});
test('corrupt storage is rejected, not converted to empty history', () => {
  assert.deepEqual(parseProgress(null), {});
  assert.deepEqual(parseProgress(JSON.stringify({'hsk1-0001':base})), {'hsk1-0001':base});
  for (const raw of ['null', '[]', '{', '{"bad":{}}', JSON.stringify({'hsk1-0001':{...base, stage:'UNKNOWN'}}), JSON.stringify({'hsk1-0001':{...base,nextReviewAt:'invalid'}}), JSON.stringify({'hsk1-0001':{...base,knownCount:10}})]) assert.throws(() => parseProgress(raw));
});
test('writes remain ordered and one failure does not block later recovery', async () => {
  const queue = createWriteQueue(); const order: number[] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const first = queue(async () => { await held; order.push(1); });
  const second = queue(async () => { order.push(2); throw new Error('disk full'); });
  const rejected = assert.rejects(second, /disk full/);
  const third = queue(async () => { order.push(3); });
  release(); await Promise.all([first,rejected,third]); assert.deepEqual(order, [1,2,3]);
});
test('search covers beyond page one, Korean, Chinese and toneless pinyin', () => {
  const left = getLevelVocabulary(2).find(w => w.word === '左边')!;
  assert.equal(matchesWord(left, 'zuobian'), true); assert.equal(matchesWord(left, '왼쪽'), true);
  assert.equal(matchesWord(left, ' 左边 '), true); assert.equal(matchesWord(left, 'no match'), false);
});
test('sense-specific corrections prevent false friends and wrong usage', () => {
  const word = (id: string) => VOCABULARY.find(w => w.id === id)!;
  assert.match(word('hsk2-0323').meaningKo, /번/);
  assert.match(word('hsk2-0384').meaningKo, /빠르다/);
  assert.match(word('hsk3-0683').exampleKo!, /회의/);
  assert.match(word('hsk6-3757').exampleKo!, /곱하기/);
  assert.match(word('hsk4-1078').exampleKo!, /타고/);
  assert.notEqual(word('hsk2-0357').exampleZh, word('hsk2-0358').exampleZh);
});
test('unverified dictionary mappings are searchable but never enter automatic learning', () => {
  const draft = VOCABULARY.find(w => w.meaningStatus === 'dictionary-draft')!;
  assert.equal(matchesWord(draft, draft.word), true);
  assert.equal(buildStudyQueue([draft], {}, 20, now).words.length, 0);
  assert.equal(buildStudyQueue([draft], {[draft.id]: base}, 20, now).words.length, 0);
});
