// Result screen (design Result.dc.html): dark cost card with rolling total, trip type, passengers, split & share, navigation.
import { Bookmark, ChevronRight, Navigation, Send, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNavApps, NavApp } from '../calculator/navApps';
import type { ResultData } from '../calculator/ResultSheet';
import { PressableScale } from '../calculator/PressableScale';
import { SlidingDigits } from '../calculator/SlidingDigits';
import { haptic } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { c, Rubik } from '../../constants/themeV2';
import { formatAmount, formatShare, splitMessage } from '../../lib/format';
import { Segmented } from './Segmented';

const BannerAd = Platform.OS === 'web' ? () => null : require('../BannerAd').default;

const ROLL_DELAY = 300;
const STAGGER = 70;
const MAX_PAX = 8;

interface Props {
  visible: boolean;
  data: ResultData | null;
  octane: string;
  onRoundTrip: (on: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

export function ResultV2({ visible, data, octane, onRoundTrip, onSave, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [pax, setPax] = useState(2);
  const [navApps, setNavApps] = useState<NavApp[]>([]);
  const destination = data?.destination ?? '';
  const total = data ? formatAmount(data.result.totalCost, 0) : '0';

  useEffect(() => {
    if (destination) getNavApps(destination).then(setNavApps);
    else setNavApps([]);
  }, [destination]);

  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(`העלות המשוערת לנסיעה ${total} שקלים`);
  }, [visible, total]);

  if (!data) return null;
  const { result, unitPrice, vehicle, roundTrip, from, to } = data;
  const ev = result.energyType === 'electricity';
  const actionsDelay = ROLL_DELAY + STAGGER * total.replace(/\D/g, '').length + 600; // design motion #6: after the number lands
  const stepPax = (d: number) => {
    haptic.press();
    setPax((n) => Math.min(MAX_PAX, Math.max(1, n + d)));
  };
  const share = () => Share.share({ message: splitMessage({ total: result.totalCost, km: result.distance, roundTrip, from, to }, pax) }).catch(() => {});

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.top}>
          <Pressable style={styles.iconBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="חזרה">
            <ChevronRight size={20} color={c.ink} strokeWidth={2} />
          </Pressable>
          <View style={styles.titleBox}>
            <Text style={styles.small} numberOfLines={1}>
              {vehicle.name} · {ev ? `${(result.consumption * 100).toFixed(1)} קוט״ש ל־100 ק״מ` : `${result.consumption.toFixed(1)} ק״מ לליטר`}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {from && to ? `${from} ← ${to}` : `${Math.round(result.distance)} ק״מ`}
            </Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={onSave} accessibilityRole="button" accessibilityLabel="שמור להיסטוריה">
            <Bookmark size={20} color={c.ink} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={{ gap: 6 }}>
            <Text style={styles.heroLabel}>
              {ev ? 'עלות טעינה' : 'עלות דלק'} · {roundTrip ? 'הלוך-חזור' : 'כיוון אחד'}
            </Text>
            <View {...LTR.props} style={[styles.totalRow, LTR.style]} accessible accessibilityLabel={`${total} שקלים`}>
              <Text style={styles.heroShekel}>₪</Text>
              <SlidingDigits value={total} from={total.replace(/\d/g, '0')} startDelay={ROLL_DELAY} staggerMs={STAGGER} fontSize={72} color={c.white} fontFamily={Rubik.extra} />
            </View>
          </View>
          <View style={styles.stats}>
            <Stat value={`₪${unitPrice.toFixed(2)}`} label={ev ? 'לקוט״ש' : vehicle.fueltype === 'Gasoline' ? `לליטר · ${octane}` : 'לליטר'} />
            <Stat value={String(Math.round(result.distance))} label="ק״מ" border />
            <Stat value={result.fuelConsumed.toFixed(1)} label={ev ? 'קוט״ש' : 'ליטר'} border />
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(380).delay(actionsDelay)} style={{ gap: 12 }}>
          <View style={styles.card}>
            <View style={styles.line}>
              <Text style={styles.label}>סוג נסיעה</Text>
              <Segmented
                variant="ink"
                compact
                height={36}
                value={roundTrip ? 'round' : 'one'}
                onChange={(v) => onRoundTrip(v === 'round')}
                accessibilityLabel="סוג נסיעה"
                options={[
                  { value: 'one', label: 'כיוון אחד' },
                  { value: 'round', label: 'הלוך-חזור' },
                ]}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.line}>
              <View style={{ gap: 2 }}>
                <Text style={styles.label}>נוסעים</Text>
                <Text style={styles.small}>מחלקים שווה בשווה</Text>
              </View>
              <View style={styles.stepper}>
                <PressableScale style={styles.stepBtn} scaleTo={0.97} onPress={() => stepPax(1)} disabled={pax >= MAX_PAX} accessibilityRole="button" accessibilityLabel="הוסף נוסע">
                  <Text style={styles.stepText}>+</Text>
                </PressableScale>
                <Text style={styles.pax} accessibilityLiveRegion="polite">
                  {pax}
                </Text>
                <PressableScale style={styles.stepBtn} scaleTo={0.97} onPress={() => stepPax(-1)} disabled={pax <= 1} accessibilityRole="button" accessibilityLabel="הסר נוסע">
                  <Text style={styles.stepText}>−</Text>
                </PressableScale>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.shareCard]}>
            <View style={styles.shareTop}>
              <View style={{ gap: 6 }}>
                <Text style={styles.small}>כל אחד מעביר</Text>
                <View {...LTR.props} style={[styles.totalRow, LTR.style]}>
                  <Text style={styles.shareShekel}>₪</Text>
                  <Text style={styles.shareValue}>{formatShare(result.totalCost, pax)}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View {...LTR.props} style={[{ flexDirection: 'row' }, LTR.style]}>
                  {Array.from({ length: pax }, (_, i) => (
                    <View key={i} style={[styles.seat, i > 0 && styles.seatOther]}>
                      <User size={14} color={i ? c.muted : c.green} strokeWidth={2} />
                    </View>
                  ))}
                </View>
                <Text style={styles.small}>{pax} נוסעים</Text>
              </View>
            </View>
            <PressableScale style={styles.shareBtn} scaleTo={0.97} onPress={share} accessibilityRole="button">
              <Send size={18} color={c.ink} strokeWidth={2} />
              <Text style={styles.shareBtnText}>שלח לחברים</Text>
            </PressableScale>
          </View>

          {navApps.length > 0 && (
            <View style={styles.navRow}>
              {navApps.slice(0, 2).map((a, i) => (
                <Pressable key={a.label} style={[styles.navBtn, i > 0 && styles.navBorder]} onPress={() => Linking.openURL(a.url)} accessibilityRole="button">
                  <Navigation size={16} color={c.ink} strokeWidth={2} />
                  <Text style={styles.navText}>{a.label === 'Waze' ? 'נווט ב-Waze' : a.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ alignItems: 'center' }}>
            <BannerAd />
          </View>
        </Animated.View>
      </ScrollView>
    </Modal>
  );
}

function Stat({ value, label, border }: { value: string; label: string; border?: boolean }) {
  return (
    <View style={[styles.stat, border && styles.statBorder]}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.mist },
  content: { paddingHorizontal: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' },
  titleBox: { flex: 1, alignItems: 'center' },
  small: { fontFamily: Rubik.regular, fontSize: 12, color: c.muted },
  title: { fontFamily: Rubik.bold, fontSize: 17, color: c.ink },
  hero: { backgroundColor: c.ink, borderRadius: 24, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 20, gap: 22 },
  heroLabel: { fontFamily: Rubik.regular, fontSize: 13, color: c.inkMuted, letterSpacing: 0.26 },
  totalRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4 },
  heroShekel: { fontFamily: Rubik.bold, fontSize: 36, color: c.green },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.inkLine, paddingTop: 14 },
  stat: { flex: 1, gap: 3 },
  statBorder: { borderStartWidth: 1, borderStartColor: c.inkLine, paddingStart: 14 },
  statValue: { fontFamily: Rubik.bold, fontSize: 20, color: c.white, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: Rubik.regular, fontSize: 12, color: c.inkMuted },
  card: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  label: { fontFamily: Rubik.semi, fontSize: 15, color: c.ink },
  divider: { height: 1, backgroundColor: c.divider },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: Rubik.regular, fontSize: 22, color: c.ink },
  pax: { width: 32, textAlign: 'center', fontFamily: Rubik.bold, fontSize: 20, color: c.ink },
  shareCard: { borderRadius: 24, padding: 18, paddingVertical: 18, gap: 16 },
  shareTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  shareShekel: { fontFamily: Rubik.bold, fontSize: 22, color: c.greenText },
  shareValue: { fontFamily: Rubik.extra, fontSize: 44, color: c.ink, fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  seat: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: c.white, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  seatOther: { marginStart: -8, backgroundColor: c.divider },
  shareBtn: { height: 54, borderRadius: 16, backgroundColor: c.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  shareBtnText: { fontFamily: Rubik.bold, fontSize: 16, color: c.ink },
  navRow: { flexDirection: 'row', borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.white, overflow: 'hidden' },
  navBtn: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  navBorder: { borderStartWidth: 1, borderStartColor: c.line },
  navText: { fontFamily: Rubik.semi, fontSize: 14, color: c.ink },
});
