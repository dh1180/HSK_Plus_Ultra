import React, { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getLevelVocabulary } from '../data/vocabulary';
import { buildStudyQueue, countLevelStats } from '../lib/study';
import { HskLevel, ProgressMap, VocabularyWord } from '../types';
import { COLORS, LEVEL_META } from '../theme';

type WordTab = 'ALL' | 'STUDIED' | 'LONG_TERM' | 'ACTIVE';

interface Props {
  level: HskLevel;
  progress: ProgressMap;
  dailyTarget: number;
  onChangeTarget: (value: number) => void;
  onBack: () => void;
  onStartStudy: () => void;
  onReviewWord: (word: VocabularyWord) => void;
}

export function LevelScreen({
  level,
  progress,
  dailyTarget,
  onChangeTarget,
  onBack,
  onStartStudy,
  onReviewWord,
}: Props) {
  const [tab, setTab] = useState<WordTab>('ALL');
  const [wordListY, setWordListY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const vocabulary = getLevelVocabulary(level);
  const meta = LEVEL_META[level];
  const stats = countLevelStats(vocabulary, progress);
  const queue = buildStudyQueue(vocabulary, progress, dailyTarget);

  const studiedWords = vocabulary.filter((word) => Boolean(progress[word.id]));
  const longTermWords = vocabulary.filter((word) => progress[word.id]?.stage === 'LONG_TERM');
  const activeWords = vocabulary.filter((word) => {
    const item = progress[word.id];
    return item && item.stage !== 'LONG_TERM';
  });

  const visibleWords = useMemo(() => {
    if (tab === 'STUDIED') return studiedWords;
    if (tab === 'LONG_TERM') return longTermWords;
    if (tab === 'ACTIVE') return activeWords;
    return vocabulary;
  }, [activeWords, longTermWords, studiedWords, tab, vocabulary]);

  const listTitle =
    tab === 'STUDIED'
      ? '학습한 단어'
      : tab === 'LONG_TERM'
        ? '장기 기억 단어'
        : tab === 'ACTIVE'
          ? '복습 중 단어'
          : `HSK ${level} 전체 단어`;

  const openWordTab = (nextTab: WordTab) => {
    setTab(nextTab);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(wordListY - 12, 0), animated: true });
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nav}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.navTitle}>HSK {level} 단어</Text>
          <View style={styles.navSpacer} />
        </View>

        <View style={[styles.hero, { backgroundColor: meta.soft }]}>
          <View>
            <Text style={styles.heroEyebrow}>HSK 3.0</Text>
            <Text style={styles.heroTitle}>HSK {level}</Text>
            <Text style={styles.heroSub}>
              신규 {meta.newWords.toLocaleString()} · 누적 {meta.cumulativeWords.toLocaleString()}단어
            </Text>
          </View>
          <Text style={styles.heroHanzi}>{meta.sample}</Text>
        </View>

        <View style={styles.autoCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>자동 학습</Text>
            <Text style={styles.cardLink}>오늘의 학습 ›</Text>
          </View>

          <Text style={styles.label}>목표 학습량</Text>
          <View style={styles.targetRow}>
            {[10, 20, 30].map((value) => (
              <Pressable
                key={value}
                onPress={() => onChangeTarget(value)}
                style={[
                  styles.targetChip,
                  dailyTarget === value && { backgroundColor: meta.accent, borderColor: meta.accent },
                ]}
              >
                <Text style={[styles.targetText, dailyTarget === value && styles.targetTextActive]}>
                  {value}개
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.rows}>
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoTitle}>새 단어</Text>
                <Text style={styles.infoSub}>복습을 먼저 채우고 남는 만큼 학습</Text>
              </View>
              <Text style={styles.infoNumber}>{queue.newCount} ›</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoTitle}>복습 단어</Text>
                <Text style={styles.infoSub}>지금 복습 시간이 된 단어</Text>
              </View>
              <Text style={styles.infoNumber}>{queue.reviewCount} ›</Text>
            </View>
          </View>

          <Pressable
            disabled={queue.words.length === 0}
            onPress={onStartStudy}
            style={({ pressed }) => [
              styles.studyButton,
              { backgroundColor: queue.words.length ? meta.accent : '#C9C6C0' },
              pressed && queue.words.length > 0 && { opacity: 0.86 },
            ]}
          >
            <Text style={styles.studyButtonText}>
              {queue.words.length ? `${queue.words.length}개 학습하기` : '오늘 학습 완료'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>HSK {level} 학습 정보</Text>
        <View style={styles.statsCard}>
          <StatRow
            label="학습한 단어"
            value={`${stats.studied} / ${vocabulary.length}`}
            onPress={() => openWordTab('STUDIED')}
          />
          <View style={styles.divider} />
          <StatRow
            label="장기 기억 단어"
            value={`${stats.longTerm} / ${vocabulary.length}`}
            onPress={() => openWordTab('LONG_TERM')}
          />
          <View style={styles.divider} />
          <StatRow
            label="복습 중"
            value={`${activeWords.length}`}
            onPress={() => openWordTab('ACTIVE')}
          />
        </View>

        <View
          onLayout={({ nativeEvent }) => setWordListY(nativeEvent.layout.y)}
          style={styles.wordSection}
        >
          <View style={styles.tabs}>
            <TabButton
              active={tab === 'ALL'}
              accent={meta.accent}
              label={`전체 ${vocabulary.length}`}
              onPress={() => setTab('ALL')}
            />
            <TabButton
              active={tab === 'STUDIED'}
              accent={meta.accent}
              label={`학습 ${studiedWords.length}`}
              onPress={() => setTab('STUDIED')}
            />
            <TabButton
              active={tab === 'LONG_TERM'}
              accent={meta.accent}
              label={`장기 ${longTermWords.length}`}
              onPress={() => setTab('LONG_TERM')}
            />
            <TabButton
              active={tab === 'ACTIVE'}
              accent={meta.accent}
              label={`복습 ${activeWords.length}`}
              onPress={() => setTab('ACTIVE')}
            />
          </View>

          <View style={styles.listSummary}>
            <Text style={styles.listTitle}>{listTitle}</Text>
            <Text style={styles.listCount}>{visibleWords.length}개</Text>
          </View>

          <View style={styles.wordList}>
            {visibleWords.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>아직 이 목록에 단어가 없습니다.</Text>
              </View>
            ) : (
              visibleWords.map((word) => (
                <Pressable
                  key={word.id}
                  onPress={() => onReviewWord(word)}
                  style={({ pressed }) => [styles.wordRow, pressed && styles.wordRowPressed]}
                >
                  <View style={styles.wordLeft}>
                    <Text style={styles.word}>{word.word}</Text>
                    <View style={styles.wordTextBlock}>
                      <Text style={styles.pinyin}>{word.pinyin}</Text>
                      <Text style={styles.meaning}>{word.meaningKo}</Text>
                    </View>
                  </View>
                  <View style={styles.stageWrap}>
                    <Text style={styles.stage}>
                      {progress[word.id]?.stage === 'LONG_TERM'
                        ? '장기 기억'
                        : progress[word.id]?.stage
                          ? '복습 중'
                          : '새 단어'}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {tab === 'LONG_TERM' && longTermWords.length > 0 ? (
          <Text style={styles.manualHint}>
            장기 기억 단어도 눌러서 다시 확인할 수 있습니다. 여기서 ‘다시 학습’을 누르면 7일 단계로 내려갑니다.
          </Text>
        ) : null}

        <Text style={styles.dataNote}>
          HSK 1은 300개 전체 단어가 포함되어 있습니다. HSK 2~6은 현재 한국어 뜻·예문 데이터를 순차 확장 중입니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  accent,
  label,
  onPress,
}: {
  active: boolean;
  accent: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && { borderBottomColor: accent, borderBottomWidth: 3 }]}
    >
      <Text numberOfLines={1} style={[styles.tabText, active && { color: accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.statRow, pressed && styles.statRowPressed]}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRight}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statChevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  page: { padding: 20, paddingBottom: 50 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  backText: { fontSize: 38, lineHeight: 40, color: COLORS.text, fontWeight: '300' },
  navTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  navSpacer: { width: 44 },
  hero: { marginTop: 14, borderRadius: 26, padding: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroEyebrow: { color: COLORS.subtext, fontSize: 12, fontWeight: '700' },
  heroTitle: { marginTop: 4, fontSize: 30, color: COLORS.text, fontWeight: '900' },
  heroSub: { marginTop: 6, color: COLORS.subtext, fontSize: 13 },
  heroHanzi: { fontSize: 70, color: COLORS.text, fontWeight: '500' },
  autoCard: { marginTop: 18, backgroundColor: '#FFFFFF', borderRadius: 26, padding: 20, borderWidth: 1, borderColor: COLORS.line },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  cardLink: { color: COLORS.subtext, fontSize: 13 },
  label: { marginTop: 20, color: COLORS.subtext, fontSize: 12, fontWeight: '700' },
  targetRow: { flexDirection: 'row', gap: 8, marginTop: 9 },
  targetChip: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 99, paddingHorizontal: 15, paddingVertical: 8 },
  targetText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  targetTextActive: { color: '#FFFFFF' },
  rows: { marginTop: 18, borderTopWidth: 1, borderTopColor: COLORS.line },
  infoRow: { minHeight: 72, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  infoSub: { marginTop: 3, color: COLORS.subtext, fontSize: 11 },
  infoNumber: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  divider: { height: 1, backgroundColor: COLORS.line },
  studyButton: { height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  studyButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  sectionTitle: { marginTop: 28, marginBottom: 10, fontSize: 17, fontWeight: '900', color: COLORS.text },
  statsCard: { backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 18, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' },
  statRow: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statRowPressed: { opacity: 0.55 },
  statLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  statRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statValue: { color: COLORS.subtext, fontSize: 14, fontWeight: '700' },
  statChevron: { color: '#B6B2AB', fontSize: 22, lineHeight: 24 },
  wordSection: { marginTop: 25 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  tab: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 2, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { color: COLORS.subtext, fontSize: 11, fontWeight: '800' },
  listSummary: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  listTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  listCount: { color: COLORS.subtext, fontSize: 12, fontWeight: '700' },
  wordList: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 22, borderBottomRightRadius: 22, overflow: 'hidden' },
  wordRow: { paddingHorizontal: 17, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  wordRowPressed: { backgroundColor: '#F7F6F3' },
  wordLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  wordTextBlock: { flex: 1 },
  word: { width: 64, fontSize: 25, color: COLORS.text, fontWeight: '600' },
  pinyin: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  meaning: { color: COLORS.subtext, fontSize: 12, marginTop: 2 },
  stageWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stage: { color: COLORS.subtext, fontSize: 10, fontWeight: '700' },
  chevron: { color: '#B6B2AB', fontSize: 19 },
  emptyBox: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: COLORS.subtext, fontSize: 12 },
  manualHint: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 12 },
  dataNote: { color: COLORS.subtext, fontSize: 10, lineHeight: 16, marginTop: 14 },
});
