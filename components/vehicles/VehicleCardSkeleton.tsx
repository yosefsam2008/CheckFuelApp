// Placeholder in the found card's shape. Appears only if the lookup is still pending after 300ms.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Keyframe, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ease, revealDur, useLoop, useRevealReduced } from '../../constants/motion';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';

const skeletonOut = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.98 }] },
}).duration(revealDur.skeletonOut);

export function VehicleCardSkeleton() {
  const reduced = useRevealReduced();
  const show = useSharedValue(0);
  useEffect(() => {
    show.value = withDelay(revealDur.skeletonAfter, withTiming(1, { duration: reduced ? 0 : revealDur.skeletonIn, easing: ease.outQuint }));
  }, [reduced, show]);
  const pulse = useLoop(900, { reverse: true, rest: 1 }); // one value shared by every bone
  const wrap = useAnimatedStyle(() => ({ opacity: show.value, transform: [{ translateY: (1 - show.value) * 10 }, { scale: 0.98 + 0.02 * show.value }] }));
  const bone = useAnimatedStyle(() => ({ opacity: 0.5 + 0.5 * pulse.value }));

  return (
    <Animated.View style={[styles.card, wrap]} exiting={reduced ? undefined : skeletonOut} accessibilityLiveRegion="polite">
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
  card: {}, // the add screen's white panel draws the card
  status: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 4 },
  statusText: { fontFamily: Rubik.semi, fontSize: 13, color: colors.textMuted },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface },
  lines: { flex: 1, minWidth: 0 },
  nameRow: { height: 25, justifyContent: 'center' },
  subRow: { height: 22, marginTop: 4, justifyContent: 'center' },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.surface },
});
