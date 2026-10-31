import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import Check from 'lucide-react-native/dist/esm/icons/check';
import Plus from 'lucide-react-native/dist/esm/icons/plus';
import React, { RefObject, useCallback } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '../../constants/motion';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import type { Vehicle } from '../../lib/tripCost';
import { toDisplay, type Fuel } from '../../lib/vehicles/consumption';
import { LtrText } from '../history/LtrText';
import { consumptionUnit, FUEL_LABEL, VehicleTile } from '../vehicles/fuel';
import { PressableScale } from './PressableScale';
import { vehicleTitle } from './VehiclePriceCard';

interface Props {
  sheetRef: RefObject<BottomSheetModal | null>;
  vehicles: Vehicle[];
  selectedId?: string;
  onSelect: (v: Vehicle) => void;
  onManage: () => void;
  onAdd: () => void;
}

// same anatomy as the vehicles tab row: tile, maker / name / fuel, consumption as the number
function Row({ v, selected, onPress }: { v: Vehicle; selected: boolean; onPress: () => void }) {
  const shown = v.avgConsumption ? toDisplay(v.avgConsumption, v.fueltype as Fuel) : null;
  return (
    <Pressable
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${v.brand ? v.brand + ' ' : ''}${vehicleTitle(v)}`}
    >
      <VehicleTile type={v.type as 'car' | 'motorcycle' | 'truck' | undefined} fuel={v.fueltype} size={44} />
      <View style={{ flex: 1 }}>
        {!!v.brand && <LtrText style={styles.brand} numberOfLines={1}>{v.brand.toUpperCase()}</LtrText>}
        <LtrText style={styles.name} numberOfLines={1}>{vehicleTitle(v)}</LtrText>
        <Text style={styles.sub} numberOfLines={1}>{FUEL_LABEL[v.fueltype] ?? v.fueltype}</Text>
      </View>
      <View style={styles.cons}>
        <LtrText style={styles.consNum}>{shown ? shown.toFixed(1) : '—'}</LtrText>
        <Text style={styles.consUnit}>{consumptionUnit(v.fueltype)}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <Check size={14} color={colors.text} strokeWidth={3} />}</View>
    </Pressable>
  );
}

export function VehicleSheet({ sheetRef, vehicles, selectedId, onSelect, onManage, onAdd }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />,
    [],
  );
  const leave = (go: () => void) => {
    sheetRef.current?.dismiss();
    go();
  };
  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      maxDynamicContentSize={height * 0.9 - insets.top}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetFlatList
        data={vehicles}
        keyExtractor={(v: Vehicle) => v.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              בחר רכב
            </Text>
            <Pressable onPress={() => leave(onManage)} hitSlop={12} style={styles.manage} accessibilityRole="button">
              <Text style={styles.manageText}>ניהול</Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={[styles.list, { paddingBottom: 32 + insets.bottom }]}
        renderItem={({ item }: { item: Vehicle }) => (
          <Row
            v={item}
            selected={item.id === selectedId}
            onPress={() => {
              haptic.select();
              onSelect(item);
              // a beat to see the new selection before the sheet goes
              setTimeout(() => sheetRef.current?.dismiss(), 180);
            }}
          />
        )}
        ListFooterComponent={
          <PressableScale onPress={() => leave(onAdd)} style={styles.add} accessibilityRole="button" accessibilityLabel="הוספת רכב">
            <View style={styles.plus}>
              <Plus size={20} color={colors.text} strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.addTitle}>הוספת רכב</Text>
              <Text style={styles.addSub}>לפי מספר רישוי או ידנית</Text>
            </View>
          </PressableScale>
        }
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  // matches AdvancedSheet
  sheet: { backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { backgroundColor: colors.disabled, width: 40, height: 5 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 4, paddingBottom: 12 },
  title: { fontFamily: Rubik.extra, fontSize: 21, color: colors.text },
  manage: { minHeight: 44, justifyContent: 'center' },
  manageText: { fontFamily: Rubik.semi, fontSize: 15, color: colors.accentText },
  list: { paddingHorizontal: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised },
  rowSelected: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  // alignSelf keeps the LTR names on the RTL start edge, in line with the Hebrew fuel label
  brand: { alignSelf: 'flex-start', fontFamily: Rubik.semi, fontSize: 11, letterSpacing: 0.9, color: colors.textMuted },
  name: { alignSelf: 'flex-start', fontFamily: Rubik.bold, fontSize: 16, color: colors.text },
  sub: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted, marginTop: 1 },
  cons: { alignItems: 'center', minWidth: 48 },
  consNum: { fontFamily: Rubik.extra, fontSize: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  consUnit: { fontFamily: Rubik.regular, fontSize: 11, color: colors.textMuted },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  add: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 4, borderRadius: 20, backgroundColor: colors.surfaceSunken },
  plus: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontFamily: Rubik.bold, fontSize: 16, color: colors.text },
  addSub: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted },
});
