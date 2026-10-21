// Result drawer: total rolls digit by digit, then metrics, eco comparison, split, navigation and save
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Navigation, Users } from 'lucide-react-native';
import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { haptic, spring, useEnter } from '../../constants/motion';
import { colors, Heebo, radius, shadow } from '../../constants/theme';
import { formatAmount, formatShare } from '../../lib/format';
import type { CalculationResult, DriveMode, Vehicle } from '../../lib/tripCost';
import { CornerArcs } from './Halo';
import { chooseNavApp, NavApp, NavSheet } from './navApps';
import { PressableScale } from './PressableScale';
import { SlidingDigits } from './SlidingDigits';
import { SplitSheet } from './SplitSheet';
import { LTR } from '../../constants/rtl';

const ROLL_DELAY = 300;
const STAGGER = 70;

export interface ResultData {
  result: CalculationResult;
  ecoCost: number;
  mode: DriveMode;
  unitPrice: number;
  vehicle: Vehicle;
  roundTrip: boolean;
  passengers: number;
  destination: string; // navigation query; empty in manual-distance mode
  from: string; // place names for the split message
  to: string;
}

interface Props {
  sheetRef: RefObject<BottomSheetModal | null>;
  data: ResultData | null;
  onSave: () => void;
  banner?: React.ReactNode;
}

const MODE_LABEL: Record<DriveMode, string> = { eco: 'חסכוני', normal: 'רגיל', sport: 'ספורט' };
const shekel = (n: number) => `₪${formatAmount(n)}`;

function Metric({ label, value, delay }: { label: string; value: string; delay: number }) {
  const ent = useEnter(delay);
  return (
    <Animated.View style={[styles.metric, shadow.card, ent]}>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Animated.View>
  );
}

function Content({ data, onSave, onClose, banner }: { data: ResultData; onSave: () => void; onClose: () => void; banner?: React.ReactNode }) {
  const { result, ecoCost, mode, unitPrice, vehicle, roundTrip, passengers, destination, from, to } = data;
  const heroRef = useRef<View>(null);
  const isElectric = result.energyType === 'electricity';
  const total = formatAmount(result.totalCost);
  const ecoIn = useEnter(900);
  const navIn = useEnter(1100);
  const saveIn = useEnter(1150);
  const linkIn = useEnter(1200);
  const [navApps, setNavApps] = useState<NavApp[] | null>(null);
  const splitSheet = useRef<BottomSheetModal>(null);
  const bigSize = total.replace(/\D/g, '').length >= 5 ? 60 : 72;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`העלות המשוערת לנסיעה ${total} שקלים`);
    const digits = total.replace(/\D/g, '').length;
    const t = setTimeout(haptic.success, ROLL_DELAY + STAGGER * (digits - 1) + 600); // last digit has landed
    return () => clearTimeout(t);
  }, [total]);

  const trip = `${Math.round(result.distance)} ק״מ${roundTrip ? ' הלוך-חזור' : ''}`;

  const capture = () => captureRef(heroRef, { format: 'png', quality: 0.9 }); // the image is a bonus; the text goes out regardless

  return (
    <BottomSheetScrollView contentContainerStyle={styles.content}>
      <View ref={heroRef} collapsable={false} style={styles.heroWrap}>
        <LinearGradient colors={colors.heroGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
          <CornerArcs />
          <Text style={styles.heroLabel}>העלות המשוערת לנסיעה</Text>
          <View {...LTR.props} style={styles.totalRow} accessible accessibilityLabel={`${total} שקלים`}>
            <SlidingDigits
              prefix="₪"
              value={total}
              from={total.replace(/\d/g, '0')}
              startDelay={ROLL_DELAY}
              staggerMs={STAGGER}
              fontSize={bigSize}
              color={colors.white}
              fontFamily={Heebo.black}
            />
          </View>
          <Text style={styles.heroSub}>
            {trip} · {vehicle.name} · מצב {MODE_LABEL[mode]}
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.metrics}>
        <Metric label={isElectric ? 'קוט״ש' : 'ליטרים'} value={result.fuelConsumed.toFixed(1)} delay={600} />
        <Metric label="₪ לק״מ" value={result.costPerKm.toFixed(2)} delay={700} />
        <Metric label={isElectric ? '₪ לקוט״ש' : '₪ לליטר'} value={unitPrice.toFixed(2)} delay={800} />
      </View>

      <Animated.Text style={[ecoIn, styles.eco, mode === 'eco' && { color: colors.ecoText }]}>
        {mode === 'eco' ? 'מצוין, זו הנסיעה החסכונית ביותר' : `במצב Eco היית משלם ${shekel(ecoCost)} · חיסכון של ${shekel(result.totalCost - ecoCost)}`}
      </Animated.Text>

      <Animated.View entering={ZoomIn.delay(1000).springify().damping(spring.bouncy.damping).stiffness(spring.bouncy.stiffness)}>
        <PressableScale style={styles.split} onPress={() => splitSheet.current?.present()} accessibilityRole="button">
          <Users size={20} color={colors.selectedText} strokeWidth={2} />
          <Text style={styles.splitLabel}>חלק עם הנוסעים</Text>
          {passengers > 1 && <Text style={styles.splitHint}>₪{formatShare(result.totalCost, passengers)} × {passengers}</Text>}
          <ChevronLeft size={18} color={colors.selectedText} strokeWidth={2} />
        </PressableScale>
      </Animated.View>

      {/* action area: at most two filled buttons + a text link, entering after the content */}
      <View style={styles.actions}>
        {!!destination && (
          <Animated.View style={navIn}>
            <PressableScale style={styles.navigate} onPress={() => chooseNavApp(destination, setNavApps)} accessibilityRole="button">
              <Navigation size={20} color={colors.selectedText} strokeWidth={2} />
              <Text style={styles.navigateText}>נווט ליעד</Text>
            </PressableScale>
          </Animated.View>
        )}
        <Animated.View style={saveIn}>
          <PressableScale style={styles.save} onPress={onSave} accessibilityRole="button">
            <LinearGradient colors={colors.ctaGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.saveText}>שמור להיסטוריה</Text>
          </PressableScale>
        </Animated.View>
        <Animated.View style={[linkIn, { marginTop: -8 }]}>
          <Pressable style={styles.link} onPress={onClose} accessibilityRole="button">
            <Text style={styles.linkText}>שנה פרטים</Text>
          </Pressable>
        </Animated.View>
      </View>
      <NavSheet apps={navApps} onClose={() => setNavApps(null)} />
      <SplitSheet
        sheetRef={splitSheet}
        total={result.totalCost}
        km={result.distance}
        roundTrip={roundTrip}
        from={from}
        to={to}
        initialCount={passengers > 1 ? passengers : 2}
        capture={capture}
      />
      {banner}
    </BottomSheetScrollView>
  );
}

