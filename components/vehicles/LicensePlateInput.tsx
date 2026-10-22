// Yellow Israeli plate over one transparent TextInput: the input owns the value, the glyph row only draws it
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  Keyframe,
  LayoutAnimationConfig,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ease, haptic, revealDur, useLoop } from '../../constants/motion';
import { LTR, NO_OUTLINE, NO_TOUCH } from '../../constants/rtl';
import { Heebo, plate as P } from '../../constants/theme';
import { plateDigits } from '../../lib/vehicles/plateLookup';
import { PlateScanBeam } from './PlateScanBeam';

const FONT = 42;
const PLACEHOLDER = '00-000-00';

const drop = (delay: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: -FONT * 0.75 }, { scale: 1.5 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: ease.outQuint },
  })
    .duration(revealDur.digitDrop)
    .delay(delay);

const lift = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: FONT * 0.3 }] },
}).duration(revealDur.digitExit);

const dashIn = FadeIn.duration(revealDur.digitExit);

interface Props {
  /** the screen's plate state, drawn exactly as stored (dashes included) */
  value: string;
  onChangeText: (t: string) => void;
  editable?: boolean;
  /** the lookup just started: one sweep of the scan beam */
  scanning?: boolean;
  /** the registry has no such plate: a small shake and an error haptic */
  shake?: boolean;
}

export function LicensePlateInput({ value, onChangeText, editable = true, scanning = false, shake = false }: Props) {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const digits = plateDigits(value);
  // digits at or past this index arrived in the latest change; a paste staggers them
  const prevCount = useRef(digits.length);
  const firstNew = prevCount.current;

  const press = useSharedValue(1);
  useEffect(() => {
    if (digits.length > prevCount.current) {
      haptic.select();
      const half = { duration: revealDur.platePress / 2 };
      if (!reduced) press.value = withSequence(withTiming(0.985, half), withTiming(1, half));
    }
    prevCount.current = digits.length;
  }, [digits.length, reduced, press]);

  const x = useSharedValue(0);
  useEffect(() => {
    if (!shake) return;
    haptic.error();
    if (reduced) return;
    const step = (to: number) => withTiming(to, { duration: revealDur.shake / 6 });
    x.value = withSequence(step(4), step(-4), step(4), step(-4), step(0));
  }, [shake, reduced, x]);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: press.value }] }));

  const blink = useLoop(1000, { rest: 0 });
  const caretStyle = useAnimatedStyle(() => ({ opacity: blink.value < 0.5 ? 1 : 0 }));

  // keyed by digit position so a dash appearing at 7 digits does not remount the digits around it
  let n = 0;
  const glyphs = [...value].map((ch) => {
    const isDigit = /\d/.test(ch);
    const key = isDigit ? `n${n}` : `s${n}`;
    const entering = reduced ? undefined : isDigit ? drop(Math.max(0, n - firstNew) * revealDur.digitStep) : dashIn;
    if (isDigit) n++;
    return (
      <Animated.Text key={key} entering={entering} exiting={reduced ? undefined : lift} style={styles.glyph} maxFontSizeMultiplier={1}>
        {ch}
      </Animated.Text>
    );
  });

  return (
    <View style={[styles.ring, focused && { backgroundColor: P.focusRing }]}>
      <Animated.View {...LTR.props} style={[styles.plate, LTR.style, pressStyle]}>
        <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.il} maxFontSizeMultiplier={1}>IL</Text>
          <Text style={styles.country} maxFontSizeMultiplier={1}>ישראל</Text>
        </View>
        <View style={[styles.row, NO_TOUCH]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <LayoutAnimationConfig skipEntering>{glyphs}</LayoutAnimationConfig>
          {focused && <Animated.View style={[styles.caret, caretStyle]} />}
          {!value && (
            <Text style={[styles.glyph, styles.placeholder]} maxFontSizeMultiplier={1}>
              {PLACEHOLDER}
            </Text>
          )}
        </View>
        <PlateScanBeam active={scanning} />
        {/* on top of everything so a tap anywhere on the plate focuses it, and long-press paste works */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          maxLength={10}
          editable={editable}
          caretHidden
          selectionColor="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="מספר רישוי"
          accessibilityValue={{ text: digits.split('').join(' ') }}
          style={[StyleSheet.absoluteFill, styles.input, NO_OUTLINE]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { marginTop: 12, padding: 4, borderRadius: 14 },
  plate: { height: 66, flexDirection: 'row', borderRadius: 10, borderWidth: 3, borderColor: P.ink, backgroundColor: P.fill, overflow: 'hidden' },
  strip: { width: 40, backgroundColor: P.strip, alignItems: 'center', justifyContent: 'center' },
  il: { fontFamily: Heebo.black, fontSize: 15, color: P.stripText },
  country: { fontFamily: Heebo.semi, fontSize: 9, color: P.stripText },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: Heebo.extra, fontSize: FONT, lineHeight: 52, color: P.ink, fontVariant: ['tabular-nums'], includeFontPadding: false },
  placeholder: { opacity: 0.25 },
  caret: { width: 1.5, height: 34, marginStart: 2, backgroundColor: P.ink },
  input: { color: 'transparent', fontSize: 20, textAlign: 'center' },
});
