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

Runtime upper-level examples come only from `content-overrides.json`. HSK 2 retains the 200 project-authored examples, rechecked in this review. HSK 3 now contains all 500 individually edited entries: Chinese corpus sentences are retained where their sense and usage fit, Korean translations are rewritten, incorrect pinyin is corrected, and unsuitable sentences are replaced with project-authored examples. HSK 4 now includes an individually reviewed block of 500 entries (app IDs hsk4-1001 through hsk4-1500): 429 retain the no7z corpus Chinese sentence and 71 use project-authored sentences, including previously authored corrections. Compared with previously published/candidate content, 56 sentences were replaced and 80 pinyin fields were corrected (including pinyin for those replacement sentences). The second half (hsk4-1501 through hsk4-2000) is now individually reviewed as well: 427 retain no7z Chinese sentences and 73 use project-authored sentences (including earlier corrections). In this second batch, 63 Chinese sentences were replaced and 92 pinyin fields were changed, including the replacement sentence pinyin. All 1,000 HSK 4 entries are now in the review ledger. The first HSK 5 batch covers 500 entries (hsk5-2001 through hsk5-2500), including the earlier 白 correction. In this batch, 403 retain no7z Chinese sentences and 97 use new or earlier project-authored sentences. 83 sentences were replaced and 95 pinyin fields were changed (including replacement sentence pinyin). The next 500 HSK 5 entries are covered in the second batch below; other HSK 5–6 entries retain earlier targeted corrections. HSK 1 retains 300 project-authored examples, also rechecked here. None is claimed to be independently human-certified.

Retained no7z records preserve `source`, `sourceId`, `sourceUrl` and `license` in `content-overrides.json`; each card displays source ID and CC BY-SA 4.0. The retained Chinese sentences, adapted pinyin and Korean translations of those sentences are distributed under CC BY-SA 4.0. License: https://creativecommons.org/licenses/by-sa/4.0/ . The archive `example-content.json` retains the previous machine translations for comparison but is not imported as runtime learning content. The few HSK 3 Tatoeba candidates without full author attribution were replaced with project-authored examples rather than republished without that information.

