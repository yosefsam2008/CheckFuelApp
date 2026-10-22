// Placeholder in the found card's shape. Appears only if the lookup is still pending after 300ms.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { dur, revealDur, useLoop } from '../../constants/motion';
import { colors, Heebo, radius } from '../../constants/theme';

export function VehicleCardSkeleton() {
  const reduced = useReducedMotion();
  const show = useSharedValue(0);
  useEffect(() => {
    show.value = withDelay(revealDur.skeletonAfter, withTiming(1, { duration: reduced ? 0 : dur.micro }));
  }, [reduced, show]);
  const pulse = useLoop(900, { reverse: true, rest: 1 }); // one value shared by every bone
  const wrap = useAnimatedStyle(() => ({ opacity: show.value }));
  const bone = useAnimatedStyle(() => ({ opacity: 0.5 + 0.5 * pulse.value }));

  return (
    <Animated.View style={[styles.card, wrap]} accessibilityLiveRegion="polite">
      <View style={styles.status}>
        <Text style={styles.statusText}>מחפש במאגר משרד התחבורה…</Text>
      </View>
      <View style={styles.head}>
        <Animated.View style={[styles.tile, bone]} />
        <View style={styles.lines}>
          <View style={styles.nameRow}><Animated.View style={[styles.bar, { width: '60%' }, bone]} /></View>
          <View style={styles.subRow}><Animated.View style={[styles.bar, { width: '40%' }, bone]} /></View>
        </View>
      </View>
    </Animated.View>
  );
}

// mirrors addVehicle.tsx found/badge/foundHead so the swap to the real card has no layout jump
const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 16, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.divider },
  status: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 4 },
  statusText: { fontFamily: Heebo.semi, fontSize: 13, color: colors.textMuted },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 48, height: 48, borderRadius: radius.tile, backgroundColor: colors.bg },
  lines: { flex: 1, minWidth: 0 },
  nameRow: { height: 25, justifyContent: 'center' },
  subRow: { height: 22, marginTop: 4, justifyContent: 'center' },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.bg },
});
