// calculator.tsx - single-screen trip cost calculator
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { CalculateButton } from '../../components/calculator/CalculateButton';
import { DriveModeCard } from '../../components/calculator/DriveModeCard';
import { HeroHeader } from '../../components/calculator/HeroHeader';
import { ResultSheet } from '../../components/calculator/ResultSheet';
import { PlaceSheet } from '../../components/calculator/PlaceSheet';
import { RouteCard } from '../../components/calculator/RouteCard';
import { FuelPriceFields, VehiclePriceCard } from '../../components/calculator/VehiclePriceCard';
import { VehicleSheet } from '../../components/calculator/VehicleSheet';
import { colors, Heebo, radius, space } from '../../constants/theme';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import { useFuelCalculator } from '../../hooks/useFuelCalculator';
import { PRICE_HINT } from '../../lib/tripCost';
import { NO_TOUCH } from '../../constants/rtl';

// Conditional imports for ads - only load on native platforms
const BannerAd = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;
const InterstitialAd = Platform.OS === 'web' ? () => null : require('../../components/InterstitialAd').default;

export default function CalculatorScreen() {
  const router = useRouter();
  const openInfo = useOpenInfoMenu();
  const resultSheet = useRef<BottomSheetModal>(null);
  const vehicleSheet = useRef<BottomSheetModal>(null);
  const destinationSheet = useRef<BottomSheetModal>(null);
  const originSheet = useRef<BottomSheetModal>(null);
  const scrollRef = useRef<ScrollView>(null);

  const {
    toast, vehicles, vehicle, selectVehicle,
    priceStatus, priceDate, octane, setOctane, fuelPrice, setFuelPrice,
    here, originStatus, originPlace, destPlace, route, routeStatus, routeError, inputMode, setInputMode,
    manualText, setManualText, manualError, roundTrip, changeRoundTrip, recents, favorites,
    pickDestination, pickOrigin, swap, retryRoute, saveFavorite, km,
    prefs, setPrefs, missing, disabledReason, calculate, resultData, saveToHistory, showInterstitialAd, openResult,
  } = useFuelCalculator({ presentResult: () => resultSheet.current?.present(), dismissResult: () => resultSheet.current?.dismiss() });

  // tapping the disabled CTA scrolls to the missing card and pulses its border
  const [cardsY, setCardsY] = useState(0);
  const [routeHl, setRouteHl] = useState(0);
  const [priceHl, setPriceHl] = useState(0);
  const pointAtMissing = () => {
    if (!missing) return;
    // the vehicle shares the route card; the price sits in the advanced options below it
    const price = missing.hint === PRICE_HINT;
    scrollRef.current?.scrollTo({ y: price ? Math.max(cardsY - 80, 0) : 0, animated: true });
    if (price) setPriceHl((k) => k + 1);
    else setRouteHl((k) => k + 1);
  };

  // the last card must scroll fully above the sticky CTA
  const [ctaHeight, setCtaHeight] = useState(110);
  const onCtaLayout = (e: LayoutChangeEvent) => setCtaHeight(e.nativeEvent.layout.height);

  return (
    <View style={styles.screen}>
      {/* SDK 54 Android is edge-to-edge: the window no longer shrinks for the keyboard, so the scroll area does.
          The sticky CTA stays outside it and goes under the keyboard instead of covering the field. */}
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: ctaHeight + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <HeroHeader onInfo={openInfo} />
        <RouteCard
          mode={inputMode}
          originStatus={originStatus}
          originText={originPlace?.main ?? ''}
          onOpenOrigin={() => originSheet.current?.present()}
          destination={destPlace?.main ?? ''}
          onOpenDestination={() => destinationSheet.current?.present()}
          onSwap={destPlace ? swap : undefined}
          recent={recents.filter((r) => r.placeId).slice(0, 5)}
          onPickRecent={pickDestination}
          routeStatus={routeStatus}
          routeError={routeError}
          onRetry={retryRoute}
          route={route}
          manualText={manualText}
          onManualText={(t) => {
            setManualText(t);
            setInputMode(t ? 'manual' : 'route'); // a typed distance wins; clearing it falls back to the destination
          }}
          manualError={manualError}
          km={km}
          roundTrip={roundTrip}
          onRoundTrip={changeRoundTrip}
          highlightKey={routeHl}
          top={<VehiclePriceCard vehicle={vehicle} onSwap={() => vehicleSheet.current?.present()} onGoToVehicles={() => router.navigate('/vehicles')} />}
        />
        <View style={styles.cards} onLayout={(e) => setCardsY(e.nativeEvent.layout.y)}>
          <DriveModeCard prefs={prefs} onChange={setPrefs} summary={vehicle && fuelPrice ? `₪${fuelPrice}` : undefined} openKey={priceHl}>
            {vehicle && (
              <FuelPriceFields
                vehicle={vehicle}
                price={fuelPrice}
                onPriceChange={setFuelPrice}
                priceStatus={priceStatus}
                priceDate={priceDate}
                octane={octane}
                onOctane={setOctane}
              />
            )}
          </DriveModeCard>
          <View style={styles.banner}>
            <BannerAd />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

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
      <VehicleSheet sheetRef={vehicleSheet} vehicles={vehicles} selectedId={vehicle?.id} onSelect={selectVehicle} onManage={() => router.navigate('/vehicles')} onAdd={() => router.push('/addVehicle')} />
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
