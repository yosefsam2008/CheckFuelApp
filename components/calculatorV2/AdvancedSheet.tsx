// "אפשרויות מתקדמות": fuel grade, price per unit, driving mode, AC. Edits are a draft; only "שמור הגדרות" commits.
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFooter, BottomSheetFooterProps, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Pencil, X } from 'lucide-react-native';
import React, { RefObject, useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PulseDot, type PriceStatus } from '../calculator/FuelPriceDisplay';
import { PressableScale } from '../calculator/PressableScale';
import { Segmented } from './Segmented';
import { LTR, NO_TOUCH } from '../../constants/rtl';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { AC_FACTOR, DriveMode, MODE_FACTOR, Octane, TripPrefs } from '../../lib/tripCost';

export interface Draft {
  octane: Octane;
  price: string;
  prefs: TripPrefs;
}

const pct = (f: number) => (f === 1 ? 'בסיס' : `‎${f > 1 ? '+' : '-'}${Math.round(Math.abs(f - 1) * 100)}%`);
export const MODES: Record<DriveMode, { name: string; desc: string; color: string }> = {
  eco: { name: 'חסכוני', desc: 'האצות עדינות ומהירות קבועה, צריכה נמוכה מהרגיל', color: colors.accentText },
  normal: { name: 'רגיל', desc: 'הצריכה הרגילה של הרכב, לפי נתוני היצרן', color: colors.textMuted },
  sport: { name: 'ספורט', desc: 'האצות חדות ומהירות גבוהה, צריכה גבוהה יותר', color: colors.warn },
};
// same as PlaceSheet: BottomSheetTextInput's blur calls TextInput.State.currentlyFocusedInput, which web lacks
const SheetInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
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

type BodyProps = Omit<Props, 'sheetRef' | 'onSave'> & { onClose: () => void; draftRef: React.MutableRefObject<Draft>; bottomPad: number };

function Body({ initial, showOctane, unit, autoPrice, priceStatus, onClose, draftRef, bottomPad }: BodyProps) {
  const [d, setD] = useState(initial);
  draftRef.current = d; // the fixed footer's save button reads it
  const custom = parseFloat(d.price) !== parseFloat(autoPrice(d.octane));
  const set = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));
  const setPrefs = (patch: Partial<TripPrefs>) => setD((p) => ({ ...p, prefs: { ...p.prefs, ...patch } }));

  return (
    <BottomSheetScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomPad }]} keyboardShouldPersistTaps="handled">
      <Row i={0}>
        <View style={styles.head}>
          <View style={{ gap: 3 }}>
            <Text style={styles.h2}>אפשרויות מתקדמות</Text>
            <Text style={styles.muted}>משפיעות על הצריכה ועל המחיר</Text>
          </View>
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="סגור">
            <X size={18} color={colors.text} strokeWidth={2.2} />
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
                <SheetInput
                  value={d.price}
                  onChangeText={(t) => set({ price: t.replace(/[^0-9.]/g, '').slice(0, 5) })}
                  keyboardType="decimal-pad"
                  style={styles.priceInput}
                  accessibilityLabel={`מחיר ${unit}, ניתן לעריכה`}
                />
                <Text style={styles.shekel}>₪</Text>
              </View>
            </View>
            <View style={styles.priceSide}>
              {custom ? (
                <>
                  <Text style={[styles.tag, { color: colors.warn }]}>המחיר שלך</Text>
                  <Pressable style={styles.reset} onPress={() => set({ price: autoPrice(d.octane) })} accessibilityRole="button" hitSlop={6}>
                    <Text style={styles.resetText}>איפוס</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.tagRow}>
                    <View style={styles.icon}>
                      {priceStatus === 'live' ? <PulseDot color={colors.accentTextLarge} /> : <View style={[styles.dot, { backgroundColor: colors.warn }]} />}
                    </View>
                    <Text style={[styles.tag, { color: priceStatus === 'live' ? colors.accentText : colors.warn }]}>{STATUS[priceStatus]}</Text>
                  </View>
                  <View style={styles.tagRow}>
                    <Pencil size={13} color={colors.textMuted} strokeWidth={2} />
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
          <AcSwitch value={d.prefs.ac} onChange={(ac) => setPrefs({ ac })} />
        </View>
      </Row>
    </BottomSheetScrollView>
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

// Custom switch: the native Android Switch draws its thumb outside the track under forced RTL.
// Track and knob sit in an LTR layer so I18nManager can't flip the offset; off = knob on the right (RTL start).
const TRACK_W = 52, KNOB = 26, PAD = 3;
function AcSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const p = useDerivedValue(() => withTiming(value ? 1 : 0, { duration: 180 }), [value]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [colors.disabled, colors.accentTextLarge]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: -(TRACK_W - KNOB - 2 * PAD) * p.value }] }));
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel="מזגן דולק" hitSlop={8}>
      <Animated.View {...LTR.props} style={[styles.track, LTR.style, track]}>
        <Animated.View style={[styles.knob, NO_TOUCH, knob]} />
      </Animated.View>
    </Pressable>
  );
}

