import { VocabularyWord } from '../types';

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/gu, '').replace(/\s+/gu, '');
}

export function matchesWord(word: VocabularyWord, query: string) {
  const needle = normalizeSearch(query);
  return !needle || [word.word, word.pinyin, word.meaningKo].some(value => normalizeSearch(value).includes(needle));
}
