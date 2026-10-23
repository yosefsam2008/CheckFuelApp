// calculator.tsx - single-screen trip cost calculator
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Heart } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { CalculateButton } from '../../components/calculator/CalculateButton';
import { DriveModeCard } from '../../components/calculator/DriveModeCard';
import { HeroHeader } from '../../components/calculator/HeroHeader';
import { PassengerStepper } from '../../components/calculator/PassengerStepper';
import { ResultData, ResultSheet } from '../../components/calculator/ResultSheet';
import { PlaceSheet } from '../../components/calculator/PlaceSheet';
import { InputMode, OriginStatus, RouteCard, RouteStatus } from '../../components/calculator/RouteCard';
import { VehiclePriceCard } from '../../components/calculator/VehiclePriceCard';
import { VehicleSheet } from '../../components/calculator/VehicleSheet';
import { colors, Heebo, radius, space } from '../../constants/theme';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import { LEGAL_UI_STRINGS } from '../../legal/LEGAL_UI_STRINGS_HE';
import { addRecent, Favorites, FavKey, isGpsPlace, loadFavorites, loadOrigin, loadRecents, MY_LOCATION, Place, placeEndpoint, placeLabel, saveFavorites, saveOrigin, saveRecents } from '../../lib/places';
import { endpointKey, getRoute, LatLng, RouteResult, routeProviderConfigured } from '../../lib/route';
import { computeTrip, DEFAULT_PREFS, FuelPrices, Octane, priceField, priceFor, TripPrefs, Vehicle } from '../../lib/tripCost';
import { NO_TOUCH } from '../../constants/rtl';
import { DEFAULT_PRICES, defaultIO, getPrices, PriceInfo, PriceResult } from '../../lib/prices';
import { saveTrip } from '../../lib/calc/history';
import type { TripRecord } from '../../types/trip';

// Conditional imports for ads - only load on native platforms
const BannerAd = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;
const InterstitialAd = Platform.OS === 'web' ? () => null : require('../../components/InterstitialAd').default;

const MAX_KM = 5000;
const ROUND_TRIP_KEY = 'roundTrip';

type ToastMsg = { text: string; type: 'success' | 'error' };

