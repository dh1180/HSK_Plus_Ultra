"""Read the pinned public HSK syllabus; preserve app IDs, attach official references.

Requires PyMuPDF. Raw PDF is downloaded to a cache outside version control.
No Korean translation or example is certified by this metadata comparison.
"""
import argparse
import hashlib
import json
import re
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf'
EXPECTED_SHA256 = 'd8b6646599bc9a0c9616a4cb06d4b37461f8792f70a3171016d00fcd8eda09ad'


def normalize(value):
    return re.sub(r"[\s’'\-·]", '', unicodedata.normalize('NFC', value)).lower()


def extract(pdf):
    import fitz
    rows = []
    with fitz.open(pdf) as doc:
        if len(doc) != 406:
            raise ValueError('Official PDF pagination changed; review the new edition first')
        for index in range(79, 214):
            words = [w for w in doc[index].get_text('words') if w[3] - w[1] < 21]
            numbers = [w for w in words if 64 < w[0] < 110 and w[4].isdigit() and 89 < w[1] < 780]
            for number in numbers:
                y = (number[1] + number[3]) / 2
                line = [w for w in words if abs((w[1] + w[3]) / 2 - y) < 5]
                def column(left, right):
                    return ' '.join(w[4] for w in sorted(line, key=lambda w: w[0]) if left <= w[0] < right).strip()
                level = column(115, 210)
                rows.append({'ordinal': int(number[4]), 'level': int(level[0]), 'levelRaw': level,
                             'sourceWord': column(210, 308), 'pinyin': column(308, 430),
                             'partOfSpeechZh': column(430, 550), 'pdfPage': index + 1, 'printedPage': index - 2})
    if sorted(r['ordinal'] for r in rows) != list(range(1, 5401)):
        raise ValueError('Incomplete or duplicate rows in the official vocabulary extraction')
    return rows


def compare(existing, rows):
    official = {}
    for row in rows:
        key = (row['level'], row['sourceWord'], normalize(row['pinyin']))
        if key in official:
            raise ValueError(f'Ambiguous official identity: {key}')
        official[key] = row
    matches, differences = [], []
    for word in existing:
        key = (word['level'], word['sourceWord'], normalize(word['pinyin']))
        if key not in official:
            raise ValueError(f'Vocabulary identity changed: {word["id"]}. Review progress migration before replacing data.')
        row = official.pop(key)
        if normalize(word['partOfSpeechZh']) != normalize(row['partOfSpeechZh']):
            differences.append({'id': word['id'], 'word': word['word'], 'previous': word['partOfSpeechZh'], 'official': row['partOfSpeechZh']})
        matches.append((word, row))
    if official or len(matches) != 5400:
        raise ValueError('Vocabulary coverage is not exactly 5400')
    return matches, differences


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf', type=Path)
    args = parser.parse_args()
    pdf = args.pdf or ROOT / '.cache' / 'official-hsk-syllabus-2026.pdf'
    if not pdf.exists():
        pdf.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(SOURCE, timeout=60) as response:
            pdf.write_bytes(response.read())
    checksum = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if checksum != EXPECTED_SHA256:
        raise ValueError('Official PDF content changed. Review edition, pagination and permissions before updating the pinned checksum.')
    snapshot_path = ROOT / 'src/data/generated-hsk.json'
    snapshot = json.loads(snapshot_path.read_text())
    matches, differences = compare(snapshot['words'], extract(pdf))
    reference = {'publisher': '中外语言交流合作中心', 'title': 'HSK 考试大纲', 'published': '2025-11',
                 'effective': '2026-07', 'url': SOURCE, 'sha256': checksum,
                 'scope': 'Chinese headword, pinyin, level and POS only. Does not validate Korean meanings or usage examples.'}
    for word, row in matches:
        word.update(partOfSpeechZh=row['partOfSpeechZh'], officialOrdinal=row['ordinal'],
                    officialPdfPage=row['pdfPage'], officialPrintedPage=row['printedPage'], officialLevelRaw=row['levelRaw'])
    snapshot['officialReference'] = reference
    snapshot['transcriptionSource'] = snapshot.get('transcriptionSource', snapshot['source'])
    snapshot['source'] = SOURCE
    snapshot['officialSource'] = SOURCE
    previous_report_path = ROOT / 'data/official-source-audit.json'
    if previous_report_path.exists():
        previous_report = json.loads(previous_report_path.read_text())
        if previous_report.get('officialReference', {}).get('sha256') == checksum:
            differences = list({entry['id']: entry for entry in previous_report.get('metadataCorrections', []) + differences}.values())
    report = {'officialReference': reference, 'officialEntries': 5400, 'matchedEntries': 5400, 'unmatchedEntries': 0,
              'idsPreserved': True, 'differentOrderCount': sum(int(w['id'].split('-')[1]) != r['ordinal'] for w, r in matches),
              'metadataCorrections': differences,
              'meaningReview': 'Separate AI editorial review: HSK 1–3 complete; HSK 4–6 incomplete.',
              'exampleReview': 'This official vocabulary table has no per-entry example sentences or Korean translations.'}
    # All checks happen before either output is replaced.
    snapshot_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'data/official-source-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'officialReference'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
