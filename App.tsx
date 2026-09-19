import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  Text,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { LevelScreen } from './src/screens/LevelScreen';
import { StudyScreen } from './src/screens/StudyScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { getLevelVocabulary } from './src/data/vocabulary';
import { applyAnswer, recordSessionRetryAnswer } from './src/lib/srs';
import { buildStudyQueue } from './src/lib/study';
import { loadDailyTarget, loadProgress, saveDailyTarget, saveProgress } from './src/lib/storage';
import { COLORS, LEVEL_META } from './src/theme';
import {
  HskLevel,
  ProgressMap,
  StudyAnswer,
  StudySessionResult,
  VocabularyWord,
} from './src/types';

type Mode = 'HOME' | 'LEVEL' | 'STUDY' | 'SUMMARY';

const emptyResult = (): StudySessionResult => ({
  total: 0,
  known: 0,
  relearn: 0,
  longTermAdded: 0,
});

export default function App() {
  return <SafeAreaProvider><StudyApp /></SafeAreaProvider>;
}

function StudyApp() {
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const answerLock = useRef(false);
  const saveRevision = useRef(0);
  const [mode, setMode] = useState<Mode>('HOME');
  const [selectedLevel, setSelectedLevel] = useState<HskLevel>(1);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [dailyTarget, setDailyTarget] = useState(20);
  const [sessionWords, setSessionWords] = useState<VocabularyWord[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionBaseTotal, setSessionBaseTotal] = useState(0);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);
  const [retryingWordIds, setRetryingWordIds] = useState<string[]>([]);
  const [sessionResult, setSessionResult] = useState<StudySessionResult>(emptyResult());

  useEffect(() => {
    let alive = true;
    setLoadError(false);
    Promise.all([loadProgress(), loadDailyTarget()])
      .then(([storedProgress, target]) => {
        if (!alive) return;
        setProgress(storedProgress);
        setDailyTarget(target);
        setReady(true);
      })
      .catch(() => { if (alive) setLoadError(true); });

    return () => {
      alive = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'HOME') {
        return false;
      }

      if (mode === 'LEVEL') {
        setMode('HOME');
        return true;
      }

      if (mode === 'STUDY' || mode === 'SUMMARY') {
        setMode('LEVEL');
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [mode]);

  const chooseLevel = (level: HskLevel) => {
    setSelectedLevel(level);
    setMode('LEVEL');
  };

  const persist = (nextProgress: ProgressMap, target: number) => {
    const revision = ++saveRevision.current;
    void Promise.all([saveProgress(nextProgress), saveDailyTarget(target)])
      .then(() => { if (revision === saveRevision.current) setSaveError(false); })
      .catch(() => { if (revision === saveRevision.current) setSaveError(true); });
  };

  useEffect(() => { answerLock.current = false; }, [sessionIndex, mode]);

  const changeTarget = (value: number) => {
    setDailyTarget(value);
    persist(progress, value);
  };

  const beginSession = (words: VocabularyWord[]) => {
    if (!words.length) return;
    setSessionWords(words);
    setSessionIndex(0);
    setSessionBaseTotal(words.length);
    setSessionCompletedCount(0);
    setRetryingWordIds([]);
    setSessionResult(emptyResult());
    setMode('STUDY');
  };

  const startStudy = () => {
    const vocabulary = getLevelVocabulary(selectedLevel);
    const queue = buildStudyQueue(vocabulary, progress, dailyTarget);
    beginSession(queue.words);
  };

  const startManualReview = (word: VocabularyWord) => {
    beginSession([word]);
  };

  const answerWord = (answer: StudyAnswer) => {
    const word = sessionWords[sessionIndex];
    if (!word || word.meaningStatus === 'dictionary-draft' || answerLock.current) return;
    answerLock.current = true;

    const previous = progress[word.id];
    const isRetryAttempt = retryingWordIds.includes(word.id);

    // 첫 `다시 학습`은 반드시 실제 SRS 단계를 내린다.
    // 예: DAY_3 -> MIN_30, DAY_7 -> DAY_3, DAY_21 -> DAY_7.
    // 재출제 성공은 단계를 유지하고, 재출제 실패는 한 단계 더 내린다.
    const updatedWord =
      isRetryAttempt && previous
        ? recordSessionRetryAnswer(previous, answer)
        : applyAnswer(previous, answer);

    const nextProgress: ProgressMap = {
      ...progress,
      [word.id]: updatedWord,
    };

    setProgress(nextProgress);
    persist(nextProgress, dailyTarget);

    setSessionResult((current) => ({
      total: current.total + (isRetryAttempt ? 0 : 1),
      known: current.known + (answer === 'KNOWN' ? 1 : 0),
      relearn: current.relearn + (answer === 'RELEARN' ? 1 : 0),
      longTermAdded:
        current.longTermAdded +
        (previous?.stage !== 'LONG_TERM' && updatedWord.stage === 'LONG_TERM' ? 1 : 0),
    }));

    let nextRetryingWordIds = retryingWordIds;
    let nextSessionWords = sessionWords;

    if (answer === 'RELEARN') {
      if (!isRetryAttempt) {
        nextRetryingWordIds = [...retryingWordIds, word.id];
      }

      // 틀린 단어는 즉시 다시 보여 주지 않고 현재 큐의 맨 뒤로 보낸다.
      // 따라서 최초 20개를 모두 본 뒤 `다시 학습`한 단어들만 다시 나오며,
      // 재출제에서도 틀리면 다시 맨 뒤로 이동한다.
      nextSessionWords = [...sessionWords, word];
    } else {
      // 진행 숫자는 `알고 있음`으로 해결된 원래 단어 수만 센다.
      // 다시 학습 응답은 완료 수를 증가시키지 않는다.
      setSessionCompletedCount((current) => Math.min(sessionBaseTotal, current + 1));

      if (isRetryAttempt) {
        nextRetryingWordIds = retryingWordIds.filter((id) => id !== word.id);
      }
    }

    if (nextSessionWords !== sessionWords) {
      setSessionWords(nextSessionWords);
    }
    if (nextRetryingWordIds !== retryingWordIds) {
      setRetryingWordIds(nextRetryingWordIds);
    }

    if (sessionIndex >= nextSessionWords.length - 1) {
      setMode('SUMMARY');
    } else {
      setSessionIndex((current) => current + 1);
    }
  };

  if (!ready) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        {loadError ? <>
          <Text style={styles.errorText}>학습 기록을 불러오지 못했습니다. 기존 기록은 보존됩니다.</Text>
          <Pressable accessibilityRole="button" onPress={() => setLoadAttempt(value => value + 1)} style={styles.retryButton}>
            <Text>다시 불러오기</Text>
          </Pressable>
        </> : <ActivityIndicator size="large" color={LEVEL_META[1].accent} />}
      </View>
    );
  }

  const accent = LEVEL_META[selectedLevel].accent;
  const currentWord = sessionWords[sessionIndex];
  const currentIsRetry = currentWord ? retryingWordIds.includes(currentWord.id) : false;


  return (
    <View style={styles.app}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {saveError && <SafeAreaView edges={['top']} style={styles.saveError}><Text style={styles.errorText} accessibilityRole="alert">기기에 저장하지 못했습니다. 앱을 닫기 전에 다시 저장해 주세요.</Text><Pressable accessibilityRole="button" onPress={() => persist(progress, dailyTarget)} style={styles.retryButton}><Text>다시 저장</Text></Pressable></SafeAreaView>}

      {mode === 'HOME' && <HomeScreen progress={progress} onSelectLevel={chooseLevel} />}

      {mode === 'LEVEL' && (
        <LevelScreen
          level={selectedLevel}
          progress={progress}
          dailyTarget={dailyTarget}
          onChangeTarget={changeTarget}
          onBack={() => setMode('HOME')}
          onStartStudy={startStudy}
          onReviewWord={startManualReview}
        />
      )}

      {mode === 'STUDY' && currentWord && (
        <StudyScreen
          key={sessionIndex}
          word={currentWord}
          completed={sessionCompletedCount}
          total={sessionBaseTotal}
          accent={accent}
          progress={progress}
          isRetry={currentIsRetry}
          onAnswer={answerWord}
          onClose={() => setMode('LEVEL')}
        />
      )}

      {mode === 'SUMMARY' && (
        <SummaryScreen
          result={sessionResult}
          accent={accent}
          onDone={() => setMode('LEVEL')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.background },
  saveError: { paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#FFF2E5' },
  errorText: { color: COLORS.text, textAlign: 'center', padding: 12 },
  retryButton: { padding: 12, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
