// app/addVehicle.tsx: plate lookup and manual entry behind one segmented control
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ChevronDown, Info, Search, WifiOff } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { HeroHeader } from '../components/calculator/HeroHeader';
import { PressableScale } from '../components/calculator/PressableScale';
import { SlidingSegment } from '../components/calculator/SlidingSegment';
import { LtrText } from '../components/history/LtrText';
import { Enter, Field, Message } from '../components/vehicles/AddFields';
import { ConsumptionField } from '../components/vehicles/ConsumptionField';
import { FuelFillButton } from '../components/vehicles/FuelFillButton';
import { LicensePlateInput } from '../components/vehicles/LicensePlateInput';
import { VehicleCardSkeleton } from '../components/vehicles/VehicleCardSkeleton';
import { VehicleFoundCard } from '../components/vehicles/VehicleFoundCard';
import { consumptionUnit, FUEL_LABEL, GradientButton } from '../components/vehicles/fuel';
import { dur, haptic, revealDur } from '../constants/motion';
import { colors, Heebo, radius, shadow, space } from '../constants/theme';
import { useOpenInfoMenu } from '../hooks/use-info-menu';
import { LEGAL_UI_STRINGS } from '../legal/LEGAL_UI_STRINGS_HE';
import type { Vehicle } from '../lib/data/vehiclesData';
import { isValidConsumption, parseDecimal, toDisplay, toStored } from '../lib/vehicles/consumption';
import { lookupPlate, plateDigits } from '../lib/vehicles/plateLookup';
import { derivePhase, formatPlate, titleCase } from '../lib/vehicles/reveal';

const ADDED_FLAG = 'vehicleJustAdded'; // read by the vehicles screen on focus
const MAKERS = [
  'Toyota', 'Kia', 'Hyundai', 'Mazda', 'Honda', 'Nissan', 'Mitsubishi', 'Subaru', 'Ford', 'Chevrolet', 'Volkswagen',
  'Peugeot', 'Renault', 'Fiat', 'Skoda', 'Suzuki', 'Seat', 'BMW', 'Mercedes-Benz', 'Audi', 'Opel',
];
const FUELS = ['Gasoline', 'Diesel', 'Electric'] as const;

type Tab = 'plate' | 'manual';
type Phase = 'idle' | 'searching' | 'found' | 'notfound' | 'offline' | 'duplicate';

const readList = async (): Promise<Vehicle[]> => JSON.parse((await AsyncStorage.getItem('vehicles')) ?? '[]');

