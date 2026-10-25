// Redesigned calculator (design/screens/Main*.dc.html), on the same useFuelCalculator logic as the current screen.
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { ArrowLeft, Car, ChevronLeft, Clock, Info, MapPin, Pencil, Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceSheet } from '../calculator/PlaceSheet';
import { PressableScale } from '../calculator/PressableScale';
import { VehicleSheet } from '../calculator/VehicleSheet';
import { FUEL_LABEL } from '../vehicles/fuel';
import { haptic } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { c, Rubik } from '../../constants/themeV2';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import { useFuelCalculator } from '../../hooks/useFuelCalculator';
import { DEFAULT_PRICES } from '../../lib/prices';
import { Octane, PRICE_HINT, priceFor } from '../../lib/tripCost';
import { AdvancedSheet, Draft, MODES } from './AdvancedSheet';
import { ResultV2 } from './ResultV2';
import { Segmented } from './Segmented';

const InterstitialAd = Platform.OS === 'web' ? () => null : require('../InterstitialAd').default;

const PRESETS = [10, 25, 50, 100];
const COMMIT_DELAY = 280; // design motion #9: the sheet closes, then the values change

export default function CalculatorV2() {
  const router = useRouter();
  const openInfo = useOpenInfoMenu();
  const insets = useSafeAreaInsets();
  const vehicleSheet = useRef<BottomSheetModal>(null);
  const destinationSheet = useRef<BottomSheetModal>(null);
  const originSheet = useRef<BottomSheetModal>(null);
  const advancedSheet = useRef<BottomSheetModal>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const calc = useFuelCalculator({ presentResult: () => setResultOpen(true), dismissResult: () => setResultOpen(false) });
  const { vehicle, vehicles, fuelPrice, octane, prefs, manual, manualText, roundTrip, km, missing, routeStatus, route, routeError, originPlace, originStatus, destPlace } = calc;

  // a trip-type change on the result screen re-prices the shown result
  const { refreshResult } = calc;
  useEffect(() => {
    if (resultOpen) refreshResult();
  }, [roundTrip]); // eslint-disable-line react-hooks/exhaustive-deps

  const ev = vehicle?.fueltype === 'Electric';
  const petrol = vehicle?.fueltype === 'Gasoline';
  const unit = ev ? 'לקוט״ש' : 'לליטר';
  const fuelName = vehicle ? `${FUEL_LABEL[vehicle.fueltype] ?? vehicle.fueltype}${petrol ? ` ${octane}` : ''}` : '';
  const autoPrice = (o: Octane) => (vehicle ? priceFor(vehicle, calc.livePrices ?? DEFAULT_PRICES, o).toFixed(2) : fuelPrice);

  const saveAdvanced = (d: Draft) => {
    advancedSheet.current?.dismiss();
    setTimeout(() => {
      calc.setPrefs(d.prefs);
      calc.setOctane(d.octane);
      // after the hook's octane effect has re-filled the auto price, so a typed price wins
      setTimeout(() => calc.setFuelPrice(d.price));
    }, COMMIT_DELAY);
  };

  const ctaLabel = !vehicles.length ? 'הוסף רכב כדי לחשב' : missing?.hint;
  const onCta = () => {
    if (!missing) return calc.calculate();
    if (missing.hint === PRICE_HINT) advancedSheet.current?.present();
  };

  const originText =
    originPlace?.main ?? (originStatus === 'locating' ? 'מאתר מיקום…' : originStatus === 'denied' ? 'בחר נקודת מוצא' : 'המיקום שלך');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View {...LTR.props} style={[styles.logo, LTR.style]} accessible accessibilityRole="image" accessibilityLabel="Checkfuel">
              <Image source={require('../../assets/images/v2/mark-ink.png')} style={styles.mark} />
              <Text style={styles.heck}>
                heck<Text style={styles.fuel}>fuel</Text>
              </Text>
            </View>
            <Pressable style={styles.infoBtn} onPress={openInfo} accessibilityRole="button" accessibilityLabel="מידע">
              <Info size={20} color={c.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={styles.h1} accessibilityRole="header">
            כמה תעלה הנסיעה?
          </Text>

          {/* vehicle */}
          {vehicle ? (
            <View style={styles.card}>
              <View style={styles.vehicleIcon}>
                <Car size={22} color={c.deep} strokeWidth={2} />
              </View>
              <View style={styles.vehicleText}>
                {!!vehicle.brand && <Text style={styles.overline}>{vehicle.brand.toUpperCase()}</Text>}
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {vehicle.name}
                </Text>
                <Text style={styles.small}>
                  {fuelName} · {`⁦₪${fuelPrice}⁩`} {unit}
                </Text>
              </View>
              <Pressable style={styles.pill} onPress={() => vehicleSheet.current?.present()} accessibilityRole="button" accessibilityLabel="החלף רכב">
                <Text style={styles.pillText}>החלף</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.card, styles.cardEmpty]}>
              <View style={[styles.vehicleIcon, { backgroundColor: c.mist }]}>
                <Car size={22} color={c.faint} strokeWidth={2} />
              </View>
              <View style={styles.vehicleText}>
                <Text style={[styles.vehicleName, { fontSize: 16 }]}>{vehicles.length ? 'בחר רכב' : 'עוד אין רכב שמור'}</Text>
                <Text style={styles.small}>כדי לחשב צריך את צריכת הדלק שלו</Text>
              </View>
              <Pressable
                style={styles.addBtn}
                onPress={() => (vehicles.length ? vehicleSheet.current?.present() : router.navigate('/vehicles'))}
                accessibilityRole="button"
              >
                <Plus size={16} color={c.ink} strokeWidth={2.4} />
                <Text style={styles.pillText}>{vehicles.length ? 'בחר' : 'הוסף רכב'}</Text>
              </Pressable>
            </View>
          )}

          {/* route */}
          <View style={styles.route}>
            <View style={{ marginBottom: 16 }}>
              <Segmented
                variant="dark"
                height={38}
                value={manual ? 'manual' : 'route'}
                onChange={(m) => calc.setInputMode(m)} // the typed km is kept across switches
                accessibilityLabel="אופן חישוב המרחק"
                options={[
                  { value: 'route', label: 'לפי יעד', icon: (col) => <MapPin size={14} color={col} strokeWidth={2} /> },
                  { value: 'manual', label: 'מרחק ידני', icon: (col) => <Pencil size={14} color={col} strokeWidth={2} /> },
                ]}
              />
            </View>

            {manual ? (
              <Animated.View key="manual" entering={FadeIn.duration(320)} style={{ gap: 14 }}>
                <View style={[styles.kmField, !!manualText && { borderColor: c.green }]}>
                  <View style={{ gap: 2 }}>
                    <Text style={styles.kmUnit}>ק״מ</Text>
                    <Text style={styles.kmSub}>כיוון אחד</Text>
                  </View>
                  <View style={styles.kmDivider} />
                  <TextInput
                    value={manualText}
                    onChangeText={(t) => calc.setManualText(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={c.inkFaint}
                    style={styles.kmInput}
                    accessibilityLabel="מרחק בקילומטרים, כיוון אחד"
                  />
                </View>
                {!!calc.manualError && <Text style={styles.error}>{calc.manualError}</Text>}
                <View style={styles.presets}>
                  {PRESETS.map((n) => {
                    const on = manualText === String(n);
                    return (
                      <Pressable
                        key={n}
                        style={[styles.preset, on && styles.presetOn]}
                        onPress={() => {
                          haptic.select();
                          calc.setManualText(String(n));
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[styles.presetText, on && { color: c.ink }]}>{n} ק״מ</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            ) : (
              <Animated.View key="route" entering={FadeIn.duration(320)}>
                <Pressable style={styles.endpoint} onPress={() => originSheet.current?.present()} accessibilityRole="button" accessibilityLabel={`נקודת מוצא: ${originText}`}>
                  <View style={styles.dotCol}>
                    <View style={styles.originDot} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.endpointLabel}>מאיפה</Text>
                    <Text style={styles.endpointText} numberOfLines={1}>
                      {originText}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.dotCol}>
                  <View style={styles.connector} />
                </View>
                <View style={styles.endpoint}>
                  <View style={styles.dotCol}>
                    <View style={styles.destDot} />
                  </View>
                  <Pressable style={styles.search} onPress={() => destinationSheet.current?.present()} accessibilityRole="button" accessibilityLabel="יעד">
                    <Search size={20} color={c.inkMuted} strokeWidth={2} />
                    <Text style={[styles.searchText, !destPlace && { color: c.inkMuted }]} numberOfLines={1}>
                      {destPlace?.main ?? 'לאן נוסעים?'}
                    </Text>
                    {routeStatus === 'loading' && <ActivityIndicator size="small" color={c.green} />}
                    {routeStatus === 'ok' && route && <Text style={styles.routeKm}>{Math.round(route.distanceMeters / 1000)} ק״מ</Text>}
                  </Pressable>
                </View>
                {routeStatus === 'error' && (
                  <Pressable onPress={calc.retryRoute} style={styles.errorRow} accessibilityRole="button">
                    <Text style={styles.error}>{routeError}</Text>
                    {!!destPlace && <Text style={styles.retry}>נסה שוב</Text>}
                  </Pressable>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                  {calc.recents
                    .filter((r) => r.placeId)
                    .slice(0, 5)
                    .map((p) => (
                      <Pressable key={p.placeId} style={styles.chip} onPress={() => calc.pickDestination(p)} accessibilityRole="button">
                        <Clock size={14} color={c.inkChip} strokeWidth={2} />
                        <Text style={styles.chipText}>{p.main}</Text>
                      </Pressable>
                    ))}
                </ScrollView>
              </Animated.View>
            )}
          </View>

          {/* trip type */}
          <View style={[styles.card, styles.optionsCard]}>
            <Text style={styles.rowLabel}>סוג נסיעה</Text>
            <Segmented
              variant="ink"
              compact
              height={36}
              value={roundTrip ? 'round' : 'one'}
              onChange={(v) => calc.changeRoundTrip(v === 'round')}
              accessibilityLabel="סוג נסיעה"
              options={[
                { value: 'one', label: 'כיוון אחד' },
                { value: 'round', label: 'הלוך-חזור' },
              ]}
            />
          </View>

          {/* advanced options */}
          <Pressable style={styles.card} onPress={() => advancedSheet.current?.present()} accessibilityRole="button" accessibilityHint="פותח את האפשרויות המתקדמות">
            <View style={styles.advIcon}>
              <SlidersHorizontal size={18} color={c.ink} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowLabel}>אפשרויות מתקדמות</Text>
              <Text style={[styles.small, { fontSize: 13 }]}>
                {fuelName ? `${fuelName} · ` : ''}
                {MODES[prefs.mode].name} · {prefs.ac ? 'מזגן דולק' : 'בלי מזגן'}
              </Text>
            </View>
            <ChevronLeft size={18} color={c.muted} strokeWidth={2} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.ctaWrap}>
        {missing ? (
          <Pressable style={[styles.cta, styles.ctaOff]} onPress={onCta} accessibilityRole="button" accessibilityState={{ disabled: true }}>
            {vehicles.length ? <MapPin size={18} color={c.disabledText} strokeWidth={2} /> : <Car size={18} color={c.disabledText} strokeWidth={2} />}
            <Text style={[styles.ctaText, { color: c.disabledText }]}>{ctaLabel}</Text>
          </Pressable>
        ) : (
          <Animated.View entering={FadeInDown.duration(320)}>
            <PressableScale
              style={styles.cta}
              scaleTo={0.97}
              onPress={() => {
                haptic.press();
                onCta();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>חשב עלות · {Math.round(km)} ק״מ</Text>
              <ArrowLeft size={18} color={c.green} strokeWidth={2.2} />
            </PressableScale>
          </Animated.View>
        )}
      </View>

      {calc.toast && (
        <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={[styles.toast, calc.toast.type === 'error' && { backgroundColor: c.warn }]} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{calc.toast.text}</Text>
        </Animated.View>
      )}

      <PlaceSheet sheetRef={destinationSheet} title="לאן נוסעים?" placeholder="חפשו כתובת או מקום" recents={calc.recents} favorites={calc.favorites} bias={calc.here} onPick={calc.pickDestination} onSaveFavorite={calc.saveFavorite} />
      <PlaceSheet sheetRef={originSheet} title="מאיפה יוצאים?" placeholder="חפשו כתובת או מקום" allowMyLocation recents={calc.recents} favorites={calc.favorites} bias={calc.here} onPick={calc.pickOrigin} onSaveFavorite={calc.saveFavorite} />
      <VehicleSheet sheetRef={vehicleSheet} vehicles={vehicles} selectedId={vehicle?.id} onSelect={calc.selectVehicle} onManage={() => router.navigate('/vehicles')} onAdd={() => router.push('/addVehicle')} />
      <AdvancedSheet
        sheetRef={advancedSheet}
        initial={{ octane, price: fuelPrice, prefs }}
        showOctane={petrol}
        unit={unit}
        autoPrice={autoPrice}
        priceStatus={calc.priceStatus}
        onSave={saveAdvanced}
      />
      <ResultV2 visible={resultOpen} data={calc.resultData} octane={octane} onRoundTrip={calc.changeRoundTrip} onSave={calc.saveToHistory} onClose={() => setResultOpen(false)} />

      {calc.showInterstitialAd && (
        <View style={styles.adOverlay}>
          <ActivityIndicator size="large" color={c.greenText} />
          <Text style={styles.adTitle}>מכינים תוצאות...</Text>
          <Text style={styles.small}>צפייה בפרסומת קצרה עוזרת לנו לשמור על האפליקציה חינמית</Text>
          <InterstitialAd
            onAdComplete={calc.openResult}
            onAdError={(error: unknown) => {
              if (__DEV__) console.log('Ad error:', error);
              calc.openResult();
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.mist },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 4, paddingBottom: 6 },
  logo: { flexDirection: 'row', alignItems: 'flex-end' },
  mark: { width: 26, height: 26, marginRight: -1, marginBottom: 1 },
  heck: { fontFamily: Rubik.medium, fontSize: 24, letterSpacing: -0.5, lineHeight: 26, color: c.ink },
  fuel: { fontFamily: Rubik.bold, color: c.greenText },
  infoBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: Rubik.extra, fontSize: 28, lineHeight: 32, color: c.ink, marginHorizontal: 4, marginTop: 4 },
  card: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.dashed },
  vehicleIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.greenTint, alignItems: 'center', justifyContent: 'center' },
  vehicleText: { flex: 1, minWidth: 0, gap: 1 },
  overline: { fontFamily: Rubik.semi, fontSize: 11, letterSpacing: 0.9, color: c.muted },
  vehicleName: { fontFamily: Rubik.bold, fontSize: 17, color: c.ink },
  small: { fontFamily: Rubik.regular, fontSize: 12, color: c.muted },
  pill: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: c.line, backgroundColor: c.mist, justifyContent: 'center' },
  pillText: { fontFamily: Rubik.semi, fontSize: 14, color: c.ink },
  addBtn: { height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.green, flexDirection: 'row', alignItems: 'center', gap: 6 },
  route: { backgroundColor: c.ink, borderRadius: 24, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16 },
  endpoint: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 },
  dotCol: { width: 20, alignItems: 'center' },
  originDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: c.green },
  destDot: { width: 12, height: 12, borderRadius: 3, backgroundColor: c.white },
  connector: { height: 20, marginVertical: 4, borderStartWidth: 2, borderStyle: 'dashed', borderColor: c.inkFaint },
  endpointLabel: { fontFamily: Rubik.regular, fontSize: 12, color: c.inkMuted },
  endpointText: { fontFamily: Rubik.bold, fontSize: 18, color: c.white },
  search: { flex: 1, height: 52, borderRadius: 16, backgroundColor: c.ink2, borderWidth: 1, borderColor: c.inkBorder, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchText: { flex: 1, fontFamily: Rubik.medium, fontSize: 17, color: c.white },
  routeKm: { fontFamily: Rubik.bold, fontSize: 14, color: c.green, fontVariant: ['tabular-nums'] },
  errorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  error: { fontFamily: Rubik.regular, fontSize: 13, color: '#FFB27A' },
  retry: { fontFamily: Rubik.semi, fontSize: 13, color: c.green },
  chips: { gap: 8, marginTop: 14 },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: c.inkBorder, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: Rubik.regular, fontSize: 14, color: c.inkChip },
  kmField: { height: 84, borderRadius: 18, backgroundColor: c.ink2, borderWidth: 1.5, borderColor: c.inkBorder, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  kmUnit: { fontFamily: Rubik.bold, fontSize: 20, color: c.white },
  kmSub: { fontFamily: Rubik.regular, fontSize: 11, color: c.inkMuted },
  kmDivider: { width: 1, alignSelf: 'stretch', marginVertical: 18, backgroundColor: c.inkBorder },
  kmInput: { flex: 1, minWidth: 0, padding: 0, fontFamily: Rubik.extra, fontSize: 52, letterSpacing: -1.5, color: c.white, textAlign: 'right', fontVariant: ['tabular-nums'] },
  presets: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.inkBorder, alignItems: 'center', justifyContent: 'center' },
  presetOn: { backgroundColor: c.white, borderColor: c.white },
  presetText: { fontFamily: Rubik.medium, fontSize: 13, color: c.inkChip },
  optionsCard: { justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14 },
  rowLabel: { fontFamily: Rubik.semi, fontSize: 15, color: c.ink },
  advIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.mist, alignItems: 'center', justifyContent: 'center' },
  ctaWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, backgroundColor: c.mist },
  cta: { height: 56, borderRadius: 18, backgroundColor: c.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaOff: { backgroundColor: c.disabled },
  ctaText: { fontFamily: Rubik.bold, fontSize: 16, color: c.white },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 84, backgroundColor: c.ink, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  toastText: { fontFamily: Rubik.bold, fontSize: 14, color: c.white },
  adOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: c.mist, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  adTitle: { fontFamily: Rubik.extra, fontSize: 17, color: c.ink, marginTop: 8 },
});
