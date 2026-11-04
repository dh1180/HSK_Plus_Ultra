import React, { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppData, parseBackup, serializeBackup } from '../lib/state';
import { exportFile, importFile } from '../lib/backup-files';
import { COLORS } from '../theme';
import appConfig from '../../app.json';
import { VOCABULARY } from '../data/vocabulary';
import { loadRawData } from '../lib/storage';

interface Props { data: AppData; recovery?: boolean; onBack: () => void; onReplace: (data: AppData) => Promise<void>; onReset: () => Promise<void>; }
export function SettingsScreen({ data, recovery, onBack, onReplace, onReset }: Props) {
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [pending,setPending] = useState<AppData | 'reset' | null>(null);
  const eligible = VOCABULARY.filter(w => w.meaningStatus !== 'dictionary-draft').length;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await fn(); } catch (e) { setMessage(e instanceof Error ? e.message : '처리하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  const button = (label: string, fn: () => void, destructive = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} style={[styles.button,destructive && styles.destructive]} onPress={fn}><Text style={[styles.buttonText,destructive && { color: '#9D2637' }]}>{label}</Text></Pressable>;
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>{button('돌아가기',onBack)}<Text accessibilityRole="header" style={styles.title}>설정 및 기록 관리</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      {busy && <ActivityIndicator accessibilityLabel="처리 중" />}
      {!!message && !pending && <Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
      <View style={styles.card}>
        <Text style={styles.heading}>내 학습 기록</Text>
        <Text style={styles.body}>{recovery ? '기록을 읽지 못했습니다. 원본을 내보내 보관한 뒤 백업을 복원하거나 초기화할 수 있습니다.' : `학습한 단어 ${Object.keys(data.progress).length}개 · 한 번에 ${data.dailyTarget}개`}</Text>
        <Text style={styles.body}>기록은 이 기기에 저장됩니다. 앱 삭제·기기 변경 전 백업해 주세요. 백업에는 학습 이력이 포함되니 신뢰하는 곳에 보관하세요.</Text>
        {button(recovery ? '손상된 원본 내보내기' : '기록 백업 내보내기',() => { void run(async () => { await exportFile(recovery ? JSON.stringify(await loadRawData(),null,2) : serializeBackup(data), recovery ? 'hsk-recovery-original.json' : undefined); setMessage('백업 저장 화면을 열었습니다. 선택한 위치에 저장되었는지 확인해 주세요.'); }); })}
        {button('백업 파일 불러오기',() => { void run(async () => { const raw = await importFile(); if (raw !== null) setPending(parseBackup(raw)); }); })}
        {button('학습 기록 초기화',() => setPending('reset'),true)}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>개인정보 안내</Text>
        <Text style={styles.body}>계정 가입 없이 사용합니다. 앱은 이름·이메일·위치·연락처를 요청하지 않으며 자체 서버로 학습 기록을 전송하지 않습니다. 광고·추적·분석 SDK는 포함하지 않습니다.</Text>
        <Text style={styles.body}>저장 항목: 학습 단계, 복습 예정 시각, 응답 횟수, 학습량 설정, 진행 중인 학습입니다. 초기화하면 앱 안의 해당 기록과 이전 버전 기록을 지웁니다. 별도로 내보낸 백업과 운영체제의 백업은 사용자가 관리해야 합니다.</Text>
        <Text style={styles.body}>발음은 운영체제의 TTS를 사용합니다. 선택된 음성 엔진은 제공자 설정에 따라 네트워크를 사용할 수 있습니다. 오프라인 음성은 기기 설정에서 다운로드하세요. 문의 링크는 외부 브라우저에서 열립니다.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>학습 자료와 이용 안내</Text>
        <Text style={styles.body}>전체 {VOCABULARY.length.toLocaleString()}개 중 현재 {eligible.toLocaleString()}개를 학습할 수 있습니다. 표시된 뜻과 예문은 AI 교정 또는 프로젝트 작성 자료입니다. HSK 공식 인증 자료가 아닙니다. 잘못된 내용은 문의로 알려 주세요.</Text>
        <Text style={styles.body}>발음은 기기마다 다를 수 있으며, 다독음자는 화면의 병음과 함께 확인해 주세요. ‘장기 기억’은 자기 평가에 따른 학습 분류입니다.</Text>
        <Text style={styles.body}>어휘·급수·병음·품사: 중외언어교류협력센터의 공식 HSK 시험 대강(2026년 7월 시행)과 대조했습니다. 초기 전사 자료: profesorm/hsk30 · CC BY 4.0. 한국어 뜻과 예문은 공식 번역이 아닙니다. 교정에 사용한 중국어 예문: no7z/hsk-sentences-audio · CC BY-SA 4.0. 해당 예문과 한국어 번역 수정본은 같은 라이선스로 제공합니다. 각 카드에 출처를 표시하며 전체 기록은 저장소에서 확인할 수 있습니다.</Text>
        {button('자료 출처와 라이선스 보기',() => { void run(async () => { await Linking.openURL('https://github.com/dh1180/HSK_Plus_Ultra/blob/main/data/ATTRIBUTION.md'); }); })}
        {button('오류 제보 및 문의',() => { void run(async () => { await Linking.openURL('https://github.com/dh1180/HSK_Plus_Ultra/issues'); }); })}
        <Text style={styles.body}>버전 {appConfig.expo.version} · HSK Plus Ultra</Text>
      </View>
    </ScrollView>
    {pending !== null && <Modal transparent visible animationType="fade" onRequestClose={() => { if (!busy) setPending(null); }}>
      <View style={styles.overlay}><View accessibilityViewIsModal style={styles.dialog}>
        <Text accessibilityRole="header" style={styles.heading}>{pending === 'reset' ? '학습 기록을 지울까요?' : '백업으로 교체할까요?'}</Text>
        <Text style={styles.body}>{pending === 'reset' ? '학습 단계와 진행 중인 학습을 모두 지웁니다. 되돌리려면 미리 내보낸 백업이 필요합니다.' : `불러온 ${pending ? Object.keys(pending.progress).length : 0}개 단어의 기록으로 현재 기록을 교체합니다. 현재 기록을 보관하려면 취소 후 먼저 백업해 주세요.`}</Text>
        {button('취소',() => setPending(null))}
        {button(pending === 'reset' ? '모두 초기화' : '기록 교체',() => { void run(async () => { if (pending === 'reset') await onReset(); else if (pending) await onReplace(pending); setPending(null); setMessage('기록을 저장했습니다.'); }); },true)}
        {!!message && pending !== null && <Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
      </View></View>
    </Modal>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background }, header: { padding: 16, gap: 12 }, title: { fontSize: 23, fontWeight: '800', color: COLORS.text },
  content: { padding: 18, paddingBottom: 40, gap: 18, width: '100%', maxWidth: 720, alignSelf: 'center' }, card: { padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF', gap: 10 },
  heading: { fontSize: 18, fontWeight: '800', color: COLORS.text }, body: { fontSize: 14, lineHeight: 23, color: COLORS.subtext }, button: { padding: 14, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#FFFFFF', alignItems: 'center' }, buttonText: { color: COLORS.text, fontSize: 14, fontWeight: '700' }, destructive: { backgroundColor: '#FFF0F2', borderColor: '#F0CCD1' },
  notice: { padding: 14, color: COLORS.text, backgroundColor: '#FFF2D4', borderRadius: 12 }, overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 22 }, dialog: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, gap: 14, borderRadius: 24, backgroundColor: '#FFFFFF' },
});
