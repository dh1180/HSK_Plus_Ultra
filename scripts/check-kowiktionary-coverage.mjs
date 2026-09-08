import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import readline from 'node:readline';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const MISSING_PATH = new URL('../data/krdict-missing.json', import.meta.url);
const REPORT_PATH = new URL('../data/kowiktionary-coverage.json', import.meta.url);
const REMAINING_PATH = new URL('../data/content-missing.json', import.meta.url);
const SOURCE = 'https://kaikki.org/kowiktionary/raw-wiktextract-data.jsonl.gz';

function normalizeChinese(value = '') {
  return value
    .normalize('NFKC')
    .replace(/[“”‘’"'·•（）()\[\]【】\s]/gu, '')
    .replace(/[0-9]+$/u, '')
    .trim();
}

function normalizeGloss(value = '') {
  return String(value).replace(/\s+/gu, ' ').trim();
}

function hskPosGroup(raw = '') {
  if (raw.includes('名')) return 'noun';
  if (raw.includes('动')) return 'verb';
  if (raw.includes('形')) return 'adj';
  if (raw.includes('副')) return 'adv';
  if (raw.includes('代')) return 'pron';
  if (raw.includes('数')) return 'num';
  if (raw.includes('量')) return 'classifier';
  if (raw.includes('介')) return 'prep';
  if (raw.includes('连')) return 'conj';
  if (raw.includes('助')) return 'particle';
  if (raw.includes('叹')) return 'intj';
  return 'other';
}

function wiktionaryPosGroup(raw = '') {
  const value = raw.toLowerCase();
  if (value === 'noun') return 'noun';
  if (value === 'verb') return 'verb';
  if (value === 'adj' || value === 'adjective') return 'adj';
  if (value === 'adv' || value === 'adverb') return 'adv';
  if (value === 'pron' || value === 'pronoun') return 'pron';
  if (value === 'num' || value === 'number') return 'num';
  if (value === 'classifier') return 'classifier';
  if (value === 'prep' || value === 'preposition') return 'prep';
  if (value === 'conj' || value === 'conjunction') return 'conj';
  if (value === 'particle') return 'particle';
  if (value === 'intj' || value === 'interjection') return 'intj';
  return 'other';
}

function extractGlosses(entry) {
  const result = [];
  for (const sense of entry.senses ?? []) {
    for (const gloss of sense.glosses ?? []) {
      const text = normalizeGloss(gloss);
      if (text && !result.includes(text)) result.push(text);
    }
  }
  return result;
}

function scoreCandidate(candidate, target) {
  let score = candidate.directChineseEntry ? 20 : 12;
  const targetPos = hskPosGroup(target.partOfSpeechZh);
  const candidatePos = wiktionaryPosGroup(candidate.pos);
  if (targetPos !== 'other' && targetPos === candidatePos) score += 5;
  if (candidate.glosses.length) score += 2;
  if (candidate.koreanWord) score += 1;
  return score;
}

async function main() {
  const missingReport = JSON.parse(await readFile(MISSING_PATH, 'utf8'));
  const targets = missingReport.missing;
  const targetByKey = new Map(targets.map((item) => [normalizeChinese(item.word), item]));
  const candidatesByKey = new Map();

  console.log(`Fetching ${SOURCE}`);
  const response = await fetch(SOURCE);
  if (!response.ok || !response.body) {
    throw new Error(`Korean Wiktionary download failed: ${response.status} ${response.statusText}`);
  }

  const nodeStream = Readable.fromWeb(response.body).pipe(createGunzip());
  const rl = readline.createInterface({ input: nodeStream, crlfDelay: Infinity });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount += 1;
    if (!line.trim()) continue;

    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Korean Wiktionary's Chinese entries have Korean glosses directly.
    if (entry.lang_code === 'zh') {
      const key = normalizeChinese(entry.word ?? '');
      if (targetByKey.has(key)) {
        const glosses = extractGlosses(entry);
        if (glosses.length) {
          const list = candidatesByKey.get(key) ?? [];
          list.push({
            koreanWord: '',
            glosses,
            pos: entry.pos ?? '',
            directChineseEntry: true,
            sourceWord: entry.word,
          });
          candidatesByKey.set(key, list);
        }
      }
    }

    // Korean entries can also point to a Chinese translation; use the Korean lemma as a concise meaning.
    if (entry.lang_code === 'ko') {
      const koreanWord = normalizeGloss(entry.word ?? '');
      if (!koreanWord) continue;
      const entryGlosses = extractGlosses(entry);

      const translationGroups = [entry.translations ?? []];
      for (const sense of entry.senses ?? []) {
        translationGroups.push(sense.translations ?? []);
      }

      for (const translations of translationGroups) {
        for (const translation of translations) {
          if (translation.lang_code !== 'zh') continue;
          const key = normalizeChinese(translation.word ?? '');
          if (!targetByKey.has(key)) continue;

          const list = candidatesByKey.get(key) ?? [];
          list.push({
            koreanWord,
            glosses: entryGlosses,
            pos: entry.pos ?? '',
            directChineseEntry: false,
            sourceWord: translation.word,
          });
          candidatesByKey.set(key, list);
        }
      }
    }
  }

  const matched = [];
  const remaining = [];
  const countByLevel = {};

  for (const target of targets) {
    countByLevel[target.level] ??= { total: 0, matched: 0, missing: 0 };
    countByLevel[target.level].total += 1;

    const key = normalizeChinese(target.word);
    const candidates = (candidatesByKey.get(key) ?? [])
      .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, target) }))
      .sort((a, b) => b.score - a.score || a.glosses[0]?.length - b.glosses[0]?.length);

    if (!candidates.length) {
      remaining.push(target);
      countByLevel[target.level].missing += 1;
      continue;
    }

    matched.push({ ...target, best: candidates[0], alternatives: candidates.slice(1, 3) });
    countByLevel[target.level].matched += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'Korean Wiktionary via Kaikki.org wiktextract',
    sourceUrl: SOURCE,
    inputMissingCount: targets.length,
    matchedCount: matched.length,
    remainingCount: remaining.length,
    coveragePercent: Number(((matched.length / targets.length) * 100).toFixed(2)),
    scannedLines: lineCount,
    countByLevel,
    matched,
    remaining,
  };

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  await writeFile(
    REMAINING_PATH,
    JSON.stringify({
      generatedAt: report.generatedAt,
      source: report.source,
      remainingCount: remaining.length,
      countByLevel,
      remaining,
    }, null, 2),
    'utf8',
  );

  console.log(`Korean Wiktionary coverage of KRDICT misses: ${matched.length}/${targets.length} (${report.coveragePercent}%)`);
  console.log(`Still missing: ${remaining.length}`);
  console.log(`By level: ${JSON.stringify(countByLevel)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
