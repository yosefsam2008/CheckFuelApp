// Result screen (design Result.dc.html): route choice, dark cost card with rolling total + trip type,
// split & share with passengers, navigation. No map here: the route shape lives on the home screen.
// Motion: one hero (the total's digit roll); everything else only answers an event. Entrance: ResultMotion.
import { Bookmark, Check, ChevronRight, Navigation, Send } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  EntryExitAnimationFunction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNavApps, NavApp } from '../calculator/navApps';
import type { ResultData } from '../calculator/ResultSheet';
import { PressableScale } from '../calculator/PressableScale';
import { RollingNumber } from '../motion/RollingNumber';
import { DUR, haptic, spring } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { formatAmount, roundHalf, splitMessage } from '../../lib/format';
import type { RouteOption } from '../../lib/route';
import { formatDuration, RouteCards } from './RouteCards';
import { ENTRANCE, useResultEntrance } from './ResultMotion';

const BannerAd = Platform.OS === 'web' ? () => null : require('../BannerAd').default;

const MAX_PAX = 8;

export interface ResultRoutes {
  options: RouteOption[];
  costs: (number | null)[];
  selected: number;
  cheapest: number;
  onSelect: (i: number) => void;
}

interface Props {
  visible: boolean;
  data: ResultData | null;
  octane: string;
  /** route choice; absent in manual-distance mode */
  routes?: ResultRoutes;
  onSave: () => void;
  onClose: () => void;
}

export function ResultV2(props: Props) {
  // the Modal mounts its children only while open, so the entrance and the landing haptic start on every open
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose} statusBarTranslucent>
      {props.data && <ResultBody {...props} data={props.data} />}
    </Modal>
  );
}

