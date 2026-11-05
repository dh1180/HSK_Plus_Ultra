import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../data/review/manifest.json';
import { VOCABULARY, getLevelVocabulary } from '../src/data/vocabulary';
import { buildStudyQueue } from '../src/lib/study';
test('review evidence binds all reviewed entries to exactly the published content', () => {
  const byId = new Map(VOCABULARY.map(w => [w.id,w]));
  assert.equal(new Set(manifest.entries.map(e => e.id)).size,5400);
  for (const e of manifest.entries) {
    const word = byId.get(e.id)!;
    const keys = ['exampleKo','examplePinyin','exampleZh','meaningKo','pinyin','word'] as const;
    const actual = createHash('sha256').update(JSON.stringify(Object.fromEntries(keys.map(key => [key,word[key]])))).digest('hex');
    assert.equal(actual,e.contentHash,e.id);
    if (e.partOfSpeech !== undefined) assert.equal(word.partOfSpeech,e.partOfSpeech,e.id);
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

test('reviewed HSK 4 first half covers all 500 targets without substring-only examples', () => {
  const words = getLevelVocabulary(4).filter(w => Number(w.id.slice(5)) <= 1500);
  assert.equal(words.length,500);
  assert.equal(words.every(w => w.meaningStatus === 'editorial' && w.exampleZh && w.examplePinyin && w.exampleKo),true);
  const byId = new Map(words.map(w => [w.id,w]));
  assert.match(byId.get('hsk4-1118')!.meaningKo,/방해/);
  assert.match(byId.get('hsk4-1081')!.meaningKo,/정직/);
  assert.match(byId.get('hsk4-1166')!.exampleZh!,/坐动车/);
  assert.doesNotMatch(byId.get('hsk4-1166')!.exampleZh!,/电动车/);
  assert.match(byId.get('hsk4-1224')!.exampleZh!,/幸福感/);
  assert.equal(byId.get('hsk4-1224')!.partOfSpeech,'접미사');
  assert.match(byId.get('hsk4-1124')!.exampleZh!,/大大提高/);
  assert.match(byId.get('hsk4-1469')!.exampleZh!,/连一句话都/);
  assert.match(byId.get('hsk4-1125')!.examplePinyin!,/dài fu/);
  assert.match(byId.get('hsk4-1136')!.examplePinyin!,/le dāng shí/);
  assert.match(byId.get('hsk4-1313')!.examplePinyin!,/huó pō/);
  assert.match(byId.get('hsk4-1376')!.examplePinyin!,/jiào xué/);
  assert.match(byId.get('hsk4-1496')!.examplePinyin!,/jiē mǎn/);
});

test('HSK 4 review covers every target and distinguishes grammatical senses and online terms', () => {
  const words = getLevelVocabulary(4);
  assert.equal(words.length,1000);
  const reviewedIds = new Set(manifest.entries.map(e => e.id));
  assert.ok(words.every(w => reviewedIds.has(w.id) && w.meaningStatus === 'editorial' && w.exampleZh && w.examplePinyin && w.exampleKo));
  const get = (id: string) => words.find(w => w.id === id)!;
  assert.match(get('hsk4-1575').exampleZh!,/千万别迟到/);
  assert.match(get('hsk4-1657').exampleZh!,/十分高兴/);
  assert.match(get('hsk4-1710').exampleZh!,/^随着天气/);
  assert.match(get('hsk4-1799').exampleZh!,/线上教学/);
  assert.match(get('hsk4-1800').exampleZh!,/线下活动/);
  assert.match(get('hsk4-1980').exampleZh!,/^自去年以来/);
  assert.match(get('hsk4-1852').exampleZh!,/一副眼镜/);
  assert.match(get('hsk4-1712').examplePinyin!,/^sūn zi/);
  assert.match(get('hsk4-1733').examplePinyin!,/liáng tǐ wēn/);
  assert.match(get('hsk4-1862').examplePinyin!,/cháng$/);
  assert.match(get('hsk4-1906').examplePinyin!,/cān jiā/);
  assert.match(get('hsk4-1978').examplePinyin!,/xià zài/);
  assert.equal(buildStudyQueue(words,{},1000).words.length,1000);
});

test('HSK 5 first 500 targets distinguish word boundaries, polyphonic senses and suffixes', () => {
  const words = getLevelVocabulary(5).filter(w => Number(w.id.slice(5)) <= 2500);
  assert.equal(words.length,500);
  const reviewedIds = new Set(manifest.entries.map(e => e.id));
  assert.ok(words.every(w => reviewedIds.has(w.id) && w.meaningStatus === 'editorial' && w.exampleZh && w.examplePinyin && w.exampleKo));
  const get = (id: string) => words.find(w => w.id === id)!;
  assert.match(get('hsk5-2006').examplePinyin!,/jì hǎo ān quán dài/);
  assert.match(get('hsk5-2066').meaningKo,/꽂다/);
  assert.match(get('hsk5-2132').meaningKo,/무게/);
  assert.match(get('hsk5-2133').meaningKo,/부르다/);
  assert.match(get('hsk5-2179').examplePinyin!,/chǔ de/);
  assert.match(get('hsk5-2182').examplePinyin!,/rù kǒu chù/);
  assert.match(get('hsk5-2210').exampleZh!,/问题仍然存在/);
  assert.match(get('hsk5-2314').examplePinyin!,/pián yi de duō/);
  assert.match(get('hsk5-2400').exampleZh!,/个人的看法/);
  assert.match(get('hsk5-2459').exampleZh!,/^哈哈/);
  assert.doesNotMatch(get('hsk5-2459').exampleZh!,/哈萨克/);
  assert.match(get('hsk5-2478').exampleZh!,/这条河流很长/);
  assert.match(get('hsk5-2497').exampleZh!,/自动化/);
  assert.match(get('hsk5-2496').meaningKo,/노를 젓다/);
  assert.doesNotMatch(get('hsk5-2496').meaningKo,/계획/);
  assert.equal(buildStudyQueue(words,{},500).words.length,500);
});

test('HSK 5 second 500 targets preserve official metadata while publishing reviewed usage', async () => {
  const words = getLevelVocabulary(5).filter(w => Number(w.id.slice(5)) > 2500 && Number(w.id.slice(5)) <= 3000);
  assert.equal(words.length,500);
  const reviewedIds = new Set(manifest.entries.map(e => e.id));
  assert.ok(words.every(w => reviewedIds.has(w.id) && w.meaningStatus === 'editorial' && w.exampleZh && w.examplePinyin && w.exampleKo));
  const get = (id: string) => words.find(w => w.id === id)!;
  assert.match(get('hsk5-2525').exampleZh!,/姓名及电话号码/);
  assert.doesNotMatch(get('hsk5-2525').exampleZh!,/阿尔及利亚/);
  assert.match(get('hsk5-2623').exampleZh!,/看起来很精神/);
  assert.match(get('hsk5-2623').examplePinyin!,/jīng shen$/);
  assert.match(get('hsk5-2853').exampleZh!,/其作者/);
  assert.match(get('hsk5-2822').examplePinyin!,/zhòng zhe/);
  assert.match(get('hsk5-2674').examplePinyin!,/jì láo/);
  assert.match(get('hsk5-2771').examplePinyin!,/le dāng shí/);
  assert.match(get('hsk5-2799').examplePinyin!,/jiē shi$/);
  assert.match(get('hsk5-2836').examplePinyin!,/wéi gù wèn/);
  const snapshot = (await import('../src/data/generated-hsk.json')).default;
  assert.equal(snapshot.words.find(w => w.id === 'hsk5-2668')!.partOfSpeechZh,'形');
  assert.equal(get('hsk5-2668').partOfSpeech,'명사(원문: 형용사)');
  assert.equal(manifest.entries.find(e => e.id === 'hsk5-2668')!.partOfSpeech,get('hsk5-2668').partOfSpeech);
  assert.equal(buildStudyQueue(words,{},500).words.length,500);
});

test('HSK adverb 大都 displays the reviewed pronunciation and preserves the official source', async () => {
  const snapshot = (await import('../src/data/generated-hsk.json')).default;
  const official = snapshot.words.find(word => word.id === 'hsk6-3847')!;
  const word = VOCABULARY.find(word => word.id === official.id)!;
  assert.equal(official.pinyin, 'dàdū');
  assert.equal(official.partOfSpeechZh, '副');
  assert.equal(word.pinyin, 'dàdōu');
  assert.match(word.wordSource!, /원문 병음 dàdū/u);
  assert.match(word.examplePinyin!, /dà dōu/u);
});
