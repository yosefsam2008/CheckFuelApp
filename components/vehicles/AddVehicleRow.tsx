// Last row of the switch list. Press feedback is on the green circle only: 0.92, then a spring back.
import Plus from 'lucide-react-native/dist/esm/icons/plus';
import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';

export const AddVehicleRow = memo(function AddVehicleRow({ onPress }: { onPress: () => void }) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => () => cancelAnimation(s), [s]);
  const circle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      onPressIn={() => !reduced && (s.value = withTiming(0.92, { duration: 120 }))}
      onPressOut={() => !reduced && (s.value = withSpring(1, { damping: 14, stiffness: 260 }))}
      accessibilityRole="button"
      accessibilityLabel="הוספת רכב"
    >
      <Animated.View style={[styles.circle, circle]}>
        <Plus size={16} color={colors.text} strokeWidth={2.8} />
      </Animated.View>
      <Text style={styles.label}>הוספת רכב</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Rubik.bold, fontSize: 16, color: colors.text },
});
