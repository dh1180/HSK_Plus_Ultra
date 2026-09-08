import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
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

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const knownNext = useMemo(
    () => STAGE_LABEL[transitionStage(currentStage, 'KNOWN')],
    [currentStage],
  );
  const relearnNext = useMemo(
    () => STAGE_LABEL[transitionStage(currentStage, 'RELEARN')],
    [currentStage],
  );

  const speakWord = () => {
    void Speech.stop();
    Speech.speak(word.word, { language: 'zh-CN', rate: 0.78, pitch: 1.0 });
  };

  const speakExample = () => {
    if (!word.exampleZh) return;
    void Speech.stop();
    Speech.speak(word.exampleZh, { language: 'zh-CN', rate: 0.72, pitch: 1.0 });
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
            <View
              style={[
                styles.fill,
                {
                  width: `${((index + 1) / total) * 100}%`,
                  backgroundColor: accent,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stageRow}>
          <View style={[styles.stageChip, { backgroundColor: `${accent}18` }]}>
            <Text style={[styles.stageLabel, { color: accent }]}>{reviewTimingText(item)}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            if (!revealed) setRevealed(true);
          }}
          style={({ pressed }) => [
            styles.card,
            !revealed && styles.cardHidden,
            !revealed && pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardActions}>
            <View style={[styles.levelDot, { backgroundColor: accent }]} />
            <Pressable
              onPress={speakWord}
              hitSlop={8}
              style={({ pressed }) => [styles.wordAudioButton, pressed && styles.pressed]}
            >
              <Text style={styles.wordAudioIcon}>🔊</Text>
              <Text style={styles.wordAudioText}>단어 듣기</Text>
            </Pressable>
          </View>

          <View style={[styles.wordZone, revealed && styles.wordZoneRevealed]}>
            <Text style={styles.word} adjustsFontSizeToFit numberOfLines={1}>{word.word}</Text>
            {!revealed ? (
              <View style={styles.tapHintWrap}>
                <Text style={styles.tapHint}>카드를 눌러 뜻 보기</Text>
              </View>
            ) : null}
          </View>

          {revealed ? (
            <View style={styles.revealZone}>
              <Text style={styles.pinyin}>{word.pinyin}</Text>
              <Text style={styles.meaning}>{word.meaningKo}</Text>
              {word.partOfSpeech ? <Text style={styles.pos}>{word.partOfSpeech}</Text> : null}

              {word.exampleZh ? (
                <View style={styles.exampleBox}>
                  <View style={styles.exampleHeader}>
                    <Text style={styles.exampleLabel}>예문</Text>
                    <Pressable
                      onPress={speakExample}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.exampleSpeakerButton,
                        { borderColor: `${accent}80` },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.exampleSpeakerText, { color: accent }]}>🔊 예문 듣기</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.exampleZh}>{word.exampleZh}</Text>
                  {word.examplePinyin ? <Text style={styles.examplePinyin}>{word.examplePinyin}</Text> : null}
                  {word.exampleKo ? <Text style={styles.exampleKo}>{word.exampleKo}</Text> : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </ScrollView>

      <View style={styles.bottom}>
        <Text style={styles.answerGuide}>
          {revealed ? '기억 상태를 선택하세요' : '뜻을 떠올린 뒤 아래에서 선택하세요'}
        </Text>
        <View style={styles.buttons}>
          <Pressable
            onPress={() => onAnswer('RELEARN')}
            style={({ pressed }) => [styles.actionButton, styles.relearnButton, pressed && styles.pressed]}
          >
            <Text style={styles.relearnText}>다시 학습</Text>
            <Text style={styles.relearnSub}>다음: {relearnNext}</Text>
          </Pressable>

          <Pressable
            onPress={() => onAnswer('KNOWN')}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.knownText}>알고 있음</Text>
            <Text style={styles.knownSub}>다음: {knownNext}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    height: 62,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    color: COLORS.text,
    fontSize: 31,
    fontWeight: '300',
    marginTop: -3,
  },
  counterWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 6,
  },
  counter: {
    color: COLORS.subtext,
    fontSize: 13,
    fontWeight: '800',
  },
  track: {
    height: 5,
    borderRadius: 99,
    width: '100%',
    backgroundColor: COLORS.line,
    overflow: 'hidden',
  },
  fill: {
    height: 5,
    borderRadius: 99,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  stageRow: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  stageChip: {
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stageLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9E6DF',
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHidden: {
    minHeight: 355,
  },
  cardPressed: {
    transform: [{ scale: 0.995 }],
  },
  cardActions: {
    minHeight: 38,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  wordAudioButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 99,
    paddingHorizontal: 11,
    backgroundColor: '#F7F5F1',
  },
  wordAudioIcon: {
    fontSize: 15,
  },
  wordAudioText: {
    color: COLORS.subtext,
    fontSize: 11,
    fontWeight: '800',
  },
  wordZone: {
    minHeight: 245,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  wordZoneRevealed: {
    minHeight: 145,
  },
  word: {
    color: COLORS.text,
    fontSize: 66,
    lineHeight: 82,
    fontWeight: '500',
    textAlign: 'center',
  },
  tapHintWrap: {
    marginTop: 18,
    backgroundColor: '#F7F5F1',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 99,
  },
  tapHint: {
    color: '#99948D',
    fontSize: 11,
    fontWeight: '700',
  },
  revealZone: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 18,
  },
  pinyin: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  meaning: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  pos: {
    color: COLORS.subtext,
    fontSize: 11,
    marginTop: 6,
  },
  exampleBox: {
    width: '100%',
    backgroundColor: '#F8F7F4',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exampleLabel: {
    color: COLORS.subtext,
    fontSize: 11,
    fontWeight: '900',
  },
  exampleSpeakerButton: {
    minHeight: 32,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  exampleSpeakerText: {
    fontSize: 11,
    fontWeight: '900',
  },
  exampleZh: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 25,
  },
  examplePinyin: {
    color: COLORS.subtext,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  exampleKo: {
    color: COLORS.text,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 20,
  },
  bottom: {
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'android' ? 64 : 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: '#ECE9E2',
  },
  answerGuide: {
    color: COLORS.subtext,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  actionButton: {
    flex: 1,
    minHeight: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  relearnButton: {
    backgroundColor: '#FFF2F0',
    borderWidth: 1,
    borderColor: '#F2C8C3',
  },
  relearnText: {
    color: COLORS.danger,
    fontWeight: '900',
    fontSize: 15,
  },
  relearnSub: {
    color: COLORS.danger,
    opacity: 0.75,
    fontSize: 10,
    fontWeight: '700',
  },
  knownText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  knownSub: {
    color: '#FFFFFF',
    opacity: 0.82,
    fontSize: 10,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
