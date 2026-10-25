import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { Plus } from 'lucide-react-native';
import React, { RefObject, useCallback } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { haptic } from '../../constants/motion';
import { colors, Heebo, radius } from '../../constants/theme';
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
    </Pressable>
  );
}

export function VehicleSheet({ sheetRef, vehicles, selectedId, onSelect, onManage, onAdd }: Props) {
  const { height } = useWindowDimensions();
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
      maxDynamicContentSize={height * 0.9}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          בחר רכב
        </Text>
        <Pressable onPress={() => leave(onManage)} hitSlop={12} style={styles.manage} accessibilityRole="button">
          <Text style={styles.manageText}>ניהול</Text>
        </Pressable>
      </View>
      <BottomSheetFlatList
        data={vehicles}
        keyExtractor={(v: Vehicle) => v.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
              <Plus size={22} color={colors.selectedText} strokeWidth={2.4} />
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
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { backgroundColor: colors.divider, width: 40, height: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  manage: { minHeight: 44, justifyContent: 'center' },
  manageText: { fontFamily: Heebo.bold, fontSize: 15, color: colors.infoText },
  list: { paddingHorizontal: 8, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
  rowSelected: { backgroundColor: colors.selectedFill },
  separator: { height: 1, backgroundColor: colors.divider, marginStart: 68, marginEnd: 12 },
  // type values below match the vehicles tab
  brand: { fontFamily: Heebo.bold, fontSize: 11, letterSpacing: 1.2, color: colors.textMuted, marginBottom: 1 },
  name: { fontFamily: Heebo.bold, fontSize: 16, color: colors.text },
  sub: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, marginTop: 1 },
  cons: { alignItems: 'center', minWidth: 56 },
  consNum: { fontFamily: Heebo.extra, fontSize: 20, color: colors.text },
  consUnit: { fontFamily: Heebo.regular, fontSize: 11, color: colors.textMuted },
  add: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, marginTop: 12, marginHorizontal: 4, borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C7C7CC' },
  plus: { width: 40, height: 40, borderRadius: radius.tile, backgroundColor: colors.selectedFill, alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontFamily: Heebo.bold, fontSize: 16, color: colors.selectedText },
  addSub: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
});
