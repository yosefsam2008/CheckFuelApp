// "אפשרויות מתקדמות": fuel grade, price per unit, driving mode, AC. Edits are a draft; only "שמור הגדרות" commits.
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { Pencil, X } from 'lucide-react-native';
import React, { RefObject, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { PriceStatus } from '../calculator/FuelPriceDisplay';
import { PressableScale } from '../calculator/PressableScale';
import { Segmented } from './Segmented';
import { LTR } from '../../constants/rtl';
import { c, Rubik } from '../../constants/themeV2';
import { AC_FACTOR, DriveMode, MODE_FACTOR, Octane, TripPrefs } from '../../lib/tripCost';

export interface Draft {
  octane: Octane;
  price: string;
  prefs: TripPrefs;
}

const pct = (f: number) => (f === 1 ? 'בסיס' : `${f > 1 ? '+' : '−'}${Math.round(Math.abs(f - 1) * 100)}%`);
export const MODES: Record<DriveMode, { name: string; desc: string; color: string }> = {
  eco: { name: 'חסכוני', desc: 'האצות עדינות ומהירות קבועה, צריכה נמוכה מהרגיל', color: c.deep },
  normal: { name: 'רגיל', desc: 'הצריכה הרגילה של הרכב, לפי נתוני היצרן', color: c.muted },
  sport: { name: 'ספורט', desc: 'האצות חדות ומהירות גבוהה, צריכה גבוהה יותר', color: c.warn },
};
const STATUS: Record<PriceStatus, string> = { live: 'מחיר מפוקח', estimate: 'מחיר משוער', fallback: 'מחיר משוער', loading: 'בודק מחיר…' };

interface Props {
  sheetRef: RefObject<BottomSheetModal | null>;
  initial: Draft; // read when the sheet opens
  showOctane: boolean; // 95/98 is petrol only
  unit: string; // "לליטר" / "לקוט״ש"
  autoPrice: (octane: Octane) => string;
  priceStatus: PriceStatus;
  onSave: (d: Draft) => void;
}

// design motion #8: rows fade and rise 14px, 90ms + 50ms per row
const Row = ({ i, children }: { i: number; children: React.ReactNode }) => <Animated.View entering={FadeInDown.duration(420).delay(90 + 50 * i)}>{children}</Animated.View>;

function Body({ initial, showOctane, unit, autoPrice, priceStatus, onSave, onClose }: Omit<Props, 'sheetRef'> & { onClose: () => void }) {
  const [d, setD] = useState(initial);
  const custom = parseFloat(d.price) !== parseFloat(autoPrice(d.octane));
  const set = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));
  const setPrefs = (patch: Partial<TripPrefs>) => setD((p) => ({ ...p, prefs: { ...p.prefs, ...patch } }));

  return (
    <BottomSheetView style={styles.body}>
      <Row i={0}>
        <View style={styles.head}>
          <View style={{ gap: 3 }}>
            <Text style={styles.h2}>אפשרויות מתקדמות</Text>
            <Text style={styles.muted}>משפיעות על הצריכה ועל המחיר</Text>
          </View>
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="סגור">
            <X size={18} color={c.ink} strokeWidth={2.2} />
          </Pressable>
        </View>
      </Row>

      <Row i={1}>
        <View style={{ gap: 12 }}>
          {showOctane && (
            <>
              <Text style={styles.label}>סוג דלק</Text>
              <SegmentedLight value={d.octane} onChange={(o) => set({ octane: o, price: autoPrice(o) })} />
            </>
          )}
          <View style={styles.priceBox}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.muted}>מחיר {unit}</Text>
              <View {...LTR.props} style={[styles.priceRow, LTR.style]}>
                <Text style={styles.shekel}>₪</Text>
                <BottomSheetTextInput
                  value={d.price}
                  onChangeText={(t) => set({ price: t.replace(/[^0-9.]/g, '').slice(0, 5) })}
                  keyboardType="decimal-pad"
                  style={styles.priceInput}
                  accessibilityLabel={`מחיר ${unit}, ניתן לעריכה`}
                />
              </View>
            </View>
            <View style={styles.priceSide}>
              {custom ? (
                <>
                  <Text style={[styles.tag, { color: c.warn }]}>המחיר שלך</Text>
                  <Pressable style={styles.reset} onPress={() => set({ price: autoPrice(d.octane) })} accessibilityRole="button" hitSlop={6}>
                    <Text style={styles.resetText}>איפוס</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.tagRow}>
                    <View style={[styles.dot, priceStatus !== 'live' && { backgroundColor: c.warn }]} />
                    <Text style={[styles.tag, { color: priceStatus === 'live' ? c.deep : c.warn }]}>{STATUS[priceStatus]}</Text>
                  </View>
                  <View style={styles.tagRow}>
                    <Pencil size={13} color={c.muted} strokeWidth={2} />
                    <Text style={styles.hint}>הקש לעריכה</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Row>

      <View style={styles.divider} />

      <Row i={2}>
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>סגנון נהיגה</Text>
          <SegmentedMode value={d.prefs.mode} onChange={(mode) => setPrefs({ mode })} />
          <Text style={styles.muted}>{MODES[d.prefs.mode].desc}</Text>
        </View>
      </Row>

      <View style={styles.divider} />

      <Row i={3}>
        <View style={styles.head}>
          <View style={{ gap: 3 }}>
            <Text style={styles.label}>מזגן דולק</Text>
            <Text style={styles.muted}>מוסיף כ-{Math.round((AC_FACTOR - 1) * 100)}% לצריכה</Text>
          </View>
          <Switch value={d.prefs.ac} onValueChange={(ac) => setPrefs({ ac })} trackColor={{ true: c.greenText, false: c.disabled }} thumbColor={c.white} accessibilityLabel="מזגן דולק" />
        </View>
      </Row>

      <Row i={4}>
        <PressableScale style={styles.save} scaleTo={0.97} onPress={() => onSave(d)} accessibilityRole="button">
          <Text style={styles.saveText}>שמור הגדרות</Text>
        </PressableScale>
      </Row>
    </BottomSheetView>
  );
}

