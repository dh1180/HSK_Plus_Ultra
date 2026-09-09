import { readFile, writeFile } from 'node:fs/promises';

const HSK_PATH = new URL('../src/data/generated-hsk.json', import.meta.url);
const KRDICT_PATH = new URL('../data/krdict-coverage.json', import.meta.url);
const OUTPUT_PATH = new URL('../src/data/korean-meanings.json', import.meta.url);

const FALLBACK_PATHS = [2, 3, 4, 5, 6].map(
  (level) => new URL(`../src/data/fallbacks/hsk${level}.json`, import.meta.url),
);

function cleanMeaning(value = '') {
  return String(value)
    .replace(/\s+/gu, ' ')
    .replace(/^[,;·\s]+|[,;·\s]+$/gu, '')
    .trim();
}

async function main() {
  const hsk = JSON.parse(await readFile(HSK_PATH, 'utf8'));
  const krdict = JSON.parse(await readFile(KRDICT_PATH, 'utf8'));

  const targetWords = hsk.words.filter((word) => word.level >= 2 && word.level <= 6);
  if (targetWords.length !== 5100) {
    throw new Error(`Expected 5100 HSK 2-6 words, got ${targetWords.length}`);
  }

  const fallbackById = new Map();
  for (const path of FALLBACK_PATHS) {
    const fallback = JSON.parse(await readFile(path, 'utf8'));
    for (const [id, item] of Object.entries(fallback)) {
      const meaning = cleanMeaning(item?.meaningKo);
      if (!meaning) throw new Error(`Empty fallback Korean meaning: ${id}`);
      fallbackById.set(id, meaning);
    }
  }

  const krdictById = new Map();
  for (const item of krdict.matched ?? []) {
    const candidates = [item.best, ...(item.alternatives ?? [])]
      .map((candidate) => cleanMeaning(candidate?.koreanWord))
      .filter(Boolean);

    const unique = [...new Set(candidates)];
    if (unique.length) krdictById.set(item.id, unique[0]);
  }

  const meanings = {};
  const sourceById = {};
  const countByLevel = {};
  const missing = [];

  for (const word of targetWords) {
    const fallback = fallbackById.get(word.id);
    const krdictMeaning = krdictById.get(word.id);
    const meaning = fallback || krdictMeaning;

    countByLevel[word.level] ??= { total: 0, filled: 0, fallback: 0, krdict: 0 };
    countByLevel[word.level].total += 1;

    if (!meaning) {
      missing.push({ id: word.id, level: word.level, word: word.word, pinyin: word.pinyin });
      continue;
    }

    meanings[word.id] = meaning;
    sourceById[word.id] = fallback ? 'curated-fallback' : 'krdict-map';
    countByLevel[word.level].filled += 1;
    countByLevel[word.level][fallback ? 'fallback' : 'krdict'] += 1;
  }

  if (missing.length) {
    throw new Error(`Korean meaning coverage incomplete: ${missing.length} missing\n${JSON.stringify(missing.slice(0, 30), null, 2)}`);
  }

  const filledCount = Object.keys(meanings).length;
  if (filledCount !== 5100) {
    throw new Error(`Expected 5100 Korean meanings, got ${filledCount}`);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    targetCount: targetWords.length,
    filledCount,
    missingCount: 0,
    countByLevel,
    sources: {
      krdict: 'National Institute of Korean Language Korean Basic Dictionary mapping',
      fallback: 'HSK Plus Ultra manually curated fallback meanings',
    },
    meanings,
    sourceById,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(`Korean meanings: ${filledCount}/${targetWords.length}`);
  console.log(`By level: ${JSON.stringify(countByLevel)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
