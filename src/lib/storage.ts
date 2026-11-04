import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, emptyData, parseAppData } from './state';
import { createWriteQueue, parseProgress } from './progress';

export const STATE_KEY = 'hsk-plus-ultra:state:v2';
const PROGRESS_KEY = 'hsk-plus-ultra:progress:v1';
const TARGET_KEY = 'hsk-plus-ultra:daily-target:v1';
const enqueue = createWriteQueue();

export async function loadAppData(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (raw !== null) return parseAppData(raw);
  // Keep v1 untouched until an atomic v2 save succeeds; damaged data is never erased.
  const [progress, target] = await Promise.all([AsyncStorage.getItem(PROGRESS_KEY), AsyncStorage.getItem(TARGET_KEY)]);
  const data = { ...emptyData(), progress: parseProgress(progress), dailyTarget: [10,20,30].includes(Number(target)) ? Number(target) : 20 };
  return parseAppData(JSON.stringify(data));
}
export function saveAppData(data: AppData) {
  const snapshot = JSON.stringify(parseAppData(JSON.stringify(data)));
  return enqueue(() => AsyncStorage.setItem(STATE_KEY, snapshot));
}
export function resetStudyData() {
  return enqueue(async () => {
    // Write the reset first so a failed removal cannot resurrect legacy data.
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(emptyData()));
    await AsyncStorage.multiRemove([PROGRESS_KEY,TARGET_KEY]);
  });
}
// Useful for recovering a corrupt local state without parsing or overwriting it.
export async function loadRawData() {
  return { current: await AsyncStorage.getItem(STATE_KEY), legacyProgress: await AsyncStorage.getItem(PROGRESS_KEY), legacyTarget: await AsyncStorage.getItem(TARGET_KEY) };
}
