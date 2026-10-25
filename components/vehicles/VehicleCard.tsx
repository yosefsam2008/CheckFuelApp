// One vehicle: collapsed line that opens in place to details, set-as-default, edit and a single inline delete confirmation
import { ChevronDown, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolateColor, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { dur, ease, haptic } from '../../constants/motion';
import { NO_OUTLINE, NO_TOUCH } from '../../constants/rtl';
import { colors, Heebo, radius, shadow } from '../../constants/theme';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { isValidConsumption, parseDecimal, toDisplay, toStored } from '../../lib/vehicles/consumption';
import { PressableScale } from '../calculator/PressableScale';
import { LtrText } from '../history/LtrText';
import { consumptionUnit, FUEL_LABEL, VehicleTile } from './fuel';

const PAD_X = 20;

/** Each detail line starts a little after the previous one while the open progress `p` runs 0 -> 1 */
function Reveal({ p, i, children }: { p: SharedValue<number>; i: number; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const q = Math.min(1, Math.max(0, (p.value - i * 0.1) / 0.5));
    return { opacity: q, transform: [{ translateY: (1 - q) * 8 }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Line({ label, value, ltr, first }: { label: string; value: string; ltr?: boolean; first?: boolean }) {
  const T = ltr ? LtrText : Text;
  return (
    <View style={[styles.kv, !first && styles.kvBorder]}>
      <Text style={styles.kvLabel}>{label}</Text>
      <T style={styles.kvText}>{value}</T>
    </View>
  );
}

function FadeIn({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) o.value = withTiming(1, { duration: dur.micro + 50, easing: ease.out });
  }, [reduced, o]);
  return <Animated.View style={useAnimatedStyle(() => ({ opacity: o.value }))}>{children}</Animated.View>;
}

/** Counts 0 -> value (ease-out cubic, 250ms delay) on the first show only */
function useCountUp(to: number, animate: boolean) {
  const [v, setV] = useState(animate ? 0 : to);
  useEffect(() => {
    if (!animate) return setV(to);
    const t0 = performance.now() + 250;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 600));
      setV(to * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, animate]);
  return v;
}

interface Props {
  vehicle: Vehicle;
  isDefault: boolean;
  open: boolean;
  /** count the consumption up (first show only) */
  intro: boolean;
  onToggle: () => void;
  onSetDefault: (v: Vehicle) => void;
  onSave: (v: Vehicle, name: string, avgConsumption: number | undefined) => void;
  /** called once the card has collapsed out */
  onDelete: (v: Vehicle) => void;
}

export function VehicleCard({ vehicle: v, isDefault, open, intro, onToggle, onSetDefault, onSave, onDelete }: Props) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view');
  const unit = consumptionUnit(v.fueltype);
  const fuel = FUEL_LABEL[v.fueltype ?? ''] ?? 'לא ידוע';
  const shown = v.avgConsumption ? toDisplay(v.avgConsumption, v.fueltype) : null;
  const [name, setName] = useState(v.name);
  const [cons, setCons] = useState('');
  const counted = useCountUp(shown ?? 0, intro && !reduced);

  const p = useSharedValue(open ? 1 : 0);
  const detailH = useSharedValue(0);
  const fullH = useSharedValue(0);
  const exit = useSharedValue(0);
  const def = useSharedValue(isDefault ? 1 : 0);

  useEffect(() => {
    if (!open) setMode('view');
    p.value = reduced ? (open ? 1 : 0) : withTiming(open ? 1 : 0, { duration: dur.std, easing: ease.out });
  }, [open, reduced, p]);
  useEffect(() => {
    def.value = reduced ? (isDefault ? 1 : 0) : withTiming(isDefault ? 1 : 0, { duration: 200, easing: ease.out });
  }, [isDefault, reduced, def]);

  const wrap = useAnimatedStyle(() =>
    exit.value > 0 ? { height: fullH.value * (1 - exit.value), opacity: 1 - exit.value, overflow: 'hidden', transform: [{ translateX: -30 * exit.value }] } : {},
  );
  const border = useAnimatedStyle(() => ({ borderColor: interpolateColor(def.value, [0, 1], ['rgba(52,199,89,0)', colors.selectedBorder]) }));
  const detail = useAnimatedStyle(() => ({ height: detailH.value * p.value }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${180 * p.value}deg` }] }));

  const confirmDelete = () => {
    haptic.press();
    if (reduced) return onDelete(v);
    exit.value = withTiming(1, { duration: dur.std, easing: ease.out }, (done) => {
      if (done) runOnJS(onDelete)(v);
    });
  };
  const startEdit = () => {
    setName(v.name);
    setCons(shown ? String(shown) : '');
    setMode('edit');
  };
  const save = () => {
    const n = parseDecimal(cons);
    onSave(v, name.trim() || v.name, isValidConsumption(n) ? toStored(n, v.fueltype) : v.avgConsumption);
    setMode('view');
  };

  const ghost = (label: string, onPress: () => void) => (
    <PressableScale onPress={onPress} style={[styles.btn, styles.ghost]} accessibilityRole="button">
      <Text style={styles.btnText}>{label}</Text>
    </PressableScale>
  );

  return (
    <Animated.View style={wrap} onLayout={(e: LayoutChangeEvent) => { if (exit.value === 0) fullH.value = e.nativeEvent.layout.height; }}>
      <Animated.View style={[styles.card, border]}>
        <PressableScale onPress={onToggle} scaleTo={0.985} style={styles.row} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${v.brand ? v.brand + ' ' : ''}${v.name} ${v.model}`}>
          <VehicleTile type={v.type} fuel={v.fueltype} />
          <View style={styles.main}>
            {!!v.brand && <LtrText style={styles.brand} numberOfLines={1}>{v.brand.toUpperCase()}</LtrText>}
            <LtrText style={styles.name} numberOfLines={1}>{v.name}</LtrText>
            <Text style={styles.sub} numberOfLines={1}>{fuel}</Text>
          </View>
          <View style={styles.cons}>
            <LtrText style={styles.consNum}>{shown ? counted.toFixed(1) : '—'}</LtrText>
            <Text style={styles.consUnit}>{unit}</Text>
          </View>
          <Animated.View style={chevron}>
            <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
          </Animated.View>
        </PressableScale>

        <Animated.View style={[styles.clip, detail, !open && NO_TOUCH]} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
          <View style={styles.measure} onLayout={(e) => (detailH.value = e.nativeEvent.layout.height)}>
            <View style={styles.dl}>
              <Reveal p={p} i={0}><Line first label="מספר רישוי" value={v.plate || '—'} ltr /></Reveal>
              {!!v.brand && <Reveal p={p} i={1}><Line label="יצרן" value={v.brand} ltr /></Reveal>}
              <Reveal p={p} i={1}><Line label="דגם" value={v.model || '—'} ltr /></Reveal>
              <Reveal p={p} i={2}><Line label="מנוע" value={v.engine || '—'} ltr /></Reveal>
              <Reveal p={p} i={3}><Line label="שנת ייצור" value={v.year ? String(v.year) : '—'} ltr /></Reveal>
              <Reveal p={p} i={4}><Line label="סוג דלק" value={fuel} /></Reveal>
              <Reveal p={p} i={5}><Line label="צריכה" value={shown ? `${shown.toFixed(1)} ${unit}` : '—'} /></Reveal>
            </View>
            <Reveal p={p} i={6}>
              {!isDefault && mode === 'view' && (
                <PressableScale onPress={() => onSetDefault(v)} style={styles.defaultBtn} accessibilityRole="button">
                  <Text style={styles.defaultText}>קבע כברירת מחדל</Text>
                </PressableScale>
              )}
              <View style={styles.actions}>
                <FadeIn key={mode}>
                  {mode === 'edit' ? (
                    <>
                      <Text style={styles.fieldLabel}>שם הרכב</Text>
                      <TextInput value={name} onChangeText={setName} style={[styles.input, NO_OUTLINE]} accessibilityLabel="שם הרכב" />
                      <Text style={styles.fieldLabel}>{`צריכה ממוצעת (${unit})`}</Text>
                      <TextInput value={cons} onChangeText={setCons} keyboardType="decimal-pad" style={[styles.input, NO_OUTLINE]} accessibilityLabel={`צריכה ממוצעת, ${unit}`} />
                      <View style={[styles.btns, styles.editBtns]}>
                        {ghost('ביטול', () => setMode('view'))}
                        <PressableScale onPress={save} style={[styles.btn, styles.primary]} accessibilityRole="button">
                          <Text style={styles.btnText}>שמור</Text>
                        </PressableScale>
                      </View>
                    </>
                  ) : mode === 'confirm' ? (
                    <View style={styles.confirm}>
                      <Text style={styles.confirmQ}>למחוק את הרכב?</Text>
                      <View style={styles.btns}>
                        {ghost('ביטול', () => setMode('view'))}
                        <PressableScale onPress={confirmDelete} style={[styles.btn, styles.danger]} accessibilityRole="button">
                          <Text style={[styles.btnText, { color: colors.white }]}>מחק</Text>
                        </PressableScale>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.confirm}>
                      <PressableScale onPress={() => setMode('confirm')} style={styles.askBtn} accessibilityRole="button">
                        <Trash2 size={18} color={colors.error} strokeWidth={2} />
                        <Text style={[styles.btnText, { color: colors.error }]}>מחק רכב</Text>
                      </PressableScale>
                      {ghost('ערוך', startEdit)}
                    </View>
                  )}
                </FadeIn>
              </View>
            </Reveal>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1.5, overflow: 'hidden', ...shadow.card },
  row: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, paddingHorizontal: PAD_X },
  main: { flex: 1, minWidth: 0 },
  brand: { fontFamily: Heebo.bold, fontSize: 11, letterSpacing: 1.2, color: colors.textMuted, marginBottom: 1 },
  name: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  sub: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  cons: { alignItems: 'center' },
  consNum: { fontFamily: Heebo.extra, fontSize: 20, color: colors.text },
  consUnit: { fontFamily: Heebo.regular, fontSize: 11, color: colors.textMuted },
  clip: { overflow: 'hidden' },
  // measured at its natural height; absolute so the clip's animated height does not squeeze it
  measure: { position: 'absolute', width: '100%' },
  dl: { marginHorizontal: PAD_X, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.bg, borderRadius: radius.tile },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  kvBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  kvLabel: { fontFamily: Heebo.regular, fontSize: 15, color: colors.textMuted },
  kvText: { fontFamily: Heebo.bold, fontSize: 15, color: colors.text, flexShrink: 1 },
  defaultBtn: { height: 48, marginHorizontal: PAD_X, marginTop: 12, borderRadius: radius.pill, backgroundColor: colors.selectedFill, alignItems: 'center', justifyContent: 'center' },
  defaultText: { fontFamily: Heebo.bold, fontSize: 15, color: colors.selectedText },
  actions: { minHeight: 68, justifyContent: 'center', paddingTop: 12, paddingBottom: 18, paddingHorizontal: PAD_X },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  confirmQ: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text },
  btns: { flexDirection: 'row', gap: 8 },
  editBtns: { justifyContent: 'flex-end', marginTop: 12 },
  btn: { height: 44, minWidth: 44, paddingHorizontal: 18, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: colors.bg },
  primary: { backgroundColor: colors.selectedFill },
  danger: { backgroundColor: colors.error },
  askBtn: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text },
  fieldLabel: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, marginTop: 8, marginBottom: 4 },
  input: { height: 48, borderRadius: radius.tile, backgroundColor: colors.bg, paddingHorizontal: 14, fontFamily: Heebo.bold, fontSize: 16, color: colors.text },
});
