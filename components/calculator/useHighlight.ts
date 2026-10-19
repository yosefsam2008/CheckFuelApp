import { useEffect } from 'react';
import { interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '../../constants/theme';

/** A 600ms green border pulse whenever `key` changes (key 0 = never). Give the card borderWidth 1.5. */
export function useHighlight(key: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (key > 0) t.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 450 }));
  }, [key, t]);
  return useAnimatedStyle(() => ({ borderColor: interpolateColor(t.value, [0, 1], ['rgba(52,199,89,0)', colors.brandGreen]) }));
}
