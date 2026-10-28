// Route choice (2-3 routes): one radio card per route with its name, time (+ toll) and cost; green dot = cheapest.
// The selected card is ink; its cost is the big total below, so it isn't repeated. Colors crossfade on selection.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { DUR, haptic } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { formatAmount } from '../../lib/format';
import type { RouteOption } from '../../lib/route';

export const routeName = (o: RouteOption, i: number) => o.name || `מסלול ${i + 1}`;

/** 42 -> "42 דק׳", 75 -> "1:15 ש׳" */
export const formatDuration = (min: number) => (min < 60 ? `${min} דק׳` : `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')} ש׳`);

interface Props {
  options: RouteOption[];
  costs: (number | null)[];
  selected: number;
  cheapest: number;
  onSelect: (i: number) => void;
}

export function RouteCards({ options, costs, selected, cheapest, onSelect }: Props) {
  const fade = { transitionDuration: `${useReducedMotion() ? DUR.fade : 200}ms` };
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="בחירת מסלול">
      {options.map((o, i) => {
        const on = i === selected;
        const time = `${formatDuration(o.durationMin)}${o.hasToll ? ' · אגרה' : ''}`;
        const cost = costs[i];
        return (
          <Pressable
            key={i}
            style={styles.slot}
            onPress={() => {
              if (on) return;
              haptic.select();
              onSelect(i);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${routeName(o, i)}, ${time}${cost == null ? '' : `, ${formatAmount(cost, 0)} שקלים`}${i === cheapest ? ', הכי זול' : ''}`}
          >
            <Animated.View style={[styles.card, on && styles.cardOn, styles.bgFade, fade]}>
              <View style={styles.nameRow}>
                {i === cheapest && <View style={styles.dot} />}
                <Animated.Text style={[styles.name, on && { color: colors.textInverse }, styles.colorFade, fade]} numberOfLines={1}>
                  {routeName(o, i)}
                </Animated.Text>
              </View>
              <Animated.Text style={[styles.time, on && { color: colors.textMutedInverse }, styles.colorFade, fade]} numberOfLines={1}>
                {time}
              </Animated.Text>
              {cost != null && !on && (
                <View {...LTR.props} style={[styles.costRow, LTR.style]}>
                  <Text style={styles.cost}>₪{formatAmount(cost, 0)}</Text>
                </View>
              )}
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  slot: { flex: 1, minWidth: 0 },
  card: { flex: 1, minHeight: 44, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  cardOn: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  bgFade: { transitionProperty: ['backgroundColor', 'borderColor'] },
  colorFade: { transitionProperty: 'color' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  name: { flexShrink: 1, fontFamily: Rubik.semi, fontSize: 14, color: colors.text },
  time: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMuted },
  costRow: { alignSelf: 'flex-start', marginTop: 4 },
  cost: { fontFamily: Rubik.bold, fontSize: 18, color: colors.text, fontVariant: ['tabular-nums'] },
});