const SegmentedLight = ({ value, onChange }: { value: Octane; onChange: (o: Octane) => void }) => (
  <Segmented
    value={value}
    onChange={onChange}
    accessibilityLabel="סוג דלק"
    options={[
      { value: '95', label: 'בנזין 95' },
      { value: '98', label: 'בנזין 98' },
    ]}
  />
);
const SegmentedMode = ({ value, onChange }: { value: DriveMode; onChange: (m: DriveMode) => void }) => (
  <Segmented
    value={value}
    onChange={onChange}
    height={58}
    accessibilityLabel="סגנון נהיגה"
    options={(['eco', 'normal', 'sport'] as const).map((m) => ({ value: m, label: MODES[m].name, sub: pct(MODE_FACTOR[m]), subColor: MODES[m].color }))}
  />
);

export function AdvancedSheet({ sheetRef, ...rest }: Props) {
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={[props.style, { backgroundColor: c.scrim }]} pressBehavior="close" />,
    [],
  );
  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose
      keyboardBehavior="interactive"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      accessibilityLabel="אפשרויות מתקדמות"
    >
      {/* remounts on every open, so the draft starts from the committed values */}
      <Body {...rest} onClose={() => sheetRef.current?.dismiss()} />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: c.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { backgroundColor: c.disabled, width: 40, height: 5 },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  h2: { fontFamily: Rubik.extra, fontSize: 21, color: c.ink },
  muted: { fontFamily: Rubik.regular, fontSize: 13, color: c.muted },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.mist, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Rubik.bold, fontSize: 15, color: c.ink },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.mist, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4 },
  shekel: { fontFamily: Rubik.bold, fontSize: 22, color: c.greenText },
  priceInput: { minWidth: 118, padding: 0, fontFamily: Rubik.extra, fontSize: 42, color: c.ink, fontVariant: ['tabular-nums'] },
  priceSide: { alignItems: 'flex-end', gap: 8 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.greenText },
  tag: { fontFamily: Rubik.semi, fontSize: 12 },
  hint: { fontFamily: Rubik.regular, fontSize: 12, color: c.muted },
  reset: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, justifyContent: 'center' },
  resetText: { fontFamily: Rubik.semi, fontSize: 12, color: c.ink },
  divider: { height: 1, backgroundColor: c.divider },
  save: { height: 56, borderRadius: 18, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: Rubik.bold, fontSize: 16, color: c.white },
});
