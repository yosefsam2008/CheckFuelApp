// Shared bits of the vehicle screens: fuel labels and units, the tinted icon tile
import { Bike, Car, Truck } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { fuelTint, radius } from '../../constants/theme';
import type { Vehicle } from '../../lib/data/vehiclesData';

export const FUEL_LABEL: Record<string, string> = { Gasoline: 'בנזין', Diesel: 'דיזל', Electric: 'חשמלי', PHEV: 'פלאג־אין' };
export const isEv = (fuel?: string) => fuel === 'Electric' || fuel === 'PHEV';
export const consumptionUnit = (fuel?: string) => (isEv(fuel) ? 'קוט״ש ל־100 ק״מ' : 'ק״מ לליטר');

export const tintFor = (fuel?: string) =>
  fuel === 'Diesel'
    ? { fill: fuelTint.dieselFill, icon: fuelTint.dieselIcon }
    : isEv(fuel)
      ? { fill: fuelTint.evFill, icon: fuelTint.evIcon }
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
