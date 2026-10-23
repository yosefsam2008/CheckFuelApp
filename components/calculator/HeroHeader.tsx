import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Info } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ease, haptic, useEnter } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { colors, Heebo } from '../../constants/theme';
import { PressableScale } from './PressableScale';

const HINT_SEEN_KEY = 'checkfuel.infoHintSeen';

/** 32px glass circle; pulses 3x (1.6s each) until the first tap, then never again. */
function InfoButton({ onPress }: { onPress: () => void }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    AsyncStorage.getItem(HINT_SEEN_KEY)
      .then((seen) => {
        if (!alive || seen) return;
        t.value = withRepeat(withSequence(withTiming(1, { duration: 800, easing: ease.sine }), withTiming(0, { duration: 800, easing: ease.sine })), 3);
      })
      .catch(() => {});
    return () => {
      alive = false;
      cancelAnimation(t);
    };
  }, [reduced, t]);

  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [1, 0.75]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.15]) }],
  }));

  return (
    <Pressable
      onPress={() => {
        haptic.press();
        cancelAnimation(t);
        t.value = 0;
        AsyncStorage.setItem(HINT_SEEN_KEY, '1').catch(() => {});
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="מידע ומסמכים משפטיים"
    >
      <Animated.View style={[styles.info, anim]}>
        <Info size={16} color={colors.white} strokeWidth={2.2} />
      </Animated.View>
    </Pressable>
  );
}

export function HeroHeader({
  onInfo,
  onBack,
  title = 'כמה זה יעלה לי?',
  subtitle = 'המחיר המדויק לנסיעה, לפני שיוצאים',
}: {
  onInfo: () => void;
  /** sub-screens: a back button takes the info button's slot */
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}) {
  const insets = useSafeAreaInsets();
  const titleIn = useEnter(0);
  const subIn = useEnter(60);
  return (
    <LinearGradient colors={colors.heroGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.hero, { paddingTop: Math.max(insets.top, 8) + 12 }]}>
      {/* LTR so the global RTL never reorders the logo (left) and the button (right) */}
      <View {...LTR.props} style={[styles.topRow, LTR.style]}>
        {/* live-text wordmark: the logo mark is the "C", then "heckfuel" in rounded Nunito; crisp at any size */}
        <View {...LTR.props} style={[styles.logoRow, LTR.style]} accessible accessibilityRole="image" accessibilityLabel="CheckFuel">
          <Image source={require('../../assets/images/logo-mark.png')} style={styles.logo} tintColor={colors.white} />
          <Text style={styles.wordmark}>heckfuel</Text>
        </View>
        {onBack ? (
          <PressableScale onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="חזרה">
            <ChevronRight size={22} color={colors.white} strokeWidth={2.2} />
          </PressableScale>
        ) : (
          <InfoButton onPress={onInfo} />
        )}
      </View>

      <Animated.Text style={[styles.title, titleIn]} accessibilityRole="header">
        {title}
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, subIn]} numberOfLines={1}>
        {subtitle}
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 70, overflow: 'hidden' },
  topRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  // small inset so the wordmark doesn't hug the rounded screen corner
  logoRow: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 6 },
  // bottom of the ring sits on the baseline, nozzle rises above the letters like in the brand artwork
  logo: { width: 19, height: 21, marginEnd: 1 },
  wordmark: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, letterSpacing: 0.2, includeFontPadding: false, color: colors.white, textShadowColor: 'rgba(0,0,0,0.12)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  info: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white18, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Heebo.extra, fontSize: 30, lineHeight: 38, color: colors.white },
  subtitle: { fontFamily: Heebo.regular, fontSize: 14, color: colors.white80, marginTop: 4 },
});
