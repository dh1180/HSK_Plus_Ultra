import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('examples', Path(__file__).resolve().parents[1] / 'scripts/build-hsk-examples.py')
examples = importlib.util.module_from_spec(spec)
spec.loader.exec_module(examples)

class CandidateTests(unittest.TestCase):
    def test_missing_content_does_not_fabricate_a_usage_sentence(self):
        item = examples.missing_candidate('转机')
        self.assertEqual(item['reviewStatus'], 'missing')
        self.assertEqual(item['exampleZh'], '')
        self.assertEqual(item['exampleKo'], '')

    def test_stale_token_cannot_attach_an_unrelated_sentence(self):
        row = {'chinese': '我喜欢喝茶。', 'pinyin': 'wǒ xǐ huan hē chá',
               'translation': {'en': 'I like drinking tea.'}, 'hsk_level': 1,
               'id': 'test', 'tokens': [{'word': '机场'}]}
        exact, substring = examples.select_no7z_examples([row], {'机场'})
        self.assertNotIn('机场', exact)
        self.assertNotIn('机场', substring)

    def test_valid_target_remains_a_candidate_with_source_identity(self):
        row = {'chinese': '机场很远。', 'pinyin': 'jī chǎng hěn yuǎn',
               'translation': {'en': 'The airport is far away.'}, 'hsk_level': 2,
               'id': 'test', 'tokens': [{'word': '机场'}]}
        exact, _ = examples.select_no7z_examples([row], {'机场'})
        self.assertEqual(exact['机场'][0]['sentenceId'], 'test')

if __name__ == '__main__':
    unittest.main()
