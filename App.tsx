import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, Text, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { LevelScreen } from './src/screens/LevelScreen';
import { StudyScreen } from './src/screens/StudyScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { getLevelVocabulary, VOCABULARY } from './src/data/vocabulary';
import { buildStudyQueue } from './src/lib/study';
import { loadAppData, resetStudyData, saveAppData } from './src/lib/storage';
import { answerStudy, AppData, beginStudy, emptyData, emptyResult } from './src/lib/state';
import { COLORS, LEVEL_META } from './src/theme';
import { HskLevel, StudyAnswer, VocabularyWord } from './src/types';

type Mode = 'HOME' | 'LEVEL' | 'STUDY' | 'SUMMARY' | 'PREVIEW' | 'SETTINGS';
const byId = new Map(VOCABULARY.map(w => [w.id,w]));
export default function App() { return <SafeAreaProvider><ErrorBoundary><StudyApp /></ErrorBoundary></SafeAreaProvider>; }
function StudyApp() {
  const [saving,setSaving] = useState(false);
  const [ready,setReady] = useState(false), [loadError,setLoadError] = useState(false), [saveError,setSaveError] = useState(false);
  const [loadAttempt,setLoadAttempt] = useState(0), [cardKey,setCardKey] = useState(0);
  const [data,setData] = useState<AppData>(emptyData);
  const current = useRef(data), answerLock = useRef(false), revision = useRef(0);
  const [mode,setMode] = useState<Mode>('HOME');
  const [selectedLevel,setSelectedLevel] = useState<HskLevel>(1);
  const [preview,setPreview] = useState<VocabularyWord | null>(null);
  const [result,setResult] = useState(emptyResult);
  useEffect(() => {
    let alive = true; setLoadError(false);
    loadAppData().then(stored => {
      if (!alive) return;
      // Only retain a session when every item is still approved learning content.
      if (stored.session && !stored.session.originalIds.every(id => byId.get(id)?.meaningStatus !== 'dictionary-draft')) stored = { ...stored, session: null };
      current.current = stored; setData(stored); setReady(true);
    }).catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  },[loadAttempt]);
  const persist = (next: AppData) => {
    const version = ++revision.current;
    current.current = next; setData(next); setSaving(true);
    void saveAppData(next).then(() => { if (version === revision.current) setSaveError(false); }).catch(() => { if (version === revision.current) setSaveError(true); }).finally(() => { if (version === revision.current) setSaving(false); });
  };
  useEffect(() => {
    if (Platform.OS !== 'web' || (!saving && !saveError)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  },[saving,saveError]);
  const leave = () => { setPreview(null); setMode(mode === 'SETTINGS' || mode === 'LEVEL' ? 'HOME' : 'LEVEL'); };
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress',() => { if (mode === 'HOME') return false; leave(); return true; });
    return () => sub.remove();
  },[mode]);
  useEffect(() => { answerLock.current = false; },[cardKey,mode]);
  const chooseLevel = (level: HskLevel) => { setSelectedLevel(level); setMode('LEVEL'); };
  const begin = (words: VocabularyWord[]) => {
    if (!words.length || current.current.session) return;
    persist(beginStudy(current.current,selectedLevel,words.map(w => w.id))); setCardKey(k => k + 1); setMode('STUDY');
  };
  const resume = () => { const s = current.current.session; if (s) { setSelectedLevel(s.level); setCardKey(k => k + 1); setMode('STUDY'); } };
  const startStudy = () => {
    if (current.current.session) { resume(); return; }
    begin(buildStudyQueue(getLevelVocabulary(selectedLevel),current.current.progress,current.current.dailyTarget).words);
  };
  const manual = (word: VocabularyWord) => {
    if (word.meaningStatus !== 'dictionary-draft' && !current.current.session) { begin([word]); return; }
    // Reading another entry never overwrites a paused session.
    setPreview(word); setCardKey(k => k + 1); setMode('PREVIEW');
  };
  const answer = (value: StudyAnswer) => {
    const s = current.current.session, word = s && byId.get(s.remainingIds[0]!);
    if (answerLock.current || !word || word.meaningStatus === 'dictionary-draft') return;
    answerLock.current = true;
    const next = answerStudy(current.current,value);
    persist(next.data); setResult(next.result); setCardKey(k => k + 1);
    if (!next.data.session) setMode('SUMMARY');
  };
  const replace = async (next: AppData) => {
    if (next.session && !next.session.originalIds.every(id => byId.get(id)?.meaningStatus !== 'dictionary-draft')) next = { ...next, session: null };
    await saveAppData(next); current.current = next; setData(next); setSaveError(false); setLoadError(false); setReady(true);
  };
  const reset = async () => { await resetStudyData(); const next = emptyData(); current.current = next; setData(next); setSaveError(false); setLoadError(false); setReady(true); };
  if (mode === 'SETTINGS') return <SettingsScreen data={data} recovery={!ready} onBack={() => setMode('HOME')} onReplace={replace} onReset={reset} />;
  if (!ready) return <SafeAreaView style={styles.loading}><StatusBar barStyle="dark-content" />{loadError ? <>
    <Text accessibilityRole="alert" style={styles.message}>학습 기록을 불러오지 못했습니다. 기존 기록은 보존됩니다.</Text>
    <Pressable accessibilityRole="button" style={styles.button} onPress={() => setLoadAttempt(n => n + 1)}><Text>다시 불러오기</Text></Pressable>
    <Pressable accessibilityRole="button" style={styles.button} onPress={() => setMode('SETTINGS')}><Text>기록 복구 및 백업</Text></Pressable>
  </> : <ActivityIndicator size="large" />}</SafeAreaView>;
  const s = data.session;
  const word = mode === 'PREVIEW' ? preview : s ? byId.get(s.remainingIds[0]!) : null;
  return <View style={styles.app}>
    <StatusBar barStyle="dark-content" />
    {saving && !saveError && <Text accessibilityLiveRegion="polite" style={styles.message}>저장 중…</Text>}
    {saveError && <SafeAreaView edges={['top']} style={styles.notice}><Text accessibilityRole="alert" style={styles.message}>기기에 저장하지 못했습니다. 앱을 닫기 전에 다시 저장해 주세요.</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => persist(current.current)}><Text>다시 저장</Text></Pressable></SafeAreaView>}
    {mode === 'HOME' && <HomeScreen progress={data.progress} onSelectLevel={chooseLevel} onSettings={() => setMode('SETTINGS')} />}
    {(mode === 'HOME' || mode === 'LEVEL') && s && <SafeAreaView edges={['bottom']} style={styles.notice}><Text style={styles.message}>HSK {s.level} · 중단한 학습 {s.originalIds.length - s.remainingIds.length} / {s.originalIds.length} 완료</Text><Pressable accessibilityRole="button" style={styles.button} onPress={resume}><Text>중단한 학습 이어하기</Text></Pressable><Pressable accessibilityRole="button" style={styles.button} onPress={() => persist({ ...current.current, session: null })}><Text>남은 세션 종료 · 답변 기록은 유지</Text></Pressable></SafeAreaView>}
    {mode === 'LEVEL' && <LevelScreen level={selectedLevel} progress={data.progress} dailyTarget={data.dailyTarget} onChangeTarget={dailyTarget => persist({ ...current.current,dailyTarget })} onBack={() => setMode('HOME')} onStartStudy={startStudy} onReviewWord={manual} />}
    {(mode === 'STUDY' || mode === 'PREVIEW') && word && <StudyScreen key={cardKey} word={word} completed={mode === 'PREVIEW' ? 0 : s!.originalIds.length - s!.remainingIds.length} total={mode === 'PREVIEW' ? 1 : s!.originalIds.length} accent={LEVEL_META[word.level].accent} progress={data.progress} isRetry={mode === 'STUDY' && s!.retryIds.includes(word.id)} readOnly={mode === 'PREVIEW'} onAnswer={answer} onClose={() => { setPreview(null); setMode('LEVEL'); }} />}
    {mode === 'SUMMARY' && <SummaryScreen result={result} accent={LEVEL_META[selectedLevel].accent} onDone={() => setMode('LEVEL')} />}
  </View>;
}
const styles = StyleSheet.create({ app: { flex: 1, backgroundColor: COLORS.background }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16, backgroundColor: COLORS.background }, notice: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF2E5', gap: 6 }, message: { color: COLORS.text, textAlign: 'center', padding: 6 }, button: { minHeight: 44, padding: 12, alignItems: 'center', borderRadius: 12, backgroundColor: '#FFFFFF' } });
