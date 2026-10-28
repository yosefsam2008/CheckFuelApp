// "Clear all history": a quiet full-width card that turns into its own confirmation in place (same height, cross-fade)
import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { PressableScale } from '../calculator/PressableScale';

interface Props {
  confirming: boolean;
  count: number;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClearHistory({ confirming, count, onAsk, onCancel, onConfirm }: Props) {
  const reduced = useReducedMotion();
  const enter = reduced ? undefined : FadeIn.duration(200);
  const press = reduced ? 1 : 0.98;

  if (!confirming)
    return (
      <PressableScale onPress={onAsk} scaleTo={press} style={styles.box} accessibilityRole="button">
        <Animated.View entering={enter} style={styles.ask}>
          <Trash2 size={16} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.askText}>ניקוי כל ההיסטוריה</Text>
        </Animated.View>
      </PressableScale>
    );

  return (
    <View style={styles.box}>
      <Animated.View entering={enter} style={styles.confirm} accessibilityLiveRegion="polite">
        <Text style={styles.question} numberOfLines={2}>
          למחוק את כל {count} הנסיעות?
        </Text>
        <PressableScale onPress={onCancel} scaleTo={press} style={[styles.btn, styles.ghost]} accessibilityRole="button">
          <Text style={styles.btnText}>ביטול</Text>
        </PressableScale>
        <PressableScale onPress={onConfirm} scaleTo={press} style={[styles.btn, styles.danger]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: colors.textInverse }]}>מחק הכל</Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: 60, justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 8 },
  ask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
  askText: { fontFamily: Rubik.medium, fontSize: 14, color: colors.textMuted },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  question: { flex: 1, fontFamily: Rubik.bold, fontSize: 14, color: colors.text, paddingHorizontal: 8 },
  btn: { height: 44, minWidth: 44, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: colors.surfaceSunken },
  danger: { backgroundColor: colors.surfaceInverse },
  btnText: { fontFamily: Rubik.bold, fontSize: 14, color: colors.text },
});
