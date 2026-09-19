import bz2
import io
import json
import os
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HSK_PATH = ROOT / 'src' / 'data' / 'generated-hsk.json'
MEANING_PATH = ROOT / 'src' / 'data' / 'korean-meanings.json'
OUTPUT_PATH = ROOT / 'src' / 'data' / 'example-content.json'
REPORT_PATH = ROOT / 'data' / 'example-content-report.json'

NO7Z_SENTENCE_URL = 'https://raw.githubusercontent.com/no7z/hsk-sentences-audio/main/dist/sentences.json'
TATOEBA_BASE = 'https://downloads.tatoeba.org/exports/per_language'
TATOEBA_URLS = {
    'cmn_sentences': f'{TATOEBA_BASE}/cmn/cmn_sentences.tsv.bz2',
    'cmn_eng_links': f'{TATOEBA_BASE}/cmn/cmn-eng_links.tsv.bz2',
    'eng_sentences': f'{TATOEBA_BASE}/eng/eng_sentences.tsv.bz2',
    'cmn_kor_links': f'{TATOEBA_BASE}/cmn/cmn-kor_links.tsv.bz2',
    'kor_sentences': f'{TATOEBA_BASE}/kor/kor_sentences.tsv.bz2',
}

TRANSLATION_MODEL = os.environ.get('HSK_KO_TRANSLATION_MODEL', 'samandar1105/translation-eng-kr')
ZH_KO_MODEL = os.environ.get('HSK_ZH_KO_TRANSLATION_MODEL', 'shun89/opus-mt-zh-ko')


def download_bytes(url: str) -> bytes:
    print(f'Downloading {url}')
    with urllib.request.urlopen(url, timeout=180) as response:
        return response.read()


def download_json(url: str):
    return json.loads(download_bytes(url).decode('utf-8'))


def clean_sentence(value: str) -> str:
    return re.sub(r'\s+', ' ', (value or '')).strip()


