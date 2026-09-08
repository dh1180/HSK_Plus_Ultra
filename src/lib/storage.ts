import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressMap } from '../types';

const PROGRESS_KEY = 'hsk-plus-ultra:progress:v1';
const TARGET_KEY = 'hsk-plus-ultra:daily-target:v1';

export async function loadProgress(): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

export async function saveProgress(progress: ProgressMap) {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export async function loadDailyTarget() {
  try {
    const raw = await AsyncStorage.getItem(TARGET_KEY);
    const parsed = raw ? Number(raw) : 20;
    return [10, 20, 30].includes(parsed) ? parsed : 20;
  } catch {
    return 20;
  }
}

export async function saveDailyTarget(target: number) {
  await AsyncStorage.setItem(TARGET_KEY, String(target));
}

export async function resetStudyData() {
  await AsyncStorage.multiRemove([PROGRESS_KEY, TARGET_KEY]);
}
