import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { LevelScreen } from './src/screens/LevelScreen';
import { StudyScreen } from './src/screens/StudyScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { getLevelVocabulary } from './src/data/vocabulary';
import { applyAnswer } from './src/lib/srs';
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

  const chooseLevel = (level: HskLevel) => {
    setSelectedLevel(level);
    setMode('LEVEL');
  };

  const changeTarget = (value: number) => {
    setDailyTarget(value);
    void saveDailyTarget(value);
  };

  const startStudy = () => {
    const vocabulary = getLevelVocabulary(selectedLevel);
    const queue = buildStudyQueue(vocabulary, progress, dailyTarget);
    if (!queue.words.length) return;

    setSessionWords(queue.words);
    setSessionIndex(0);
    setSessionResult(emptyResult());
    setMode('STUDY');
  };

  const answerWord = (answer: StudyAnswer) => {
    const word = sessionWords[sessionIndex];
    if (!word) return;

    const previous = progress[word.id];
    const updatedWord = applyAnswer(previous, answer);
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

    if (sessionIndex >= sessionWords.length - 1) {
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
        />
      )}

      {mode === 'STUDY' && currentWord && (
        <StudyScreen
          word={currentWord}
          index={sessionIndex}
          total={sessionWords.length}
          accent={accent}
          progress={progress}
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