def is_reasonable_chinese_sentence(text: str) -> bool:
    text = clean_sentence(text)
    if not (3 <= len(text) <= 48):
        return False
    if 'http://' in text or 'https://' in text or '@' in text:
        return False
    chinese_chars = sum('\u4e00' <= ch <= '\u9fff' for ch in text)
    return chinese_chars >= max(2, len(text) // 4)


def sentence_pinyin(chinese: str) -> str:
    from pypinyin import Style, lazy_pinyin
    return ' '.join(lazy_pinyin(chinese, style=Style.TONE, neutral_tone_with_five=False))


def select_no7z_examples(sentences, target_words):
    exact = defaultdict(list)
    substring = defaultdict(list)

    for sentence in sentences:
        chinese = clean_sentence(sentence.get('chinese', ''))
        pinyin = clean_sentence(sentence.get('pinyin', ''))
        en = clean_sentence((sentence.get('translation') or {}).get('en', ''))
        if not chinese or not pinyin or not en or not is_reasonable_chinese_sentence(chinese):
            continue

        item = {
            'chinese': chinese,
            'pinyin': pinyin,
            'en': en,
            'hskLevel': int(sentence.get('hsk_level') or 99),
            'sentenceId': sentence.get('id'),
        }

        seen = set()
        for token in sentence.get('tokens') or []:
            word = clean_sentence(token.get('word', ''))
            if not word or word in seen:
                continue
            seen.add(word)
            if word in target_words:
                exact[word].append(item)

    missing = target_words.difference(exact.keys())
    by_first = defaultdict(list)
    for word in missing:
        if len(word) >= 2:
            by_first[word[0]].append(word)

    if by_first:
        for sentence in sentences:
            chinese = clean_sentence(sentence.get('chinese', ''))
            pinyin = clean_sentence(sentence.get('pinyin', ''))
            en = clean_sentence((sentence.get('translation') or {}).get('en', ''))
            if not chinese or not pinyin or not en or not is_reasonable_chinese_sentence(chinese):
                continue
            item = {
                'chinese': chinese,
                'pinyin': pinyin,
                'en': en,
                'hskLevel': int(sentence.get('hsk_level') or 99),
                'sentenceId': sentence.get('id'),
            }
            for first in set(chinese).intersection(by_first.keys()):
                for word in by_first[first]:
                    if word in chinese:
                        substring[word].append(item)

    for source in (exact, substring):
        for word, candidates in source.items():
            candidates.sort(key=lambda item: (len(item['chinese']), item['hskLevel'], item['sentenceId'] or ''))

    return exact, substring


def parse_tsv_bz2(url: str):
    raw = bz2.decompress(download_bytes(url)).decode('utf-8', errors='replace')
    for line in io.StringIO(raw):
        line = line.rstrip('\n')
        if line:
            yield line.split('\t')


def load_links(url: str):
    result = defaultdict(list)
    for parts in parse_tsv_bz2(url):
        if len(parts) < 2:
            continue
        try:
            left = int(parts[0])
            right = int(parts[1])
        except ValueError:
            continue
        result[left].append(right)
    return result


def load_sentence_subset(url: str, wanted_ids):
    wanted = set(wanted_ids)
    result = {}
    if not wanted:
        return result
    for parts in parse_tsv_bz2(url):
        if len(parts) < 3:
            continue
        try:
            sentence_id = int(parts[0])
        except ValueError:
            continue
        if sentence_id in wanted:
            result[sentence_id] = clean_sentence(parts[2])
    return result


def find_tatoeba_examples(words):
    words = set(words)
    if not words:
        return {}

    import jieba
    for word in words:
        jieba.add_word(word, freq=2_000_000)

    eng_links = load_links(TATOEBA_URLS['cmn_eng_links'])
    kor_links = load_links(TATOEBA_URLS['cmn_kor_links'])
    by_first = defaultdict(list)
    for word in words:
        by_first[word[0]].append(word)

    candidates = defaultdict(list)
    cmn_text_by_id = {}

    for parts in parse_tsv_bz2(TATOEBA_URLS['cmn_sentences']):
        if len(parts) < 3:
            continue
        try:
            sentence_id = int(parts[0])
        except ValueError:
            continue
        chinese = clean_sentence(parts[2])
        if not is_reasonable_chinese_sentence(chinese):
            continue

        possible = set()
        for first in set(chinese).intersection(by_first.keys()):
            for word in by_first[first]:
                if word in chinese:
                    possible.add(word)
        if not possible:
            continue

        segmented = set(jieba.lcut(chinese, HMM=False))
        for word in possible:
            # Multi-character HSK words are safe to match by literal containment.
            # Single-character entries require an actual segmentation boundary.
            if len(word) == 1 and word not in segmented:
                continue
            candidates[word].append({
                'cmnId': sentence_id,
                'chinese': chinese,
                'hasKo': sentence_id in kor_links,
                'hasEn': sentence_id in eng_links,
            })
            cmn_text_by_id[sentence_id] = chinese

    chosen = {}
    for word, items in candidates.items():
        items.sort(key=lambda item: (
            0 if item['hasKo'] else 1,
            abs(len(item['chinese']) - 12),
            len(item['chinese']),
            item['cmnId'],
        ))
        chosen[word] = items[0]

    needed_eng_ids = set()
    needed_kor_ids = set()
    for item in chosen.values():
        cmn_id = item['cmnId']
        if item['hasKo']:
            needed_kor_ids.update(kor_links[cmn_id])
        elif item['hasEn']:
            needed_eng_ids.update(eng_links[cmn_id])

    kor_text = load_sentence_subset(TATOEBA_URLS['kor_sentences'], needed_kor_ids)
    eng_text = load_sentence_subset(TATOEBA_URLS['eng_sentences'], needed_eng_ids)

    result = {}
    for word, item in chosen.items():
        cmn_id = item['cmnId']
        ko_candidates = [kor_text.get(i, '') for i in kor_links.get(cmn_id, [])]
        ko_candidates = [x for x in ko_candidates if x]
        en_candidates = [eng_text.get(i, '') for i in eng_links.get(cmn_id, [])]
        en_candidates = [x for x in en_candidates if x]

        example_ko = min(ko_candidates, key=len) if ko_candidates else ''
        example_en = min(en_candidates, key=len) if en_candidates else ''
        result[word] = {
            'exampleZh': item['chinese'],
            'examplePinyin': sentence_pinyin(item['chinese']),
            'exampleKo': example_ko,
            'exampleEn': example_en,
            'source': 'tatoeba-linked' if (example_ko or example_en) else 'tatoeba-unlinked',
            'sourceId': str(cmn_id),
        }

    return result


def translate_english(texts):
    if not texts:
        return {}

    print(f'Loading translation model: {TRANSLATION_MODEL}')
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    import torch

    tokenizer = AutoTokenizer.from_pretrained(TRANSLATION_MODEL)
    model = AutoModelForSeq2SeqLM.from_pretrained(TRANSLATION_MODEL)
    model.eval()

    unique = list(dict.fromkeys(texts))
    result = {}
    batch_size = 24

    with torch.inference_mode():
        for start in range(0, len(unique), batch_size):
            batch = unique[start:start + batch_size]
            encoded = tokenizer(batch, return_tensors='pt', padding=True, truncation=True, max_length=128)
            generated = model.generate(**encoded, max_new_tokens=128, num_beams=3)
            decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)
            for source, target in zip(batch, decoded):
                result[source] = clean_sentence(target)
            print(f'Translated {min(start + batch_size, len(unique))}/{len(unique)} unique sentences')

    return result


