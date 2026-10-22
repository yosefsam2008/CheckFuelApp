// The found-vehicle consumption field: odometer overlay on first reveal, then the real input; gauge for km/l only.
import React, { useEffect, useRef } from 'react';
import { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { revealDur } from '../../constants/motion';
import { parseDecimal } from '../../lib/vehicles/consumption';
import { Field } from './AddFields';
import { ConsumptionGauge } from './ConsumptionGauge';
import { consumptionUnit, isEv } from './fuel';
import { OdometerText, odometerDuration } from './OdometerText';

interface Props {
  value: string;
  onChange: (t: string) => void;
  fuel?: string;
  /** first reveal of this lookup result: play the odometer and the gauge sweep */
  first: boolean;
  /** when the rolls start, so they follow the card */
  delay: number;
}

export function ConsumptionField({ value, onChange, fuel, first, delay }: Props) {
  const reduced = useReducedMotion();
  const play = useRef(first && !reduced && /\d/.test(value)).current;

  // 0: overlay shows the roll and the input is invisible; 1: the real input. The input is focusable either way.
  const shown = useSharedValue(play ? 0 : 1);
  useEffect(() => {
    if (play) shown.value = withDelay(delay + odometerDuration(value), withTiming(1, { duration: revealDur.handoff }));
    return () => cancelAnimation(shown);
    // mount-only: user edits never replay the roll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // user input wins: focusing at any moment drops the overlay at once
  const takeOver = () => {
    cancelAnimation(shown);
    shown.value = 1;
  };
  const inputStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - shown.value }));

  return (
    <Field
      label="צריכה ממוצעת"
      value={value}
      onChange={onChange}
      onFocus={takeOver}
      suffix={consumptionUnit(fuel)}
      keyboardType="decimal-pad"
      ltr
      inputStyle={inputStyle}
      overlay={play ? <OdometerText value={value} delay={delay} style={overlayStyle} /> : undefined}
      accessory={isEv(fuel) ? undefined : <ConsumptionGauge value={parseDecimal(value)} play={first} delay={delay} />}
    />
  );
}
