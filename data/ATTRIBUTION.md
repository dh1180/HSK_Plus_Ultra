# HSK data attribution

HSK Plus Ultra uses a third-party machine-readable transcription of the HSK 3.0 syllabus as its vocabulary reference. This does not make this application or its Korean content officially certified.

Machine-readable vocabulary metadata can be synchronized from:

- `profesorm/hsk30` — HSK 3.0 2026 Syllabus Dataset
- Repository: https://github.com/profesorm/hsk30
- License stated by that repository: CC BY 4.0
- Upstream official source identified by the dataset: https://www.chinesetest.cn/

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

Runtime upper-level examples come only from `content-overrides.json`: 200 HSK 2 entries and 105 sense-specific HSK 3–6 entries newly authored with AI-assisted editorial correction. These are original short examples, not corrected translations of the external corpus sentences, and are not independently teacher-reviewed. HSK 1 retains the project's 300 authored examples. Origin/status is displayed on each card.

The candidate generator retains translation method/model, original English when available, and the target word, pinyin and source form. It leaves missing candidates empty instead of writing quoted-headword templates. Generated workflows upload review artifacts and do not commit candidates to `main`.

Before publishing any external corpus candidate, verify its sense and pronunciation, translation, individual attribution, and applicable license, including source/translation authors and sentence links for Tatoeba. Legacy candidate records do not contain enough evidence to treat all Korean translations as directly human-authored.
