import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Speech from 'expo-speech';
import { ProgressMap, StudyAnswer, VocabularyWord } from '../types';
import { COLORS } from '../theme';
import { reviewTimingText, STAGE_LABEL, transitionStage } from '../lib/srs';

interface Props {
  word: VocabularyWord;
  cardKey: number;
  completed: number;
  total: number;
  accent: string;
  progress: ProgressMap;
  isRetry: boolean;
  readOnly?: boolean;
  onAnswer: (answer: StudyAnswer) => void;
  onClose: () => void;
}

export function StudyScreen({
  word,
  cardKey,
  completed,
  total,
  accent,
  progress,
  isRetry,
  readOnly = false,
  onAnswer,
  onClose,
}: Props) {
  const { width, height, fontScale } = useWindowDimensions();
  const wide = width >= 560 && height / width < 0.78 && fontScale <= 1.3;
  const compact = height < 580;
  const [revealedCard, setRevealedCard] = useState<number | null>(null);
  const revealed = revealedCard === cardKey;
  const [speechErrorCard, setSpeechError] = useState<number | null>(null);
  const [linkErrorCard, setLinkError] = useState<number | null>(null);
  const speechRequest = useRef(0);
  const item = progress[word.id];
  const currentStage = item?.stage ?? 'NEW';
  const isDraft = word.meaningStatus === 'dictionary-draft';
  const locked = isDraft || readOnly;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || event.repeat || event.isComposing ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!revealed && event.code === 'Space' && !target?.closest('button, a, [role="button"], [role="link"]')) {
        event.preventDefault();
        setRevealedCard(cardKey);
      } else if (revealed && !locked && (event.key === '1' || event.key === '2')) {
        event.preventDefault();
        onAnswer(event.key === '1' ? 'RELEARN' : 'KNOWN');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cardKey, revealed, locked, onAnswer]);

  useEffect(() => {
    return () => {
      speechRequest.current++;
      void Speech.stop().catch(() => undefined);
    };
  }, [cardKey]);

  const knownNext = useMemo(
    () => (isRetry ? STAGE_LABEL[currentStage] : STAGE_LABEL[transitionStage(currentStage, 'KNOWN')]),
    [currentStage, isRetry],
  );
  const relearnNext = useMemo(
    () => STAGE_LABEL[transitionStage(currentStage, 'RELEARN')],
    [currentStage],
  );

  const speak = async (text: string, rate: number) => {
    const request = ++speechRequest.current;
    setSpeechError(null);
    try {
      await Speech.stop();
      const voices = await Speech.getAvailableVoicesAsync();
      const voice = voices.find(v => /^zh[-_](CN|SG|Hans)/i.test(v.language));
      if (request !== speechRequest.current) return;
      if (!voice) throw new Error('중국어 음성을 사용할 수 없습니다.');
      Speech.speak(text, {
        voice: voice.identifier,
        language: 'zh-CN', rate, pitch: 1.0,
        onError: () => { if (request === speechRequest.current) setSpeechError(cardKey); },
      });
    } catch {
      if (request === speechRequest.current) setSpeechError(cardKey);
    }
  };

  const speakWord = () => { void speak(word.word, 0.78); };
  const speakExample = () => { if (word.exampleZh) void speak(word.exampleZh, 0.72); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.shell, wide && styles.shellWide]}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="학습 닫기" onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.close}>×</Text>
          </Pressable>

          <View style={styles.counterWrap}>
            <Text style={styles.counter}>{completed} / {total} 완료</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${(completed / total) * 100}%`,
                    backgroundColor: accent,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.closeButton} />
        </View>

        <View testID="study-card-frame" style={[styles.card, wide && styles.cardWide]}>
          <View style={[styles.prompt, compact && styles.promptCompact, wide && styles.promptWide]}>
            <View style={styles.cardActions}>
              <Text numberOfLines={1} style={[styles.stageLabel, { color: accent }]}>
                {readOnly ? '미리 보기' : isRetry ? '다시 학습' : 'HSK ' + word.level}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="중국어 단어 듣기"
                onPress={speakWord} style={({ pressed }) => [styles.wordAudioButton, pressed && styles.pressed]}>
                <Text style={styles.wordAudioText}>🔊 단어 듣기</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button"
              accessibilityLabel={revealed ? word.word + ', ' + word.meaningKo : word.word + ', 뜻 보기'}
              onPress={() => setRevealedCard(cardKey)} style={styles.wordZone}>
              <Text style={[styles.word, compact && styles.wordCompact]} adjustsFontSizeToFit numberOfLines={1}>{word.word}</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.stageTiming}>{reviewTimingText(item)}</Text>
          </View>

          <View style={[styles.detail, wide && styles.detailWide]}>
            {revealed ? (
              <ScrollView key={cardKey} style={styles.scrollView} contentContainerStyle={styles.revealZone}>
                <Text style={styles.detailLabel}>정답 확인</Text>
                <Text style={styles.pinyin}>{word.pinyin}</Text>
                <Text style={styles.meaning}>{word.meaningKo}</Text>
                <Text style={styles.qualityNote}>{word.meaningStatus === 'dictionary-draft'
                  ? '자동 매핑 뜻 · 의미와 품사 검토 필요'
                  : word.meaningStatus === 'editorial' ? 'AI 보조 교정 · 교사 검수 전' : '프로젝트 작성 뜻'}</Text>
                {word.partOfSpeech ? <Text style={styles.pos}>{word.partOfSpeech}</Text> : null}
                {word.exampleZh ? (
                  <View style={styles.exampleBox}>
                    <View style={styles.exampleHeader}>
                      <Text style={styles.exampleLabel}>예문</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="중국어 예문 듣기"
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
                    <Text style={styles.exampleZh}>{word.exampleZh.split(word.word).map((part, partIndex) => (
                      <React.Fragment key={partIndex}>{partIndex > 0 && <Text style={{ color: accent, fontWeight: '900' }}>{word.word}</Text>}{part}</React.Fragment>
                    ))}</Text>
                    {word.examplePinyin ? <Text style={styles.examplePinyin}>{word.examplePinyin}</Text> : null}
                    {word.exampleKo ? <Text style={styles.exampleKo}>{word.exampleKo}</Text> : null}
                    <Text style={styles.qualityNote}>{word.exampleSource}</Text>
                  </View>
                ) : <Text style={styles.qualityNote}>예문 검토 중 · 확인되지 않은 자동 생성 예문은 표시하지 않습니다.</Text>}
                {word.wordSourceUrl && <Pressable accessibilityRole="link" accessibilityLabel="공식 어휘 원문 보기" onPress={() => { setLinkError(null); void Linking.openURL(word.wordSourceUrl!).catch(() => setLinkError(cardKey)); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={styles.qualityNote}>{word.wordSource} · 원문 보기</Text></Pressable>}
              </ScrollView>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setRevealedCard(cardKey)} style={styles.cover}>
                <Text style={styles.coverIndex}>01 / 떠올리기</Text>
                <Text style={styles.coverTitle}>뜻을 떠올려 보세요</Text>
                <Text style={styles.tapHint}>뜻·병음·예문 보기  ↓</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.bottom}>
          {(linkErrorCard === cardKey || speechErrorCard === cardKey) && (
            <View style={styles.studyNotice}>
              <Text accessibilityRole="alert" style={styles.studyNoticeText}>
                {linkErrorCard === cardKey ? '공식 원문을 열지 못했습니다. 인터넷 연결을 확인해 주세요.' :
                  '음성을 재생하지 못했습니다. 기기의 중국어 음성 설정을 확인해 주세요.'}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="안내 닫기"
                onPress={() => { setLinkError(null); setSpeechError(null); }} style={styles.closeButton}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
          )}
          <Text numberOfLines={1} style={styles.answerGuide}>
            {readOnly || isDraft ? '미리 보기 · 학습 기록에 반영하지 않아요' :
              Platform.OS === 'web' ? 'Space 뜻 보기   ·   1 다시 학습   ·   2 알고 있음' : '뜻을 확인한 뒤 기억 상태를 선택하세요'}
          </Text>
          <View style={styles.buttons}>
            <Pressable
              accessibilityRole="button"
              disabled={!revealed || locked}
              accessibilityState={{ disabled: !revealed || locked }}
              onPress={() => onAnswer('RELEARN')}
              style={({ pressed }) => [styles.actionButton, styles.relearnButton, (!revealed || locked) && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.relearnText}>다시 학습</Text>
              <Text style={styles.relearnSub}>다음: {relearnNext}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!revealed || locked}
              accessibilityState={{ disabled: !revealed || locked }}
              onPress={() => onAnswer('KNOWN')}
              style={({ pressed }) => [
                styles.actionButton,
                (!revealed || locked) && styles.disabled,
                { backgroundColor: COLORS.yellow },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.knownText}>알고 있음</Text>
              <Text style={styles.knownSub}>다음: {knownNext}</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  qualityNote: { color: COLORS.subtext, fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'left' },
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  shell: { flex: 1, width: '100%', alignSelf: 'center' },
  shellWide: { maxWidth: 1000, maxHeight: 750, marginVertical: 'auto' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    minHeight: 56,
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
  scrollView: { flex: 1 },
  card: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'center',
    width: '94%',
    maxWidth: 700,
    marginVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.yellowLine,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  cardWide: { flexDirection: 'row', maxWidth: 940 },
  prompt: { minHeight: 164, backgroundColor: COLORS.yellowSoft, paddingHorizontal: 18, paddingVertical: 8 },
  promptCompact: { minHeight: 108, paddingVertical: 4 },
  promptWide: { flex: 2, justifyContent: 'center', paddingHorizontal: 22 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  stageLabel: { fontSize: 12, fontWeight: '900', flex: 1 },
  stageTiming: { color: COLORS.subtext, fontSize: 11, textAlign: 'center', marginBottom: 3 },
  wordAudioButton: { minHeight: 44, justifyContent: 'center', borderRadius: 99, paddingHorizontal: 12, backgroundColor: COLORS.surface },
  wordAudioText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  wordZone: { flex: 1, minHeight: 54, justifyContent: 'center', alignItems: 'stretch', paddingHorizontal: 4 },
  word: { color: COLORS.text, fontSize: 59, fontWeight: '800', textAlign: 'center' },
  wordCompact: { fontSize: 42 },
  detail: { flex: 1, minHeight: 0, borderTopWidth: 1, borderTopColor: COLORS.yellowLine },
  detailWide: { flex: 3, borderTopWidth: 0, borderLeftWidth: 1, borderLeftColor: COLORS.yellowLine },
  cover: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12, gap: 7 },
  coverIndex: { color: COLORS.subtext, fontSize: 11, fontWeight: '800' },
  coverTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  tapHint: { color: COLORS.text, fontSize: 12, fontWeight: '800', backgroundColor: COLORS.yellowSoft, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, overflow: 'hidden' },
  revealZone: { padding: 14, alignItems: 'stretch' },
  detailLabel: { color: COLORS.subtext, fontSize: 11, fontWeight: '900', marginBottom: 4 },
  studyNotice: { position: 'absolute', bottom: '100%', alignSelf: 'center', width: '100%', maxWidth: 650, backgroundColor: COLORS.yellowSoft, borderWidth: 1, borderColor: COLORS.yellowLine, borderRadius: 12, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  studyNoticeText: { flex: 1, color: COLORS.text, fontSize: 12 },
  pinyin: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'left',
  },
  meaning: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'left',
  },
  pos: {
    color: COLORS.subtext,
    fontSize: 11,
    marginTop: 6,
  },
  exampleBox: {
    width: '100%',
    backgroundColor: COLORS.background,
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
    minHeight: 44,
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
    zIndex: 1,
    paddingTop: 5,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
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
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  actionButton: {
    flex: 1,
    minHeight: 53,
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
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 15,
  },
  knownSub: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
});
