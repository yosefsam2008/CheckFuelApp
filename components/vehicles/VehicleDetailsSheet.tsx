// "פרטי הרכב": the registry fields, then delete (with the same in-place confirmation the old card had) and edit
// (the same name + consumption form). Built like AdvancedSheet; springs open, pan down to close.
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetTextInput, BottomSheetView, useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import Pencil from 'lucide-react-native/dist/esm/icons/pencil';
import Trash2 from 'lucide-react-native/dist/esm/icons/trash-2';
import X from 'lucide-react-native/dist/esm/icons/x';
import React, { RefObject, useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { NO_OUTLINE } from '../../constants/rtl';
import { Rubik } from '../../constants/themeV2';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { isValidConsumption, parseDecimal, toStored } from '../../lib/vehicles/consumption';
import { formatPlate, shownConsumption, titleCase, vehicleLabels } from '../../lib/vehicles/display';
import { LtrText } from '../history/LtrText';
import { consumptionUnit, FUEL_LABEL } from './fuel';
import { Press } from './Press';

// same as AdvancedSheet: BottomSheetTextInput's blur calls TextInput.State.currentlyFocusedInput, which web lacks
const SheetInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

interface Props {
  sheetRef: RefObject<BottomSheetModal | null>;
  /** undefined once deleted: the closing sheet keeps showing the last vehicle */
  vehicle: Vehicle | undefined;
  onSave: (v: Vehicle, name: string, avgConsumption: number | undefined) => void;
  onDelete: (v: Vehicle) => void;
}

function Body({ v, onSave, onDelete, onClose, bottomPad }: { v: Vehicle; onSave: Props['onSave']; onDelete: Props['onDelete']; onClose: () => void; bottomPad: number }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view');
  const shown = shownConsumption(v);
  const unit = consumptionUnit(v.fueltype);
  const [name, setName] = useState(v.name);
  const [cons, setCons] = useState(shown ? String(shown) : '');

  const save = () => {
    const n = parseDecimal(cons);
    onSave(v, name.trim() || v.name, isValidConsumption(n) ? toStored(n, v.fueltype) : v.avgConsumption);
    setMode('view');
  };
  const startEdit = () => {
    setName(v.name);
    setCons(shown ? String(shown) : '');
    setMode('edit');
  };

  const rows: [string, string, boolean?][] = [];
  if (v.plate) rows.push(['מספר רישוי', formatPlate(v.plate), true]);
  if (v.brand) rows.push(['יצרן', titleCase(v.brand), true]);
  if (v.model) rows.push(['דגם', v.model, true]);
  if (v.year) rows.push(['שנת ייצור', String(v.year), true]);
  if (v.engine) rows.push(['מנוע', v.engine, true]);
  if (v.fueltype && FUEL_LABEL[v.fueltype]) rows.push(['סוג דלק', FUEL_LABEL[v.fueltype]]);
  if (shown) rows.push(['צריכה', `${shown.toFixed(1)} ${unit}`]);

  const name0 = vehicleLabels(v).title;
  return (
    <BottomSheetView style={[styles.body, { paddingBottom: bottomPad }]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.h2}>פרטי הרכב</Text>
          <Text style={styles.muted} numberOfLines={1}>
            {v.plate ? `${name0} · נשלף ממשרד התחבורה` : name0}
          </Text>
        </View>
        <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="סגור">
          <X size={18} color={colors.text} strokeWidth={2.2} />
        </Pressable>
      </View>

      {mode === 'edit' ? (
        <View>
          <Text style={styles.fieldLabel}>שם הרכב</Text>
          <SheetInput value={name} onChangeText={setName} style={[styles.input, NO_OUTLINE]} accessibilityLabel="שם הרכב" />
          <Text style={styles.fieldLabel}>{`צריכה ממוצעת (${unit})`}</Text>
          <SheetInput value={cons} onChangeText={setCons} keyboardType="decimal-pad" style={[styles.input, NO_OUTLINE]} accessibilityLabel={`צריכה ממוצעת, ${unit}`} />
        </View>
      ) : (
        rows.length > 0 && (
          <View style={styles.list}>
            {rows.map(([k, val, ltr], i) => (
              <View key={k} style={[styles.kv, i > 0 && styles.kvBorder]}>
                <Text style={styles.key}>{k}</Text>
                {ltr ? (
                  <LtrText style={styles.val} numberOfLines={1}>
                    {val}
                  </LtrText>
                ) : (
                  <Text style={styles.val} numberOfLines={1}>
                    {val}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )
      )}

      {mode === 'confirm' && <Text style={styles.confirmQ}>למחוק את הרכב?</Text>}
      <View style={styles.btns}>
        {mode === 'view' ? (
          <>
            <Press style={[styles.btn, styles.ghost]} onPress={() => setMode('confirm')} accessibilityRole="button">
              <Trash2 size={18} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.ghostText}>מחק רכב</Text>
            </Press>
            <Press style={[styles.btn, styles.primary]} onPress={startEdit} accessibilityRole="button">
              <Pencil size={18} color={colors.textInverse} strokeWidth={2} />
              <Text style={styles.primaryText}>עריכה</Text>
            </Press>
          </>
        ) : (
          <>
            <Press style={[styles.btn, styles.ghost]} onPress={() => setMode('view')} accessibilityRole="button">
              <Text style={styles.ghostText}>ביטול</Text>
            </Press>
            {mode === 'edit' ? (
              <Press style={[styles.btn, styles.primary]} onPress={save} accessibilityRole="button">
                <Text style={styles.primaryText}>שמור</Text>
              </Press>
            ) : (
              <Press style={[styles.btn, styles.danger]} onPress={() => onDelete(v)} accessibilityRole="button">
                <Text style={styles.primaryText}>מחק</Text>
              </Press>
            )}
          </>
        )}
      </View>
    </BottomSheetView>
  );
}

export function VehicleDetailsSheet({ sheetRef, vehicle, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const last = useRef(vehicle);
  if (vehicle) last.current = vehicle;
  // one spring for open and close (the library takes a single config); explicit reduceMotion because the root config says Never
  const animationConfigs = useBottomSheetSpringConfigs({ damping: 22, stiffness: 220, mass: 0.9, reduceMotion: reduced ? ReduceMotion.Always : ReduceMotion.Never });
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={[props.style, { backgroundColor: colors.scrim }]} pressBehavior="close" />,
    [],
  );
  const v = last.current;
  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose
      keyboardBehavior="interactive"
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      accessibilityLabel="פרטי הרכב"
    >
      {/* the modal unmounts its content on close, so each open starts in view mode */}
      {v && <Body v={v} onSave={onSave} onDelete={onDelete} onClose={() => sheetRef.current?.dismiss()} bottomPad={insets.bottom + 28} />}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { backgroundColor: colors.disabled, width: 40, height: 5 },
  body: { paddingHorizontal: 20, paddingTop: 10, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headText: { flex: 1, minWidth: 0, gap: 3 },
  h2: { fontFamily: Rubik.extra, fontSize: 21, color: colors.text },
  muted: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.surfaceSunken, borderRadius: 18, paddingHorizontal: 16 },
  kv: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kvBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  key: { fontFamily: Rubik.regular, fontSize: 14, color: colors.textMuted },
  val: { fontFamily: Rubik.semi, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'], flexShrink: 1 },
  fieldLabel: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted, marginTop: 8, marginBottom: 4 },
  input: { height: 48, borderRadius: 14, backgroundColor: colors.surfaceSunken, paddingHorizontal: 14, fontFamily: Rubik.bold, fontSize: 16, color: colors.text, textAlign: 'right' },
  confirmQ: { fontFamily: Rubik.bold, fontSize: 15, color: colors.text, marginBottom: -6 },
  btns: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 56, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line },
  ghostText: { fontFamily: Rubik.bold, fontSize: 16, color: colors.textMuted },
  primary: { backgroundColor: colors.surfaceInverse },
  primaryText: { fontFamily: Rubik.bold, fontSize: 16, color: colors.textInverse },
  danger: { backgroundColor: colors.danger },
});
