import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../data/review/manifest.json';
import { VOCABULARY, getLevelVocabulary } from '../src/data/vocabulary';
import { buildStudyQueue } from '../src/lib/study';
test('review evidence binds all reviewed entries to exactly the published content', () => {
  const byId = new Map(VOCABULARY.map(w => [w.id,w]));
  assert.equal(new Set(manifest.entries.map(e => e.id)).size,1001);
  for (const e of manifest.entries) {
    const word = byId.get(e.id)!;
    const keys = ['exampleKo','examplePinyin','exampleZh','meaningKo','pinyin','word'] as const;
    const actual = createHash('sha256').update(JSON.stringify(Object.fromEntries(keys.map(key => [key,word[key]])))).digest('hex');
    assert.equal(actual,e.contentHash,e.id);
  }
  assert.equal(getLevelVocabulary(3).every(w => w.exampleZh && w.meaningStatus === 'editorial'),true);
  assert.equal(buildStudyQueue(getLevelVocabulary(3),{},500).words.length,500);
});
test('usage examples match target sense rather than a substring in another word', () => {
  const get = (id: string) => VOCABULARY.find(w => w.id === id)!;
  assert.match(get('hsk3-0586').exampleZh!,/有时间的话/);
  assert.match(get('hsk3-0769').exampleZh!,/两米/);
  assert.match(get('hsk3-0704').meaningKo,/화폐/);
  assert.match(get('hsk3-0700').meaningKo,/검표/);
  assert.match(get('hsk3-0996').exampleZh!,/最好早点/);
  assert.match(get('hsk3-0514').examplePinyin!,/jiě jué/);
  assert.match(get('hsk3-0861').examplePinyin!,/cháng/);
  assert.match(get('hsk3-0564').exampleKo!,/퇴원/);
  assert.match(get('hsk3-0501').exampleSource!,/no7z.*CC BY-SA/);
  assert.equal(get('hsk5-2012').partOfSpeech,'부사');
  assert.match(get('hsk5-2012').meaningKo,/헛되이/);
  assert.match(get('hsk5-2012').exampleZh!,/白等/);
});

test('all 5400 vocabulary entries retain a unique official row and page while app IDs stay stable', async () => {
  const snapshot = (await import('../src/data/generated-hsk.json')).default;
  assert.equal(snapshot.officialReference.sha256,'d8b6646599bc9a0c9616a4cb06d4b37461f8792f70a3171016d00fcd8eda09ad');
  assert.equal(new Set(snapshot.words.map(w => w.officialOrdinal)).size,5400);
  assert.deepEqual(snapshot.words.map(w => w.officialOrdinal).sort((a,b) => a-b),Array.from({length:5400},(_,i) => i+1));
  for (const w of snapshot.words) {
    assert.equal(w.officialPdfPage,80 + Math.floor((w.officialOrdinal - 1) / 40));
    assert.equal(w.officialPrintedPage,w.officialPdfPage - 3);
    assert.equal(w.word,w.sourceWord.replace(/\d+$/u,''));
    assert.ok(VOCABULARY.find(word => word.id === w.id)!.wordSourceUrl?.endsWith(`#page=${w.officialPdfPage}`));
  }
  assert.equal(VOCABULARY.find(w => w.id === 'hsk1-0031')!.word,'第');
  assert.equal(snapshot.words.find(w => w.id === 'hsk1-0031')!.officialOrdinal,32);
});
