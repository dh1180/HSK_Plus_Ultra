import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressMap } from '../types';
import { createWriteQueue, parseProgress } from './progress';

const PROGRESS_KEY = 'hsk-plus-ultra:progress:v1';
const TARGET_KEY = 'hsk-plus-ultra:daily-target:v1';
const enqueue = createWriteQueue();

export async function loadProgress(): Promise<ProgressMap> {
  return parseProgress(await AsyncStorage.getItem(PROGRESS_KEY));
}

export function saveProgress(progress: ProgressMap) {
  const snapshot = JSON.stringify(progress);
  return enqueue(() => AsyncStorage.setItem(PROGRESS_KEY, snapshot));
}

export async function loadDailyTarget() {
  const raw = await AsyncStorage.getItem(TARGET_KEY);
  const parsed = raw ? Number(raw) : 20;
  return [10, 20, 30].includes(parsed) ? parsed : 20;
}

export function saveDailyTarget(target: number) {
  return enqueue(() => AsyncStorage.setItem(TARGET_KEY, String(target)));
}

export function resetStudyData() {
  return enqueue(() => AsyncStorage.multiRemove([PROGRESS_KEY, TARGET_KEY]));
}
