// The calculator's state and logic, shared by the calculator screens. Moved unchanged out of app/(tabs)/calculator.tsx.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Linking, Platform } from 'react-native';
import type { PriceStatus } from '../components/calculator/FuelPriceDisplay';
import type { ResultData } from '../components/calculator/ResultSheet';
import type { InputMode, OriginStatus, RouteStatus } from '../components/calculator/RouteCard';
import { LEGAL_UI_STRINGS } from '../legal/LEGAL_UI_STRINGS_HE';
import { afterCalculation, afterShown, AdState, loadAdState, saveAdState, shouldShowInterstitial } from '../lib/ads/policy';
import { saveTrip } from '../lib/calc/history';
import { markSessionError, onTripSaved } from '../lib/growth';
import { addRecent, Favorites, FavKey, isGpsPlace, loadFavorites, loadOrigin, loadRecents, MY_LOCATION, Place, placeEndpoint, placeLabel, saveFavorites, saveOrigin, saveRecents } from '../lib/places';
import { DEFAULT_PRICES, defaultIO, getPrices, PriceInfo, PriceResult } from '../lib/prices';
import { endpointKey, getRoute, LatLng, RouteResult, routeOptions as toOptions, routeProviderConfigured } from '../lib/route';
import { cheapestIndex, computeTrip, DEFAULT_PREFS, FuelPrices, Octane, priceField, priceFor, routeCosts, TripPrefs, tripInputs, Vehicle } from '../lib/tripCost';
import type { TripRecord } from '../types/trip';

const ROUND_TRIP_KEY = 'roundTrip';

type ToastMsg = { text: string; type: 'success' | 'error' };

interface Options {
  /** show the result UI (sheet or screen) */
  presentResult: () => void;
  /** hide it after a successful save */
  dismissResult: () => void;
}

// one per app session: sessionShown must not reset when the screen remounts
let adState: AdState | null = null;

