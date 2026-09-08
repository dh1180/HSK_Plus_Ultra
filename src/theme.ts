import { HskLevel } from './types';

export const COLORS = {
  background: '#F6F5F1',
  surface: '#FFFFFF',
  text: '#1F1F1F',
  subtext: '#77746F',
  line: '#E8E5DF',
  danger: '#EF6A65',
  success: '#5EB694',
};

export const LEVEL_META: Record<
  HskLevel,
  {
    accent: string;
    soft: string;
    sample: string;
    cumulativeWords: number;
    newWords: number;
  }
> = {
  1: { accent: '#E2A900', soft: '#FFF0A8', sample: '你', cumulativeWords: 300, newWords: 300 },
  2: { accent: '#E08A39', soft: '#FFD2A6', sample: '学', cumulativeWords: 500, newWords: 200 },
  3: { accent: '#D75F75', soft: '#FFC2CC', sample: '懂', cumulativeWords: 1000, newWords: 500 },
  4: { accent: '#816AD6', soft: '#D7CEFF', sample: '旅', cumulativeWords: 2000, newWords: 1000 },
  5: { accent: '#2D9E8E', soft: '#B8EBE1', sample: '深', cumulativeWords: 3600, newWords: 1600 },
  6: { accent: '#4A79C8', soft: '#C7D9FF', sample: '论', cumulativeWords: 5400, newWords: 1800 },
};
