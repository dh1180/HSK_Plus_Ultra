import { Platform } from 'react-native';
const MAX_BYTES = 5_000_000;
export async function exportFile(text: string, name = 'hsk-plus-ultra-backup.json') {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const [{ File, Paths }, Sharing] = await Promise.all([import('expo-file-system'),import('expo-sharing')]);
  if (!await Sharing.isAvailableAsync()) throw new Error('이 기기에서 파일 공유를 사용할 수 없습니다.');
  const file = new File(Paths.cache, name);
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: '학습 기록 백업 저장' });
}
export async function importFile(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
      input.oncancel = () => resolve(null);
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        if (file.size > MAX_BYTES) { reject(new Error('파일 크기는 5MB 이하여야 합니다.')); return; }
        file.text().then(resolve,reject);
      };
      input.click();
    });
  }
  const [Picker,{ File }] = await Promise.all([import('expo-document-picker'),import('expo-file-system')]);
  const result = await Picker.getDocumentAsync({ type: ['application/json','text/plain'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  const file = new File(asset.uri);
  if ((asset.size ?? file.size) > MAX_BYTES) throw new Error('파일 크기는 5MB 이하여야 합니다.');
  return file.text();
}
