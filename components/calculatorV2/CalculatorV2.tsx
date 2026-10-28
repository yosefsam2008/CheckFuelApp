// Redesigned calculator (design/screens/Main*.dc.html), on the same useFuelCalculator logic as the current screen.
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { ArrowLeft, Car, ChevronLeft, Clock, Info, MapPin, Pencil, Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceSheet } from '../calculator/PlaceSheet';
import { PressableScale } from '../calculator/PressableScale';
import { VehicleSheet } from '../calculator/VehicleSheet';
import { FUEL_LABEL } from '../vehicles/fuel';
import { DUR, EASE, haptic } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import { useFuelCalculator } from '../../hooks/useFuelCalculator';
import { DEFAULT_PRICES } from '../../lib/prices';
import { Octane, PRICE_HINT, priceFor } from '../../lib/tripCost';
import { AdvancedSheet, Draft, MODES } from './AdvancedSheet';
import { ResultV2 } from './ResultV2';
import { RouteShapeBox } from './RouteShapeBox';
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
  const { vehicle, vehicles, fuelPrice, octane, prefs, manual, manualText, roundTrip, km, missing, routeStatus, routeError, originPlace, originStatus, destPlace } = calc;

  // a trip-type or route change on the result screen re-prices the shown result
  const { refreshResult, routeOptions, routeTrips, selectedRouteIndex } = calc;
  useEffect(() => {
    if (resultOpen) refreshResult();
  }, [roundTrip, selectedRouteIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  // the home card draws the route the result will price: the selected one, by default the cheapest
  const shown = destPlace && routeStatus === 'ok' ? routeOptions[selectedRouteIndex] : undefined;
  // one toast at a time, on screen for DUR.toastStay (the hook clears its own copy later)
  const reduced = useReducedMotion();
  const [toast, setToast] = useState(calc.toast);
  useEffect(() => {
    setToast(calc.toast);
    if (!calc.toast) return;
    const t = setTimeout(() => setToast(null), DUR.toastStay);
    return () => clearTimeout(t);
  }, [calc.toast]);

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
            <Pressable style={styles.infoBtn} onPress={openInfo} accessibilityRole="button" accessibilityLabel="מידע">
              <Info size={20} color={colors.text} strokeWidth={2} />
            </Pressable>
            <View {...LTR.props} style={[styles.logo, LTR.style]} accessible accessibilityRole="image" accessibilityLabel="Checkfuel">
              <Image source={require('../../assets/images/v2/mark-ink.png')} style={styles.mark} />
              <Text style={styles.heck}>
                heck<Text style={styles.fuel}>fuel</Text>
              </Text>
            </View>
          </View>

          <Text style={styles.h1} accessibilityRole="header">
            כמה תעלה הנסיעה?
          </Text>

          {/* vehicle */}
          {vehicle ? (
            <View style={styles.card}>
              <View style={styles.vehicleIcon}>
                <Car size={22} color={colors.accentText} strokeWidth={2} />
              </View>
              <View style={styles.vehicleText}>
                {!!vehicle.brand && <Text style={styles.overline}>{vehicle.brand.toUpperCase()}</Text>}
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {vehicle.name}
                </Text>              </View>
              <Pressable style={styles.pill} onPress={() => vehicleSheet.current?.present()} accessibilityRole="button" accessibilityLabel="החלף רכב">
                <Text style={styles.pillText}>החלף</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.card, styles.cardEmpty]}>
              <View style={[styles.vehicleIcon, { backgroundColor: colors.surfaceSunken }]}>
                <Car size={22} color={colors.faint} strokeWidth={2} />
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
                <Plus size={16} color={colors.text} strokeWidth={2.4} />
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
                <View style={[styles.kmField, !!manualText && { borderColor: colors.accent }]}>
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
                    placeholderTextColor={colors.inkFaint}
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
                        <Text style={[styles.presetText, on && { color: colors.text }]}>{n} ק״מ</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            ) : (
              <Animated.View key="route" entering={FadeIn.duration(320)}>
                <View style={styles.routeRow}>
                  {/* one itinerary: the markers are the route drawing's own ends (green ring = start, white square = destination) */}
                  <View style={styles.legs}>
                    <Pressable style={styles.leg} onPress={() => originSheet.current?.present()} accessibilityRole="button" accessibilityLabel={`נקודת מוצא: ${originText}`}>
                      <View style={styles.markCol}>
                        <View style={styles.gap} />
                        <View style={styles.dotStart} />
                        <View style={styles.line} />
                      </View>
                      <View style={styles.legText}>
                        <Text style={styles.endpointLabel}>מאיפה</Text>
                        <Text style={styles.endpointText} numberOfLines={1}>
                          {originText}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.sep}>
                      <View style={styles.markCol}>
                        <View style={styles.line} />
                      </View>
                      <View style={styles.hair} />
                    </View>
                    <Pressable style={styles.leg} onPress={() => destinationSheet.current?.present()} accessibilityRole="button" accessibilityLabel={destPlace ? `יעד: ${destPlace.main}` : 'יעד'}>
                      <View style={styles.markCol}>
                        <View style={styles.line} />
                        <View style={[styles.dotEnd, !destPlace && styles.dotEndGhost]} />
                        <View style={styles.gap} />
                      </View>
                      <View style={styles.legText}>
                        <Text style={styles.endpointLabel}>לאן</Text>
                        <Text style={[styles.endpointText, !destPlace && styles.endpointEmpty]} numberOfLines={1}>
                          {destPlace?.main ?? 'לאן נוסעים?'}
                        </Text>
                      </View>
                      <View style={styles.legTrail}>
                        {routeStatus === 'loading' ? (
                          <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                          !destPlace && <Search size={18} color={colors.textMutedInverse} strokeWidth={2} />
                        )}
                      </View>
                    </Pressable>
                  </View>
                  <RouteShapeBox polyline={shown?.polyline} km={shown?.distanceKm} />
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
                        <Clock size={14} color={colors.inkChip} strokeWidth={2} />
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
              <SlidersHorizontal size={18} color={colors.text} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowLabel}>אפשרויות מתקדמות</Text>
              <Text style={[styles.small, { fontSize: 13 }]}>
                {fuelName ? `${fuelName} · ` : ''}
                {MODES[prefs.mode].name} · {prefs.ac ? 'מזגן דולק' : 'בלי מזגן'}
              </Text>
            </View>
            <ChevronLeft size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.ctaWrap}>
        {missing ? (
          <Pressable style={[styles.cta, styles.ctaOff]} onPress={onCta} accessibilityRole="button" accessibilityState={{ disabled: true }}>
            {vehicles.length ? <MapPin size={18} color={colors.disabledText} strokeWidth={2} /> : <Car size={18} color={colors.disabledText} strokeWidth={2} />}
            <Text style={[styles.ctaText, { color: colors.disabledText }]}>{ctaLabel}</Text>
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
              <ArrowLeft size={18} color={colors.accent} strokeWidth={2.2} />
            </PressableScale>
          </Animated.View>
        )}
      </View>

      {toast && (
        <Animated.View
          entering={reduced ? FadeIn.duration(DUR.fade) : FadeInDown.duration(DUR.toastIn).easing(EASE.out).withInitialValues({ opacity: 0, transform: [{ translateY: -20 }] })}
          exiting={reduced ? FadeOut.duration(DUR.fade) : FadeOutUp.duration(DUR.toastOut)}
          style={[styles.toast, { top: insets.top + 8 }, toast.type === 'error' && { backgroundColor: colors.warn }]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.toastText}>{toast.text}</Text>
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
      <ResultV2
        visible={resultOpen}
        data={calc.resultData}
        octane={octane}
        routes={
          manual || !routeOptions.length
            ? undefined
            : { options: routeOptions, costs: routeTrips.map((t) => t?.totalCost ?? null), selected: selectedRouteIndex, cheapest: calc.cheapestRouteIndex, onSelect: calc.selectRoute }
        }
        onRoundTrip={calc.changeRoundTrip}
        onSave={calc.saveToHistory}
        onClose={() => setResultOpen(false)}
      />

      {calc.showInterstitialAd && (
        <View style={styles.adOverlay}>
          <ActivityIndicator size="large" color={colors.accentTextLarge} />
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
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 4, paddingBottom: 6 },
  logo: { flexDirection: 'row', alignItems: 'flex-end' },
  mark: { width: 26, height: 26, marginRight: -1, marginBottom: 1 },
  heck: { fontFamily: Rubik.medium, fontSize: 24, letterSpacing: -0.5, lineHeight: 26, color: colors.text },
  fuel: { fontFamily: Rubik.bold, color: colors.accentTextLarge },
  infoBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: Rubik.extra, fontSize: 28, lineHeight: 32, color: colors.text, marginHorizontal: 4, marginTop: 4 },
  card: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.dashed },
  vehicleIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  vehicleText: { flex: 1, minWidth: 0, gap: 1 },
  overline: { fontFamily: Rubik.semi, fontSize: 11, letterSpacing: 0.9, color: colors.textMuted },
  vehicleName: { fontFamily: Rubik.bold, fontSize: 17, color: colors.text },
  small: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMuted },
  pill: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, justifyContent: 'center' },
  pillText: { fontFamily: Rubik.semi, fontSize: 14, color: colors.text },
  addBtn: { height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 },
  route: { backgroundColor: colors.surfaceInverse, borderRadius: 24, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'stretch', gap: 14 },
  // the itinerary box; the connector runs through each row's marker column, so it is all plain layout (no start/end offsets)
  legs: { flex: 1, minWidth: 0, alignSelf: 'center', borderRadius: 18, backgroundColor: colors.surfaceInverseRaised, borderWidth: 1, borderColor: colors.inkBorder, paddingHorizontal: 14 },
  leg: { minHeight: 60, flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  sep: { height: 1, flexDirection: 'row', gap: 12 },
  hair: { flex: 1, backgroundColor: colors.inkBorder },
  markCol: { width: 14, alignItems: 'center' },
  gap: { flex: 1 },
  line: { flex: 1, width: 2, borderRadius: 1, backgroundColor: colors.inkBorder },
  dotStart: { width: 14, height: 14, borderRadius: 7, borderWidth: 3.5, borderColor: colors.accent, marginVertical: 3 },
  dotEnd: { width: 12, height: 12, borderRadius: 3.5, backgroundColor: colors.textInverse, marginVertical: 4 },
  dotEndGhost: { backgroundColor: colors.inkFaint },
  legText: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 1, paddingVertical: 8 },
  endpointLabel: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMutedInverse },
  endpointText: { fontFamily: Rubik.bold, fontSize: 17, color: colors.textInverse },
  legTrail: { justifyContent: 'center' },
  endpointEmpty: { fontFamily: Rubik.medium, color: colors.textMutedInverse },
  errorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  error: { fontFamily: Rubik.regular, fontSize: 13, color: colors.dangerOnInverse },
  retry: { fontFamily: Rubik.semi, fontSize: 13, color: colors.accent },
  chips: { gap: 8, marginTop: 14 },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.inkBorder, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: Rubik.regular, fontSize: 14, color: colors.inkChip },
  kmField: { height: 84, borderRadius: 18, backgroundColor: colors.surfaceInverseRaised, borderWidth: 1.5, borderColor: colors.inkBorder, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  kmUnit: { fontFamily: Rubik.bold, fontSize: 20, color: colors.textInverse },
  kmSub: { fontFamily: Rubik.regular, fontSize: 11, color: colors.textMutedInverse },
  kmDivider: { width: 1, alignSelf: 'stretch', marginVertical: 18, backgroundColor: colors.inkBorder },
  kmInput: { flex: 1, minWidth: 0, padding: 0, fontFamily: Rubik.extra, fontSize: 52, letterSpacing: -1.5, color: colors.textInverse, textAlign: 'right', fontVariant: ['tabular-nums'] },
  presets: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.inkBorder, alignItems: 'center', justifyContent: 'center' },
  presetOn: { backgroundColor: colors.surfaceRaised, borderColor: colors.surfaceRaised },
  presetText: { fontFamily: Rubik.medium, fontSize: 13, color: colors.inkChip },
  optionsCard: { justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14 },
  rowLabel: { fontFamily: Rubik.semi, fontSize: 15, color: colors.text },
  advIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  ctaWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, backgroundColor: colors.surfaceSunken },
  cta: { height: 56, borderRadius: 18, backgroundColor: colors.surfaceInverse, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaOff: { backgroundColor: colors.disabled },
  ctaText: { fontFamily: Rubik.bold, fontSize: 16, color: colors.textInverse },
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.surfaceInverse, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  toastText: { fontFamily: Rubik.bold, fontSize: 14, color: colors.textInverse },
  adOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  adTitle: { fontFamily: Rubik.extra, fontSize: 17, color: colors.text, marginTop: 8 },
});
