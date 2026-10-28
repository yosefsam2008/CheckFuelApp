// The Result screen's hero motion: each digit is a 0-9 column that rolls (or, for stats, counts) on the UI thread.
// Entry rolls from 0; a later value change rolls up when the value grows and down when it shrinks.
// Reduce Motion: no roll, a 150ms crossfade between the old and new text.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  runOnJS,
  runOnUI,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { DUR, EASE, PLACE_STAGGER } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { formatAmount } from '../../lib/format';
import { centerRow, digitAt, glyphs, rollTarget } from '../../lib/rollingDigits';

// change rolls (rollTarget from the middle copy) reach rows 1-28, so a column always has the 3 copies
const ROW_COUNT = 30;
const ROWS = Array.from({ length: ROW_COUNT }, (_, i) => String(i % 10));
const DEV = __DEV__; // a module const, so the worklet captures it
const lineHeightOf =(fontSize: number) => Math.round(fontSize * 1.2);

interface Props {
  value: number;
  decimals?: number;
  fontSize: number;
  fontFamily?: string;
  color: string;
  /** leading zeros while the entry starts from 0 */
  dimColor: string;
  prefix?: string;
  /** entry: wait this long (ms) before rolling */
  delay?: number;
  /** entry duration (ms); later changes take DUR.change */
  duration?: number;
  /** extra full turns on entry per place: [units, tens, hundreds...] */
  spinsByPlace?: number[];
  /** entry style: 'roll' (hero) or 'count' (a plain count-up, for the stats) */
  enter?: 'roll' | 'count';
  /** the entry waits until this is true */
  play?: boolean;
  /** once, when the entry's last digit lands */
  onLanded?: () => void;
}

type Run = { id: number; kind: 'none' | 'entry' | 'change'; dir: 1 | -1 };

const textStyle = (fontSize: number, fontFamily: string | undefined, color: string): TextStyle => ({
  fontSize,
  fontFamily,
  color,
  lineHeight: lineHeightOf(fontSize),
  height: lineHeightOf(fontSize),
  fontVariant: ['tabular-nums'],
  includeFontPadding: false,
  textAlignVertical: 'center',
});

export function RollingNumber(props: Props) {
  const reduced = useReducedMotion();
  if (!Number.isFinite(props.value)) {
    if (__DEV__) console.warn('RollingNumber: value is not a finite number', props.value);
    return <Text style={textStyle(props.fontSize, props.fontFamily, props.color)}>—</Text>;
  }
  return reduced ? <FadeNumber {...props} /> : <Rolling {...props} />;
}

/** onLanded at most once per mount */
function useOnce(fn?: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  const done = useRef(false);
  return useCallback(() => {
    if (done.current) return;
    done.current = true;
    ref.current?.();
  }, []);
}

function FadeNumber({ value, decimals = 0, prefix = '', fontSize, fontFamily, color, play = true, onLanded }: Props) {
  const text = prefix + formatAmount(value, decimals);
  const style = textStyle(fontSize, fontFamily, color);
  const landed = useOnce(onLanded);
  useEffect(() => {
    if (play) landed();
  }, [play, landed]);
  return (
    <View {...LTR.props} style={LTR.style} accessible accessibilityLabel={text}>
      <Text style={[style, { opacity: 0 }]}>{text}</Text>
      <Animated.Text key={text} entering={FadeIn.duration(DUR.fade)} exiting={FadeOut.duration(DUR.fade)} style={[style, StyleSheet.absoluteFill]}>
        {text}
      </Animated.Text>
    </View>
  );
}

