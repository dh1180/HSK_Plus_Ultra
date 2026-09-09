# HSK data attribution

HSK Plus Ultra uses the official HSK 3.0 syllabus as its vocabulary reference.

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

Example sentences and Korean example translations are separately authored for this project and are not copied from a commercial dictionary.

The HSK source repository keeps sense markers such as `本1`. The sync script preserves the source form as `sourceWord` while removing a trailing numeric sense marker from the user-facing `word` field.