`data/review/manifest.json` records the exact 5,400 entries examined across HSK 1–6 for definition, target sense/POS, Chinese usage, Korean translation and pinyin. CC-CEDICT (MDBG, CC BY-SA 4.0, https://www.mdbg.net/chinese/dictionary?page=cc-cedict) was consulted for sense distinctions including 的话, 米, 角, 最好, 检票, 中学, 中学生, 员 and 子; no full dictionary is bundled.

The candidate generator retains translation method/model, original English when available, and the target word, pinyin and source form. It leaves missing candidates empty instead of writing quoted-headword templates. Generated workflows upload review artifacts and do not commit candidates to `main`.

Before publishing any external corpus candidate, verify its sense and pronunciation, translation, individual attribution, and applicable license, including source/translation authors and sentence links for Tatoeba. Legacy candidate records do not contain enough evidence to treat all Korean translations as directly human-authored.

## HSK 4 editorial review batch

`hsk4-corrections.tsv` and `hsk4-pinyin-corrections.json` are the reviewed definitions/translations and explicit sentence/pronunciation corrections. `hsk4-review.json` preserves the prior candidate text and resulting content hashes. `scripts/apply-editorial-review.py` imports already reviewed content; it does not perform semantic review or translate candidates automatically. It refuses quoted-word templates, missing target text, duplicate rows and unresolved corpus attribution. Re-running the same import preserves the original audit findings.

The official POS/sense distinction is checked against each word's linked HSK syllabus row. CC-CEDICT was also consulted for the readings and senses of 大夫 (doctor dài fu vs historical official dà fū), 教学 (nominal jiàoxué), 看 (caretaking kān), and 结 (bearing fruit jiē). The updated Korean meanings/translations are AI editorial work, not official HSK Korean translations. HSK 5–6 full linguistic review remains incomplete.

## HSK 4 second-half review batch

`hsk4-second-half-corrections.tsv`, `hsk4-second-half-pinyin-corrections.json`, and `hsk4-second-half-review.json` preserve this separate 500-entry batch without replacing the first-half audit. Import with `--audit data/review/hsk4-second-half-review.json`. This import does not conduct a semantic review.

Target usage corrections include 千万 (adverb, not the number ten million), 十分 (very, not ten points), 随着 (preposition, not the verb 跟随), 自 (from/since, not 自在), and 线上/线下 (online/offline, not a substring of 地平线). Quoted-word placeholders for 扫码, 售票员, 转发 and 自习 are replaced with actual usage. Incorrect noun classifiers (一副眼镜) and readings (量体温 liáng, 孙子 grandson sūn zi, 下载 xià zài, 长 length cháng, 参加 cān jiā) are corrected. CC-CEDICT was consulted directly for those sense/readings and neutral-tone distinctions including 生意 (business) and 值得. Definitions and translations remain AI editorial work, not official Korean translations or independently certified content.

## HSK 5 first 500 editorial review

`hsk5-first-500-corrections.tsv`, `hsk5-first-500-pinyin-corrections.json`, and `hsk5-first-500-review.json` contain the reviewed Korean definitions/translations, sentence and pinyin corrections, archived candidates and resulting hashes. Import with `--audit data/review/hsk5-first-500-review.json`; the importer does not review meaning automatically. Earlier batch audit files are preserved. 白 was already in the ledger, so this 500-entry batch adds 499 unique reviewed entries.

False sentence matches corrected include 存在 (existence, not 存 + 在 for storage at a place), 个人 (individual, not 个 + 人 in 两个人), 河流 (river, not 河 + 流经), 哈 (interjection/laughter, not the start of 哈萨克), and 超 (verb, not the adjective 超级). The two 处 readings have separate chǔ/chù usage; 化 now demonstrates a suffix in 自动化. Quoted-word templates for 乘务员, 充值, 点赞, 电商, 丰富多彩 and 各行各业 have actual usage sentences. CC-CEDICT was consulted for 系 jì (fasten), 处 chǔ/chù, the two 称 chēng senses, 充值/充电, 划 huá versus huà, and 胡同. The official word table remains the source for headword POS/pinyin and page references. Korean definitions/translations and authored examples are AI editorial work, not official HSK material or independent human certification. That batch left 2,900 HSK 5–6 entries unreviewed.

## HSK 5 second 500 editorial review

`hsk5-second-500-corrections.tsv`, `hsk5-second-500-pinyin-corrections.json`, `hsk5-second-500-pos-corrections.json` and `hsk5-second-500-review.json` cover hsk5-2501 through hsk5-3000. The first 1,000 HSK 5 entries are now in the ledger. In this second batch, 399 Chinese corpus sentences are retained and 101 are new or earlier project-authored sentences. 89 sentences were replaced and 114 pinyin fields changed, including replacement sentence pinyin. All retained corpus source IDs and CC BY-SA 4.0 information remain attached.`n`hsk5-next-50-corrections.tsv` and `hsk5-next-50-review.json` cover hsk5-3001 through hsk5-3050 with 50 project-authored sentences.

`hsk5-3051-3100-corrections.tsv` and `hsk5-3051-3100-review.json` cover hsk5-3051 through hsk5-3100 with 50 project-authored sentences.

`hsk5-remaining-corrections.tsv` and its review record cover hsk5-3101 through hsk5-3600. `hsk6-corrections.tsv` and its review record cover hsk6-3601 through hsk6-5400. The HSK snapshot lists 大都 as dàdū with adverb POS. The Taiwan Ministry of Education revised dictionary lists dà dōu for the adverb sense and dà dū for historical place-name senses (https://dict.revised.moe.edu.tw/dictView.jsp?ID=40749&la=0&powerMode=0). The app shows dàdōu for this adverb and keeps dàdū in the official source label. Retained no7z examples keep their corpus IDs and CC BY-SA 4.0 license. Replacement sentences are project-authored.

Sense corrections include 及 as a conjunction rather than part of 阿尔及利亚, 其 as a pronoun rather than 其实, and 精神 jīngshen for vitality/vigorous rather than abstract jīngshén. CC-CEDICT was consulted for those readings and senses, 结实 (sturdy jiē shi vs bearing fruit jiē shí), 扎 (tie zā), and 系 (fasten jì). Quoted-headword templates are replaced with actual usage. These are AI editorial judgments, not official example sentences.

The pinned official PDF row 2668 (PDF page 146 / printed page 143) labels 客服 as 形. That original field is retained verbatim. Based on customer service/personnel noun usage, the display adds an explicit editorial POS exception, marked 名词 in Korean with the original adjective classification shown. This is not a publisher-issued erratum. The exception is word/pinyin/source-POS-bound and cannot be silently attached to another word. Its reviewed display value is checked by the release gate in addition to the six-field content hash. References: CC-CEDICT (https://www.mdbg.net/chinese/dictionary?page=cc-cedict) and LEO’s 客户服务 entry showing noun usage and 客服 abbreviation (https://dict.leo.org/pages/addinfo/addInfo.php?aiid=JcwgYw31g1K&lang=ch&lp=chde). No dictionary passages are bundled. Re-import with `--pos data/review/hsk5-second-500-pos-corrections.json --audit data/review/hsk5-second-500-review.json`.