function Rolling({ value, decimals = 0, prefix, fontSize, fontFamily, color, dimColor, delay = 0, duration = DUR.hero, spinsByPlace = [2, 1, 0], enter = 'roll', play = true, onLanded }: Props) {
  const text = formatAmount(value, decimals);
  const style = textStyle(fontSize, fontFamily, color);
  const [run, setRun] = useState<Run>({ id: 0, kind: 'none', dir: 1 });
  const prev = useRef(value);
  const initialKeys = useRef<Set<string> | null>(null);
  const n = useSharedValue(0); // count-up value
  const counting = useSharedValue(0);
  const landed = useOnce(onLanded);
  const ready = play;

  useEffect(() => {
    if (!ready) return;
    setRun((r) => (r.kind === 'none' ? { id: 1, kind: 'entry', dir: 1 } : { id: r.id + 1, kind: 'change', dir: value >= prev.current ? 1 : -1 }));
    prev.current = value;
  }, [value, ready]);

  useEffect(() => {
    if (run.kind === 'entry' && enter === 'count') {
      counting.value = 1;
      n.value = withDelay(delay, withTiming(value, { duration, easing: EASE.out }, () => {
        counting.value = 0;
        runOnJS(landed)();
      }));
    } else if (run.kind === 'change') {
      cancelAnimation(n);
      counting.value = 0;
    }
  }, [run.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reacts to each new run only

  const gs = glyphs(text);
  if (!initialKeys.current) initialKeys.current = new Set(gs.map((g) => g.key));
  const places = gs.filter((g) => g.digit).map((g) => g.place);
  const maxPlace = Math.max(...places);
  const minPlace = Math.min(...places);

  return (
    <View {...LTR.props} style={[styles.row, LTR.style]} accessible accessibilityLabel={(prefix ?? '') + text}>
      {!!prefix && <Text style={style}>{prefix}</Text>}
      {gs.map((g) =>
          g.digit ? (
            <Column
              key={g.key}
              digit={+g.ch}
              place={g.place}
              wait={(run.kind === 'entry' ? delay : 0) + (maxPlace - g.place) * PLACE_STAGGER}
              run={run}
              isNew={!initialKeys.current!.has(g.key)}
              lineHeight={lineHeightOf(fontSize)}
              style={style}
              dimColor={dimColor}
              spins={spinsByPlace[Math.max(g.place, 0)] ?? 0}
              duration={duration}
              count={enter === 'count'}
              n={n}
              counting={counting}
              onLast={g.place === minPlace && enter === 'roll' ? landed : undefined}
            />
          ) : (
            <Text key={g.key} style={style}>
              {g.ch}
            </Text>
          ),
      )}
    </View>
  );
}

interface ColumnProps {
  digit: number;
  place: number;
  wait: number;
  run: Run;
  isNew: boolean;
  lineHeight: number;
  style: TextStyle;
  dimColor: string;
  spins: number;
  duration: number;
  count: boolean;
  n: SharedValue<number>;
  counting: SharedValue<number>;
  onLast?: () => void;
}

function Column({ digit, place, wait, run, isNew, lineHeight, style, dimColor, spins, duration, count, n, counting, onLast }: ColumnProps) {
  const pos = useSharedValue(isNew ? 10 : 0); // row shown; row 0 is the dimmed leading zero
  const grow = useSharedValue(isNew ? 0 : 1);

  useEffect(() => {
    if (isNew) grow.value = withTiming(1, { duration: 250, easing: EASE.out });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount only

  useEffect(() => {
    if (run.kind === 'none') return;
    if (run.kind === 'entry') {
      if (count) {
        pos.value = digit + 10; // the count-up draws from n; this is where it hands over
        return;
      }
      const to = spins * 10 + digit;
      // a 0 above a higher digit (the 0 in 1,005) must not stay on the dimmed row
      const dimZero = to === 0 && place > 0;
      pos.value = withDelay(wait, withTiming(dimZero ? 10 : to, { duration: dimZero ? 0 : duration, easing: EASE.hero }, () => {
        if (onLast) runOnJS(onLast)();
      }));
      return;
    }
    const dir = run.dir;
    runOnUI(() => {
      'worklet';
      // continue from wherever the column is now (a fast double tap must not jump)
      cancelAnimation(pos);
      const from = centerRow(pos.value);
      pos.value = from;
      pos.value = withDelay(wait, withTiming(rollTarget(from, digit, dir), { duration: DUR.change, easing: EASE.hero }));
    })();
  }, [run.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reacts to each new run only

  const roll = useAnimatedStyle(() => {
    let row = pos.value;
    if (counting.value) row = digitAt(n.value, place) + (place > 0 && n.value < Math.pow(10, place) ? 0 : 10);
    if (DEV && (row < 0 || row > ROW_COUNT - 1)) console.warn(`RollingNumber: row ${row} outside 0-${ROW_COUNT - 1}`);
    return { transform: [{ translateY: -Math.min(Math.max(row, 0), ROW_COUNT - 1) * lineHeight }] };
  });
  // the fade sits on the small window, not the tall column: Android can draw a big faded layer as a black box
  const fade = useAnimatedStyle(() => ({ opacity: grow.value }));

  return (
    <Animated.View style={[{ height: lineHeight, overflow: 'hidden' }, fade]}>
      <Animated.View style={roll}>
        {ROWS.map((d, i) => (
          <Text key={i} style={[style, { textAlign: 'center' }, i === 0 && place > 0 && { color: dimColor }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', alignSelf: 'flex-start' },
});
