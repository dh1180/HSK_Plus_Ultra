import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { getLevelVocabulary } from '../data/vocabulary';
import { countLevelStats } from '../lib/study';
import { COLORS, LEVEL_META } from '../theme';
import { HskLevel, ProgressMap } from '../types';

interface Props {
  progress: ProgressMap;
  dailyTarget: number;
  resumeCard: React.ReactNode;
  onSelectLevel: (level: HskLevel) => void;
  onReview: (level: HskLevel) => void;
  onSettings: () => void;
}

const levels: HskLevel[] = [1, 2, 3, 4, 5, 6];
const vocabulary = levels.map(level => ({ level, words: getLevelVocabulary(level) }));

export function HomeScreen({ progress, dailyTarget, resumeCard, onSelectLevel, onReview, onSettings }: Props) {
  const [now, setNow] = useState(() => new Date());
  const { width, fontScale } = useWindowDimensions();
  const columns = fontScale > 1.4 || width < 360 ? 1 : width >= 760 ? 3 : 2;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(new Date());
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  const cards = vocabulary.map(({ level, words }) => ({
    level, total: words.length, ...countLevelStats(words, progress, now),
  }));
  const due = cards.reduce((total, card) => total + card.due, 0);
  const vocabularyTotal = cards.reduce((total, card) => total + card.total, 0);
  const studiedTotal = cards.reduce((total, card) => total + card.studied, 0);
  const priority = cards.reduce((best, card) => card.due > best.due ? card : best, cards[0]!);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.logo}><Text style={styles.logoText}>汉</Text></View>
            <View style={styles.brandBlock}>
              <Text style={styles.eyebrow}>HSK 3.0 · 중국어 어휘</Text>
              <Text accessibilityRole="header" style={styles.brand}>HSK Plus Ultra</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="설정 · 기록 백업" onPress={onSettings} style={styles.settings}>
              <Text style={styles.settingsText}>설정</Text>
            </Pressable>
          </View>

          {resumeCard || <View style={styles.hero}>
            <Text style={styles.heroLabel}>오늘의 학습</Text>
            <Text accessibilityRole="header" style={styles.heroTitle}>복습 대기 {due.toLocaleString()}개</Text>
            <Text style={styles.heroCopy}>{due ? `HSK ${priority.level}에 복습할 단어가 가장 많아요.` : '급수를 골라 오늘 학습을 시작하세요.'}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}><Text style={styles.heroValue}>{studiedTotal.toLocaleString()}</Text><Text style={styles.heroLabel}>학습한 단어</Text></View>
              <View style={styles.heroStat}><Text style={styles.heroValue}>{vocabularyTotal.toLocaleString()}</Text><Text style={styles.heroLabel}>전체 어휘</Text></View>
            </View>
            <Pressable accessibilityRole="button" onPress={() => due ? onReview(priority.level) : onSelectLevel(1)} style={styles.review}>
              <Text style={styles.reviewText}>{due ? `HSK ${priority.level} 복습만 ${Math.min(dailyTarget, priority.due)}개 시작` : 'HSK 1 시작하기  ›'}</Text>
            </Pressable>
          </View>}

          <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.heading}>급수별 학습</Text><Text style={styles.eyebrow}>HSK 1–6</Text></View>
          <View style={styles.grid}>
            {cards.map(({ level, total, studied, due: levelDue }) => {
              const meta = LEVEL_META[level];
              return (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityLabel={`HSK ${level} 바로가기`}
                  accessibilityHint={`학습 ${studied}개, 복습 대기 ${levelDue}개`}
                  onPress={() => onSelectLevel(level)}
                  style={({ pressed }) => [styles.cell, { flexBasis: columns === 1 ? '100%' : columns === 2 ? '48%' : '31%' }, pressed && styles.pressed]}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.badge, { backgroundColor: meta.soft, color: meta.accent }]}>{meta.sample}</Text>
                    <Text style={styles.level}>HSK {level}</Text><Text style={styles.arrow}>›</Text>
                  </View>
                  <Text style={[styles.due, levelDue > 0 && { color: meta.accent }]}>
                    {levelDue ? `복습 대기 ${levelDue}개` : '복습 대기 없음'}
                  </Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${studied / total * 100}%`, backgroundColor: meta.accent }]} />
                  </View>
                  <Text style={styles.progress}>학습 {studied.toLocaleString()} / {total.toLocaleString()}개</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { alignItems: 'center' },
  page: { width: '100%', maxWidth: 960, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logo: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.yellow },
  logoText: { fontSize: 25, color: COLORS.ink, fontWeight: '900' },
  brandBlock: { flex: 1 },
  eyebrow: { color: COLORS.subtext, fontSize: 13, fontWeight: '700' },
  brand: { fontSize: 23, letterSpacing: -0.6, fontWeight: '900', color: COLORS.text },
  settings: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: COLORS.surface },
  settingsText: { color: COLORS.text, fontWeight: '700' },
  hero: { backgroundColor: COLORS.yellow, borderWidth: 1, borderColor: COLORS.yellowLine, padding: 20, borderRadius: 22, gap: 7 },
  heroLabel: { color: '#6E5014', fontSize: 13, fontWeight: '800' },
  heroTitle: { color: COLORS.text, fontSize: 28, fontWeight: '900' },
  heroCopy: { color: COLORS.subtext, fontSize: 14, lineHeight: 21 },
  heroStats: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  heroStat: { flex: 1, borderRadius: 14, padding: 10, backgroundColor: COLORS.yellowSoft },
  heroValue: { color: COLORS.ink, fontSize: 22, fontWeight: '900' },
  review: { minHeight: 48, padding: 12, marginTop: 7, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.ink, borderRadius: 14 },
  reviewText: { color: COLORS.surface, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  arrow: { marginLeft: 'auto', color: COLORS.subtext, fontSize: 20 },
  heading: { color: COLORS.text, fontSize: 19, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cell: { padding: 14, gap: 9, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface },
  pressed: { opacity: 0.78 },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  badge: { fontSize: 18, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  level: { color: COLORS.text, fontSize: 16, fontWeight: '900' },
  due: { color: COLORS.subtext, fontSize: 13, fontWeight: '800' },
  track: { height: 5, borderRadius: 5, overflow: 'hidden', backgroundColor: COLORS.line },
  fill: { height: '100%', borderRadius: 5 },
  progress: { color: COLORS.subtext, fontSize: 12 },
});
