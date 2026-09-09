import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
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
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>('HOME');
  const [selectedLevel, setSelectedLevel] = useState<HskLevel>(1);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [dailyTarget, setDailyTarget] = useState(20);
  const [sessionWords, setSessionWords] = useState<VocabularyWord[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionBaseTotal, setSessionBaseTotal] = useState(0);
  const [retryingWordIds, setRetryingWordIds] = useState<string[]>([]);
  const [sessionResult, setSessionResult] = useState<StudySessionResult>(emptyResult());

  useEffect(() => {
    let alive = true;
    Promise.all([loadProgress(), loadDailyTarget()])
      .then(([storedProgress, target]) => {
        if (!alive) return;
        setProgress(storedProgress);
        setDailyTarget(target);
      })
      .finally(() => {
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, []);

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

  const changeTarget = (value: number) => {
    setDailyTarget(value);
    void saveDailyTarget(value);
  };

  const beginSession = (words: VocabularyWord[]) => {
    if (!words.length) return;
    setSessionWords(words);
    setSessionIndex(0);
    setSessionBaseTotal(words.length);
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
    if (!word) return;

    const previous = progress[word.id];
    const isRetryAttempt = retryingWordIds.includes(word.id);
    const updatedWord =
      isRetryAttempt && previous
        ? recordSessionRetryAnswer(previous, answer)
        : applyAnswer(previous, answer);

    const nextProgress: ProgressMap = {
      ...progress,
      [word.id]: updatedWord,
    };

    setProgress(nextProgress);
    void saveProgress(nextProgress);

    setSessionResult((current) => ({
      total: current.total + 1,
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

      // 현재 세션의 맨 뒤에 다시 넣는다. 다시 틀리면 또 맨 뒤로 들어가며,
      // `알고 있음`을 누를 때까지 현재 학습 세션 안에서 계속 재출제된다.
      nextSessionWords = [...sessionWords, word];
    } else if (isRetryAttempt) {
      nextRetryingWordIds = retryingWordIds.filter((id) => id !== word.id);
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
        <ActivityIndicator size="large" color={LEVEL_META[1].accent} />
      </View>
    );
  }

  const accent = LEVEL_META[selectedLevel].accent;
  const currentWord = sessionWords[sessionIndex];
  const currentIsRetry = currentWord ? retryingWordIds.includes(currentWord.id) : false;
  const displayIndex = Math.min(sessionIndex, Math.max(sessionBaseTotal - 1, 0));

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

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
          word={currentWord}
          index={displayIndex}
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
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