export function ResultSheet({ sheetRef, data, onSave, banner }: Props) {
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />,
    [],
  );
  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['92%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      animationConfigs={{ damping: 16, stiffness: 170, mass: 1, overshootClamping: false }}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      accessibilityLabel="תוצאת החישוב"
    >
      {data && <Content data={data} onSave={onSave} onClose={() => sheetRef.current?.dismiss()} banner={banner} />}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { backgroundColor: colors.divider, width: 40, height: 4 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  heroWrap: { borderRadius: 24, overflow: 'hidden' },
  hero: { padding: 20, borderRadius: 24, overflow: 'hidden' },
  heroLabel: { fontFamily: Heebo.medium, fontSize: 14, color: colors.white85 },
  totalRow: { flexDirection: 'row', alignItems: 'center', ...LTR.style, alignSelf: 'flex-start', gap: 4, marginTop: 6 },
  heroSub: { fontFamily: Heebo.medium, fontSize: 14, color: colors.white85, marginTop: 4 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center' },
  metricValue: { fontFamily: Heebo.extra, fontSize: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  metricLabel: { fontFamily: Heebo.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  eco: { fontFamily: Heebo.bold, fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 4 },
  split: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, backgroundColor: colors.selectedFill, borderRadius: 18, paddingHorizontal: 16 },
  splitLabel: { flex: 1, fontFamily: Heebo.bold, fontSize: 15, color: colors.selectedText },
  splitHint: { fontFamily: Heebo.medium, fontSize: 13, color: colors.selectedText, fontVariant: ['tabular-nums'] },
  actions: { gap: 12, marginTop: 4 },
  navigate: { height: 48, borderRadius: radius.pill, backgroundColor: colors.selectedFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  navigateText: { fontFamily: Heebo.bold, fontSize: 15, color: colors.selectedText },
  save: { height: 56, borderRadius: radius.pill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: Heebo.extra, fontSize: 17, color: colors.white },
  link: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: Heebo.semi, fontSize: 14, color: colors.textMuted },
});