function ResultBody({ visible, data, octane, routes, onSave, onClose }: Props & { data: ResultData }) {
  const insets = useSafeAreaInsets();
  const [pax, setPax] = useState(2);
  const [paxDir, setPaxDir] = useState<1 | -1>(1);
  const [landed, setLanded] = useState(false); // the total's entry roll has landed
  const [navApps, setNavApps] = useState<NavApp[]>([]);
  const destination = data.destination;
  const total = formatAmount(data.result.totalCost, 0);
  const enter = useResultEntrance();
  const reduced = useReducedMotion();
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (destination) getNavApps(destination).then(setNavApps);
    else setNavApps([]);
  }, [destination]);

  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(`העלות המשוערת לנסיעה ${total} שקלים`);
  }, [visible, total]);

  const { result, unitPrice, vehicle, roundTrip, from, to } = data;
  const ev = result.energyType === 'electricity';
  const perPerson = roundHalf(result.totalCost / pax); // same rounding as formatShare
  const stepPax = (d: 1 | -1) => {
    const next = pax + d;
    if (next < 1 || next > MAX_PAX) {
      haptic.warn();
      if (!reduced) {
        const step = (x: number) => withTiming(x, { duration: 48 });
        shake.value = withSequence(step(-6), step(6), step(-4), step(4), step(0));
      }
      return;
    }
    haptic.press();
    setPaxDir(d);
    setPax(next);
  };
  const share = () => Share.share({ message: splitMessage({ total: result.totalCost, km: result.distance, roundTrip, from, to }, pax) });
  const single = routes?.options.length === 1 ? routes.options[0] : undefined;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <Pressable style={styles.iconBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="חזרה">
          <ChevronRight size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={styles.small} numberOfLines={1}>
            {vehicle.name} · {ev ? `${(result.consumption * 100).toFixed(1)} קוט״ש ל־100 ק״מ` : `${result.consumption.toFixed(1)} ק״מ לליטר`}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {from && to ? `${from} ← ${to}` : `${Math.round(result.distance)} ק״מ`}
          </Text>
        </View>
        <SaveButton onSave={onSave} />
      </View>

      {single ? (
        <Animated.Text style={[styles.routeLine, enter.routes]} numberOfLines={1}>
          {single.name ? `דרך ${single.name}` : 'המסלול המהיר'} · {formatDuration(single.durationMin)} · {Math.round(single.distanceKm)} ק״מ
        </Animated.Text>
      ) : (
        !!routes?.options.length && (
          <Animated.View style={enter.routes}>
            <RouteCards {...routes} />
          </Animated.View>
        )
      )}

      <Animated.View style={[styles.hero, enter.hero]}>
        <View style={{ gap: 6 }}>
          <View style={styles.line}>
            <Text style={styles.heroLabel}>{ev ? 'עלות טעינה' : 'עלות דלק'}</Text>
          </View>
          <View {...LTR.props} style={[styles.totalRow, LTR.style]} accessible accessibilityLabel={`${total} שקלים`}>
            <Text style={styles.heroShekel}>₪</Text>
            <RollingNumber
              value={Math.round(result.totalCost)}
              delay={ENTRANCE.total}
              fontSize={72}
              fontFamily={Rubik.extra}
              color={colors.textInverse}
              dimColor={colors.inkFaint}
              onLanded={() => {
                haptic.success();
                setLanded(true);
              }}
            />
          </View>
        </View>
        <View style={styles.stats}>
          <Stat value={unitPrice} decimals={2} prefix="₪" label={ev ? 'לקוט״ש' : vehicle.fueltype === 'Gasoline' ? `לליטר · ${octane}` : 'לליטר'} />
          <Stat value={Math.round(result.distance)} label="ק״מ" border />
          <Stat value={result.fuelConsumed} decimals={1} label={ev ? 'קוט״ש' : 'ליטר'} border />
        </View>
      </Animated.View>

      <Animated.View style={[styles.card, styles.shareCard, enter.share]}>
        <View style={styles.shareTop}>
          <View style={{ gap: 6 }}>
            <Text style={styles.small}>כל אחד מעביר</Text>
            <View {...LTR.props} style={[styles.totalRow, LTR.style]}>
              <Text style={styles.shareShekel}>₪</Text>
              <RollingNumber
                value={perPerson}
                decimals={Number.isInteger(perPerson) ? 0 : 1}
                play={landed}
                duration={ENTRANCE.shareDur}
                spinsByPlace={[1, 0]}
                fontSize={44}
                fontFamily={Rubik.extra}
                color={colors.text}
                dimColor={colors.disabled}
              />
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Animated.View style={[styles.stepper, shakeStyle]}>
              <PressableScale style={styles.stepBtn} scaleTo={0.92} onPress={() => stepPax(1)} accessibilityState={{ disabled: pax >= MAX_PAX }} accessibilityRole="button" accessibilityLabel="הוסף נוסע">
                <Text style={styles.stepText}>+</Text>
              </PressableScale>
              <PaxCount value={pax} dir={paxDir} />
              <PressableScale style={styles.stepBtn} scaleTo={0.92} onPress={() => stepPax(-1)} accessibilityState={{ disabled: pax <= 1 }} accessibilityRole="button" accessibilityLabel="הסר נוסע">
                <Text style={styles.stepText}>−</Text>
              </PressableScale>
            </Animated.View>
            <Text style={[styles.small, { fontSize: 11 }]}>נוסעים</Text>
          </View>
        </View>
        <ShareButton share={share} />
      </Animated.View>

      {navApps.length > 0 && (
        <Animated.View style={[styles.navRow, enter.nav]}>
          {navApps.slice(0, 2).map((a, i) => (
            <PressableScale key={a.label} style={[styles.navBtn, i > 0 && styles.navBorder]} scaleTo={0.97} onPress={() => Linking.openURL(a.url)} accessibilityRole="button">
              <Navigation size={16} color={colors.text} strokeWidth={2} />
              <Text style={styles.navText}>{a.label === 'Waze' ? 'נווט ב-Waze' : a.label}</Text>
            </PressableScale>
          ))}
        </Animated.View>
      )}

      <View style={{ alignItems: 'center' }}>
        <BannerAd />
      </View>
    </ScrollView>
  );
}

function Stat({ value, decimals, prefix, label, border }: { value: number; decimals?: number; prefix?: string; label: string; border?: boolean }) {
  return (
    <View style={[styles.stat, border && styles.statBorder]}>
      <RollingNumber value={value} decimals={decimals} prefix={prefix} enter="count" delay={ENTRANCE.stats} duration={ENTRANCE.statsDur} fontSize={20} fontFamily={Rubik.bold} color={colors.textInverse} dimColor={colors.inkFaint} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Passenger count: the new digit slides in 10px from below on + (from above on −) while the old one fades out. */
function PaxCount({ value, dir }: { value: number; dir: 1 | -1 }) {
  const reduced = useReducedMotion();
  const dy = reduced ? 0 : 10 * dir;
  const ms = reduced ? DUR.fade : 220;
  const entering: EntryExitAnimationFunction = () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: dy }] },
      animations: { opacity: withTiming(1, { duration: ms }), transform: [{ translateY: withTiming(0, { duration: ms }) }] },
    };
  };
  const exiting: EntryExitAnimationFunction = () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
      animations: { opacity: withTiming(0, { duration: ms }), transform: [{ translateY: withTiming(-dy, { duration: ms }) }] },
    };
  };
  return (
    <View style={styles.pax} accessibilityLiveRegion="polite" accessibilityLabel={`${value} נוסעים`}>
      <Animated.Text key={value} entering={entering} exiting={exiting} style={styles.paxText}>
        {value}
      </Animated.Text>
    </View>
  );
}

