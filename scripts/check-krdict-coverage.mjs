import { mkdir, readFile, writeFile } from 'node:fs/promises';

const HSK_PATH = new URL('../src/data/generated-hsk.json', import.meta.url);
const REPORT_PATH = new URL('../data/krdict-coverage.json', import.meta.url);
const MISSING_PATH = new URL('../data/krdict-missing.json', import.meta.url);
const KRDICT_BASE = 'https://raw.githubusercontent.com/spellcheck-ko/korean-dict-nikl/master/krdict';
const KRDICT_FILES = Array.from({ length: 11 }, (_, i) => `${String(i + 1).padStart(3, '0')}.xml`);

function decodeXml(value = '') {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function clean(value = '') {
  return decodeXml(value).replace(/\s+/gu, ' ').trim();
}

function normalizeChinese(value = '') {
  return clean(value)
    .replace(/[“”‘’"'·•]/gu, '')
    .replace(/[（）()\[\]【】]/gu, '')
    .replace(/\s+/gu, '')
    .replace(/[0-9]+$/u, '')
    .trim();
}

function splitChineseLemma(value = '') {
  const raw = clean(value);
  const candidates = new Set([normalizeChinese(raw)]);

  for (const part of raw.split(/[，,、；;\/|]/u)) {
    const normalized = normalizeChinese(part);
    if (normalized) candidates.add(normalized);
  }

  return [...candidates].filter(Boolean);
}

function getFeat(block, att) {
  const escaped = att.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<feat\\s+att="${escaped}"\\s+val="([^"]*)"\\s*\\/>`, 'u');
  return clean(block.match(pattern)?.[1] ?? '');
}

function hskPosGroup(raw = '') {
  if (raw.includes('名')) return 'noun';
  if (raw.includes('动')) return 'verb';
  if (raw.includes('形')) return 'adjective';
  if (raw.includes('副')) return 'adverb';
  if (raw.includes('代')) return 'pronoun';
  if (raw.includes('数')) return 'numeral';
  if (raw.includes('量')) return 'counter';
  if (raw.includes('介')) return 'preposition';
  if (raw.includes('连')) return 'conjunction';
  if (raw.includes('助')) return 'particle';
  if (raw.includes('叹')) return 'interjection';
  return 'other';
}

function koreanPosGroup(raw = '') {
  if (raw.includes('명사')) return 'noun';
  if (raw.includes('동사')) return 'verb';
  if (raw.includes('형용사')) return 'adjective';
  if (raw.includes('부사')) return 'adverb';
  if (raw.includes('대명사')) return 'pronoun';
  if (raw.includes('수사')) return 'numeral';
  if (raw.includes('조사')) return 'particle';
  if (raw.includes('감탄사')) return 'interjection';
  return 'other';
}

function scoreCandidate(candidate, hskWord) {
  let score = candidate.fullLemmaExact ? 12 : 8;
  const hskPos = hskPosGroup(hskWord.partOfSpeechZh);
  const koPos = koreanPosGroup(candidate.partOfSpeechKo);
  if (hskPos !== 'other' && hskPos === koPos) score += 4;
  if (candidate.vocabularyLevel === '초급') score += 2;
  else if (candidate.vocabularyLevel === '중급') score += 1;
  if (candidate.koDefinition) score += 1;
  if (candidate.zhDefinition) score += 1;
  if (candidate.koreanWord.length <= 8) score += 0.5;
  return score;
}

function addCandidate(index, key, candidate) {
  if (!key) return;
  const list = index.get(key) ?? [];
  list.push(candidate);
  index.set(key, list);
}

async function parseKrdictFile(fileName, index) {
  const url = `${KRDICT_BASE}/${fileName}`;
  console.log(`Fetching ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`KRDICT download failed: ${response.status} ${url}`);
  const xml = await response.text();

  const entryRegex = /<LexicalEntry\b[\s\S]*?<\/LexicalEntry>/gu;
  let entryMatch;
  let entryCount = 0;
  let equivalentCount = 0;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entry = entryMatch[0];
    const lemmaMatch = entry.match(/<Lemma>[\s\S]*?<feat\s+att="writtenForm"\s+val="([^"]*)"\s*\/>[\s\S]*?<\/Lemma>/u);
    const koreanWord = clean(lemmaMatch?.[1] ?? '');
    if (!koreanWord) continue;

    const senseStart = entry.indexOf('<Sense');
    const entryHead = senseStart >= 0 ? entry.slice(0, senseStart) : entry;
    const partOfSpeechKo = getFeat(entryHead, 'partOfSpeech');
    const vocabularyLevel = getFeat(entryHead, 'vocabularyLevel');

    const senseRegex = /<Sense\b[\s\S]*?<\/Sense>/gu;
    let senseMatch;
    while ((senseMatch = senseRegex.exec(entry)) !== null) {
      const sense = senseMatch[0];
      const equivalentStart = sense.indexOf('<Equivalent>');
      const senseHead = equivalentStart >= 0 ? sense.slice(0, equivalentStart) : sense;
      const koDefinition = getFeat(senseHead, 'definition');

      const equivalentRegex = /<Equivalent>[\s\S]*?<feat\s+att="language"\s+val="중국어"\s*\/>[\s\S]*?<feat\s+att="lemma"\s+val="([^"]*)"\s*\/>[\s\S]*?<feat\s+att="definition"\s+val="([^"]*)"\s*\/>[\s\S]*?<\/Equivalent>/gu;
      let equivalentMatch;
      while ((equivalentMatch = equivalentRegex.exec(sense)) !== null) {
        const zhLemma = clean(equivalentMatch[1]);
        const zhDefinition = clean(equivalentMatch[2]);
        const normalizedWhole = normalizeChinese(zhLemma);
        const split = splitChineseLemma(zhLemma);

        for (const key of split) {
          addCandidate(index, key, {
            koreanWord,
            partOfSpeechKo,
            vocabularyLevel,
            koDefinition,
            zhLemma,
            zhDefinition,
            fullLemmaExact: key === normalizedWhole,
          });
          equivalentCount += 1;
        }
      }
    }

    entryCount += 1;
  }

  console.log(`${fileName}: ${entryCount} entries, ${equivalentCount} Chinese equivalent keys`);
}

async function main() {
  const hsk = JSON.parse(await readFile(HSK_PATH, 'utf8'));
  const targetWords = hsk.words.filter((word) => word.level >= 2 && word.level <= 6);
  if (targetWords.length !== 5100) {
    throw new Error(`Expected 5100 HSK 2-6 words, got ${targetWords.length}`);
  }

  const index = new Map();
  for (const file of KRDICT_FILES) {
    await parseKrdictFile(file, index);
  }

  const matched = [];
  const missing = [];
  const countByLevel = {};

  for (const word of targetWords) {
    const key = normalizeChinese(word.word);
    const candidates = (index.get(key) ?? [])
      .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, word) }))
      .sort((a, b) => b.score - a.score || a.koreanWord.length - b.koreanWord.length);

    countByLevel[word.level] ??= { total: 0, matched: 0, missing: 0 };
    countByLevel[word.level].total += 1;

    if (!candidates.length) {
      missing.push({
        id: word.id,
        level: word.level,
        word: word.word,
        pinyin: word.pinyin,
        partOfSpeechZh: word.partOfSpeechZh,
      });
      countByLevel[word.level].missing += 1;
      continue;
    }

    countByLevel[word.level].matched += 1;
    matched.push({
      id: word.id,
      level: word.level,
      word: word.word,
      best: candidates[0],
      alternatives: candidates.slice(1, 4),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'National Institute of Korean Language Korean Basic Dictionary via spellcheck-ko/korean-dict-nikl',
    sourceRepository: 'https://github.com/spellcheck-ko/korean-dict-nikl',
    targetCount: targetWords.length,
    matchedCount: matched.length,
    missingCount: missing.length,
    coveragePercent: Number(((matched.length / targetWords.length) * 100).toFixed(2)),
    countByLevel,
    matched,
    missing,
  };

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  await writeFile(
    MISSING_PATH,
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        source: report.source,
        missingCount: missing.length,
        countByLevel,
        missing,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`KRDICT exact coverage: ${matched.length}/${targetWords.length} (${report.coveragePercent}%)`);
  console.log(`Missing: ${missing.length}`);
  console.log(`By level: ${JSON.stringify(countByLevel)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
