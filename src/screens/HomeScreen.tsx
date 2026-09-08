import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { HskLevel, ProgressMap } from '../types';
import { COLORS, LEVEL_META } from '../theme';
import { getLevelVocabulary } from '../data/vocabulary';

interface Props {
  progress: ProgressMap;
  onSelectLevel: (level: HskLevel) => void;
}

const levels: HskLevel[] = [1, 2, 3, 4, 5, 6];

export function HomeScreen({ progress, onSelectLevel }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(Math.max(width * 0.72, 280), 380);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>HSK Plus Ultra</Text>
            <Text style={styles.subtitle}>기억할 때까지, 필요한 순간에 다시</Text>
          </View>
          <View style={styles.streak}>
            <Text style={styles.streakText}>🔥 1</Text>
          </View>
        </View>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>학습 주기</Text>
          <Text style={styles.ruleText}>30분 → 3일 → 7일 → 21일 → 장기 기억</Text>
        </View>

        <Text style={styles.sectionTitle}>목표 급수를 선택하세요</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + 16}
          contentContainerStyle={styles.carousel}
        >
          {levels.map((level) => {
            const meta = LEVEL_META[level];
            const demoWords = getLevelVocabulary(level);
            const studied = demoWords.filter((word) => progress[word.id]).length;
            const ratio = demoWords.length ? studied / demoWords.length : 0;

            return (
              <Pressable
                key={level}
                onPress={() => onSelectLevel(level)}
                style={({ pressed }) => [
                  styles.levelCard,
                  { width: cardWidth, backgroundColor: meta.soft },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View>
                    <Text style={styles.wordCount}>누적 {meta.cumulativeWords.toLocaleString()}단어</Text>
                    <Text style={styles.newCount}>이 급수 신규 {meta.newWords.toLocaleString()}단어</Text>
                  </View>
                  <View style={[styles.levelPill, { backgroundColor: meta.accent }]}>
                    <Text style={styles.levelPillText}>HSK {level}</Text>
                  </View>
                </View>

                <Text style={styles.hanzi}>{meta.sample}</Text>
                <Text style={styles.levelName}>HSK {level}</Text>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(ratio * 100)}%`, backgroundColor: meta.accent },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>현재 탑재 데이터 학습 {studied} / {demoWords.length}</Text>

                <View style={[styles.startButton, { backgroundColor: meta.accent }]}>
                  <Text style={styles.startButtonText}>학습하기</Text>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>HSK 3.0 기준</Text>
          <Text style={styles.noteText}>
            앱 구조는 HSK 1~6을 지원하며, 현재 저장소에는 UI·학습 로직 검증용 한국어 스타터 어휘가 포함되어 있습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  page: { paddingTop: 18, paddingBottom: 40 },
  header: {
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.6 },
  subtitle: { marginTop: 5, color: COLORS.subtext, fontSize: 14 },
  streak: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  streakText: { fontWeight: '700', color: COLORS.text },
  ruleCard: {
    marginHorizontal: 22,
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  ruleTitle: { fontWeight: '800', color: COLORS.text, fontSize: 14 },
  ruleText: { marginTop: 6, color: COLORS.subtext, fontSize: 14, lineHeight: 20 },
  sectionTitle: { marginHorizontal: 22, marginTop: 28, marginBottom: 14, fontSize: 18, fontWeight: '800', color: COLORS.text },
  carousel: { paddingHorizontal: 22, paddingBottom: 8, gap: 16 },
  levelCard: { minHeight: 468, borderRadius: 32, padding: 24, justifyContent: 'space-between' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  wordCount: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  newCount: { color: COLORS.subtext, fontSize: 12, marginTop: 4 },
  levelPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  levelPillText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  hanzi: { textAlign: 'center', fontSize: 112, lineHeight: 132, color: COLORS.text, fontWeight: '500' },
  levelName: { textAlign: 'center', fontSize: 26, fontWeight: '800', color: COLORS.text },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.7)' },
  progressFill: { height: '100%', borderRadius: 99 },
  progressLabel: { textAlign: 'center', color: COLORS.subtext, fontSize: 12, marginTop: -9 },
  startButton: { height: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  arrow: { color: '#FFFFFF', fontSize: 26, marginTop: -2 },
  note: { marginHorizontal: 22, marginTop: 24, padding: 18, backgroundColor: '#ECEAE5', borderRadius: 18 },
  noteTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  noteText: { fontSize: 12, color: COLORS.subtext, lineHeight: 18, marginTop: 5 },
});
