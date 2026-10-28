// Pressable that scales to 0.98 (120ms timing) on press-in and back on press-out. Reduce Motion: no scale.
import React, { useEffect } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const T = { duration: 120 };

export function Press({ style, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => () => cancelAnimation(s), [s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduced) s.value = withTiming(0.98, T);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) s.value = withTiming(1, T);
        onPressOut?.(e);
      }}
      style={[style, anim]}
    />
  );
}
