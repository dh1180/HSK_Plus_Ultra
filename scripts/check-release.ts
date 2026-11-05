import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { VOCABULARY } from '../src/data/vocabulary';
import manifest from '../data/review/manifest.json';
export function contentHash(word: { word: string; pinyin: string; meaningKo: string; exampleZh?: string; examplePinyin?: string; exampleKo?: string }) {
  const keys = ['exampleKo','examplePinyin','exampleZh','meaningKo','pinyin','word'] as const;
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(keys.map(key => [key,word[key]])))).digest('hex');
}
const reviewed = new Map(manifest.entries.map(x => [x.id,x]));
const stale = VOCABULARY.filter(w => {
  const evidence = reviewed.get(w.id);
  return evidence && (evidence.contentHash !== contentHash(w) ||
    (evidence.partOfSpeech !== undefined && evidence.partOfSpeech !== w.partOfSpeech));
}).map(w => w.id);
const unknown = manifest.entries.filter(e => !VOCABULARY.some(w => w.id === e.id)).map(e => e.id);
const duplicateCount = manifest.entries.length - reviewed.size;
const pending = VOCABULARY.filter(w => !reviewed.has(w.id)).map(w => w.id);
const report = { total: VOCABULARY.length, reviewed: reviewed.size, pending: pending.length, stale, unknown, duplicateCount, pendingByLevel: [1,2,3,4,5,6].map(level => ({ level, pending: pending.filter(id => id[3] === String(level)).length })), releaseReady: !pending.length && !stale.length && !unknown.length && !duplicateCount, note: 'This gate verifies editorial coverage and exact reviewed content, not independent linguistic certification, signing credentials or native device behavior.' };
console.log(JSON.stringify(report,null,2));
if (process.argv.includes('--write')) fs.writeFileSync('data/release-readiness.json',JSON.stringify(report,null,2)+'\n');
if (stale.length || unknown.length || duplicateCount || (!process.argv.includes('--report') && pending.length)) process.exitCode = 1;
