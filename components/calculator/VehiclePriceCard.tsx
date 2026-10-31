import Car from 'lucide-react-native/dist/esm/icons/car';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, Heebo, radius, space } from '../../constants/theme';
import { priceField, type Octane, type Vehicle } from '../../lib/tripCost';
import { priceLabel } from '../../lib/priceDisplay';
import { LtrText } from '../history/LtrText';
import { FuelPriceDisplay, PriceStatus } from './FuelPriceDisplay';
import { PressableScale } from './PressableScale';
import { SlidingSegment } from './SlidingSegment';

interface Props {
  vehicle: Vehicle | null;
  onSwap: () => void;
  onGoToVehicles: () => void;
}

interface PriceProps {
  vehicle: Vehicle;
  price: string;
  onPriceChange: (text: string) => void;
  priceStatus: PriceStatus;
  priceDate?: string;
  octane: Octane;
  onOctane: (o: Octane) => void;
}

/** the vehicle's display name, as on the vehicles tab; the model only when there is no name */
export function vehicleTitle(v: Vehicle) {
  return (v.name ?? '').trim() || (v.model ?? '').trim();
}

const OCTANE_OPTIONS = [
  { value: '95' as Octane, label: 'בנזין 95' },
  { value: '98' as Octane, label: 'בנזין 98' },
];

/** price + octane; lives in the calculator's advanced options */
export function FuelPriceFields(p: PriceProps) {
  const v = p.vehicle;
  const isElectric = v.fueltype === 'Electric';
  const isPetrol = v.fueltype !== 'Electric' && v.fueltype !== 'Diesel';
  return (
    <>
      <FuelPriceDisplay price={p.price} onPriceChange={p.onPriceChange} unit={isElectric ? 'לקוט״ש' : 'לליטר'} label={priceLabel(priceField(v), p.octane)} status={p.priceStatus} />
      {/* the fuel comes from the vehicle; only petrol cars pick an octane, which the registry doesn't record */}
      {isPetrol && (
        <View style={{ marginTop: space.block }}>
          <SlidingSegment accessibilityLabel="סוג דלק" options={OCTANE_OPTIONS} value={p.octane} onChange={p.onOctane} />
        </View>
      )}
    </>
  );
}

/** vehicle row; lives at the top of the route card */
export function VehiclePriceCard(p: Props) {
  const v = p.vehicle;
  return (
    <View>
      <View style={styles.vehicleRow}>
        <View style={styles.tile}>
          <Car size={24} color={v ? colors.text : colors.textMuted} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          {!!v?.brand && <LtrText style={styles.brand} numberOfLines={1}>{v.brand.toUpperCase()}</LtrText>}
          <Text style={styles.title} numberOfLines={1}>
            {v ? vehicleTitle(v) : 'עוד לא בחרת רכב'}
          </Text>
          {!v && (
            <Text style={styles.sub} numberOfLines={1}>
              בחר רכב מהרשימה שלך
            </Text>
          )}
        </View>
        {v && (
          <PressableScale style={styles.swap} onPress={p.onSwap} accessibilityRole="button" accessibilityLabel="החלף רכב">
            <Text style={styles.swapText}>החלף</Text>
          </PressableScale>
        )}
      </View>

      {!v && (
        <PressableScale style={styles.cta} onPress={p.onGoToVehicles} accessibilityRole="button">
          <Text style={styles.ctaText}>לרכבים שלי</Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 48, height: 48, borderRadius: radius.tile, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: Heebo.bold, fontSize: 11, letterSpacing: 1.2, color: colors.textMuted, marginBottom: 1 }, // as on the vehicles tab
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  sub: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  swap: { height: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.bg },
  swapText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text },
  cta: { height: 40, marginTop: space.block, borderRadius: radius.pill, backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.white },
});
