import fs from 'node:fs';
import assert from 'node:assert/strict';
import { VOCABULARY } from '../src/data/vocabulary';
import generated from '../src/data/generated-hsk.json';
import candidates from '../src/data/example-content.json';
import overrides from '../src/data/content-overrides.json';

const counts = [300, 200, 500, 1000, 1600, 1800];
const ids = new Set<string>();
const metadata = new Map(generated.words.map(word => [word.id, word]));
const errors: string[] = [];
const examplesById = candidates.examples as Record<string, { exampleZh: string; examplePinyin: string; exampleKo: string; source: string }>;
for (const word of VOCABULARY) {
  const check = (valid: unknown, reason: string) => { if (!valid) errors.push(`${word.id}: ${reason}`); };
  check(!ids.has(word.id), 'duplicate ID'); ids.add(word.id);
  check(metadata.get(word.id)?.word === word.word, 'metadata word mismatch');
  check(word.meaningKo.trim() && /[가-힣]/u.test(word.meaningKo), 'missing Korean meaning');
  check(word.pinyin.trim(), 'missing pinyin');
  if (word.exampleZh) {
    check(word.exampleZh.includes(word.word), 'example does not contain target');
    check(word.examplePinyin?.trim() && word.exampleKo?.trim(), 'incomplete visible example');
    check(!word.exampleZh.includes('我今天学会了') && !word.exampleZh.includes('这个字在这里读作'), 'template is not a usage example');
    check(word.exampleSource, 'visible example lacks attribution');
  }
  if (word.level > 1) check(Boolean(word.exampleZh) === (word.id in overrides), 'unapproved candidate published');
}
for (const [id, item] of Object.entries(overrides)) {
  const word = metadata.get(id);
  if (!word || word.word !== item.word || word.pinyin !== item.pinyin) errors.push(`${id}: stale correction identity`);
}
for (let level = 1; level <= 6; level++) {
  if (VOCABULARY.filter(word => word.level === level).length !== counts[level - 1]) errors.push(`HSK ${level}: count mismatch`);
}
const homographs = new Map<string, string[]>();
for (const word of generated.words) homographs.set(word.word, [...(homographs.get(word.word) ?? []), word.id]);
const translationGroups = new Map<string, Set<string>>();
for (const item of Object.values(examplesById)) {
  const group = translationGroups.get(item.exampleKo) ?? new Set<string>();
  group.add(item.exampleZh); translationGroups.set(item.exampleKo, group);
}
const report = {
  schemaVersion: 1,
  scope: 'All 5400 runtime entries; structural checks plus targeted AI-assisted editorial corrections. Not a linguistic certification.',
  totalWords: VOCABULARY.length,
  editorialCorrections: Object.keys(overrides).length,
  visibleExamples: VOCABULARY.filter(word => word.exampleZh).length,
  withheldExamples: VOCABULARY.filter(word => !word.exampleZh).length,
  draftMeanings: VOCABULARY.filter(word => word.meaningStatus === 'dictionary-draft').length,
  levels: counts.map((total, index) => ({ level: index + 1, total, examples: VOCABULARY.filter(word => word.level === index + 1 && word.exampleZh).length, draftMeanings: VOCABULARY.filter(word => word.level === index + 1 && word.meaningStatus === 'dictionary-draft').length })),
  candidateSnapshot: {
    total: Object.keys(examplesById).length,
    quotedWordTemplates: Object.values(examplesById).filter(item => item.source === 'hsk-plus-ultra-authored').length,
    missingTarget: generated.words.filter(word => examplesById[word.id] && !examplesById[word.id]!.exampleZh.includes(word.word)).map(word => word.id),
    homographs: [...homographs].filter(([, group]) => group.length > 1).map(([word, group]) => ({ word, ids: group })),
    suspiciousRepeatedTranslations: [...translationGroups].filter(([, group]) => group.size >= 5).map(([translation, group]) => ({ translation, distinctChineseSentences: group.size })).sort((a,b) => b.distinctChineseSentences - a.distinctChineseSentences),
  },
  structuralErrors: errors,
};
if (process.argv.includes('--write')) fs.writeFileSync('data/content-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, candidateSnapshot: { total: report.candidateSnapshot.total, quotedWordTemplates: report.candidateSnapshot.quotedWordTemplates, homographGroups: report.candidateSnapshot.homographs.length, suspiciousTranslationGroups: report.candidateSnapshot.suspiciousRepeatedTranslations.length } }, null, 2));
assert.equal(errors.length, 0, errors.join('\n'));
