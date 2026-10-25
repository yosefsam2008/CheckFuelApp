import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, FadeIn, FadeOut, interpolate, interpolateColor, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { dur, ease, haptic, spring, useEnter } from '../../constants/motion';
import { colors, Heebo, radius, shadow, space } from '../../constants/theme';
import { AC_FACTOR, DriveMode, MODE_FACTOR, TripPrefs } from '../../lib/tripCost';
import { SegmentOption, SlidingSegment } from './SlidingSegment';
import { useHighlight } from './useHighlight';
import { LTR } from '../../constants/rtl';

const OPTIONS: SegmentOption<DriveMode>[] = [
  { value: 'eco', tag: 'ECO', label: 'חסכוני', tagColor: colors.ecoText },
  { value: 'normal', tag: 'NORMAL', label: 'רגיל', tagColor: colors.infoText },
  { value: 'sport', tag: 'SPORT', label: 'ספורט', tagColor: colors.sportText },
];

const pct = (f: number) => Math.round(Math.abs(1 - f) * 100);
const HINTS: Record<DriveMode, { text: string; color: string }> = {
  eco: { text: `מצב Eco חוסך כ-${pct(MODE_FACTOR.eco)}% דלק`, color: colors.ecoText },
  normal: { text: 'הצריכה הרגילה של הרכב', color: colors.textMuted },
  sport: { text: `מצב Sport צורך כ-${pct(MODE_FACTOR.sport)}% יותר דלק`, color: colors.sportText },
};

function Switch({ on }: { on: boolean }) {
  const k = useDerivedValue(() => withTiming(on ? 1 : 0, { duration: dur.std }));
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(k.value, [0, 1], [colors.divider, colors.brandGreen]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(on ? 20 : 0, spring.bouncy) }] }));
  return (
    <Animated.View {...LTR.props} style={[styles.track, track]}>
      <Animated.View style={[styles.knob, knob]} />
    </Animated.View>
  );
}

interface Props {
  prefs: TripPrefs;
  onChange: (p: TripPrefs) => void;
  children?: React.ReactNode; // fuel price fields, shown first when open
  summary?: string; // leads the collapsed line, e.g. the price
  openKey: number; // bump to open the section and pulse it (invalid price)
}

export function DriveModeCard({ prefs, onChange, children, summary, openKey }: Props) {
  const hint = HINTS[prefs.mode];
  const ent = useEnter(240);
  const hl = useHighlight(openKey);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (openKey) setOpen(true);
  }, [openKey]);
  // height is animated from the measured content, not a layout transition (those clip on web and jump on Android)
  const reduced = useReducedMotion();
  const [h, setH] = useState(0);
  const t = useDerivedValue(() => withTiming(open ? 1 : 0, { duration: reduced ? 0 : open ? 420 : 320, easing: ease.inOut }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 180}deg` }] }));
  const body = useAnimatedStyle(() => ({ height: t.value * h }));
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.25, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: (1 - t.value) * -12 }],
  }));
  const modeLabel = OPTIONS.find((o) => o.value === prefs.mode)!.label;
  return (
    <Animated.View style={[styles.card, shadow.card, hl, ent]}>
      <Pressable
        style={styles.acRow}
        onPress={() => {
          haptic.select();
          setOpen(!open);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="אפשרויות מתקדמות"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>אפשרויות מתקדמות</Text>
          <Text style={styles.sub}>
            {summary ? `${summary} · ` : ''}{modeLabel} · {prefs.ac ? 'מזגן דולק' : 'מזגן כבוי'}
          </Text>
        </View>
        <Animated.View style={chevron}>
          <ChevronDown size={22} color={colors.textMuted} strokeWidth={2} />
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.clip, body]} pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        {/* absolute so it measures its natural height while the clip animates */}
        <Animated.View style={[styles.measure, content]} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
          <View style={styles.divider} />
          {children && (
            <>
              {children}
              <View style={styles.divider} />
            </>
          )}
          <Text style={styles.acTitle} accessibilityRole="header">
            באיזה מצב נסיעה תיסע?
          </Text>
          <View style={{ marginTop: 12 }}>
            <SlidingSegment accessibilityLabel="מצב נסיעה" height={56} options={OPTIONS} value={prefs.mode} onChange={(mode) => onChange({ ...prefs, mode })} />
          </View>

          <View style={styles.hintBox} accessibilityLiveRegion="polite">
            <Animated.Text key={prefs.mode} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.hint, { color: hint.color }]}>
              {hint.text}
            </Animated.Text>
          </View>

          <View style={styles.divider} />

          <Pressable
            style={styles.acRow}
            onPress={() => {
              haptic.select();
              onChange({ ...prefs, ac: !prefs.ac });
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: prefs.ac }}
            accessibilityLabel="מזגן דולק"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.acTitle}>מזגן דולק</Text>
              <Text style={styles.sub}>מוסיף כ-{pct(AC_FACTOR)}% לצריכה</Text>
            </View>
            <Switch on={prefs.ac} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.cardPad - 1.5, borderWidth: 1.5, borderColor: 'transparent' }, // border is for the highlight pulse
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  sub: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  hintBox: { height: 22, marginTop: 10, justifyContent: 'center' },
  hint: { position: 'absolute', fontFamily: Heebo.bold, fontSize: 13 },
  clip: { overflow: 'hidden' },
  measure: { position: 'absolute', top: 0, left: 0, right: 0 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: space.block },
  acRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  acTitle: { fontFamily: Heebo.bold, fontSize: 15, color: colors.text },
  track: { width: 46, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 2, ...LTR.style },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, ...shadow.button },
});
