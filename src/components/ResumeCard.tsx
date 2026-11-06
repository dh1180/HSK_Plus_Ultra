import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  level: number;
  total: number;
  remaining: number;
  retryCount: number;
  onResume: () => void;
  onEnd: () => void;
}

export function ResumeCard({ level, total, remaining, retryCount, onResume, onEnd }: Props) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const completed = total - remaining;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>저장된 학습 · HSK {level}</Text>
      <Text accessibilityRole="header" style={styles.title}>학습 이어하기</Text>
      <Text style={styles.detail}>{completed} / {total}개 완료 · {remaining}개 남음{retryCount > 0 ? ` · 다시 학습 ${retryCount}개 포함` : ''}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${completed / total * 100}%` }]} />
      </View>
      {confirmEnd ? (
        <>
          <Text style={styles.detail}>지금까지 답한 기록은 저장됩니다. 남은 학습을 종료할까요?</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setConfirmEnd(false)} style={styles.secondary}><Text style={styles.label}>취소</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={onEnd} style={styles.secondary}><Text style={[styles.label, { color: COLORS.danger }]}>세션 종료 확인</Text></Pressable>
          </View>
        </>
      ) : (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="중단한 학습 이어하기" onPress={onResume} style={styles.primary}><Text style={styles.label}>남은 {remaining}개 이어하기 ›</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setConfirmEnd(true)} style={styles.secondary}><Text style={styles.detail}>남은 세션 종료 · 답변 기록은 유지</Text></Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, gap: 8, borderRadius: 20, backgroundColor: COLORS.yellowSoft, borderWidth: 1, borderColor: COLORS.yellowLine },
  eyebrow: { color: '#6E5014', fontSize: 13, fontWeight: '800' },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  detail: { color: COLORS.subtext, fontSize: 14 },
  track: { height: 6, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.yellowLine, marginVertical: 4 },
  fill: { height: '100%', backgroundColor: '#88600B' },
  primary: { minHeight: 48, padding: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.yellow, borderRadius: 12 },
  secondary: { minHeight: 44, padding: 8, justifyContent: 'center', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  label: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
});