/** Bookmark: fills and pops on save. The toast and closing the screen come from the hook. */
function SaveButton({ onSave }: { onSave: () => void }) {
  const [saved, setSaved] = useState(false);
  const s = useSharedValue(1);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <PressableScale
      style={styles.iconBtn}
      onPress={() => {
        if (!saved) {
          setSaved(true);
          haptic.success();
          s.value = withSequence(withSpring(1.2, spring.snappy), withSpring(1, spring.snappy));
        }
        onSave();
      }}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'נשמר בהיסטוריה' : 'שמור להיסטוריה'}
    >
      <Animated.View style={pop}>
        <Bookmark size={20} color={colors.text} fill={saved ? colors.text : 'none'} strokeWidth={2} />
      </Animated.View>
    </PressableScale>
  );
}

/** "שלח לחברים": only a completed share answers (plane flies off, check + "נשלח!" for 1.5s, then back). Cancel = nothing. */
function ShareButton({ share }: { share: () => Promise<{ action: string }> }) {
  const reduced = useReducedMotion();
  const fly = useSharedValue(0); // plane flight 0..1
  const sent = useSharedValue(0); // crossfade plane + label -> check + "נשלח!"
  const pop = useSharedValue(1); // check scale
  const plane = useAnimatedStyle(() => ({
    opacity: 1 - sent.value,
    transform: [{ translateX: -24 * fly.value }, { rotate: `${-12 * fly.value}deg` }],
  }));
  const check = useAnimatedStyle(() => ({ opacity: sent.value, transform: [{ scale: pop.value }] }));
  const idleLabel = useAnimatedStyle(() => ({ opacity: 1 - sent.value }));
  const sentLabel = useAnimatedStyle(() => ({ opacity: sent.value }));

  const press = async () => {
    const r = await share().catch(() => null);
    if (r?.action !== Share.sharedAction) return;
    const hold = 1500;
    if (reduced) {
      sent.value = withSequence(withTiming(1, { duration: DUR.fade }), withDelay(hold, withTiming(0, { duration: DUR.fade })));
      return;
    }
    sent.value = withSequence(withTiming(1, { duration: 280 }), withDelay(hold - 280, withTiming(0, { duration: 200 })));
    fly.value = withSequence(withTiming(1, { duration: 280 }), withDelay(hold, withTiming(0, { duration: 0 })));
    pop.value = 0.6;
    pop.value = withSpring(1, spring.snappy);
  };

  return (
    <PressableScale style={styles.shareBtn} scaleTo={0.97} onPress={press} accessibilityRole="button" accessibilityLabel="שלח לחברים">
      <View style={styles.shareIcon}>
        <Animated.View style={plane}>
          <Send size={18} color={colors.text} strokeWidth={2} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, check]}>
          <Check size={18} color={colors.text} strokeWidth={2.4} />
        </Animated.View>
      </View>
      <View>
        <Animated.Text style={[styles.shareBtnText, idleLabel]}>שלח לחברים</Animated.Text>
        <Animated.Text style={[styles.shareBtnText, StyleSheet.absoluteFill, styles.centerText, sentLabel]}>נשלח!</Animated.Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  titleBox: { flex: 1, alignItems: 'center' },
  small: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMuted },
  title: { fontFamily: Rubik.bold, fontSize: 17, color: colors.text },
  routeLine: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted },
  hero: { backgroundColor: colors.surfaceInverse, borderRadius: 24, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 20, gap: 22 },
  heroLabel: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMutedInverse, letterSpacing: 0.26 },
  totalRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4 },
  heroShekel: { fontFamily: Rubik.bold, fontSize: 36, color: colors.accent },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.lineInverse, paddingTop: 14 },
  stat: { flex: 1, gap: 3 },
  statBorder: { borderStartWidth: 1, borderStartColor: colors.lineInverse, paddingStart: 14 },
  statLabel: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMutedInverse },
  card: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.surfaceSunken, borderRadius: 14, padding: 3 },
  stepBtn: { width: 44, height: 44, borderRadius: 11, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: Rubik.regular, fontSize: 22, color: colors.text },
  pax: { width: 30, height: 24, alignItems: 'center', justifyContent: 'center' },
  paxText: { position: 'absolute', fontFamily: Rubik.bold, fontSize: 18, color: colors.text, fontVariant: ['tabular-nums'] },
  shareCard: { borderRadius: 24, padding: 18, paddingVertical: 18, gap: 16 },
  shareTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  shareShekel: { fontFamily: Rubik.bold, fontSize: 22, color: colors.accentText },
  shareBtn: { height: 54, borderRadius: 16, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  shareIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  shareBtnText: { fontFamily: Rubik.bold, fontSize: 16, color: colors.text },
  navRow: { flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  navBtn: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  navBorder: { borderStartWidth: 1, borderStartColor: colors.line },
  navText: { fontFamily: Rubik.semi, fontSize: 14, color: colors.text },
});
