"""Import already reviewed editorial rows, not machine-translate or certify content.

TSV columns: source sort, Korean definition, Korean example translation,
optional replacement Chinese sentence and matching pinyin.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT_KEYS = ['exampleKo', 'examplePinyin', 'exampleZh', 'meaningKo', 'pinyin', 'word']


def read(path):
    return json.loads((ROOT / path).read_text())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--pinyin', required=True)
    parser.add_argument('--expected-count', required=True, type=int)
    parser.add_argument('--reviewer', required=True)
    parser.add_argument('--pos', help='Explicit, identity-bound editorial POS exceptions; never changes official rows.')
    parser.add_argument('--audit', default='data/review/hsk4-review.json',
                        help='Separate audit file for this reviewed batch; preserves earlier batches.')
    args = parser.parse_args()
    words = {word['sort']: word for word in read('src/data/generated-hsk.json')['words']}
    candidates = read('src/data/example-content.json')['examples']
    overrides = read('src/data/content-overrides.json')
    meanings = read('src/data/korean-meanings.json')['meanings']
    pinyin_fixes = read(args.pinyin)
    pos_fixes = read(args.pos) if args.pos else {}
    manifest = read('data/review/manifest.json')
    entries = {entry['id']: entry for entry in manifest['entries']}
    audit_path = ROOT / args.audit
    prior_audit = {entry['id']: entry for entry in json.loads(audit_path.read_text())['entries']} if audit_path.exists() else {}
    audit = []
    seen = set()
    for line in (ROOT / args.input).read_text().splitlines():
        fields = line.split('\t')
        if len(fields) not in (3, 5):
            raise ValueError(f'Expected 3 or 5 columns: {line}')
        number, meaning, translation = int(fields[0]), fields[1], fields[2]
        word = words[number]
        key = word['id']
        if key in seen:
            raise ValueError(f'Duplicate reviewed row: {key}')
        seen.add(key)
        if entries.get(key, {}).get('partOfSpeech') is not None and key not in pos_fixes:
            raise ValueError(f'Previously reviewed POS exception requires explicit --pos evidence: {key}')
        previous = overrides.get(key, candidates[key])
        replacement = len(fields) == 5
        zh = fields[3] if replacement else previous['exampleZh']
        py = fields[4] if replacement else pinyin_fixes.get(key, previous['examplePinyin'])
        if not word['word'] in zh or any(t in zh for t in ['我今天学会了', '这个字在这里读作']):
            raise ValueError(f'Not a usage example: {key}')
        if not py.strip() or not re.search('[가-힣]', meaning) or not re.search('[가-힣]', translation):
            raise ValueError(f'Incomplete review: {key}')
        source = 'hsk-plus-ultra-authored' if replacement else previous.get('source', 'hsk-plus-ultra-authored')
        if source not in ('no7z/hsk-sentences-audio', 'hsk-plus-ultra-authored'):
            raise ValueError(f'Resolve sentence author/license or replace before publishing: {key} {source}')
        item = {'word': word['word'], 'pinyin': word['pinyin'], 'meaningKo': meaning,
                'exampleZh': zh, 'examplePinyin': py, 'exampleKo': translation,
                'source': source, 'sourceId': previous.get('sourceId') if not replacement else None,
                'sourceUrl': 'https://github.com/no7z/hsk-sentences-audio' if source == 'no7z/hsk-sentences-audio' else 'https://github.com/dh1180/HSK_Plus_Ultra',
                'license': 'CC BY-SA 4.0' if source == 'no7z/hsk-sentences-audio' else 'project-authored',
                'reviewStatus': 'editorial',
                'reviewNote': 'AI editorial review of definition, official target sense/POS, Chinese usage, Korean translation and pinyin. Not an official example/translation or independent human certification.'}
        if key in pos_fixes:
            fix = pos_fixes[key]
            if (fix['word'], fix['pinyin'], fix['officialPartOfSpeechZh']) != (word['word'], word['pinyin'], word['partOfSpeechZh']):
                raise ValueError(f'POS exception does not match the official lexical identity: {key}')
            if not re.search('[가-힣]', fix['displayKo']) or not fix['references']:
                raise ValueError(f'POS exception needs a display label and references: {key}')
            item['partOfSpeech'] = fix['displayKo']
            item['reviewNote'] += ' ' + fix['note']
        digest = hashlib.sha256(json.dumps({k: item[k] for k in CONTENT_KEYS}, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        entries[key] = {'id': key, 'word': word['word'], 'pinyin': word['pinyin'], 'contentHash': digest,
                        'reviewer': args.reviewer, 'reviewType': 'AI editorial',
                        'checks': ['definition', 'target-sense-and-pos', 'chinese-usage', 'korean-translation', 'pinyin'], 'decision': 'reviewed'}
        if 'partOfSpeech' in item:
            entries[key]['partOfSpeech'] = item['partOfSpeech']
        audit.append({'id': key, 'word': word['word'], 'originalMeaningKo': meanings[key],
                      'originalExampleZh': candidates[key]['exampleZh'], 'originalExampleKo': candidates[key]['exampleKo'],
                      'sentenceReplaced': zh != previous['exampleZh'], 'pinyinCorrected': py != previous['examplePinyin'],
                      'contentHash': digest})
        if key in prior_audit and prior_audit[key]['contentHash'] == digest:
            audit[-1] = prior_audit[key]
        overrides[key] = item
    if len(seen) != args.expected_count or set(pinyin_fixes) - seen or set(pos_fixes) - seen:
        raise ValueError('Review count or pinyin correction coverage mismatch')
    manifest.update(reviewedCount=len(entries), scope='Per-ID AI editorial review only. See entry IDs and per-level release report for actual coverage; remaining entries are not reviewed.', entries=list(entries.values()))
    # Nothing is published until every import row has passed the integrity checks above.
    for path, data in [('src/data/content-overrides.json', overrides), ('data/review/manifest.json', manifest),
                       (args.audit, {'reviewedCount': len(audit), 'reviewType': 'AI editorial', 'entries': audit})]:
        (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'importedReviewedRows': len(audit), 'totalReviewedRows': len(entries),
                      'replacedSentences': sum(e['sentenceReplaced'] for e in audit),
                      'correctedPinyin': sum(e['pinyinCorrected'] for e in audit)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
