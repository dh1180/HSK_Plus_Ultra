import { HskLevel, VocabularyWord } from '../types';
import generatedHsk from './generated-hsk.json';
import { HSK1_001_100 } from './hsk1-001-100';
import { HSK1_101_200 } from './hsk1-101-200';
import { HSK1_201_300 } from './hsk1-201-300';

interface GeneratedWord {
  id: string;
  level: number;
  word: string;
  pinyin: string;
  partOfSpeechZh: string;
  sort: number;
}

const v = (
  level: HskLevel,
  n: number,
  word: string,
  pinyin: string,
  meaningKo: string,
  partOfSpeech?: string,
  exampleZh?: string,
  examplePinyin?: string,
  exampleKo?: string,
): VocabularyWord => ({
  id: `hsk${level}-${String(n).padStart(4, '0')}`,
  level,
  word,
  pinyin,
  meaningKo,
  partOfSpeech,
  exampleZh,
  examplePinyin,
  exampleKo,
});

export const HSK1_VOCABULARY: VocabularyWord[] = [
  ...HSK1_001_100,
  ...HSK1_101_200,
  ...HSK1_201_300,
];

// 한국어 뜻을 먼저 손본 단어는 공식 데이터 위에 덮어쓴다.
const UPPER_LEVEL_CURATED: VocabularyWord[] = [
  v(2, 301, '啊', 'a', '문장 끝에서 어감을 나타내는 조사', '조사'),
  v(2, 302, '爱好', 'àihào', '취미; 좋아하다', '명사·동사'),
  v(2, 303, '白色', 'báisè', '흰색', '명사'),
  v(2, 304, '班', 'bān', '반, 학급', '명사'),
  v(2, 305, '帮', 'bāng', '돕다', '동사'),
  v(2, 306, '帮忙', 'bāngmáng', '도와주다', '동사'),
  v(2, 307, '包', 'bāo', '싸다; 가방; 묶음', '동사·명사·양사'),
  v(2, 308, '本子', 'běnzi', '공책, 노트', '명사'),
  v(2, 309, '比', 'bǐ', '비교하다; ~보다', '동사·개사'),
  v(2, 310, '笔', 'bǐ', '펜, 붓', '명사'),
  v(2, 311, '别', 'bié', '~하지 마라', '부사'),
  v(2, 312, '不错', 'búcuò', '괜찮다, 나쁘지 않다', '형용사'),

  v(3, 501, '阿姨', 'āyí', '아주머니, 이모', '명사'),
  v(3, 502, '矮', 'ǎi', '키가 작다, 낮다', '형용사'),
  v(3, 503, '爱人', 'àiren', '배우자', '명사'),
  v(3, 504, '安静', 'ānjìng', '조용하다', '형용사'),
  v(3, 505, '安全', 'ānquán', '안전하다; 안전', '형용사·명사'),
  v(3, 506, '把', 'bǎ', '목적어를 앞으로 이끄는 把자문 표지', '개사'),
  v(3, 507, '搬', 'bān', '옮기다, 나르다', '동사'),
  v(3, 508, '班级', 'bānjí', '학급, 반', '명사'),
  v(3, 509, '搬家', 'bānjiā', '이사하다', '동사'),
  v(3, 510, '办', 'bàn', '처리하다, 하다', '동사'),
  v(3, 511, '办法', 'bànfǎ', '방법', '명사'),
  v(3, 512, '办公室', 'bàngōngshì', '사무실', '명사'),

  v(4, 1001, '啊', 'ā', '아! 하고 내는 감탄 소리', '감탄사'),
  v(4, 1002, '爱情', 'àiqíng', '사랑, 애정', '명사'),
  v(4, 1003, '爱心', 'àixīn', '사랑하는 마음, 배려심', '명사'),
  v(4, 1004, '安检', 'ānjiǎn', '보안 검사, 안전 검사', '동사·명사'),
  v(4, 1005, '安排', 'ānpái', '배치하다, 안배하다; 일정', '동사·명사'),
  v(4, 1006, '按', 'àn', '누르다; ~에 따라', '동사·개사'),
  v(4, 1007, '按时', 'ànshí', '제시간에, 정시에', '부사'),
  v(4, 1008, '按照', 'ànzhào', '~에 따라, ~대로', '개사'),
  v(4, 1009, '白酒', 'báijiǔ', '바이주, 중국식 증류주', '명사'),
  v(4, 1010, '办公', 'bàngōng', '사무를 보다, 근무하다', '동사'),
  v(4, 1011, '办理', 'bànlǐ', '처리하다, 수속하다', '동사'),
  v(4, 1012, '办事', 'bànshì', '일을 처리하다', '동사'),

  v(5, 2001, '哎', 'āi', '어이, 아 같은 감탄 소리', '감탄사'),
  v(5, 2002, '哎呀', 'āiyā', '아이고, 어머', '감탄사'),
  v(5, 2003, '唉', 'ài', '아, 에휴 같은 한숨·감탄', '감탄사'),
  v(5, 2004, '爱护', 'àihù', '아끼고 보호하다', '동사'),
  v(5, 2005, '安', 'ān', '편안하다; 설치하다', '형용사·동사'),
  v(5, 2006, '安全带', 'ānquándài', '안전벨트', '명사'),
  v(5, 2007, '安慰', 'ānwèi', '위로하다; 위안', '동사·명사'),
  v(5, 2008, '安装', 'ānzhuāng', '설치하다', '동사'),
  v(5, 2009, '暗', 'àn', '어둡다', '형용사'),
  v(5, 2010, '熬夜', 'áoyè', '밤을 새우다', '동사'),
  v(5, 2011, '把握', 'bǎwò', '파악하다; 확신, 자신', '동사·명사'),
  v(5, 2012, '白', 'bái', '희다; 헛되이', '형용사·부사'),

  v(6, 3601, '岸', 'àn', '기슭, 물가', '명사'),
  v(6, 3602, '案例', 'ànlì', '사례, 케이스', '명사'),
  v(6, 3603, '按摩', 'ànmó', '마사지하다; 마사지', '동사·명사'),
  v(6, 3604, '暗示', 'ànshì', '암시하다; 암시', '동사·명사'),
  v(6, 3605, '昂贵', 'ángguì', '비싸다, 고가이다', '형용사'),
  v(6, 3606, '白白', 'báibái', '헛되이, 공연히', '부사'),
  v(6, 3607, '白领', 'báilǐng', '화이트칼라, 사무직', '명사'),
  v(6, 3608, '摆', 'bǎi', '놓다, 벌여 놓다; 흔들다', '동사'),
  v(6, 3609, '摆放', 'bǎifàng', '배치하다, 진열하다', '동사'),
  v(6, 3610, '百分点', 'bǎifēndiǎn', '퍼센트포인트', '명사'),
  v(6, 3611, '百货', 'bǎihuò', '백화 상품, 각종 상품', '명사'),
  v(6, 3612, '摆脱', 'bǎituō', '벗어나다, 떨쳐 버리다', '동사'),
];

