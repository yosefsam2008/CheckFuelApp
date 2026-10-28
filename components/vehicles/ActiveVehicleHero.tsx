// The one dark card, read like the car's own dash: plate, a rolling km/L, an efficiency strip and the cost per 100 km.
// Swap: content fades up and out (120ms), the data changes, then fades in from below (240ms) while the number rolls
// and the strip sweeps to the new value. The card itself never moves. Reduce Motion: everything changes at once.
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { LTR } from '../../constants/rtl';
import { plate as P } from '../../constants/theme';
import { Rubik } from '../../constants/themeV2';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { formatAmount } from '../../lib/format';
import type { FuelPrices } from '../../lib/tripCost';
import { costPer100, formatPlate, shownConsumption, vehicleLabels } from '../../lib/vehicles/display';
import { RollingNumber } from '../motion/RollingNumber';
import { EfficiencyGauge } from './EfficiencyGauge';
import { consumptionUnit, FUEL_LABEL, isEv } from './fuel';
import { Press } from './Press';

const IN = { duration: 240, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };

interface Props {
  vehicle: Vehicle;
  prices: FuelPrices | null;
  onDetails: () => void;
}

export function ActiveVehicleHero({ vehicle, prices, onDetails }: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(vehicle);
  const o = useSharedValue(1);
  const y = useSharedValue(0);

  useEffect(() => () => [o, y].forEach(cancelAnimation), [o, y]);

  // a new vehicle fades out first; the same vehicle reloaded or edited just updates
  useEffect(() => {
    if (reduced || vehicle.id === shown.id) {
      // back to the shown vehicle mid-fade (a quick undo) must not leave the content hidden
      o.value = reduced ? 1 : withTiming(1, IN);
      y.value = reduced ? 0 : withTiming(0, IN);
      return setShown(vehicle);
    }
    y.value = withTiming(-6, { duration: 120 });
    o.value = withTiming(0, { duration: 120 }, (done) => {
      if (done) runOnJS(setShown)(vehicle);
    });
  }, [vehicle]); // eslint-disable-line react-hooks/exhaustive-deps -- reacts to the incoming vehicle only

  useEffect(() => {
    if (reduced) {
      o.value = 1;
      y.value = 0;
      return;
    }
    if (o.value === 0) { // only after a completed fade-out
      y.value = 8;
      y.value = withTiming(0, IN);
      o.value = withTiming(1, IN);
    }
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per swapped-in vehicle

  const content = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));

  const kpl = shownConsumption(shown);
  const cost = prices ? costPer100(shown, prices) : null;
  const { title, brand, subline } = useMemo(() => vehicleLabels(shown), [shown]);
  const rest = brand ? subline.slice(brand.length) : subline;

  const fuel = shown.fueltype && FUEL_LABEL[shown.fueltype];
  const amount = cost === null ? '' : formatAmount(Math.round(cost), 0);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.status}>
          <View style={styles.halo}>
            <View style={styles.led} />
          </View>
          <Text style={styles.label}>פעיל במחשבון</Text>
        </View>
        <Press style={styles.btn} onPress={onDetails} accessibilityRole="button" accessibilityLabel="פרטי הרכב">
          <ChevronLeft size={18} color={colors.textInverse} strokeWidth={2.2} />
        </Press>
      </View>

      <Animated.View style={content}>
        <Text style={styles.name} numberOfLines={2}>
          {title}
        </Text>
        {(!!subline || !!shown.plate) && (
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              {!!brand && <Text style={styles.brand}>{brand}</Text>}
              {rest}
            </Text>
            {!!shown.plate && <Plate plate={formatPlate(shown.plate)} />}
          </View>
        )}

        <View style={styles.numRow} accessible accessibilityLabel={kpl ? `${kpl.toFixed(1)} ${consumptionUnit(shown.fueltype)}` : 'אין נתון צריכה'}>
          {kpl ? (
            <RollingNumber value={kpl} decimals={1} delay={120} fontSize={64} fontFamily={Rubik.extra} color={colors.textInverse} dimColor={colors.inkFaint} />
          ) : (
            <Text style={styles.dash}>—</Text>
          )}
          <Text style={styles.unit}>{consumptionUnit(shown.fueltype)}</Text>
        </View>

        {/* kWh per 100 km reads the other way (lower is better), so EVs get no strip */}
        {!!kpl && !isEv(shown.fueltype) && <EfficiencyGauge value={kpl} />}

        {(cost !== null || !!fuel) && (
          <View style={styles.foot}>
            {cost !== null ? (
              // one line of text; the LRI/PDI isolates keep "₪68" sign-first on web and native alike (a dir="ltr" row
              // did not flip on web, where RTL comes from the document, not I18nManager)
              <Text style={styles.cost} accessibilityLabel={`₪${amount} דלק לכל 100 ק״מ`}>
                {'⁦'}
                <Text style={styles.shekel}>₪</Text>
                <Text style={styles.costAmount}>{amount}</Text>
                {'⁩ דלק לכל 100 ק״מ'}
              </Text>
            ) : (
              <View />
            )}
            {!!fuel && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{fuel}</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/** Israeli plate: yellow field, black digits, the blue IL band on the left. The band is drawn at the physical left
 *  (absolute `left`, not `start`) so it stays put in RTL on both web and native. */
export function Plate({ plate }: { plate: string }) {
  return (
    <View style={[styles.plate, LTR.style]} accessible accessibilityLabel={`מספר רישוי ${plate}`}>
      <View style={styles.band}>
        <Text style={styles.bandText}>IL</Text>
      </View>
      <Text style={styles.plateText}>{`⁦${plate}⁩`}</Text>
    </View>
  );
}

// plate colours are shared with the add screen's plate input (a real-world object: fixed in every theme)

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceInverse, borderRadius: 24, paddingTop: 14, paddingEnd: 14, paddingBottom: 18, paddingStart: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  halo: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(64,214,60,0.22)', alignItems: 'center', justifyContent: 'center' },
  led: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  label: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMutedInverse },
  btn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceInverseRaised, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: Rubik.extra, fontSize: 26, lineHeight: 32, letterSpacing: -0.3, color: colors.textInverse, marginTop: 4, marginEnd: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6, marginEnd: 6 },
  meta: { flexShrink: 1, fontFamily: Rubik.regular, fontSize: 14, color: colors.textMutedInverse },
  brand: { fontFamily: Rubik.semi, color: colors.inkChip },
  numRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 18, marginBottom: 10 },
  dash: { fontFamily: Rubik.extra, fontSize: 64, lineHeight: 77, color: colors.textInverse },
  unit: { fontFamily: Rubik.regular, fontSize: 15, color: colors.textMutedInverse, paddingBottom: 14 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginEnd: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.lineInverse },
  shekel: { fontFamily: Rubik.bold, fontSize: 16, color: colors.accent },
  costAmount: { fontFamily: Rubik.extra, fontSize: 22, color: colors.textInverse, fontVariant: ['tabular-nums'] },
  cost: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMutedInverse },
  chip: { borderWidth: 1, borderColor: colors.inkBorder, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: Rubik.medium, fontSize: 12, color: colors.inkChip },
  // physical left/padding on purpose: the band sits on the left of a real plate in any language
  plate: { height: 26, paddingLeft: 20, paddingRight: 8, justifyContent: 'center', borderRadius: 4, overflow: 'hidden', backgroundColor: P.fill, borderWidth: 1.5, borderColor: P.ink },
  band: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, backgroundColor: P.strip, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3 },
  bandText: { fontFamily: Rubik.bold, fontSize: 7, lineHeight: 8, color: P.stripText },
  plateText: { fontFamily: Rubik.bold, fontSize: 14, lineHeight: 18, letterSpacing: 1, color: P.ink, fontVariant: ['tabular-nums'], includeFontPadding: false },
});
