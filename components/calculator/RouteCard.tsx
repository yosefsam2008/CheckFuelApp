import { ArrowUpDown, Clock, RotateCw, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { haptic, useEnter } from '../../constants/motion';
import { NO_OUTLINE } from '../../constants/rtl';
import { colors, Heebo, radius, shadow, space } from '../../constants/theme';
import type { Place } from '../../lib/places';
import type { RouteResult } from '../../lib/route';
import { PressableScale } from './PressableScale';
import { RouteMiniMap } from './RouteMiniMap';
import { Shimmer } from './Shimmer';
import { SlidingDigits } from './SlidingDigits';
import { SlidingSegment } from './SlidingSegment';
import { useHighlight } from './useHighlight';

export type OriginStatus = 'locating' | 'ok' | 'denied';
export type RouteStatus = 'idle' | 'loading' | 'error' | 'ok';
export type InputMode = 'route' | 'manual';

interface Props {
  mode: InputMode;
  onMode: (m: InputMode) => void;
  originStatus: OriginStatus;
  originText: string; // '' = current GPS location
  onOpenOrigin: () => void;
  destination: string;
  onOpenDestination: () => void;
  /** shown once there is a destination */
  onSwap?: () => void;
  recent: Place[];
  onPickRecent: (place: Place) => void;
  routeStatus: RouteStatus;
  routeError: string | null;
  onRetry: () => void;
  route: RouteResult | null;
  manualText: string;
  onManualText: (t: string) => void;
  manualError: string | null;
  km: number; // total, after round trip
  roundTrip: boolean;
  onRoundTrip: (on: boolean) => void;
  highlightKey: number;
}

const MODES = [
  { value: 'route' as InputMode, label: 'לפי יעד' },
  { value: 'manual' as InputMode, label: 'מרחק ידני' },
];
const CHIPS = [5, 10, 25, 50, 100];
const ORIGIN_TEXT: Record<OriginStatus, string> = { locating: 'מאתר מיקום…', ok: 'המיקום שלי', denied: 'אין גישה למיקום' };
const formatKm = (km: number) => (km < 100 ? km.toFixed(1) : String(Math.round(km)));
const SLOT = 20;
const SWAP = 24;

type Row = { y: number; h: number };

/** Origin ring + destination square, both centered on their rows; the dotted line joins the measured centers. */
function Rows({ p, children }: { p: Props; children: React.ReactNode }) {
  const [o, setO] = useState<Row | null>(null);
  const [d, setD] = useState<Row | null>(null);
  const [first, second] = React.Children.toArray(children);
  const top = o ? o.y + o.h / 2 : 0;
  const bottom = o && d ? d.y + d.h / 2 : 0;
  return (
    <View>
      {o && d && (
        // flow layout (not `start`) so the line sits in the marker slot on both RN and web
        <View style={styles.lineLayer} pointerEvents="none">
          <View style={styles.slot}>
            <View style={[styles.line, { marginTop: top, height: bottom - top }]}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={styles.lineDot} />
              ))}
            </View>
          </View>
        </View>
      )}
      <View style={styles.row} onLayout={(e) => setO({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}>
        <View style={styles.slot}>
          <View style={styles.ring} />
        </View>
        {first}
      </View>
      <View style={[styles.row, { marginTop: 8 }]} onLayout={(e) => setD({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}>
        <View style={styles.slot}>
          <View style={styles.square} />
        </View>
        {second}
      </View>
      {o && d && p.onSwap && (
        // sits on the dotted line, halfway between the two markers
        <View style={[styles.swapLayer, { top: (top + bottom) / 2 - SWAP / 2 }]} pointerEvents="box-none">
          <View style={styles.slot}>
            <Pressable
              onPress={() => {
                haptic.select();
                p.onSwap?.();
              }}
              hitSlop={12}
              style={styles.swap}
              accessibilityRole="button"
              accessibilityLabel="החלפת מוצא ויעד"
            >
              <ArrowUpDown size={13} color={colors.text} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function RoundTripPill({ on, onPress }: { on: boolean; onPress: () => void }) {
  const k = useDerivedValue(() => withTiming(on ? 1 : 0, { duration: 250 }));
  const box = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(k.value, [0, 1], [colors.bg, colors.selectedFill]) }));
  const text = useAnimatedStyle(() => ({ color: interpolateColor(k.value, [0, 1], [colors.textMuted, colors.selectedText]) }));
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} hitSlop={4}>
      <Animated.View style={[styles.pill, box]}>
        <Animated.Text style={[styles.pillText, text]}>הלוך-חזור</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function Skeleton({ w, h }: { w: number; h: number }) {
  return (
    <View style={{ width: w, height: h, borderRadius: 8, backgroundColor: colors.bg, overflow: 'hidden' }}>
      <Shimmer width={w} period={1400} sweepMs={1400} band={w * 0.5} skew={0} />
    </View>
  );
}

function Distance({ p }: { p: Props }) {
  const manual = p.mode === 'manual';
  const hasRoute = !manual && p.routeStatus === 'ok' && p.km > 0;
  // phones under 360pt wide (SE 1st gen, small Androids): narrower column so the destination field keeps room
  const narrow = useWindowDimensions().width < 360;
  return (
    <View style={[styles.distance, narrow && { width: 84 }]}>
      {!manual && <RouteMiniMap width={narrow ? 74 : undefined} active={hasRoute} polyline={hasRoute ? p.route?.polyline : undefined} />}
      {!manual && p.routeStatus === 'loading' ? (
        <View style={{ gap: 6, alignItems: 'center' }} accessible accessibilityLabel="מחשב מסלול">
          <Skeleton w={70} h={30} />
          <Skeleton w={34} h={12} />
        </View>
      ) : !manual && p.routeStatus === 'error' ? (
        <Pressable onPress={p.onRetry} style={styles.retry} accessibilityRole="button" accessibilityLabel="נסה שוב לחשב מסלול">
          <RotateCw size={18} color={colors.infoText} strokeWidth={2} />
          <Text style={styles.retryText}>נסה שוב</Text>
        </Pressable>
      ) : (manual || hasRoute) ? (
        <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center' }}>
          <SlidingDigits value={manual ? (p.km ? formatKm(p.km) : '0') : formatKm(p.km)} fontSize={28} color={colors.text} fontFamily={Heebo.extra} accessibilityLabel={`${formatKm(p.km)} קילומטר`} />
          <Text style={styles.kmUnit}>ק״מ</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function DestinationBlock({ p }: { p: Props }) {
  const has = !!p.destination;
  return (
    <>
      <Rows p={p}>
        <Pressable onPress={p.onOpenOrigin} style={styles.originText} accessibilityRole="button" accessibilityLabel="שינוי נקודת מוצא">
          <Text style={styles.label}>מאיפה</Text>
          <Text style={styles.value} numberOfLines={1}>
            {p.originText || ORIGIN_TEXT[p.originStatus]}
          </Text>
        </Pressable>
        <PressableScale onPress={p.onOpenDestination} style={styles.destination} accessibilityRole="button" accessibilityLabel="בחירת יעד">
          <Search size={20} color={colors.textMuted} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            {has && <Text style={styles.label}>לאן</Text>}
            <Text style={[styles.value, !has && { color: colors.textMuted }]} numberOfLines={2}>
              {has ? p.destination : 'לאן נוסעים?'}
            </Text>
          </View>
        </PressableScale>
      </Rows>
      {p.recent.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled" style={{ marginTop: 12 }}>
          {p.recent.map((r) => (
            <Pressable key={r.placeId ?? r.main} style={styles.recent} onPress={() => p.onPickRecent(r)} accessibilityRole="button" accessibilityLabel={`יעד אחרון: ${r.main}`}>
              <Clock size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.recentText} numberOfLines={1}>
                {'‏'}
                {r.main}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {p.routeStatus === 'error' && !!p.routeError && <Text style={styles.error}>{p.routeError}</Text>}
    </>
  );
}

function ManualField({ p }: { p: Props }) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <View style={[styles.manualField, focused && { borderColor: colors.brandGreen }]}>
        <TextInput
          value={p.manualText}
          onChangeText={p.onManualText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          returnKeyType="done"
          style={styles.manualInput}
          accessibilityLabel="מרחק בקילומטרים"
        />
        <Text style={styles.manualSuffix}>ק״מ</Text>
      </View>
      {!!p.manualError && <Text style={styles.error}>{p.manualError}</Text>}
    </>
  );
}

function QuickChips({ p }: { p: Props }) {
  return (
    <View style={styles.quick}>
      {CHIPS.map((c) => {
        const on = p.manualText === String(c);
        return (
          <Pressable
            key={c}
            onPress={() => {
              haptic.select();
              p.onManualText(String(c));
            }}
            style={[styles.quickChip, on && styles.quickChipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.quickText, on && { color: colors.selectedText }]}>{c}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RouteCard(p: Props) {
  const manual = p.mode === 'manual';
  const minutes = p.route && !manual ? Math.round(p.route.durationSeconds / 60) * (p.roundTrip ? 2 : 1) : 0;
  const hl = useHighlight(p.highlightKey);
  const ent = useEnter(120);
  return (
    <Animated.View style={[styles.card, shadow.card, hl, ent]}>
      <View style={styles.body}>
        <SlidingSegment accessibilityLabel="אופן הזנת מרחק" height={36} options={MODES} value={p.mode} onChange={p.onMode} />

        {/* shortcut: mode change cross-fades in; Reanimated's layout transition clipped the card on web, so height jumps */}
        <Animated.View key={p.mode} entering={FadeIn.duration(250)} style={{ gap: space.block }}>
          <View style={styles.main}>
            <View style={{ flex: 1 }}>{manual ? <ManualField p={p} /> : <DestinationBlock p={p} />}</View>
            <Distance p={p} />
          </View>
          {manual && <QuickChips p={p} />}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>
          {manual ? 'מרחק שהוזן ידנית' : minutes ? `מרחק נהיגה בכביש · ~${minutes} דק׳` : 'מרחק נהיגה בכביש'}
        </Text>
        <RoundTripPill
          on={p.roundTrip}
          onPress={() => {
            haptic.select();
            p.onRoundTrip(!p.roundTrip);
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, marginTop: -44, marginHorizontal: space.gutter, zIndex: 2, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
  body: { padding: space.cardPad - 1.5, gap: space.block },
  main: { flexDirection: 'row', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slot: { width: SLOT, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: colors.brandGreen, backgroundColor: colors.surface },
  square: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.text },
  lineLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  line: { width: 2, alignItems: 'center', justifyContent: 'space-evenly' },
  swapLayer: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  swap: { width: SWAP, height: SWAP, borderRadius: SWAP / 2, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  lineDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: colors.divider },
  originText: { flex: 1, minHeight: 48, justifyContent: 'center' },
  destination: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.tile, backgroundColor: colors.bg },
  label: { fontFamily: Heebo.regular, fontSize: 12, color: colors.textMuted },
  value: { fontFamily: Heebo.bold, fontSize: 17, color: colors.text },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, maxWidth: 180, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.bg },
  recentText: { fontFamily: Heebo.medium, fontSize: 13, color: colors.text, flexShrink: 1 },
  chips: { gap: 8 },
  error: { fontFamily: Heebo.medium, fontSize: 13, color: colors.error, marginTop: 8 },
  distance: { width: 104, alignItems: 'center', justifyContent: 'center', gap: 4, borderStartWidth: 1, borderStartColor: colors.divider, paddingStart: 10 },
  kmUnit: { fontFamily: Heebo.regular, fontSize: 12, color: colors.textMuted },
  retry: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.infoText },
  manualField: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 14, borderRadius: radius.tile, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: 'transparent' },
  manualInput: { flex: 1, minWidth: 0, textAlign: 'right', fontFamily: Heebo.extra, fontSize: 24, color: colors.text, padding: 0, fontVariant: ['tabular-nums'], ...NO_OUTLINE },
  manualSuffix: { fontFamily: Heebo.medium, fontSize: 15, color: colors.textMuted, marginStart: 8 },
  quick: { flexDirection: 'row', gap: 8 },
  quickChip: { flex: 1, height: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.divider },
  quickChipOn: { backgroundColor: colors.selectedFill, borderColor: colors.selectedBorder },
  quickText: { fontFamily: Heebo.bold, fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: colors.subtle, paddingHorizontal: space.cardPad, paddingVertical: 8 },
  footerText: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  pill: { height: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill },
  pillText: { fontFamily: Heebo.bold, fontSize: 13 },
});