const curatedById = new Map(UPPER_LEVEL_CURATED.map((word) => [word.id, word]));

const POS_LABEL: Record<string, string> = {
  名: '명사',
  动: '동사',
  形: '형용사',
  副: '부사',
  数: '수사',
  量: '양사',
  代: '대명사',
  介: '개사',
  助: '조사',
  连: '접속사',
  叹: '감탄사',
  方: '방위사',
  区: '구별사',
};

function formatPartOfSpeech(raw: string) {
  if (!raw) return undefined;
  return raw
    .split(/[、，,]/u)
    .map((part) => POS_LABEL[part.trim()] ?? part.trim())
    .filter(Boolean)
    .join('·');
}

const generatedUpperVocabulary: VocabularyWord[] = (generatedHsk.words as GeneratedWord[])
  .filter((item) => item.level >= 2 && item.level <= 6)
  .sort((a, b) => a.sort - b.sort)
  .map((item) => {
    const curated = curatedById.get(item.id);
    if (curated) return curated;

    return {
      id: item.id,
      level: item.level as HskLevel,
      word: item.word,
      pinyin: item.pinyin,
      meaningKo: '한국어 뜻 데이터 추가 예정',
      partOfSpeech: formatPartOfSpeech(item.partOfSpeechZh),
    };
  });

export const VOCABULARY: VocabularyWord[] = [
  ...HSK1_VOCABULARY,
  ...generatedUpperVocabulary,
];

export function getLevelVocabulary(level: HskLevel) {
  return VOCABULARY.filter((word) => word.level === level);
}
