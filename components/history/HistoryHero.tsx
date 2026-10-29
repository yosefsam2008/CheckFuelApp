// The one dark card: month spend, change vs last month, stats, six-month bars and the month-end projection.
// Motion: the total rolls like the Result screen's ticker (up on entry, up/down on a month switch or delete),
// the stats count up, and the month-dependent text cross-fades. Reduce Motion: RollingNumber cross-fades instead.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { LTR } from '../../constants/rtl';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { monthName, monthYear, type MonthSummary } from '../../lib/calc/monthly';
import { formatMoney } from '../../lib/format';
import { RollingNumber } from '../motion/RollingNumber';
import { MonthBars } from './MonthBars';

const TOTAL_DELAY = 220;
const STATS_DELAY = 380;

interface Props {
  summary: MonthSummary;
  months: { key: number; total: number }[];
  selectedKey: number;
  onSelectMonth: (key: number) => void;
  isCurrent: boolean;
}

export const HistoryHero = React.memo(function HistoryHero({ summary, months, selectedKey, onSelectMonth, isCurrent }: Props) {
  const reduced = useReducedMotion();
  const swap = reduced ? undefined : FadeIn.duration(220);
  // display only: electric trips store kWh in fuelConsumed, so they stay out of the liters sum
  const liters = useMemo(() => summary.trips.reduce((s, t) => (t.energyType === 'electricity' ? s : s + t.fuelConsumed), 0), [summary.trips]);
  const delta = summary.deltaPct == null ? null : Math.round(summary.deltaPct);
  const stats: [number, string][] = [
    [Math.round(summary.km), 'ק״מ'],
    [summary.count, 'נסיעות'],
    [Math.round(liters), 'ליטר'],
  ];

  return (
    <View style={styles.card}>
      {/* keyed by month: a switch fades the new line in instead of snapping */}
      <Animated.View key={selectedKey} entering={swap} style={styles.top}>
        <Text style={styles.muted}>{`הוצאה על דלק · ${monthName(selectedKey)} ${monthYear(selectedKey)}${isCurrent ? ' · החודש' : ''}`}</Text>
        {delta !== null && <Text style={styles.muted}>{`⁦${Math.abs(delta)}%⁩ ${delta >= 0 ? 'יותר' : 'פחות'} מ${monthName(selectedKey - 1)}`}</Text>}
      </Animated.View>

      <View {...LTR.props} style={[styles.totalRow, LTR.style]} accessible accessibilityLabel={formatMoney(Math.round(summary.total), { decimals: 0 })}>
        <Text style={styles.shekel} maxFontSizeMultiplier={1.2}>
          ₪
        </Text>
        <RollingNumber value={Math.round(summary.total)} delay={TOTAL_DELAY} fontSize={60} fontFamily={Rubik.extra} color={colors.textInverse} dimColor={colors.inkFaint} />
      </View>

      <View style={styles.stats}>
        {stats.map(([value, label], i) => (
          <View key={label} style={[styles.stat, i > 0 && styles.statDivider]}>
            {/* the roll pins itself to flex-start; the wrapper lets the column center it */}
            <View>
              <RollingNumber value={value} enter="count" delay={STATS_DELAY} duration={700} fontSize={20} fontFamily={Rubik.extra} color={colors.textInverse} dimColor={colors.inkFaint} />
            </View>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <MonthBars months={months} selectedKey={selectedKey} onSelect={onSelectMonth} />

      {isCurrent && summary.projection != null && (
        <Animated.Text entering={swap} style={styles.muted}>
          בקצב הזה החודש ייסגר על <Text style={styles.strong}>{formatMoney(summary.projection, { decimals: 0 })}</Text>
        </Animated.Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceInverse, borderRadius: 24, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 14, gap: 14 },
  top: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 8 },
  muted: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMutedInverse, fontVariant: ['tabular-nums'] },
  strong: { fontFamily: Rubik.bold, color: colors.textInverse },
  // ₪ sits on the digits' baseline: the roll's line box is 72 (1.2 x 60), the ₪ box 36
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 4 },
  shekel: { fontFamily: Rubik.bold, fontSize: 30, lineHeight: 36, marginBottom: 8, color: colors.accent },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.lineInverse, paddingTop: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderStartWidth: 1, borderStartColor: colors.lineInverse },
  statLabel: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMutedInverse },
});
