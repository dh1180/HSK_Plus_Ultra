import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import { ProgressMap, StudyAnswer, VocabularyWord } from '../types';
import { COLORS } from '../theme';
import { reviewTimingText, STAGE_LABEL, transitionStage } from '../lib/srs';

interface Props {
  word: VocabularyWord;
  index: number;
  total: number;
  accent: string;
  progress: ProgressMap;
  onAnswer: (answer: StudyAnswer) => void;
  onClose: () => void;
}

export function StudyScreen({ word, index, total, accent, progress, onAnswer, onClose }: Props) {
  const [revealed, setRevealed] = useState(false);
  const item = progress[word.id];
  const currentStage = item?.stage ?? 'NEW';

  useEffect(() => {
    setRevealed(false);
  }, [word.id]);

  const knownNext = useMemo(
    () => STAGE_LABEL[transitionStage(currentStage, 'KNOWN')],
    [currentStage],
  );
  const relearnNext = useMemo(
    () => STAGE_LABEL[transitionStage(currentStage, 'RELEARN')],
    [currentStage],
  );

  const speak = () => {
    Speech.stop();
    Speech.speak(word.word, { language: 'zh-CN', rate: 0.78, pitch: 1.0 });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
          <Text style={styles.close}>×</Text>
        </Pressable>
        <View style={styles.counterWrap}>
          <Text style={styles.counter}>{index + 1} / {total}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${((index + 1) / total) * 100}%`, backgroundColor: accent }]} />
          </View>
        </View>
        <View style={styles.closeButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.stageRow}>
          <Text style={styles.stageLabel}>{reviewTimingText(item)}</Text>
        </View>

        <Pressable onPress={() => setRevealed(true)} style={styles.card}>
          <View style={styles.cardActions}>
            <View style={[styles.levelDot, { backgroundColor: accent }]} />
            <Pressable onPress={speak} hitSlop={8} style={styles.speakerButton}>
              <Text style={styles.speaker}>🔊</Text>
            </Pressable>
          </View>

          <View style={styles.wordZone}>
            <Text style={styles.word}>{word.word}</Text>
            {!revealed && <Text style={styles.tapHint}>눌러서 뜻 보기</Text>}
          </View>

          {revealed && (
            <View style={styles.revealZone}>
              <Text style={styles.pinyin}>{word.pinyin}</Text>
              <Text style={styles.meaning}>{word.meaningKo}</Text>
              {word.partOfSpeech ? <Text style={styles.pos}>{word.partOfSpeech}</Text> : null}

              {word.exampleZh ? (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleZh}>{word.exampleZh}</Text>
                  {word.examplePinyin ? <Text style={styles.examplePinyin}>{word.examplePinyin}</Text> : null}
                  {word.exampleKo ? <Text style={styles.exampleKo}>{word.exampleKo}</Text> : null}
                </View>
              ) : null}
            </View>
          )}
        </Pressable>
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.buttonHints}>
          <Text style={styles.relearnHint}>↓ {relearnNext}</Text>
          <Text style={styles.knownHint}>↑ {knownNext}</Text>
        </View>
        <View style={styles.buttons}>
          <Pressable
            onPress={() => onAnswer('RELEARN')}
            style={({ pressed }) => [styles.actionButton, styles.relearnButton, pressed && styles.pressed]}
          >
            <Text style={styles.relearnText}>다시 학습</Text>
          </Pressable>
          <Pressable
            onPress={() => onAnswer('KNOWN')}
            style={({ pressed }) => [styles.actionButton, { backgroundColor: accent }, pressed && styles.pressed]}
          >
            <Text style={styles.knownText}>알고 있음</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, height: 62 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  close: { color: COLORS.text, fontSize: 31, fontWeight: '300', marginTop: -3 },
  counterWrap: { flex: 1, alignItems: 'center', gap: 7 },
  counter: { color: COLORS.subtext, fontSize: 12, fontWeight: '800' },
  track: { height: 4, borderRadius: 99, width: '100%', backgroundColor: COLORS.line, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 99 },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 20 },
  stageRow: { alignItems: 'center', marginTop: 16, marginBottom: 10 },
  stageLabel: { color: COLORS.subtext, fontSize: 12, fontWeight: '700' },
  card: {
    minHeight: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 22,
    elevation: 2,
  },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  speakerButton: { padding: 7 },
  speaker: { fontSize: 20 },
  wordZone: { minHeight: 215, alignItems: 'center', justifyContent: 'center' },
  word: { color: COLORS.text, fontSize: 76, lineHeight: 92, fontWeight: '500' },
  tapHint: { color: '#AAA6A0', fontSize: 12, marginTop: 18 },
  revealZone: { alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 25 },
  pinyin: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  meaning: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 9, textAlign: 'center' },
  pos: { color: COLORS.subtext, fontSize: 11, marginTop: 7 },
  exampleBox: { width: '100%', backgroundColor: '#F8F7F4', borderRadius: 18, padding: 16, marginTop: 23 },
  exampleZh: { color: COLORS.text, fontSize: 17, fontWeight: '700', lineHeight: 25 },
  examplePinyin: { color: COLORS.subtext, fontSize: 12, marginTop: 5, lineHeight: 18 },
  exampleKo: { color: COLORS.text, fontSize: 13, marginTop: 8, lineHeight: 20 },
  bottom: { paddingHorizontal: 18, paddingTop: 9, paddingBottom: 14, backgroundColor: COLORS.background },
  buttonHints: { flexDirection: 'row', marginBottom: 7 },
  relearnHint: { flex: 1, textAlign: 'center', color: COLORS.danger, fontSize: 10, fontWeight: '700' },
  knownHint: { flex: 1, textAlign: 'center', color: COLORS.success, fontSize: 10, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  relearnButton: { backgroundColor: '#FFF0EF', borderWidth: 1, borderColor: '#F6C7C4' },
  relearnText: { color: COLORS.danger, fontWeight: '900', fontSize: 16 },
  knownText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
});