export function useFuelCalculator({ presentResult, dismissResult }: Options) {
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
      markSessionError();
      setToast({ text: LEGAL_UI_STRINGS.errors.apiError, type: 'error' });
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      loadVehicles();
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
      if (r.source === 'default') markSessionError(); // live fetch failed and nothing cached
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

  const priceStatus: PriceStatus =
    pricesLoading ? 'loading'
    : !livePrices ? 'fallback'
    : octane === '98' && vehicle?.fueltype !== 'Diesel' ? 'estimate'
    : vehicle && priceInfo?.computed?.[priceField(vehicle)] === false ? 'estimate' // server sent its fixed fallback
    : 'live';
  const priceDate = vehicle && priceField(vehicle) === 'Gasoline' ? priceInfo?.effectiveFrom : undefined; // the feed's date is the gasoline row's

  // ---------- route ----------
  const [originStatus, setOriginStatus] = useState<OriginStatus>('locating');
  const [here, setHere] = useState<LatLng | null>(null); // GPS
  const [originPlace, setOriginPlace] = useState<Place | null>(null); // null = GPS
  const [destPlace, setDestPlace] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routePick, setRoutePick] = useState<number | null>(null); // null = the cheapest route
  const [inputMode, setInputMode] = useState<InputMode>('route');
  const [manualText, setManualText] = useState('');
  const [roundTrip, setRoundTrip] = useState(false);
  const [recents, setRecents] = useState<Place[]>([]);
  const [favorites, setFavorites] = useState<Favorites>({});
  const routeRequest = useRef(0);
  const routeCache = useRef(new Map<string, RouteResult>()); // per app session, so swapping back costs nothing

  // why the last locate() failed: 'blocked' = the OS won't ask again, only Settings can fix it
  const locError = useRef<'denied' | 'blocked' | 'no_fix' | null>(null);

  const locate = async (): Promise<LatLng | null> => {
    setOriginStatus('locating');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        locError.current = perm.canAskAgain ? 'denied' : 'blocked';
        setOriginStatus('denied');
        return null;
      }
      // a recent fix answers at once; a fresh one can hang indoors, so it gets 12s
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 120_000 })) ??
        (await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 12_000)),
        ]));
      if (!pos) throw new Error('timeout');
      const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      locError.current = null;
      setHere(p);
      setOriginStatus('ok');
      return p;
    } catch {
      locError.current = 'no_fix'; // location services off, or no fix in time
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
    // no prompt on launch: the OS dialog shows on the first route search, when the reason is obvious
    Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (p.granted) locate();
        else setOriginStatus(p.canAskAgain ? 'ok' : 'denied');
      })
      .catch(() => setOriginStatus('ok'));
  }, []);

  const changeRoundTrip = (on: boolean) => {
    setRoundTrip(on);
    AsyncStorage.setItem(ROUND_TRIP_KEY, on ? '1' : '0').catch(() => {});
  };

  /** `from` null = GPS. Only placeIds or coords reach the route API. */
  const searchRoute = async (from: Place | null, to: Place) => {
    Keyboard.dismiss();
    setInputMode('route');
    setManualText('');
    const id = ++routeRequest.current;
    setRouteError(null);
    setRoutePick(null);
    try {
      if (!routeProviderConfigured) throw new Error('not_configured');
      if (!from && !here) setRouteStatus('loading'); // locating can take seconds
      const a = from ? placeEndpoint(from) : here ?? (await locate()); // retries after a denial or a failed fix
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
      markSessionError();
      const msg = (e as Error).message;
      setRoute(null);
      setRouteStatus('error');
      setRouteError(
        msg === 'not_configured' ? 'חישוב מסלול עדיין לא מחובר. אפשר להקליד מרחק ידנית'
        : msg === 'no_origin'
          ? locError.current === 'blocked' ? 'אין גישה למיקום. הקישו לפתיחת ההגדרות, או בחרו נקודת מוצא'
          : locError.current === 'no_fix' ? 'לא הצלחנו לאתר את המיקום. הקישו לנסות שוב, או בחרו נקודת מוצא'
          : 'אין גישה למיקום. אפשר לבחור נקודת מוצא או להקליד מרחק ידנית'
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

  const retryRoute = async () => {
    // a blocked permission can only be fixed in Settings; once granted there, the next tap searches
    if (!originPlace && locError.current === 'blocked') {
      const p = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!p?.granted) return void Linking.openSettings();
    }
    if (destPlace) searchRoute(originPlace, destPlace);
  };

  const destination = destPlace ? (isGpsPlace(destPlace) ? `${destPlace.lat},${destPlace.lng}` : placeLabel(destPlace)) : '';

  // ---------- trip factors ----------
  const [prefs, setPrefs] = useState<TripPrefs>(DEFAULT_PREFS);

  // every route option is priced by the same checks + formula as the trip itself
  const routeOptions = route ? toOptions(route) : [];
  const routeTrips = routeCosts(routeOptions.map((o) => o.distanceKm), { vehicle, roundTrip, fuelPrice }, prefs);
  const cheapestRouteIndex = cheapestIndex(routeTrips);
  const selectedRouteIndex = routePick ?? Math.max(cheapestRouteIndex, 0);

  const manual = inputMode === 'manual';
  const { manualError, km, price, missing } = tripInputs({
    vehicle,
    manual,
    manualText,
    routeKm: routeOptions[selectedRouteIndex]?.distanceKm ?? null,
    routeLoading: routeStatus === 'loading',
    roundTrip,
    fuelPrice,
  });

  // ---------- calculate ----------
  const disabledReason = missing?.hint ?? null;

  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);

  const openResult = () => {
    setShowInterstitialAd(false);
    presentResult();
  };

  const buildResult = (): ResultData | null => {
    if (disabledReason || !vehicle) return null;
    const result = computeTrip(vehicle, km, price, prefs);
    const ecoCost = computeTrip(vehicle, km, price, { ...prefs, mode: 'eco' }).totalCost;
    const routed = !manual && !!destPlace;
    return {
      result, ecoCost, mode: prefs.mode, unitPrice: price, vehicle, roundTrip,
      destination: routed ? destination : '',
      from: routed ? (originPlace?.main ?? MY_LOCATION) : '',
      to: routed ? destPlace.main : '',
    };
  };

  /** Recompute the shown result from the current inputs, without the ad flow (for edits made on the result screen). */
  const refreshResult = () => {
    const data = buildResult();
    if (data) setResultData(data);
  };

  const calculate = async () => {
    const data = buildResult();
    if (!data) return;
    Keyboard.dismiss();
    setResultData(data);

    if (Platform.OS === 'web') return openResult();
    try {
      // frequency caps live in lib/ads/policy (never the first result, >=3 calcs and >=3 min apart, <=2 per session)
      const s = (adState ??= await loadAdState());
      const now = Date.now();
      const show = shouldShowInterstitial(s, now);
      adState = show ? afterShown(s, now) : afterCalculation(s);
      saveAdState(adState);
      if (show) setShowInterstitialAd(true);
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
        // empty in manual-distance mode; undefined is dropped from the stored JSON
        from: resultData.from || undefined,
        to: resultData.to || undefined,
      };
      const status = await saveTrip(tripRecord);
      dismissResult();
      setToast({ text: status === 'duplicate' ? 'כבר נשמר' : LEGAL_UI_STRINGS.toasts.dataSaved, type: 'success' });
      if (status === 'saved') onTripSaved();
    } catch (error) {
      savedFor.current = null; // nothing was written, so a retry must be allowed
      console.error('Failed to save calculation:', error);
      markSessionError();
      setToast({ text: LEGAL_UI_STRINGS.errors.apiError, type: 'error' });
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return {
    toast,
    // vehicles
    vehicles, vehicle, selectVehicle,
    // price
    livePrices, pricesLoading, priceStatus, priceDate, octane, setOctane, fuelPrice, setFuelPrice,
    // route
    here, originStatus, originPlace, destPlace, route, routeStatus, routeError, inputMode, setInputMode,
    manual, manualText, setManualText, manualError, roundTrip, changeRoundTrip, recents, favorites,
    pickDestination, pickOrigin, swap, retryRoute, saveFavorite, km,
    routeOptions, routeTrips, cheapestRouteIndex, selectedRouteIndex, selectRoute: setRoutePick,
    // trip factors
    prefs, setPrefs,
    // calculate
    missing, disabledReason, calculate, resultData, refreshResult, saveToHistory, showInterstitialAd, openResult,
  };
}
