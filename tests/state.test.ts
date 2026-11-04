import test from 'node:test';
import assert from 'node:assert/strict';
import { answerStudy, beginStudy, emptyData, parseAppData, parseBackup, serializeBackup, validWordId } from '../src/lib/state';
const now = new Date('2026-11-05T01:00:00Z');
test('paused retries resume at the same card without promoting or losing a recorded answer', () => {
  const first = beginStudy(emptyData(), 1, ['hsk1-0001','hsk1-0002']);
  const failed = answerStudy(first,'RELEARN',now).data;
  const restored = parseBackup(serializeBackup(failed,now));
  assert.deepEqual(restored.session!.remainingIds,['hsk1-0002','hsk1-0001']);
  const second = answerStudy(restored,'KNOWN',now).data;
  const done = answerStudy(parseAppData(JSON.stringify(second)),'KNOWN',now);
  assert.equal(done.data.session,null);
  assert.equal(done.result.total,2); assert.equal(done.result.known,2); assert.equal(done.result.relearn,1);
  assert.equal(done.data.progress['hsk1-0001']!.stage,'DAY_3');
  assert.equal(done.data.progress['hsk1-0001']!.seenCount,2);
});
test('retry queue stays bounded even after repeated failures', () => {
  let data = beginStudy(emptyData(),1,['hsk1-0001']);
  for (let i = 0; i < 100; i++) data = answerStudy(data,'RELEARN',now).data;
  assert.equal(data.session!.remainingIds.length,1);
  assert.equal(parseAppData(JSON.stringify(data)).session!.result.total,1);
  assert.equal(data.progress['hsk1-0001']!.seenCount,100);
});
test('invalid imports fail before replacement, including forged IDs, results and queue relationships', () => {
  const original = beginStudy(emptyData(),1,['hsk1-0001']);
  const corruptions = [
    (d: any) => { d.progress = null; },
    (d: any) => { d.dailyTarget = 5000; },
    (d: any) => { d.session.remainingIds = ['hsk1-0001','hsk1-0001']; },
    (d: any) => { d.session.remainingIds = ['hsk1-0002']; },
    (d: any) => { d.session.originalIds = ['hsk1-9999']; },
    (d: any) => { d.session.result.total = 20; },
    (d: any) => { d.session.retryIds = ['hsk1-0001']; },
    (d: any) => { d.session.answeredIds = ['hsk1-0001']; },
    (d: any) => { d.schemaVersion = 3; },
  ];
  for (const corrupt of corruptions) { const copy = JSON.parse(JSON.stringify(original)); corrupt(copy); assert.throws(() => parseAppData(JSON.stringify(copy))); }
  assert.throws(() => parseBackup('{}'));
  assert.throws(() => parseBackup('x'.repeat(5_000_001)));
  assert.equal(original.progress['hsk1-0001'],undefined);
  assert.equal(validWordId('hsk2-0301'),true); assert.equal(validWordId('hsk2-0001'),false);
});
