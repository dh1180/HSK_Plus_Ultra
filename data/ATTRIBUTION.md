# HSK data attribution

HSK Plus Ultra's 5,400 headwords, pinyin, levels and POS have been compared directly against the official **HSK 考试大纲**, published 2025-11 and effective 2026-07, issued by 中外语言交流合作中心.

- Official PDF: https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf
- Vocabulary section: PDF pages 80–214 (printed pages 77–211).
- Pinned PDF SHA-256: `d8b6646599bc9a0c9616a4cb06d4b37461f8792f70a3171016d00fcd8eda09ad`.
- All 5,400 identities match by level, sense-marked source form and normalized pinyin; the existing app IDs are preserved. Official order differs for 1,942 IDs, so using official row numbers as replacement app IDs would corrupt progress connections.
- The official POS for HSK 5 白 is 副; the earlier transcription's 形、副 and the app's adjective meaning were corrected.
- Per-entry official ordinal and page references are in `generated-hsk.json`; `data/official-source-audit.json` records the comparison.

The earlier machine-readable transcription by `profesorm/hsk30` remains identified as the transcription source (CC BY 4.0, https://github.com/profesorm/hsk30). The official PDF is linked for reference and is not bundled or relicensed under that third party's license. A free public download is not treated as permission to redistribute textbook/test sentences commercially.

**This metadata verification does not make the app's Korean definitions or examples official.** The vocabulary table has no per-headword Korean translations or usage sentences. The grammar section lists grammar forms, rather than providing example coverage for all 5,400 words. Project-authored and openly licensed corpus examples remain explicitly labeled as such; an official source is used only where the actual passage and reuse terms can be established.

To reproduce the metadata comparison: `python3 -m pip install -r requirements-content.txt`, then `npm run sync:hsk`. Changed PDF content, duplicate/omitted rows or changed lexical identities cause an error before replacing the snapshot. The printed numbering is kept separately from the app ID.

## Korean meanings

HSK 2–6 Korean meanings are built from two sources:

- Korean headword mappings found through the National Institute of Korean Language Korean Basic Dictionary data mirrored by `spellcheck-ko/korean-dict-nikl`.
- Manually curated fallback meanings in `src/data/fallbacks/` for HSK words that do not receive a usable dictionary mapping.

The runtime file `src/data/korean-meanings.json` stores short Korean meaning labels for all 5,100 HSK 2–6 words. It does not ship the full Korean dictionary definition text used during matching. Words that have been manually reviewed in `src/data/vocabulary.ts` override the generated mapping when a more suitable HSK-learning meaning is available.

## Example sentences

The legacy HSK 2–6 candidate snapshot was assembled from open sentence corpora and project-authored fallback templates. It is now quarantined from the runtime; see the publication boundary below.

- Primary source: `no7z/hsk-sentences-audio`
  - HSK-graded Chinese sentences, sentence pinyin, and English translations.
  - Dataset license stated by that repository: CC BY-SA 4.0.
  - Repository: https://github.com/no7z/hsk-sentences-audio
- Secondary source: Tatoeba Mandarin exports
  - Mandarin sentences and direct Mandarin↔English / Mandarin↔Korean translation links are downloaded from the official Tatoeba exports.
  - Text export license: CC BY 2.0 FR unless an individual sentence carries another stated license.
  - Downloads: https://tatoeba.org/en/downloads
- When a source sentence has no direct Korean translation, the source English translation is converted to Korean with the public `samandar1105/translation-eng-kr` model. If a Tatoeba Mandarin sentence has no linked English or Korean translation, its Chinese text is translated directly to Korean with `shun89/opus-mt-zh-ko` (Apache-2.0).
- The legacy snapshot filled missing sentences with quoted-headword templates marked `hsk-plus-ultra-authored`. These are not usage examples and are no longer published or generated. New runs leave missing candidates empty.

Generated entries retain a `source` and `sourceId` so their origin can be audited.

The HSK source repository keeps sense markers such as `本1`. The sync script preserves the source form as `sourceWord` while removing a trailing numeric sense marker from the user-facing `word` field.

## Runtime publication boundary (2026-09-19)

`example-content.json` is an archived **unreviewed candidate dataset**, not runtime learning content. Serious machine translation and sense-matching errors were found. No source corpus or model name is a quality certification.

Runtime upper-level examples come only from `content-overrides.json`. HSK 2 retains the 200 project-authored examples, rechecked in this review. HSK 3 now contains all 500 individually edited entries: Chinese corpus sentences are retained where their sense and usage fit, Korean translations are rewritten, incorrect pinyin is corrected, and unsuitable sentences are replaced with project-authored examples. HSK 4 now includes an individually reviewed block of 500 entries (app IDs hsk4-1001 through hsk4-1500): 429 retain the no7z corpus Chinese sentence and 71 use project-authored sentences, including previously authored corrections. Compared with previously published/candidate content, 56 sentences were replaced and 80 pinyin fields were corrected (including pinyin for those replacement sentences). Other HSK 4–6 entries retain earlier targeted corrections. HSK 1 retains 300 project-authored examples, also rechecked here. None is claimed to be independently human-certified.

Retained no7z records preserve `source`, `sourceId`, `sourceUrl` and `license` in `content-overrides.json`; each card displays source ID and CC BY-SA 4.0. The retained Chinese sentences, adapted pinyin and Korean translations of those sentences are distributed under CC BY-SA 4.0. License: https://creativecommons.org/licenses/by-sa/4.0/ . The archive `example-content.json` retains the previous machine translations for comparison but is not imported as runtime learning content. The few HSK 3 Tatoeba candidates without full author attribution were replaced with project-authored examples rather than republished without that information.

`data/review/manifest.json` records the exact 1,501 entries examined (1,000 HSK 1–3, 500 HSK 4, and HSK 5 白) for definition, target sense/POS, Chinese usage, Korean translation and pinyin. It does not cover all HSK 4–6 entries. CC-CEDICT (MDBG, CC BY-SA 4.0, https://www.mdbg.net/chinese/dictionary?page=cc-cedict) was consulted for sense distinctions including 的话, 米, 角, 最好, 检票, 中学, 中学生, 员 and 子; no full dictionary is bundled.

The candidate generator retains translation method/model, original English when available, and the target word, pinyin and source form. It leaves missing candidates empty instead of writing quoted-headword templates. Generated workflows upload review artifacts and do not commit candidates to `main`.

Before publishing any external corpus candidate, verify its sense and pronunciation, translation, individual attribution, and applicable license, including source/translation authors and sentence links for Tatoeba. Legacy candidate records do not contain enough evidence to treat all Korean translations as directly human-authored.

## HSK 4 editorial review batch

`hsk4-corrections.tsv` and `hsk4-pinyin-corrections.json` are the reviewed definitions/translations and explicit sentence/pronunciation corrections. `hsk4-review.json` preserves the prior candidate text and resulting content hashes. `scripts/apply-editorial-review.py` imports already reviewed content; it does not perform semantic review or translate candidates automatically. It refuses quoted-word templates, missing target text, duplicate rows and unresolved corpus attribution. Re-running the same import preserves the original audit findings.

The official POS/sense distinction is checked against each word's linked HSK syllabus row. CC-CEDICT was also consulted for the readings and senses of 大夫 (doctor dài fu vs historical official dà fū), 教学 (nominal jiàoxué), 看 (caretaking kān), and 结 (bearing fruit jiē). The updated Korean meanings/translations are AI editorial work, not official HSK Korean translations. HSK 4–6 full linguistic review remains incomplete.
