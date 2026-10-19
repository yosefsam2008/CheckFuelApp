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
import { InputSheet } from '../../components/calculator/InputSheet';
import { PassengerStepper } from '../../components/calculator/PassengerStepper';
import { ResultData, ResultSheet } from '../../components/calculator/ResultSheet';
import { InputMode, OriginStatus, RouteCard, RouteStatus } from '../../components/calculator/RouteCard';
import { VehiclePriceCard } from '../../components/calculator/VehiclePriceCard';
import { VehicleSheet } from '../../components/calculator/VehicleSheet';
import { colors, Heebo, radius, space } from '../../constants/theme';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import { LEGAL_UI_STRINGS } from '../../legal/LEGAL_UI_STRINGS_HE';
import { getRoute, LatLng, RouteResult, routeProviderConfigured } from '../../lib/route';
import { computeTrip, DEFAULT_PREFS, FuelPrices, Octane, priceFor, TripPrefs, Vehicle } from '../../lib/tripCost';
import { NO_TOUCH } from '../../constants/rtl';

// Conditional imports for ads - only load on native platforms
const BannerAd = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;
const InterstitialAd = Platform.OS === 'web' ? () => null : require('../../components/InterstitialAd').default;

const DEFAULT_FUEL_PRICES: FuelPrices = { Gasoline: 7.08, Diesel: 9.58, Electric: 0.6 };
const MAX_KM = 5000;
const RECENT_KEY = 'recentDestinations';

type ToastMsg = { text: string; type: 'success' | 'error' };

export default function CalculatorScreen() {
  const router = useRouter();
  const openInfo = useOpenInfoMenu();
  const resultSheet = useRef<BottomSheetModal>(null);
  const vehicleSheet = useRef<BottomSheetModal>(null);
  const destinationSheet = useRef<BottomSheetModal>(null);
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
  const [pricesLoading, setPricesLoading] = useState(true);
  const [octane, setOctane] = useState<Octane>('95');
  const [fuelPrice, setFuelPrice] = useState(DEFAULT_FUEL_PRICES.Gasoline.toFixed(2));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('https://checkfuel-data.vercel.app/prices.json');
        if (!response.ok) throw new Error('Network response not ok');
        const data = await response.json();
        if (!cancelled) {
          setLivePrices({ Gasoline: parseFloat(data.Gasoline), Diesel: parseFloat(data.Diesel), Electric: parseFloat(data.Electric) });
        }
      } catch {
        // stays on the default prices
      } finally {
        if (!cancelled) setPricesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (vehicle) setFuelPrice(priceFor(vehicle, livePrices ?? DEFAULT_FUEL_PRICES, octane).toFixed(2));
  }, [vehicle, livePrices, octane]);

  // ---------- route ----------
  const [originStatus, setOriginStatus] = useState<OriginStatus>('locating');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState('');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('route');
  const [manualText, setManualText] = useState('');
  const [roundTrip, setRoundTrip] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const routeRequest = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((s) => s && setRecent(JSON.parse(s)))
      .catch(() => {});
    (async () => {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!granted) throw new Error('denied');
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setOrigin({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setOriginStatus('ok');
      } catch {
        setOriginStatus('denied');
      }
    })();
  }, []);

  const searchRoute = async (dest: string) => {
    const q = dest.trim();
    if (!q) return;
    Keyboard.dismiss();
    setDestination(q);
    setInputMode('route');
    const id = ++routeRequest.current;
    setRoute(null);
    setRouteStatus('loading');
    setRouteError(null);
    try {
      if (!routeProviderConfigured) throw new Error('not_configured');
      if (!origin) throw new Error('no_origin');
      const r = await getRoute(origin, q);
      if (id !== routeRequest.current) return;
      setRoute(r);
      setRouteStatus('ok');
      const next = [q, ...recent.filter((x) => x !== q)].slice(0, 5);
      setRecent(next);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
    } catch (e) {
      if (id !== routeRequest.current) return;
      const msg = (e as Error).message;
      setRouteStatus('error');
      setRouteError(
        msg === 'not_configured' ? 'חישוב מסלול עדיין לא מחובר. אפשר להקליד מרחק ידנית'
        : msg === 'no_origin' ? 'אין גישה למיקום. אפשר להקליד מרחק ידנית'
        : 'לא הצלחנו לחשב את המסלול',
      );
    }
  };

  const submitDestination = (text: string) => {
    if (!text.trim()) return 'הקלד כתובת או מקום';
    searchRoute(text);
    return null;
  };

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
    setResultData({ result, ecoCost, mode: prefs.mode, unitPrice: price, vehicle, roundTrip, passengers, destination });

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

  const saveToHistory = async () => {
    if (!resultData) return;
    const { result, vehicle: v } = resultData;
    try {
      const tripRecord = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('he-IL'),
        timestamp: Date.now(),
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
      const stored = await AsyncStorage.getItem('tripHistory');
      const history = stored ? JSON.parse(stored) : [];
      history.push(tripRecord);
      await AsyncStorage.setItem('tripHistory', JSON.stringify(history));
      resultSheet.current?.dismiss();
      setToast({ text: LEGAL_UI_STRINGS.toasts.dataSaved, type: 'success' });
    } catch (error) {
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
          destination={destination}
          onOpenDestination={() => destinationSheet.current?.present()}
          recent={recent}
          onPickRecent={searchRoute}
          routeStatus={routeStatus}
          routeError={routeError}
          onRetry={() => searchRoute(destination)}
          route={route}
          manualText={manualText}
          onManualText={setManualText}
          manualError={manualError}
          km={km}
          roundTrip={roundTrip}
          onRoundTrip={setRoundTrip}
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
              priceStatus={pricesLoading ? 'loading' : !livePrices ? 'fallback' : octane === '98' && vehicle?.fueltype !== 'Diesel' ? 'estimate' : 'live'}
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

      <InputSheet
        sheetRef={destinationSheet}
        title="לאן נוסעים?"
        placeholder="כתובת או מקום, למשל: דיזנגוף 50, תל אביב"
        initial={destination}
        cta="חשב מסלול"
        onSubmit={submitDestination}
        recent={recent}
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
