// "החלפת רכב": every non-active vehicle, then the add row. A pressed row fades out, the previously active one
// fades in, the rest reflow. Nothing animates on first mount. Reduce Motion: no layout animations.
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { AddVehicleRow } from './AddVehicleRow';
import { VehicleRow } from './VehicleRow';

const enter = FadeIn.duration(220).delay(80);
const exit = FadeOut.duration(160);
const reflow = LinearTransition.duration(260);

interface Props {
  vehicles: Vehicle[];
  bestId: string | null;
  onSelect: (v: Vehicle) => void;
  onAdd: () => void;
}

export function VehicleSwitchList({ vehicles, bestId, onSelect, onAdd }: Props) {
  const reduced = useReducedMotion();
  const anim = reduced ? {} : { entering: enter, exiting: exit, layout: reflow };
  return (
    <LayoutAnimationConfig skipEntering>
      {vehicles.length > 0 && (
        <Animated.View {...anim}>
          <Text style={styles.label}>החלפת רכב</Text>
        </Animated.View>
      )}
      <Animated.View style={styles.card} layout={reduced ? undefined : reflow} accessibilityRole="radiogroup">
        {vehicles.map((v, i) => (
          <Animated.View key={v.id} {...anim} style={i > 0 && styles.divider}>
            <VehicleRow vehicle={v} best={v.id === bestId} onSelect={onSelect} />
          </Animated.View>
        ))}
        <Animated.View layout={reduced ? undefined : reflow} style={vehicles.length > 0 && styles.divider}>
          <AddVehicleRow onPress={onAdd} />
        </Animated.View>
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: Rubik.bold, fontSize: 15, color: colors.textMuted, marginTop: 6, marginHorizontal: 4, marginBottom: -6 }, // 14 screen gap - 6 = 8 to the card
  card: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 18 },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSubtle },
});

