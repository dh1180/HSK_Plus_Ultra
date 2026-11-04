import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { COLORS } from '../theme';
export class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <View style={{ flex: 1, padding: 28, justifyContent: 'center', gap: 20, backgroundColor: COLORS.background }}>
      <Text accessibilityRole="alert" style={{ color: COLORS.text, fontSize: 18 }}>화면을 표시하지 못했습니다. 저장된 기록을 지우지 않고 다시 불러옵니다.</Text>
      <Pressable accessibilityRole="button" onPress={() => this.setState(s => ({ failed: false, attempt: s.attempt + 1 }))} style={{ padding: 18, borderRadius: 14, backgroundColor: '#FFFFFF' }}><Text>앱 다시 불러오기</Text></Pressable>
    </View>;
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}