def translate_chinese(texts):
    if not texts:
        return {}

    print(f'Loading Chinese→Korean translation model: {ZH_KO_MODEL}')
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    import torch

    tokenizer = AutoTokenizer.from_pretrained(ZH_KO_MODEL)
    model = AutoModelForSeq2SeqLM.from_pretrained(ZH_KO_MODEL)
    model.eval()

    unique = list(dict.fromkeys(texts))
    result = {}
    batch_size = 24

    with torch.inference_mode():
        for start in range(0, len(unique), batch_size):
            batch = unique[start:start + batch_size]
            encoded = tokenizer(batch, return_tensors='pt', padding=True, truncation=True, max_length=128)
            generated = model.generate(**encoded, max_new_tokens=128, num_beams=3)
            decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)
            for source, target in zip(batch, decoded):
                result[source] = clean_sentence(target)
            print(f'Translated zh→ko {min(start + batch_size, len(unique))}/{len(unique)} unique sentences')

    return result


def authored_fallback(word: str, meaning: str):
    # Only used when neither open corpus yields a usable sentence.
    # It is intentionally a natural, short learning sentence rather than a meta sentence such as “这个词…”.
    if len(word) == 1:
        chinese = f'这个字在这里读作“{word}”。'
        korean = f'이 글자는 여기에서 “{word}”라고 읽는다.'
    else:
        chinese = f'我今天学会了“{word}”的用法。'
        korean = f'나는 오늘 “{word}”({meaning})의 쓰임을 배웠다.'
    return {
        'exampleZh': chinese,
        'examplePinyin': sentence_pinyin(chinese),
        'exampleKo': korean,
        'source': 'hsk-plus-ultra-authored',
        'sourceId': None,
    }


