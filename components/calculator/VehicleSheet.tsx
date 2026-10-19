import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { Car, Check } from 'lucide-react-native';
import React, { RefObject, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptic } from '../../constants/motion';
import { colors, Heebo, radius } from '../../constants/theme';
import type { Vehicle } from '../../lib/tripCost';
import { consumptionLabel, vehicleTitle } from './VehiclePriceCard';

interface Props {
  sheetRef: RefObject<BottomSheetModal | null>;
  vehicles: Vehicle[];
  selectedId?: string;
  onSelect: (v: Vehicle) => void;
  onManage: () => void;
}

export function VehicleSheet({ sheetRef, vehicles, selectedId, onSelect, onManage }: Props) {
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />,
    [],
  );
  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['55%', '90%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
    >
      <Text style={styles.title} accessibilityRole="header">
        בחר רכב
      </Text>
      <BottomSheetFlatList
        data={vehicles}
        keyExtractor={(v: Vehicle) => v.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: Vehicle }) => {
          const selected = item.id === selectedId;
          return (
            <Pressable
              style={[styles.item, selected && styles.itemSelected]}
              onPress={() => {
                haptic.select();
                onSelect(item);
                sheetRef.current?.dismiss();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={styles.tile}>
                <Car size={22} color={colors.selectedText} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {vehicleTitle(item)}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {consumptionLabel(item)}
                </Text>
              </View>
              {selected && <Check size={20} color={colors.selectedText} strokeWidth={2.5} />}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable
            style={styles.manage}
            onPress={() => {
              sheetRef.current?.dismiss();
              onManage();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.manageText}>ניהול רכבים</Text>
          </Pressable>
        }
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { backgroundColor: colors.divider, width: 40, height: 4 },
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text, paddingHorizontal: 20, paddingVertical: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.divider },
  itemSelected: { borderColor: colors.selectedBorder, backgroundColor: colors.selectedFill },
  tile: { width: 44, height: 44, borderRadius: radius.tile, backgroundColor: colors.selectedFill, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: Heebo.bold, fontSize: 16, color: colors.text },
  sub: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted },
  manage: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  manageText: { fontFamily: Heebo.bold, fontSize: 15, color: colors.infoText },
});