export default function AddVehicleScreen() {
  const router = useRouter();
  const openInfo = useOpenInfoMenu();
  const reduced = useReducedMotion();

  const [tab, setTab] = useState<Tab>('plate');
  const [error, setError] = useState<string | null>(null);

  // plate tab
  const [plate, setPlate] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [found, setFound] = useState<Vehicle | null>(null);
  const [name, setName] = useState('');
  const [cons, setCons] = useState('');

  // manual tab
  const [maker, setMaker] = useState('');
  const [fuel, setFuel] = useState<(typeof FUELS)[number] | null>(null);
  const [mCons, setMCons] = useState('');
  const [model, setModel] = useState('');
  const [mPlate, setMPlate] = useState('');
  const [engine, setEngine] = useState('');
  const [year, setYear] = useState('');
  const [more, setMore] = useState(false);

  const save = async (v: Vehicle) => {
    try {
      const list = await readList();
      await AsyncStorage.multiSet([['vehicles', JSON.stringify([...list, v])], ['lastVehicleId', v.id], [ADDED_FLAG, '1']]);
      haptic.success();
      router.back();
    } catch (e) {
      console.error('Failed to save vehicle:', e);
      setError(LEGAL_UI_STRINGS.errors.apiError);
    }
  };

  const onPlate = (text: string) => {
    setPlate(formatPlate(text));
    setPhase('idle');
    setFound(null);
    setError(null);
  };

  const search = async () => {
    setPhase('searching');
    try {
      const d = plateDigits(plate);
      if ((await readList()).some((v) => plateDigits(v.plate) === d)) return setPhase('duplicate');
    } catch (e) {
      console.error('Error checking duplicates:', e);
    }
    const r = await lookupPlate(plate);
    if (r.status === 'found') {
      const { model, year } = r.vehicle;
      setFound(r.vehicle);
      setName(model && model !== 'לא ידוע' ? `${titleCase(model)} ${year}` : '');
      haptic.success();
      setCons(r.vehicle.avgConsumption ? String(toDisplay(r.vehicle.avgConsumption, r.vehicle.fueltype)) : '');
    }
    setPhase(r.status);
  };

  const toManual = () => {
    setMPlate(plate);
    setMore(true);
    setTab('manual');
  };

  const foundCons = parseDecimal(cons);
  const saveFound = () => found && save({ ...found, name: name.trim() || found.name, avgConsumption: toStored(foundCons!, found.fueltype) });

  const mFuel = fuel ?? 'Gasoline';
  const mValue = parseDecimal(mCons);
  const manualOk = !!maker.trim() && !!fuel && isValidConsumption(mValue);
  const suggestions = maker.trim() ? MAKERS.filter((m) => m.toLowerCase().startsWith(maker.trim().toLowerCase()) && m !== maker).slice(0, 4) : [];
  const saveManual = () =>
    save({
      id: Date.now().toString(),
      plate: mPlate.trim().toUpperCase(),
      name: maker.trim(),
      model: model.trim(),
      engine: engine.trim(),
      type: 'car',
      avgConsumption: toStored(mValue!, mFuel),
      fueltype: mFuel,
      year: year ? parseInt(year, 10) : new Date().getFullYear(),
    });

  const fade = reduced ? undefined : FadeIn.duration(dur.std);
  const searching = phase === 'searching';
  const reveal = derivePhase({ plate, status: phase, hasResult: !!found });

  // presentation only: the reveal plays once per lookup result, not again after a tab switch
  const revealed = useRef<Vehicle | null>(null);
  const firstReveal = reveal === 'found' && revealed.current !== found;
  useEffect(() => {
    if (reveal === 'found') revealed.current = found;
  }, [reveal, found]);

  // padding on Android too: since SDK 54 it is edge-to-edge and the window no longer resizes for the keyboard
  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <HeroHeader onInfo={openInfo} onBack={router.back} title="הוספת רכב" subtitle="מספר רישוי ממלא הכל לבד. אין? מוסיפים ידנית." />

        <View style={styles.card}>
          <SlidingSegment
            height={52}
            accessibilityLabel="דרך הוספה"
            value={tab}
            onChange={(t) => {
              setTab(t);
              setError(null);
            }}
            options={[
              { value: 'plate', label: 'לפי מספר רישוי' },
              { value: 'manual', label: 'ידנית' },
            ]}
          />

          {tab === 'plate' ? (
            <Animated.View key="plate" entering={fade}>
              <Text style={styles.title}>מה מספר הרישוי?</Text>
              <Text style={styles.sub}>נביא את הדגם, סוג הדלק והצריכה ממאגר משרד התחבורה.</Text>
              <LicensePlateInput value={plate} onChangeText={onPlate} editable={!searching} scanning={reveal === 'searching'} shake={reveal === 'notFound'} />

              {reveal === 'searching' ? (
                <VehicleCardSkeleton />
              ) : phase === 'found' && found ? (
                <View>
                  <VehicleFoundCard vehicle={found} title={titleCase(`${found.name} ${found.model}`.trim())} first={firstReveal} />
                  <Enter delay={300} play={firstReveal}>
                    <Text style={styles.editTitle}>אפשר לשנות לפני השמירה</Text>
                    <Field label="שם הרכב" value={name} onChange={setName} placeholder="למשל: הרכב של אמא" />
                  </Enter>
                  <Enter delay={370} play={firstReveal}>
                    <ConsumptionField value={cons} onChange={setCons} fuel={found.fueltype} first={firstReveal} delay={revealDur.consumptionDelay} />
                    <Text style={styles.hint}>הערכה לפי משקל ומנוע. אם אתם יודעים את הצריכה האמיתית, עדיף לתקן.</Text>
                  </Enter>
                </View>
              ) : phase === 'notfound' ? (
                <Message
                  icon={<Search size={22} color={colors.textMuted} strokeWidth={2} />}
                  title="לא מצאנו רכב עם המספר הזה"
                  body="כדאי לבדוק את המספר. רכבים חדשים מאוד, אופנועים ורכבים מיובאים לא תמיד מופיעים במאגר."
                  link="הוספה ידנית עם המספר הזה"
                  onLink={toManual}
                />
              ) : phase === 'offline' ? (
                <Message icon={<WifiOff size={22} color={colors.textMuted} strokeWidth={2} />} title="אין חיבור לאינטרנט" body="החיפוש צריך רשת. אפשר לנסות שוב, או להוסיף ידנית." link="נסה שוב" onLink={search} />
              ) : phase === 'duplicate' ? (
                <Message icon={<Info size={22} color={colors.textMuted} strokeWidth={2} />} title="הרכב הזה כבר שמור אצלך" />
              ) : null}

              <View style={styles.cta}>
                {phase === 'found' ? (
                  <FuelFillButton label="שמור רכב" onPress={saveFound} disabled={!isValidConsumption(foundCons)} first={firstReveal} />
                ) : (
                  <GradientButton label={searching ? 'מחפש…' : 'חפש'} onPress={search} loading={searching} disabled={plateDigits(plate).length < 7} />
                )}
              </View>
            </Animated.View>
          ) : (
            <Animated.View key="manual" entering={fade}>
              <Text style={styles.title}>פרטי הרכב</Text>
              <Text style={styles.sub}>שלושה שדות חובה, וזהו.</Text>

              <Field label="יצרן" value={maker} onChange={setMaker} ltr />
              {suggestions.map((m) => (
                <Pressable key={m} onPress={() => setMaker(m)} style={styles.suggest} accessibilityRole="button">
                  <LtrText style={styles.suggestText}>{m}</LtrText>
                </Pressable>
              ))}

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>סוג דלק</Text>
              <View style={styles.fuels}>
                {FUELS.map((f) => (
                  <PressableScale key={f} onPress={() => { haptic.select(); setFuel(f); }} style={[styles.fuelBtn, fuel === f && styles.fuelOn]} accessibilityRole="button" accessibilityState={{ selected: fuel === f }}>
                    <Text style={[styles.fuelText, fuel === f && { color: colors.selectedText }]}>{FUEL_LABEL[f]}</Text>
                  </PressableScale>
                ))}
              </View>

              <Field label="צריכה ממוצעת" value={mCons} onChange={setMCons} suffix={consumptionUnit(mFuel)} keyboardType="decimal-pad" ltr />

              <Pressable onPress={() => setMore(!more)} style={styles.moreHead} accessibilityRole="button" accessibilityState={{ expanded: more }}>
                <Text style={styles.moreTitle}>
                  פרטים נוספים <Text style={styles.moreSub}>· לא חובה</Text>
                </Text>
                <ChevronDown size={18} color={colors.textMuted} style={more ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </Pressable>
              {more && (
                <Animated.View entering={fade}>
                  <Field label="דגם" value={model} onChange={setModel} ltr />
                  <Field label="מספר רישוי" value={mPlate} onChange={setMPlate} keyboardType="number-pad" ltr />
                  <View style={styles.pair}>
                    <View style={styles.half}><Field label="מנוע" value={engine} onChange={setEngine} ltr /></View>
                    <View style={styles.half}><Field label="שנת ייצור" value={year} onChange={setYear} keyboardType="number-pad" maxLength={4} ltr /></View>
                  </View>
                </Animated.View>
              )}

              <View style={styles.cta}>
                <GradientButton label="שמור רכב" onPress={saveManual} disabled={!manualOk} />
              </View>
            </Animated.View>
          )}

          {!!error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 48 },
  card: { zIndex: 2, backgroundColor: colors.surface, borderRadius: radius.card, marginTop: -44, marginHorizontal: space.gutter + 4, paddingVertical: 16, paddingHorizontal: 20, ...shadow.card },
  title: { fontFamily: Heebo.extra, fontSize: 20, color: colors.text, marginTop: 20 },
  sub: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted, marginTop: 4 },
  cta: { marginTop: 20 },
  editTitle: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, marginTop: 20 },
  hint: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, marginTop: 12 },
  suggest: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  suggestText: { fontFamily: Heebo.semi, fontSize: 15, color: colors.text },
  fieldLabel: { fontFamily: Heebo.semi, fontSize: 14, color: colors.textMuted, marginBottom: 6 },
  fuels: { flexDirection: 'row', gap: 8 },
  fuelBtn: { flex: 1, height: 48, borderRadius: radius.tile, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  fuelOn: { backgroundColor: colors.selectedFill, borderColor: colors.selectedBorder },
  fuelText: { fontFamily: Heebo.bold, fontSize: 15, color: colors.textMuted },
  moreHead: { minHeight: 52, marginTop: 18, borderTopWidth: 1, borderTopColor: colors.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreTitle: { fontFamily: Heebo.bold, fontSize: 15, color: colors.text },
  moreSub: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted },
  pair: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  error: { fontFamily: Heebo.bold, fontSize: 14, color: colors.error, marginTop: 12, textAlign: 'center' },
});
