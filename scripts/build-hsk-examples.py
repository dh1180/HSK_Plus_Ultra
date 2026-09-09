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
SENTENCE_URL = 'https://raw.githubusercontent.com/no7z/hsk-sentences-audio/main/dist/sentences.json'
# 기존 Helsinki-NLP/opus-mt-en-ko는 공개 모델 식별자로 존재하지 않아 Actions에서 401/404가 발생했다.
# 공개 CC BY 4.0 영어→한국어 Marian 모델을 기본값으로 사용한다.
TRANSLATION_MODEL = os.environ.get('HSK_KO_TRANSLATION_MODEL', 'samandar1105/translation-eng-kr')


def download_json(url: str):
    print(f'Downloading {url}')
    with urllib.request.urlopen(url, timeout=120) as response:
        return json.loads(response.read().decode('utf-8'))


def clean_sentence(value: str) -> str:
    return re.sub(r'\s+', ' ', (value or '')).strip()


def select_examples(sentences):
    by_word = defaultdict(list)
    for sentence in sentences:
        chinese = clean_sentence(sentence.get('chinese', ''))
        pinyin = clean_sentence(sentence.get('pinyin', ''))
        en = clean_sentence((sentence.get('translation') or {}).get('en', ''))
        if not chinese or not pinyin or not en:
            continue

        seen = set()
        for token in sentence.get('tokens') or []:
            word = clean_sentence(token.get('word', ''))
            if not word or word in seen:
                continue
            seen.add(word)
            by_word[word].append({
                'chinese': chinese,
                'pinyin': pinyin,
                'en': en,
                'hskLevel': int(sentence.get('hsk_level') or 99),
                'sentenceId': sentence.get('id'),
            })

    for word, candidates in by_word.items():
        candidates.sort(key=lambda item: (len(item['chinese']), item['hskLevel'], item['sentenceId'] or ''))
    return by_word


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


def fallback_example(word: str, meaning: str):
    chinese = f'这里用了“{word}”这个词。'
    try:
        from pypinyin import Style, lazy_pinyin
        pinyin = ' '.join(lazy_pinyin(chinese, style=Style.TONE, neutral_tone_with_five=False))
    except Exception:
        pinyin = word
    return {
        'exampleZh': chinese,
        'examplePinyin': pinyin,
        'exampleKo': f"여기서는 ‘{word}’({meaning})라는 단어를 사용했다.",
        'source': 'fallback-generated',
        'sourceId': None,
    }


def main():
    hsk = json.loads(HSK_PATH.read_text(encoding='utf-8'))
    meanings = json.loads(MEANING_PATH.read_text(encoding='utf-8')).get('meanings', {})
    target_words = [word for word in hsk['words'] if 2 <= int(word['level']) <= 6]
    if len(target_words) != 5100:
        raise RuntimeError(f'Expected 5100 HSK 2-6 words, got {len(target_words)}')

    sentence_data = download_json(SENTENCE_URL)
    if isinstance(sentence_data, dict) and 'sentences' in sentence_data:
        sentences = sentence_data['sentences']
    else:
        sentences = sentence_data
    if not isinstance(sentences, list):
        raise RuntimeError('Unexpected sentence dataset format')

    by_word = select_examples(sentences)
    selected = {}
    english_to_translate = []
    source_count = 0
    fallback_count = 0
    count_by_level = {}

    for word in target_words:
        level = str(word['level'])
        count_by_level.setdefault(level, {'total': 0, 'dataset': 0, 'fallback': 0})
        count_by_level[level]['total'] += 1
        candidates = by_word.get(word['word'], [])
        if candidates:
            # 해당 급수와 난이도가 가까우면서 짧은 문장을 우선해 학습 카드에 적합하게 고른다.
            candidate = min(
                candidates,
                key=lambda item: (
                    abs(item['hskLevel'] - int(word['level'])),
                    len(item['chinese']),
                    item['hskLevel'],
                ),
            )
            selected[word['id']] = {
                'exampleZh': candidate['chinese'],
                'examplePinyin': candidate['pinyin'],
                'exampleEn': candidate['en'],
                'source': 'no7z/hsk-sentences-audio',
                'sourceId': candidate['sentenceId'],
            }
            english_to_translate.append(candidate['en'])
            source_count += 1
            count_by_level[level]['dataset'] += 1
        else:
            meaning = meanings.get(word['id'], '')
            if not meaning:
                raise RuntimeError(f'Missing Korean meaning for fallback: {word["id"]} {word["word"]}')
            selected[word['id']] = fallback_example(word['word'], meaning)
            fallback_count += 1
            count_by_level[level]['fallback'] += 1

    translated = translate_english(english_to_translate)

    for word_id, item in selected.items():
        if item['source'] == 'no7z/hsk-sentences-audio':
            ko = translated.get(item.pop('exampleEn'), '')
            if not ko:
                raise RuntimeError(f'Missing Korean translation for {word_id}')
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
        'datasetCount': source_count,
        'fallbackCount': fallback_count,
        'countByLevel': count_by_level,
        'sources': {
            'sentences': 'no7z/hsk-sentences-audio (CC BY-SA 4.0)',
            'koreanTranslation': f'{TRANSLATION_MODEL} (CC BY 4.0) machine translation from the source English translation',
            'fallback': 'HSK Plus Ultra generated neutral example for uncovered words',
        },
        'examples': selected,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')

    report = {key: value for key, value in payload.items() if key != 'examples'}
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