def main():
    hsk = json.loads(HSK_PATH.read_text(encoding='utf-8'))
    meanings = json.loads(MEANING_PATH.read_text(encoding='utf-8')).get('meanings', {})
    target_words = [word for word in hsk['words'] if 2 <= int(word['level']) <= 6]
    if len(target_words) != 5100:
        raise RuntimeError(f'Expected 5100 HSK 2-6 words, got {len(target_words)}')

    target_word_set = {item['word'] for item in target_words}
    no7z_data = download_json(NO7Z_SENTENCE_URL)
    sentences = no7z_data['sentences'] if isinstance(no7z_data, dict) and 'sentences' in no7z_data else no7z_data
    if not isinstance(sentences, list):
        raise RuntimeError('Unexpected no7z sentence dataset format')

    exact_map, substring_map = select_no7z_examples(sentences, target_word_set)

    selected = {}
    count_by_level = {}
    source_counts = defaultdict(int)
    english_to_translate = []
    chinese_to_translate = []

    unresolved = []
    for item in target_words:
        word = item['word']
        level = str(item['level'])
        count_by_level.setdefault(level, {'total': 0, 'no7zExact': 0, 'no7zSubstring': 0, 'tatoebaLinked': 0, 'tatoebaUnlinked': 0, 'authored': 0})
        count_by_level[level]['total'] += 1

        candidates = exact_map.get(word)
        source = 'no7z/hsk-sentences-audio'
        source_bucket = 'no7zExact'
        if not candidates:
            candidates = substring_map.get(word)
            source_bucket = 'no7zSubstring'

        if candidates:
            candidate = min(
                candidates,
                key=lambda x: (
                    abs(x['hskLevel'] - int(item['level'])),
                    len(x['chinese']),
                    x['hskLevel'],
                ),
            )
            selected[item['id']] = {
                'exampleZh': candidate['chinese'],
                'examplePinyin': candidate['pinyin'],
                'exampleEn': candidate['en'],
                'source': source,
                'sourceId': candidate['sentenceId'],
            }
            english_to_translate.append(candidate['en'])
            source_counts[source_bucket] += 1
            count_by_level[level][source_bucket] += 1
        else:
            unresolved.append(item)

    print(f'No7z coverage: {len(selected)}/5100; searching Tatoeba for {len(unresolved)} words')
    tatoeba = find_tatoeba_examples(item['word'] for item in unresolved)

    still_unresolved = []
    for item in unresolved:
        level = str(item['level'])
        found = tatoeba.get(item['word'])
        if found:
            entry = dict(found)
            if not entry.get('exampleKo') and entry.get('exampleEn'):
                english_to_translate.append(entry['exampleEn'])
            elif not entry.get('exampleKo') and not entry.get('exampleEn'):
                chinese_to_translate.append(entry['exampleZh'])
            selected[item['id']] = entry
            bucket = 'tatoebaLinked' if entry['source'] == 'tatoeba-linked' else 'tatoebaUnlinked'
            source_counts[bucket] += 1
            count_by_level[level][bucket] += 1
        else:
            still_unresolved.append(item)

    for item in still_unresolved:
        meaning = meanings.get(item['id'], '')
        if not meaning:
            raise RuntimeError(f'Missing Korean meaning for authored fallback: {item["id"]} {item["word"]}')
        selected[item['id']] = authored_fallback(item['word'], meaning)
        level = str(item['level'])
        source_counts['authored'] += 1
        count_by_level[level]['authored'] += 1

    translated = translate_english(english_to_translate)
    translated_zh = translate_chinese(chinese_to_translate)

    for word_id, item in selected.items():
        en = item.pop('exampleEn', '')
        if not item.get('exampleKo') and en:
            ko = translated.get(en, '')
            if not ko:
                raise RuntimeError(f'Missing Korean translation for {word_id}')
            item['exampleKo'] = ko
        if not item.get('exampleKo') and item.get('source') == 'tatoeba-unlinked':
            ko = translated_zh.get(item['exampleZh'], '')
            if not ko:
                raise RuntimeError(f'Missing direct Chinese→Korean translation for {word_id}')
            item['exampleKo'] = ko

    missing = [
        word_id for word_id, item in selected.items()
        if not item.get('exampleZh') or not item.get('examplePinyin') or not item.get('exampleKo')
    ]
    if missing:
        raise RuntimeError(f'Example content missing for {len(missing)} words: {missing[:10]}')
    if len(selected) != 5100:
        raise RuntimeError(f'Expected 5100 example entries, got {len(selected)}')

    payload = {
        'generatedAt': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
        'targetCount': 5100,
        'filledCount': len(selected),
        'missingCount': 0,
        'sourceCounts': dict(source_counts),
        'countByLevel': count_by_level,
        'sources': {
            'primarySentences': 'no7z/hsk-sentences-audio (CC BY-SA 4.0)',
            'secondarySentences': 'Tatoeba Mandarin sentence exports, including sentences without direct translations (CC BY 2.0 FR)',
            'koreanTranslation': f'{TRANSLATION_MODEL} for English→Korean and {ZH_KO_MODEL} for Chinese→Korean when direct Korean translations are unavailable',
            'authoredFallback': 'HSK Plus Ultra authored only when neither open corpus contains a usable sentence',
        },
        'examples': selected,
    }

    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    report = {key: value for key, value in payload.items() if key != 'examples'}
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
