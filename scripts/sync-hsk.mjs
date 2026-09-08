import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'https://raw.githubusercontent.com/profesorm/hsk30/main/data/hsk_vocabulary.csv';
const OUTPUT = new URL('../src/data/generated-hsk.json', import.meta.url);

const LEVELS = new Map([
  ['一级', 1],
  ['二级', 2],
  ['三级', 3],
  ['四级', 4],
  ['五级', 5],
  ['六级', 6],
]);

const EXPECTED_COUNTS = new Map([
  [1, 300],
  [2, 200],
  [3, 500],
  [4, 1000],
  [5, 1600],
  [6, 1800],
]);

function parseLevel(levelName) {
  for (const [label, level] of LEVELS) {
    if (levelName.startsWith(label)) return level;
  }
  return null;
}

function cleanDisplayWord(sourceWord) {
  return sourceWord.replace(/[0-9]+$/u, '');
}

async function main() {
  console.log(`Fetching ${SOURCE}`);
  const response = await fetch(SOURCE);
  if (!response.ok) {
    throw new Error(`HSK source download failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const lines = text.replace(/^\uFEFF/u, '').trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== 'type,word,pinyin,cixing,sort,levelName') {
    throw new Error(`Unexpected CSV header: ${header}`);
  }

  const words = [];
  const countByLevel = Object.fromEntries([...EXPECTED_COUNTS.keys()].map((level) => [level, 0]));

  for (const line of lines) {
    const [type, sourceWord, pinyin, partOfSpeechZh, sortRaw, levelName] = line.split(',');
    if (!sourceWord || !pinyin || !sortRaw || !levelName) continue;

    const level = parseLevel(levelName);
    if (!level) continue;

    const sort = Number(sortRaw);
    countByLevel[level] += 1;
    words.push({
      id: `hsk${level}-${String(sort).padStart(4, '0')}`,
      level,
      sourceWord,
      word: cleanDisplayWord(sourceWord),
      pinyin,
      partOfSpeechZh: partOfSpeechZh || '',
      sort,
      levelName,
      sourceType: type,
    });
  }

  for (const [level, expected] of EXPECTED_COUNTS) {
    const actual = countByLevel[level];
    if (actual !== expected) {
      throw new Error(`HSK ${level} count mismatch: expected ${expected}, got ${actual}`);
    }
  }

  words.sort((a, b) => a.sort - b.sort);

  await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
  await writeFile(
    OUTPUT,
    JSON.stringify(
      {
        source: SOURCE,
        sourceProject: 'https://github.com/profesorm/hsk30',
        officialSource: 'https://www.chinesetest.cn/',
        scope: 'HSK 1-6',
        count: words.length,
        countByLevel,
        words,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`Wrote ${words.length} words to src/data/generated-hsk.json`);
  console.log(`Level counts: ${JSON.stringify(countByLevel)}`);
  console.log('Korean meanings/examples remain separately curated and are overlaid in vocabulary.ts.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