export function AdvancedSheet({ sheetRef, onSave, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const draftRef = useRef(rest.initial);
  const footerPad = insets.bottom + 16;
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View style={[styles.footer, { paddingBottom: footerPad }]}>
          <PressableScale style={styles.save} scaleTo={0.97} onPress={() => onSave(draftRef.current)} accessibilityRole="button">
            <Text style={styles.saveText}>שמור הגדרות</Text>
          </PressableScale>
        </View>
      </BottomSheetFooter>
    ),
    [footerPad, onSave],
  );
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={[props.style, { backgroundColor: colors.scrim }]} pressBehavior="close" />,
    [],
  );
  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose
      keyboardBehavior="interactive"
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      maxDynamicContentSize={height * 0.9}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      accessibilityLabel="אפשרויות מתקדמות"
    >
      {/* remounts on every open, so the draft starts from the committed values */}
      <Body {...rest} draftRef={draftRef} bottomPad={FOOTER_H + footerPad + 8} onClose={() => sheetRef.current?.dismiss()} />
    </BottomSheetModal>
  );
}

const FOOTER_H = 12 + 56; // footer paddingTop + button; the scroll content clears it

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { backgroundColor: colors.disabled, width: 40, height: 5 },
  body: { paddingHorizontal: 20, paddingTop: 4, gap: 18 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.surfaceRaised },
  track: { width: TRACK_W, height: 32, borderRadius: 16 },
  knob: { position: 'absolute', top: PAD, left: TRACK_W - KNOB - PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: colors.surfaceRaised },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  h2: { fontFamily: Rubik.extra, fontSize: 21, color: colors.text },
  muted: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Rubik.bold, fontSize: 15, color: colors.text },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceSunken, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  shekel: { fontFamily: Rubik.bold, fontSize: 22, color: colors.accentText },
  priceInput: { flex: 1, minWidth: 0, textAlign: 'right', padding: 0, fontFamily: Rubik.extra, fontSize: 42, color: colors.text, fontVariant: ['tabular-nums'] },
  priceSide: { alignItems: 'flex-start', gap: 8 },
  icon: { width: 13, alignItems: 'center' }, // pencil's width, so the dot centres on the pencil's axis
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentTextLarge },
  tag: { fontFamily: Rubik.semi, fontSize: 12 },
  hint: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMuted },
  reset: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, justifyContent: 'center' },
  resetText: { fontFamily: Rubik.semi, fontSize: 12, color: colors.text },
  divider: { height: 1, backgroundColor: colors.lineSubtle },
  save: { height: 56, borderRadius: 18, backgroundColor: colors.surfaceInverse, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: Rubik.bold, fontSize: 16, color: colors.textInverse },
});
