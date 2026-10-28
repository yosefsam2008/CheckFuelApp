// Yellow Israeli plate over one transparent TextInput: the input owns the value, the glyph row only draws it
import { BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ease, haptic, revealDur, useLoop, useRevealReduced } from '../../constants/motion';
import { LTR, NO_OUTLINE, NO_TOUCH } from '../../constants/rtl';
import { plate as P } from '../../constants/theme';
import { Rubik } from '../../constants/themeV2';
import { plateDigits } from '../../lib/vehicles/plateLookup';
import { PlateScanBeam } from './PlateScanBeam';

const FONT = 42;
const PLACEHOLDER = '00-000-00';

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
  const reduced = useRevealReduced();
  const [focused, setFocused] = useState(false);
  // plate digits only; Rubik stands in until the font file is loaded
  const [barlow] = useFonts({ BarlowCondensed_700Bold });
  const glyphFont = { fontFamily: barlow ? 'BarlowCondensed_700Bold' : Rubik.extra };
  const digits = plateDigits(value);
  // digits at or past this index arrived in the latest change; a paste staggers them
  const prevCount = useRef(digits.length);
  const firstNew = prevCount.current;
  // nothing animates on the plate's own mount (e.g. coming back from the manual tab)
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

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

  // focus ring fades in; once a search starts it lingers, then fades out under the beam
  const ring = useSharedValue(0);
  useEffect(() => {
    if (reduced) ring.value = focused && !scanning ? 1 : 0;
    else if (scanning) ring.value = withDelay(revealDur.ringOutDelay, withTiming(0, { duration: revealDur.ringOut }));
    else ring.value = withTiming(focused ? 1 : 0, { duration: revealDur.focusRing });
  }, [focused, scanning, reduced, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));

  // keyed by digit position so a dash appearing at 7 digits does not remount the digits around it
  let n = 0;
  const glyphs = [...value].map((ch) => {
    const isDigit = /\d/.test(ch);
    const key = isDigit ? `n${n}` : `s${n}`;
    const play = !reduced && mounted.current && (!isDigit || n >= firstNew);
    const delay = isDigit ? Math.max(0, n - firstNew) * revealDur.digitStep : 0;
    if (isDigit) n++;
    return <Glyph key={key} ch={ch} play={play} delay={delay} font={glyphFont} />;
  });

  return (
    <View style={styles.ring}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.ringFill, ringStyle]} />
      <Animated.View {...LTR.props} style={[styles.plate, LTR.style, pressStyle]}>
        <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.il} maxFontSizeMultiplier={1}>IL</Text>
          <Text style={styles.country} maxFontSizeMultiplier={1}>ישראל</Text>
        </View>
        <View style={[styles.row, NO_TOUCH]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {glyphs}
          {focused && <Caret />}
          {!value && (
            <Text style={[styles.glyph, glyphFont, styles.placeholder]} maxFontSizeMultiplier={1}>
              {PLACEHOLDER}
            </Text>
          )}
        </View>
        <PlateScanBeam active={scanning} />
        {/* on top of everything so a tap anywhere on the plate focuses it, and long-press paste works */}
        {/* digits only: the dashes exist only in the glyph row, so the native text always equals what was typed and
            Android never has to replace it mid-typing (that round trip made typing lag when a dash appeared) */}
        <TextInput
          value={digits}
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
          style={[StyleSheet.absoluteFill, styles.input, NO_OUTLINE, Platform.OS !== 'ios' && styles.inputHidden]}
        />
      </Animated.View>
    </View>
  );
}

/**
 * One plate character that drops in on mount. A shared-value style, not a Reanimated `entering`/`exiting`
 * layout animation: on web those took the glyphs out of the row and stacked them on top of each other.
 * shortcut: a deleted digit just disappears (the 120ms exit needed `exiting`); revisit if layout animations get fixed on web.
 */
function Glyph({ ch, play, delay, font }: { ch: string; play: boolean; delay: number; font: { fontFamily: string } }) {
  const t = useSharedValue(play ? 0 : 1);
  useEffect(() => {
    if (play) t.value = withDelay(delay, withTiming(1, { duration: revealDur.digitDrop, easing: ease.pop }));
    // mount-only: a glyph animates once, when it arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // starts smaller, not larger, so it never covers its neighbours
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 2),
    transform: [{ translateY: (1 - t.value) * -FONT * 0.5 }, { scale: 0.8 + 0.2 * t.value }],
  }));
  return (
    <Animated.Text style={[styles.glyph, font, style]} maxFontSizeMultiplier={1}>
      {ch}
    </Animated.Text>
  );
}

/** Mounted only while focused, so the blink loop does not run in the background */
function Caret() {
  const blink = useLoop(1000, { rest: 0 }); // reduced motion: a steady caret
  const style = useAnimatedStyle(() => ({ opacity: blink.value < 0.5 ? 1 : 0 }));
  return <Animated.View style={[styles.caret, style]} />;
}

const styles = StyleSheet.create({
  ring: { marginTop: 12, padding: 4 },
  ringFill: { borderRadius: 14, backgroundColor: P.focusRing },
  plate: { height: 66, flexDirection: 'row', borderRadius: 10, borderWidth: 3, borderColor: P.ink, backgroundColor: P.fill, overflow: 'hidden' },
  strip: { width: 40, backgroundColor: P.strip, alignItems: 'center', justifyContent: 'center' },
  il: { fontFamily: Rubik.extra, fontSize: 15, color: P.stripText },
  country: { fontFamily: Rubik.semi, fontSize: 9, color: P.stripText },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: FONT, lineHeight: 52, color: P.ink, fontVariant: ['tabular-nums'], includeFontPadding: false },
  placeholder: { opacity: 0.25 },
  caret: { width: 1.5, height: 34, marginStart: 2, backgroundColor: P.ink },
  input: { color: 'transparent', fontSize: 20, textAlign: 'center' },
  // Android drew the typed text over the plate despite the transparent color; opacity 0 still takes taps there and on web.
  // Not on iOS: a view under 1% alpha stops receiving touches, and iOS honours the transparent color anyway.
  inputHidden: { opacity: 0 },
});