export default function CalculatorScreen() {
  const router = useRouter();
  const openInfo = useOpenInfoMenu();
  const resultSheet = useRef<BottomSheetModal>(null);
  const vehicleSheet = useRef<BottomSheetModal>(null);
  const destinationSheet = useRef<BottomSheetModal>(null);
  const originSheet = useRef<BottomSheetModal>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [toast, setToast] = useState<ToastMsg | null>(null);

  // ---------- vehicles ----------
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  const loadVehicles = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('vehicles');
      setVehicles(stored ? (JSON.parse(stored) as Vehicle[]) : []);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      setToast({ text: LEGAL_UI_STRINGS.errors.apiError, type: 'error' });
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      loadVehicles();
      setStatusBarStyle('light'); // the green hero sits under the status bar
      return () => setStatusBarStyle('dark');
    }, [loadVehicles]),
  );

  // Preselect the last-used vehicle (or the first); also re-picks if the selected one was deleted
  useEffect(() => {
    if (vehicles.length === 0) return setVehicle(null);
    if (vehicle && vehicles.some((v) => v.id === vehicle.id)) return;
    AsyncStorage.getItem('lastVehicleId')
      .then((id) => setVehicle(vehicles.find((v) => v.id === id) ?? vehicles[0]))
      .catch(() => setVehicle(vehicles[0]));
  }, [vehicle, vehicles]);

  const selectVehicle = (v: Vehicle) => {
    setVehicle(v);
    AsyncStorage.setItem('lastVehicleId', v.id).catch(() => {});
  };

  // ---------- fuel price ----------
  const [livePrices, setLivePrices] = useState<FuelPrices | null>(null);
  const [priceInfo, setPriceInfo] = useState<PriceInfo>();
  const [pricesLoading, setPricesLoading] = useState(true);
  const [octane, setOctane] = useState<Octane>('95');
  const [fuelPrice, setFuelPrice] = useState(DEFAULT_PRICES.Gasoline.toFixed(2));

  useEffect(() => {
    let cancelled = false;
    const apply = (r: PriceResult) => {
      if (cancelled) return;
      setLivePrices(r.source === 'default' ? null : r.prices);
      setPriceInfo(r.info);
    };
    getPrices(defaultIO, apply)
      .then(apply)
      .finally(() => !cancelled && setPricesLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (vehicle) setFuelPrice(priceFor(vehicle, livePrices ?? DEFAULT_PRICES, octane).toFixed(2));
  }, [vehicle, livePrices, octane]);

  // ---------- route ----------
  const [originStatus, setOriginStatus] = useState<OriginStatus>('locating');
  const [here, setHere] = useState<LatLng | null>(null); // GPS
  const [originPlace, setOriginPlace] = useState<Place | null>(null); // null = GPS
  const [destPlace, setDestPlace] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('route');
  const [manualText, setManualText] = useState('');
  const [roundTrip, setRoundTrip] = useState(false);
  const [recents, setRecents] = useState<Place[]>([]);
  const [favorites, setFavorites] = useState<Favorites>({});
  const routeRequest = useRef(0);
  const routeCache = useRef(new Map<string, RouteResult>()); // per app session, so swapping back costs nothing

  const locate = async (): Promise<LatLng | null> => {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) throw new Error('denied');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setHere(p);
      setOriginStatus('ok');
      return p;
    } catch {
      setOriginStatus('denied');
      return null;
    }
  };

  useEffect(() => {
    loadRecents().then(setRecents);
    loadFavorites().then(setFavorites);
    loadOrigin().then((p) => p && setOriginPlace(p));
    AsyncStorage.getItem(ROUND_TRIP_KEY)
      .then((v) => setRoundTrip(v === '1'))
      .catch(() => {});
    locate();
  }, []);

  const changeRoundTrip = (on: boolean) => {
    setRoundTrip(on);
    AsyncStorage.setItem(ROUND_TRIP_KEY, on ? '1' : '0').catch(() => {});
  };

  /** `from` null = GPS. Only placeIds or coords reach the route API. */
  const searchRoute = async (from: Place | null, to: Place) => {
    Keyboard.dismiss();
    setInputMode('route');
    const id = ++routeRequest.current;
    setRouteError(null);
    try {
      if (!routeProviderConfigured) throw new Error('not_configured');
      const a = from ? placeEndpoint(from) : here;
      const b = placeEndpoint(to);
      if (!a && !from) throw new Error('no_origin');
      if (!a || !b) throw new Error('unresolved');
      const key = `${endpointKey(a)}|${endpointKey(b)}`;
      const hit = routeCache.current.get(key);
      if (hit) {
        setRoute(hit);
        setRouteStatus('ok');
        return;
      }
      setRoute(null);
      setRouteStatus('loading');
      const r = await getRoute(a, b);
      if (id !== routeRequest.current) return;
      routeCache.current.set(key, r);
      setRoute(r);
      setRouteStatus('ok');
    } catch (e) {
      if (id !== routeRequest.current) return;
      const msg = (e as Error).message;
      setRoute(null);
      setRouteStatus('error');
      setRouteError(
        msg === 'not_configured' ? 'חישוב מסלול עדיין לא מחובר. אפשר להקליד מרחק ידנית'
        : msg === 'no_origin' ? 'אין גישה למיקום. אפשר לבחור נקודת מוצא או להקליד מרחק ידנית'
        : msg === 'unresolved' ? 'בחרו את המקום מחדש מהחיפוש'
        : 'לא הצלחנו לחשב את המסלול',
      );
    }
  };

  // the updater writes storage too: harmless if StrictMode runs it twice, and never works from a stale list
  const remember = (p: Place) =>
    setRecents((prev) => {
      const next = addRecent(prev, p);
      saveRecents(next);
      return next;
    });

  const saveFavorite = (k: FavKey, p: Place) =>
    setFavorites((prev) => {
      const next = { ...prev, [k]: { ...p, lastUsed: p.lastUsed ?? Date.now() } };
      saveFavorites(next);
      return next;
    });

  const pickDestination = (p: Place | null) => {
    if (!p) return;
    remember(p);
    setDestPlace(p);
    searchRoute(originPlace, p);
  };

  const pickOrigin = (p: Place | null) => {
    if (p) remember(p);
    setOriginPlace(p);
    saveOrigin(p);
    if (destPlace) searchRoute(p, destPlace);
  };

  // GPS origin becomes a fixed "my location" destination, so take a fresh fix first
  const swap = async () => {
    if (!destPlace) return;
    const nextOrigin = isGpsPlace(destPlace) ? null : destPlace;
    let nextDest = originPlace;
    if (!nextDest) {
      const pos = await locate();
      if (!pos) {
        setRouteStatus('error');
        setRouteError('אין גישה למיקום, אי אפשר להחליף כיוון');
        return;
      }
      nextDest = { main: MY_LOCATION, lat: pos.latitude, lng: pos.longitude };
    }
    setOriginPlace(nextOrigin);
    saveOrigin(nextOrigin);
    setDestPlace(nextDest);
    searchRoute(nextOrigin, nextDest);
  };

  const destination = destPlace ? (isGpsPlace(destPlace) ? `${destPlace.lat},${destPlace.lng}` : placeLabel(destPlace)) : '';

  const manual = inputMode === 'manual';
  const manualValue = parseFloat(manualText);
  const manualError = !manualText ? null : isNaN(manualValue) ? 'המרחק חייב להיות מספר' : manualValue <= 0 ? 'המרחק חייב להיות גדול מ-0' : manualValue > MAX_KM ? `המרחק חייב להיות עד ${MAX_KM} ק״מ` : null;
  const oneWayKm = manual ? manualValue : route ? route.distanceMeters / 1000 : 0;
  const kmValid = oneWayKm > 0 && oneWayKm <= MAX_KM;
  const km = kmValid ? oneWayKm * (roundTrip ? 2 : 1) : 0;

  // ---------- trip factors ----------
  const [prefs, setPrefs] = useState<TripPrefs>(DEFAULT_PREFS);
  const [passengers, setPassengers] = useState(1);

  // ---------- calculate ----------
  const price = parseFloat(fuelPrice);
  // one hint at a time; the vehicle comes first
  const missing: { hint: string; target: 'vehicle' | 'route' } | null = !vehicle
    ? { hint: 'בחר רכב כדי לחשב', target: 'vehicle' }
    : !kmValid
      ? { hint: routeStatus === 'loading' && !manual ? 'מחשב מרחק…' : manual ? 'הקלד מרחק כדי לחשב' : 'בחר יעד כדי לחשב', target: 'route' }
      : !((vehicle.avgConsumption ?? 0) > 0)
        ? { hint: LEGAL_UI_STRINGS.errors.invalidConsumption, target: 'vehicle' }
        : !(price > 0 && price <= 100)
          ? { hint: 'הזן מחיר דלק תקין', target: 'vehicle' }
          : null;
  const disabledReason = missing?.hint ?? null;

  // tapping the disabled CTA scrolls to the missing card and pulses its border
  const [cardsY, setCardsY] = useState(0);
  const [vehicleY, setVehicleY] = useState(0);
  const [routeHl, setRouteHl] = useState(0);
  const [vehicleHl, setVehicleHl] = useState(0);
  const pointAtMissing = () => {
    if (!missing) return;
    scrollRef.current?.scrollTo({ y: missing.target === 'vehicle' ? Math.max(cardsY + vehicleY - 80, 0) : 0, animated: true });
    if (missing.target === 'vehicle') setVehicleHl((k) => k + 1);
    else setRouteHl((k) => k + 1);
  };

  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);

  const openResult = () => {
    setShowInterstitialAd(false);
    resultSheet.current?.present();
  };

  const calculate = async () => {
    if (disabledReason || !vehicle) return;
    Keyboard.dismiss();
    const result = computeTrip(vehicle, km, price, prefs);
    const ecoCost = computeTrip(vehicle, km, price, { ...prefs, mode: 'eco' }).totalCost;
    const routed = !manual && !!destPlace;
    setResultData({
      result, ecoCost, mode: prefs.mode, unitPrice: price, vehicle, roundTrip, passengers,
      destination: routed ? destination : '',
      from: routed ? (originPlace?.main ?? MY_LOCATION) : '',
      to: routed ? destPlace.main : '',
    });

    if (Platform.OS === 'web') return openResult();
    try {
      // interstitial on every second calculation, as before
      const count = parseInt((await AsyncStorage.getItem('calculationCount')) ?? '0', 10) + 1;
      await AsyncStorage.setItem('calculationCount', count.toString());
      if (count % 2 === 0) setShowInterstitialAd(true);
      else openResult();
    } catch {
      openResult();
    }
  };

  // the result this sheet already saved (or is saving): a double tap or a tap during dismiss must not insert twice
  const savedFor = useRef<ResultData | null>(null);
  const saveToHistory = async () => {
    if (!resultData) return;
    if (savedFor.current === resultData) return setToast({ text: 'כבר נשמר', type: 'success' });
    savedFor.current = resultData;
    const { result, vehicle: v } = resultData;
    const now = Date.now();
    try {
      const tripRecord: TripRecord = {
        id: String(now), // saveTrip makes it unique
        date: new Date(now).toLocaleDateString('he-IL'),
        timestamp: now,
        distance: result.distance,
        vehicleName: v.name,
        vehicleModel: v.model,
        fuelType: v.fueltype,
        totalCost: result.totalCost,
        fuelConsumed: result.fuelConsumed,
        costPerKm: result.costPerKm,
        consumption: result.consumption,
        energyType: result.energyType,
      };
      const status = await saveTrip(tripRecord);
      resultSheet.current?.dismiss();
      setToast({ text: status === 'duplicate' ? 'כבר נשמר' : LEGAL_UI_STRINGS.toasts.dataSaved, type: 'success' });
    } catch (error) {
      savedFor.current = null; // nothing was written, so a retry must be allowed
      console.error('Failed to save calculation:', error);
      setToast({ text: LEGAL_UI_STRINGS.errors.apiError, type: 'error' });
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // the last card must scroll fully above the sticky CTA
  const [ctaHeight, setCtaHeight] = useState(110);
  const onCtaLayout = (e: LayoutChangeEvent) => setCtaHeight(e.nativeEvent.layout.height);

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: ctaHeight + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <HeroHeader onInfo={openInfo} />
        <RouteCard
          mode={inputMode}
          onMode={setInputMode}
          originStatus={originStatus}
          originText={originPlace ? placeLabel(originPlace) : ''}
          onOpenOrigin={() => originSheet.current?.present()}
          destination={destPlace ? placeLabel(destPlace) : ''}
          onOpenDestination={() => destinationSheet.current?.present()}
          onSwap={destPlace ? swap : undefined}
          recent={recents.filter((r) => r.placeId).slice(0, 5)}
          onPickRecent={pickDestination}
          routeStatus={routeStatus}
          routeError={routeError}
          onRetry={() => destPlace && searchRoute(originPlace, destPlace)}
          route={route}
          manualText={manualText}
          onManualText={setManualText}
          manualError={manualError}
          km={km}
          roundTrip={roundTrip}
          onRoundTrip={changeRoundTrip}
          highlightKey={routeHl}
        />
        <View style={styles.cards} onLayout={(e) => setCardsY(e.nativeEvent.layout.y)}>
          <View onLayout={(e) => setVehicleY(e.nativeEvent.layout.y)}>
            <VehiclePriceCard
              vehicle={vehicle}
              onSwap={() => vehicleSheet.current?.present()}
              onGoToVehicles={() => router.navigate('/vehicles')}
              price={fuelPrice}
              onPriceChange={setFuelPrice}
              priceStatus={
                pricesLoading ? 'loading'
                : !livePrices ? 'fallback'
                : octane === '98' && vehicle?.fueltype !== 'Diesel' ? 'estimate'
                : vehicle && priceInfo?.computed?.[priceField(vehicle)] === false ? 'estimate' // server sent its fixed fallback
                : 'live'
              }
              priceDate={vehicle && priceField(vehicle) === 'Gasoline' ? priceInfo?.effectiveFrom : undefined} // the feed's date is the gasoline row's
              octane={octane}
              onOctane={setOctane}
              highlightKey={vehicleHl}
            />
          </View>
          <DriveModeCard prefs={prefs} onChange={setPrefs} />
          <PassengerStepper count={passengers} onChange={setPassengers} />
          <View style={styles.banner}>
            <BannerAd />
          </View>
        </View>
      </ScrollView>

      <View style={styles.ctaWrap} onLayout={onCtaLayout}>
        <LinearGradient colors={[colors.fadeBg, colors.bg]} style={[styles.ctaFade, NO_TOUCH]} />
        <View style={styles.ctaBody}>
          <CalculateButton hint={disabledReason} target={missing?.target ?? null} onPress={calculate} onDisabledPress={pointAtMissing} />
        </View>
      </View>

      {toast && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.toast, { bottom: ctaHeight + 12 }, toast.type === 'error' && { backgroundColor: colors.error }]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.toastText}>{toast.text}</Text>
        </Animated.View>
      )}

      <PlaceSheet
        sheetRef={destinationSheet}
        title="לאן נוסעים?"
        placeholder="חפשו כתובת או מקום"
        recents={recents}
        favorites={favorites}
        bias={here}
        onPick={pickDestination}
        onSaveFavorite={saveFavorite}
      />
      <PlaceSheet
        sheetRef={originSheet}
        title="מאיפה יוצאים?"
        placeholder="חפשו כתובת או מקום"
        allowMyLocation
        recents={recents}
        favorites={favorites}
        bias={here}
        onPick={pickOrigin}
        onSaveFavorite={saveFavorite}
      />
      <VehicleSheet sheetRef={vehicleSheet} vehicles={vehicles} selectedId={vehicle?.id} onSelect={selectVehicle} onManage={() => router.navigate('/vehicles')} />
      <ResultSheet sheetRef={resultSheet} data={resultData} onSave={saveToHistory} banner={<BannerAd style={{ marginTop: 8 }} />} />

      {showInterstitialAd && (
        <View style={styles.adOverlay}>
          <ActivityIndicator size="large" color={colors.brandGreen} />
          <Text style={styles.adTitle}>מכינים תוצאות...</Text>
          <Text style={styles.adSub}>זה יקח רק כמה שניות</Text>
          <View style={styles.adNoteRow}>
            <Text style={styles.adNote}>צפייה בפרסומת קצרה תעזור לנו לשמור על האפליקציה חינמית</Text>
            <Heart size={14} color={colors.brandGreen} strokeWidth={2} />
          </View>
          <InterstitialAd
            onAdComplete={openResult}
            onAdError={(error: unknown) => {
              if (__DEV__) console.log('Ad error:', error);
              openResult();
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  cards: { paddingHorizontal: space.gutter, gap: space.cardGap, marginTop: space.cardGap },
  banner: { alignItems: 'center', marginTop: 4 },
  ctaWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaFade: { position: 'absolute', left: 0, right: 0, top: -24, height: 24 },
  ctaBody: { backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.text, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  toastText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.white },
  adOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  adTitle: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text, marginTop: 16 },
  adSub: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted, marginTop: 4 },
  adNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  adNote: { fontFamily: Heebo.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', flexShrink: 1 },
});
