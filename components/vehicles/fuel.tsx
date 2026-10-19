// Shared bits of the vehicle screens: fuel labels and units, the tinted icon tile, the gradient CTA
import { LinearGradient } from 'expo-linear-gradient';
import { Bike, Car, Truck } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fuelTint, Heebo, radius, shadow } from '../../constants/theme';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { PressableScale } from '../calculator/PressableScale';

export const FUEL_LABEL: Record<string, string> = { Gasoline: 'בנזין', Diesel: 'דיזל', Electric: 'חשמלי', PHEV: 'פלאג־אין' };
export const isEv = (fuel?: string) => fuel === 'Electric' || fuel === 'PHEV';
export const consumptionUnit = (fuel?: string) => (isEv(fuel) ? 'קוט״ש ל־100 ק״מ' : 'ק״מ לליטר');

const tintFor = (fuel?: string) =>
  fuel === 'Diesel'
    ? { fill: fuelTint.dieselFill, icon: fuelTint.dieselIcon }
    : isEv(fuel)
      ? { fill: colors.guideFill, icon: colors.guideText }
      : { fill: fuelTint.gasolineFill, icon: fuelTint.gasolineIcon };

export function VehicleTile({ type, fuel, size = 48 }: { type?: Vehicle['type']; fuel?: string; size?: number }) {
  const { fill, icon } = tintFor(fuel);
  const Icon = type === 'motorcycle' ? Bike : type === 'truck' ? Truck : Car;
  return (
    <View style={{ width: size, height: size, borderRadius: radius.tile, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size / 2} color={icon} strokeWidth={2} />
    </View>
  );
}

/** Full-width gradient button. Disabled: the mint "guide" look, not pressable. */
export function GradientButton({ label, onPress, disabled, loading, icon }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; icon?: React.ReactNode }) {
  const off = disabled || loading;
  return (
    <PressableScale onPress={off ? undefined : onPress} style={[styles.btn, !off && shadow.cta]} accessibilityRole="button" accessibilityState={{ disabled: !!off, busy: !!loading }} accessibilityLabel={label}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.guideFill }]} />
      {!disabled && <LinearGradient colors={colors.ctaGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />}
      {loading ? <ActivityIndicator size="small" color={colors.white} /> : icon}
      <Text style={[styles.label, { color: disabled ? colors.guideText : colors.white }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: { height: 56, borderRadius: radius.pill, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { fontFamily: Heebo.extra, fontSize: 17 },
});
