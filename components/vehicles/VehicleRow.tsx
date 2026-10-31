// A non-active vehicle in the switch list; pressing it makes it the calculator's vehicle.
// The small bar under the number is the hero's efficiency strip in miniature (same 0-25 km/L scale).
import Bike from 'lucide-react-native/dist/esm/icons/bike';
import Car from 'lucide-react-native/dist/esm/icons/car';
import Truck from 'lucide-react-native/dist/esm/icons/truck';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { shownConsumption, vehicleLabels } from '../../lib/vehicles/display';
import { LtrText } from '../history/LtrText';
import { gaugeRatio } from './EfficiencyGauge';
import { consumptionUnit, isEv } from './fuel';
import { Press } from './Press';

interface Props {
  vehicle: Vehicle;
  best: boolean;
  onSelect: (v: Vehicle) => void;
}

export const VehicleRow = memo(function VehicleRow({ vehicle: v, best, onSelect }: Props) {
  const kpl = shownConsumption(v);
  const { title: name, subline: meta } = useMemo(() => vehicleLabels(v), [v]);
  const spokenUnit = isEv(v.fueltype) ? 'קילוואט שעה ל־100 קילומטר' : 'קילומטר לליטר';
  const Icon = v.type === 'motorcycle' ? Bike : v.type === 'truck' ? Truck : Car;
  return (
    <Press
      style={styles.row}
      onPress={() => onSelect(v)}
      accessibilityRole="radio"
      accessibilityState={{ checked: false }}
      accessibilityLabel={`${name}, ${kpl ? `${kpl.toFixed(1)} ${spokenUnit}` : 'אין נתון צריכה'}${best ? ', הכי חסכוני' : ''}, הפוך לרכב פעיל`}
    >
      <View style={[styles.tile, best && styles.tileBest]}>
        <Icon size={20} color={best ? colors.accentText : colors.text} strokeWidth={2} />
      </View>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {(!!meta || best) && (
          <View style={styles.metaRow}>
            {!!meta && (
              <Text style={styles.meta} numberOfLines={1}>
                {meta}
              </Text>
            )}
            {best && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>הכי חסכוני</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.cons}>
        <LtrText style={styles.num}>{kpl ? kpl.toFixed(1) : '—'}</LtrText>
        {!!kpl && !isEv(v.fueltype) && (
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${gaugeRatio(kpl) * 100}%` }]} />
          </View>
        )}
        <Text style={styles.unit}>{consumptionUnit(v.fueltype)}</Text>
      </View>
    </Press>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 72, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tileBest: { backgroundColor: colors.accentTint },
  main: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: Rubik.bold, fontSize: 16, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flexShrink: 1, fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted },
  badge: { backgroundColor: colors.accentTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: Rubik.semi, fontSize: 11, color: colors.accentText },
  cons: { alignItems: 'center', minWidth: 56 },
  num: { fontFamily: Rubik.extra, fontSize: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  bar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden', marginVertical: 4, alignItems: 'flex-start' },
  barFill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  unit: { fontFamily: Rubik.regular, fontSize: 11, color: colors.textMuted },
});
