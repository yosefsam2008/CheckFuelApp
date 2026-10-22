import { Car } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useEnter } from '../../constants/motion';
import { colors, Heebo, radius, shadow, space } from '../../constants/theme';
import { priceField, type Octane, type Vehicle } from '../../lib/tripCost';
import { priceLabel } from '../../lib/priceDisplay';
import { toDisplay, type Fuel } from '../../lib/vehicles/consumption';
import { consumptionUnit } from '../vehicles/fuel';
import { FuelPriceDisplay, PriceStatus } from './FuelPriceDisplay';
import { PressableScale } from './PressableScale';
import { SlidingSegment } from './SlidingSegment';
import { useHighlight } from './useHighlight';

interface Props {
  vehicle: Vehicle | null;
  onSwap: () => void;
  onGoToVehicles: () => void;
  price: string;
  onPriceChange: (text: string) => void;
  priceStatus: PriceStatus;
  priceDate?: string;
  octane: Octane;
  onOctane: (o: Octane) => void;
  highlightKey: number;
}

export function consumptionLabel(v: Vehicle) {
  if (!v.avgConsumption) return 'אין נתון צריכה';
  // same number + unit the user typed on the add-vehicle screen
  return `${toDisplay(v.avgConsumption, v.fueltype as Fuel).toFixed(1)} ${consumptionUnit(v.fueltype)}`;
}

/** make + model ("Hyundai Tucson"), falling back to make + year when the model is missing */
export function vehicleTitle(v: Vehicle) {
  const make = (v.name ?? '').trim();
  const model = (v.model ?? '').trim();
  if (model) return model.toLowerCase().includes(make.toLowerCase()) ? model : `${make} ${model}`.trim();
  return v.year ? `${make} ${v.year}` : make;
}

const OCTANE_OPTIONS = [
  { value: '95' as Octane, label: 'בנזין 95' },
  { value: '98' as Octane, label: 'בנזין 98' },
];

export function VehiclePriceCard(p: Props) {
  const hl = useHighlight(p.highlightKey);
  const ent = useEnter(180);
  const v = p.vehicle;
  const isElectric = v?.fueltype === 'Electric';
  const isPetrol = !!v && v.fueltype !== 'Electric' && v.fueltype !== 'Diesel';
  return (
    <Animated.View style={[styles.card, shadow.card, hl, ent]}>
      <View style={styles.vehicleRow}>
        <View style={styles.tile}>
          <Car size={24} color={v ? colors.text : colors.textMuted} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {v ? vehicleTitle(v) : 'עוד לא בחרת רכב'}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {v ? consumptionLabel(v) : 'בחר רכב מהרשימה שלך'}
          </Text>
        </View>
        {v && (
          <PressableScale style={styles.swap} onPress={p.onSwap} accessibilityRole="button" accessibilityLabel="החלף רכב">
            <Text style={styles.swapText}>החלף</Text>
          </PressableScale>
        )}
      </View>

      {v ? (
        <>
          {/* choose the fuel first, then see its price */}
          {isPetrol && (
            <View style={{ marginTop: space.block }}>
              <SlidingSegment accessibilityLabel="סוג דלק" options={OCTANE_OPTIONS} value={p.octane} onChange={p.onOctane} />
            </View>
          )}
          <View style={{ marginTop: space.block }}>
            <FuelPriceDisplay price={p.price} onPriceChange={p.onPriceChange} unit={isElectric ? 'לקוט״ש' : 'לליטר'} label={priceLabel(priceField(v), p.octane)} status={p.priceStatus} />
          </View>
        </>
      ) : (
        <PressableScale style={styles.cta} onPress={p.onGoToVehicles} accessibilityRole="button">
          <Text style={styles.ctaText}>לרכבים שלי</Text>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.cardPad - 1.5, borderWidth: 1.5, borderColor: 'transparent' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 48, height: 48, borderRadius: radius.tile, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  sub: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  swap: { height: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.bg },
  swapText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text },
  cta: { height: 40, marginTop: space.block, borderRadius: radius.pill, backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.white },
});
