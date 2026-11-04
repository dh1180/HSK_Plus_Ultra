import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../data/review/manifest.json';
import { VOCABULARY, getLevelVocabulary } from '../src/data/vocabulary';
import { buildStudyQueue } from '../src/lib/study';
test('review evidence binds all 1000 reviewed entries to exactly the published content', () => {
  const byId = new Map(VOCABULARY.map(w => [w.id,w]));
  assert.equal(new Set(manifest.entries.map(e => e.id)).size,1000);
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
});
