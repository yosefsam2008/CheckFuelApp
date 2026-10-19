// Sticky CTA. Missing input: a mint "guide" button pointing at the next step (still tappable).
// Ready: deep gradient with shimmer. The two states cross-fade over 300ms.
import { LinearGradient } from 'expo-linear-gradient';
import { Car, MapPin } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { dur, haptic } from '../../constants/motion';
import { colors, Heebo, radius, shadow } from '../../constants/theme';
import { PressableScale } from './PressableScale';
import { Shimmer } from './Shimmer';

interface Props {
  hint: string | null;
  target: 'vehicle' | 'route' | null;
  onPress: () => void;
  onDisabledPress: () => void;
}

export function CalculateButton({ hint, target, onPress, onDisabledPress }: Props) {
  const [width, setWidth] = useState(0);
  const disabled = !!hint;
  const k = useDerivedValue(() => withTiming(disabled ? 0 : 1, { duration: dur.std }));

  const wasDisabled = useRef(disabled);
  useEffect(() => {
    if (wasDisabled.current && !disabled) haptic.press(); // it just became ready
    wasDisabled.current = disabled;
  }, [disabled]);

  const gradient = useAnimatedStyle(() => ({ opacity: k.value }));
  const border = useAnimatedStyle(() => ({ borderColor: interpolateColor(k.value, [0, 1], [colors.selectedBorder, 'rgba(52,199,89,0)']) }));
  const label = useAnimatedStyle(() => ({ color: interpolateColor(k.value, [0, 1], [colors.guideText, colors.white]) }));
  const Icon = target === 'vehicle' ? Car : MapPin;

  return (
    <PressableScale
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={() => {
        if (disabled) {
          haptic.warn();
          onDisabledPress();
        } else {
          haptic.press();
          onPress();
        }
      }}
      style={[styles.button, !disabled && shadow.cta]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={hint ?? 'חשב תוצאה'}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.guideFill }]} />
      <Animated.View style={[StyleSheet.absoluteFill, gradient]}>
        <LinearGradient colors={colors.ctaGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.frame, border]} />
      {!disabled && width > 0 && <Shimmer width={width} period={3600} sweepMs={2000} />}
      {disabled ? (
        <Animated.View key="hint" entering={FadeIn.duration(dur.std)} exiting={FadeOut.duration(dur.micro)} style={styles.row}>
          <Icon size={20} color={colors.guideText} strokeWidth={2} />
          <Animated.Text style={[styles.hint, label]}>{hint}</Animated.Text>
        </Animated.View>
      ) : (
        <Animated.Text key="go" entering={FadeIn.duration(dur.std)} exiting={FadeOut.duration(dur.micro)} style={[styles.go, label]}>
          חשב תוצאה
        </Animated.Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { height: 60, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  frame: { borderRadius: radius.pill, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { fontFamily: Heebo.extra, fontSize: 17 },
  go: { fontFamily: Heebo.extra, fontSize: 18, textShadowColor: colors.textShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
