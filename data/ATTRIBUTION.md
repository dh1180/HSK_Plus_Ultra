# HSK data attribution

HSK Plus Ultra uses the official HSK 3.0 syllabus as its vocabulary reference.

Machine-readable vocabulary metadata can be synchronized from:

- `profesorm/hsk30` — HSK 3.0 2026 Syllabus Dataset
- Repository: https://github.com/profesorm/hsk30
- License stated by that repository: CC BY 4.0
- Upstream official source identified by the dataset: https://www.chinesetest.cn/

The app does **not** copy Korean dictionary definitions or example sentences from a commercial dictionary. Korean meanings and examples shipped in `src/data/vocabulary.ts` are separately curated for this project.

The source repository keeps sense markers such as `本1`. The sync script preserves the source form as `sourceWord` while removing a trailing numeric sense marker from the user-facing `word` field.
