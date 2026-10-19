// Summary card: month eyebrow, rolling total, change vs last month, stats, projection and the 6-month chart
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SlidingDigits } from '../calculator/SlidingDigits';
import { colors, Heebo, radius, shadow, space } from '../../constants/theme';
import { formatAmount } from '../../lib/format';
import { monthName, monthYear, type MonthSummary as Summary } from '../../lib/calc/monthly';
import { LtrText } from './LtrText';
import { MonthChart } from './MonthChart';

const PAD = 24;

interface Props {
  summary: Summary;
  months: { key: number; total: number }[];
  selectedKey: number;
  onSelectMonth: (key: number) => void;
  isCurrent: boolean;
}

export function MonthSummary({ summary, months, selectedKey, onSelectMonth, isCurrent }: Props) {
  // the first show rolls up from 0; later changes (month switch, delete) roll from the old value
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 600);
    return () => clearTimeout(t);
  }, []);

  const amount = formatAmount(Math.round(summary.total), 0);
  const eyebrow = `${isCurrent ? 'החודש · ' : ''}${monthName(selectedKey)} ${monthYear(selectedKey)}`;
  const delta = summary.deltaPct == null ? null : Math.round(summary.deltaPct);
  const prevName = monthName(selectedKey - 1);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <View style={styles.amountRow}>
        <SlidingDigits
          value={amount}
          from={intro ? amount.replace(/\d/g, '0') : undefined}
          startDelay={300}
          staggerMs={25}
          prefix="₪"
          fontSize={40}
          fontFamily={Heebo.black}
          color={colors.text}
          accessibilityLabel={`₪${amount}`}
        />
        {delta !== null && (
          <View style={styles.chip} accessible accessibilityLabel={`שינוי מ${prevName}: ${delta >= 0 ? 'עלייה' : 'ירידה'} של ${Math.abs(delta)} אחוז`}>
            <LtrText style={styles.chipNum}>{`${delta >= 0 ? '+' : '−'}${Math.abs(delta)}%`}</LtrText>
            <Text style={styles.chipText}>מ{prevName}</Text>
          </View>
        )}
      </View>
      <Text style={styles.stats}>
        <Text style={styles.bold}>{formatAmount(summary.km, 0)}</Text> ק״מ · <Text style={styles.bold}>{summary.count}</Text> נסיעות
      </Text>
      {isCurrent && summary.projection != null && (
        <View style={styles.projRow}>
          <Text style={styles.proj}>צפי לסוף החודש: </Text>
          <LtrText style={styles.proj}>{`₪${formatAmount(summary.projection, 0)}`}</LtrText>
        </View>
      )}
      <View style={styles.divider} />
      <View style={styles.chart}>
        <MonthChart months={months} selectedKey={selectedKey} onSelect={onSelectMonth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // overlaps the hero by 44, like RouteCard
  card: { backgroundColor: colors.surface, borderRadius: radius.card, marginTop: -44, marginHorizontal: space.gutter, zIndex: 2, paddingTop: PAD, paddingHorizontal: PAD, paddingBottom: 18, ...shadow.card },
  eyebrow: { fontFamily: Heebo.medium, fontSize: 13, color: colors.textMuted },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.bg },
  chipNum: { fontFamily: Heebo.bold, fontSize: 13, color: colors.text },
  chipText: { fontFamily: Heebo.bold, fontSize: 13, color: colors.text },
  stats: { fontFamily: Heebo.regular, fontSize: 15, color: colors.textMuted, marginTop: 8 },
  bold: { fontFamily: Heebo.bold, color: colors.text },
  projRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  proj: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
  // the chart bleeds to the card edges so every column is at least 44pt wide on narrow phones
  divider: { marginTop: 20, height: 1, backgroundColor: colors.divider },
  chart: { marginTop: 18, marginHorizontal: -PAD },
});
