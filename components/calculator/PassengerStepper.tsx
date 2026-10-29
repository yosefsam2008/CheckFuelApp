import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { haptic, spring, useEnter } from '../../constants/motion';
import { colors, Heebo, radius, shadow } from '../../constants/theme';
import { PressableScale } from './PressableScale';
import { SlidingDigits } from './SlidingDigits';

const MIN = 1;

function RoundButton({ icon, label, disabled, onPress }: { icon: React.ReactNode; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale
      scaleTo={0.9}
      hitSlop={4}
      disabled={disabled}
      onPress={onPress}
      style={[styles.btn, disabled && { opacity: 0.4 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
    </PressableScale>
  );
}

export function PassengerStepper({ count, onChange, max = 8 }: { count: number; onChange: (n: number) => void; max?: number }) {
  const ent = useEnter(300);
  const bump = useSharedValue(1);
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  const step = (d: number) => {
    const next = Math.min(max, Math.max(MIN, count + d));
    if (next === count) return;
    haptic.select();
    bump.value = withSequence(withSpring(0.9, spring.snappy), withSpring(1, spring.snappy));
    onChange(next);
  };

  return (
    <Animated.View style={[styles.card, shadow.card, ent]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>כמה נוסעים ברכב?</Text>
        <Text style={styles.hint} numberOfLines={2}>{count === 1 ? 'אפשר לחלק את העלות עם חברים' : 'העלות מתחלקת שווה בשווה'}</Text>
      </View>
      <Animated.View
        style={[styles.capsule, bumpStyle]}
        accessibilityRole="adjustable"
        accessibilityLabel="מספר נוסעים"
        accessibilityValue={{ min: MIN, max, now: count }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <RoundButton label="פחות נוסעים" disabled={count === MIN} onPress={() => step(-1)} icon={<Minus size={20} color={colors.text} strokeWidth={2} />} />
        <View style={styles.count}>
          <SlidingDigits value={String(count)} fontSize={22} color={colors.text} fontFamily={Heebo.extra} />
        </View>
        <RoundButton label="יותר נוסעים" disabled={count === max} onPress={() => step(1)} icon={<Plus size={20} color={colors.text} strokeWidth={2} />} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  hint: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  capsule: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 24, padding: 4 },
  btn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.button },
  count: { width: 36, alignItems: 'center' },
});
