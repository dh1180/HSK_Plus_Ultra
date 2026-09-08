import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StudySessionResult } from '../types';
import { COLORS } from '../theme';

interface Props {
  result: StudySessionResult;
  accent: string;
  onDone: () => void;
}

export function SummaryScreen({ result, accent, onDone }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✓</Text>
        </View>
        <Text style={styles.title}>오늘 학습 완료</Text>
        <Text style={styles.subtitle}>오늘도 기억 한 칸을 앞으로 옮겼어요.</Text>

        <View style={styles.card}>
          <Stat label="학습한 단어" value={result.total} />
          <View style={styles.line} />
          <Stat label="알고 있음" value={result.known} />
          <View style={styles.line} />
          <Stat label="다시 학습" value={result.relearn} />
          <View style={styles.line} />
          <Stat label="새로 장기 기억에 들어간 단어" value={result.longTermAdded} />
        </View>

        <View style={styles.ruleBox}>
          <Text style={styles.ruleTitle}>복습 규칙</Text>
          <Text style={styles.ruleText}>
            알고 있으면 한 단계 위로, 다시 학습이면 한 단계 아래로 이동합니다. 새 단어를 바로 알고 있으면 장기 기억으로 이동합니다.
          </Text>
        </View>

        <Pressable onPress={onDone} style={({ pressed }) => [styles.button, { backgroundColor: accent }, pressed && { opacity: 0.85 }]}>
          <Text style={styles.buttonText}>돌아가기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  page: { flex: 1, padding: 24, justifyContent: 'center' },
  badge: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#E3F4EC', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 30, color: COLORS.success, fontWeight: '900' },
  title: { textAlign: 'center', marginTop: 18, fontSize: 27, fontWeight: '900', color: COLORS.text },
  subtitle: { textAlign: 'center', marginTop: 7, fontSize: 13, color: COLORS.subtext },
  card: { marginTop: 28, backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 19, borderWidth: 1, borderColor: COLORS.line },
  stat: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  statValue: { color: COLORS.text, fontSize: 19, fontWeight: '900' },
  line: { height: 1, backgroundColor: COLORS.line },
  ruleBox: { marginTop: 16, backgroundColor: '#ECEAE5', borderRadius: 18, padding: 16 },
  ruleTitle: { color: COLORS.text, fontWeight: '800', fontSize: 12 },
  ruleText: { color: COLORS.subtext, fontSize: 11, lineHeight: 18, marginTop: 5 },
  button: { marginTop: 22, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
