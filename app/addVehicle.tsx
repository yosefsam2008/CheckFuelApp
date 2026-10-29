// app/addVehicle.tsx: plate lookup and manual entry behind one segmented control.
// Layout: the plate is the object on a dark stage (the screen's one dark card); everything the lookup returns lands
// in the white card under it. Before a search that card previews what will be filled, so the screen explains itself.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { CalendarDays, Car, ChevronDown, ChevronRight, Droplet, Fuel, Gauge, Info, ListPlus, Search, ShieldCheck, WifiOff, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReducedMotionConfig, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/calculator/PressableScale';
import { Segmented } from '../components/calculatorV2/Segmented';
import { LtrText } from '../components/history/LtrText';
import { Enter, Field, Message } from '../components/vehicles/AddFields';
import { ConsumptionField } from '../components/vehicles/ConsumptionField';
import { FuelFillButton } from '../components/vehicles/FuelFillButton';
import { LicensePlateInput } from '../components/vehicles/LicensePlateInput';
import { VehicleCardSkeleton } from '../components/vehicles/VehicleCardSkeleton';
import { VehicleFoundCard } from '../components/vehicles/VehicleFoundCard';
import { consumptionUnit, FUEL_LABEL } from '../components/vehicles/fuel';
import { colors } from '../constants/colors';
import { dur, haptic, revealDur } from '../constants/motion';
import { LTR } from '../constants/rtl';
import { Rubik } from '../constants/themeV2';
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
const FUEL_ICON = { Gasoline: Fuel, Diesel: Droplet, Electric: Zap };
// what a lookup fills in, shown as empty slots before the first search
const PREVIEW = [
  { Icon: Car, label: 'יצרן ודגם' },
  { Icon: CalendarDays, label: 'שנת ייצור וסוג דלק' },
  { Icon: Gauge, label: 'צריכה ממוצעת משוערת' },
];

type Tab = 'plate' | 'manual';
type Phase = 'idle' | 'searching' | 'found' | 'notfound' | 'offline' | 'duplicate';

// the stage shrinks when the search button leaves; the panel under it glides up instead of jumping mid-reveal
const reflow = LinearTransition.duration(260);

const readList = async (): Promise<Vehicle[]> => JSON.parse((await AsyncStorage.getItem('vehicles')) ?? '[]');

export default function AddVehicleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openInfo = useOpenInfoMenu();
  const reduced = useReducedMotion();
  // no history after a web refresh / deep link: back() would do nothing, so land on the vehicles tab
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/vehicles'));

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
      goBack();
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
    Keyboard.dismiss(); // the keyboard closes during the scan, not on top of the reveal
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
  const extras = [model, mPlate, engine, year].filter((s) => s.trim()).length; // display only: the optional fields filled
  const suggestions = maker.trim() ? MAKERS.filter((m) => m.toLowerCase().startsWith(maker.trim().toLowerCase()) && m !== maker).slice(0, 4) : [];
  const saveManual = () =>
    save({
      id: Date.now().toString(),
      plate: mPlate.trim().toUpperCase(),
      name: maker.trim(),
      brand: maker.trim(),
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
  const canSearch = plateDigits(plate).length >= 7 && !searching;

  // presentation only: the reveal plays once per lookup result, not again after a tab switch
  const revealed = useRef<Vehicle | null>(null);
  const firstReveal = reveal === 'found' && revealed.current !== found;
  useEffect(() => {
    if (reveal === 'found') revealed.current = found;
  }, [reveal, found]);

  // padding on Android too: since SDK 54 it is edge-to-edge and the window no longer resizes for the keyboard
  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior="padding">
      {/* the reveal plays even under Reduce Motion (owner's decision, see useRevealReduced); restored when the screen closes */}
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* the vehicles tab's header, plus a back button */}
        <View style={styles.header}>
          <Pressable style={styles.iconBtn} onPress={goBack} accessibilityRole="button" accessibilityLabel="חזרה">
            <ChevronRight size={20} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          <View {...LTR.props} style={[styles.logo, LTR.style]} accessible accessibilityRole="image" accessibilityLabel="Checkfuel">
            <Image source={require('../assets/images/v2/mark-ink.png')} style={styles.mark} />
            <Text style={styles.heck}>
              heck<Text style={styles.fuelWord}>fuel</Text>
            </Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={openInfo} accessibilityRole="button" accessibilityLabel="מידע">
            <Info size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.h1} accessibilityRole="header">
            הוספת רכב
          </Text>
          <Text style={styles.lead}>מספר רישוי ממלא הכל לבד. אין? מוסיפים ידנית.</Text>
        </View>

        <Segmented
          height={48}
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
          <Animated.View key="plate" entering={fade} style={styles.stack}>
            <Animated.View style={styles.stage} layout={reflow}>
              <View style={styles.stageHead}>
                <Text style={styles.stageTitle}>מה מספר הרישוי?</Text>
                <Text style={styles.stageHint}>7 או 8 ספרות</Text>
              </View>
              <LicensePlateInput value={plate} onChangeText={onPlate} editable={!searching} scanning={reveal === 'searching'} shake={reveal === 'notFound'} />

              {phase !== 'found' && (
                <Animated.View exiting={FadeOut.duration(150)}>
                <PressableScale
                  onPress={canSearch ? search : undefined}
                  style={[styles.searchBtn, !canSearch && !searching && styles.searchOff]}
                  accessibilityRole="button"
                  accessibilityLabel="חפש רכב"
                  accessibilityState={{ disabled: !canSearch, busy: searching }}
                >
                  {searching ? <ActivityIndicator size="small" color={colors.text} /> : <Search size={18} color={canSearch ? colors.text : colors.textMutedInverse} strokeWidth={2.4} />}
                  <Text style={[styles.searchText, !canSearch && !searching && styles.searchTextOff]}>{searching ? 'מחפש…' : 'חפש רכב'}</Text>
                </PressableScale>
                </Animated.View>
              )}

              <Animated.View style={styles.source} layout={reflow}>
                <ShieldCheck size={14} color={colors.textMutedInverse} strokeWidth={2} />
                <Text style={styles.sourceText}>נתונים רשמיים ממאגר משרד התחבורה</Text>
              </Animated.View>
            </Animated.View>

            <Animated.View style={styles.panel} layout={reflow}>
              {reveal === 'searching' ? (
                <VehicleCardSkeleton />
              ) : phase === 'found' && found ? (
                <View>
                  <VehicleFoundCard vehicle={found} title={titleCase(`${found.name} ${found.model}`.trim())} first={firstReveal} />
                  <Enter delay={300} play={firstReveal}>
                    <View style={styles.divider} />
                    <Text style={styles.editTitle}>אפשר לשנות לפני השמירה</Text>
                    <Field label="שם הרכב" value={name} onChange={setName} placeholder="למשל: הרכב של אמא" />
                  </Enter>
                  <Enter delay={370} play={firstReveal}>
                    <ConsumptionField value={cons} onChange={setCons} fuel={found.fueltype} first={firstReveal} delay={revealDur.consumptionDelay} />
                    <Text style={styles.hint}>הערכה לפי משקל ומנוע. אם אתם יודעים את הצריכה האמיתית, עדיף לתקן.</Text>
                  </Enter>
                  <View style={styles.cta}>
                    <FuelFillButton label="שמור רכב" onPress={saveFound} disabled={!isValidConsumption(foundCons)} first={firstReveal} />
                  </View>
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
              ) : (
                <View>
                  <Text style={styles.panelTitle}>מה נמלא בשבילך</Text>
                  {PREVIEW.map(({ Icon, label }, i) => (
                    <View key={label} style={[styles.slot, i > 0 && styles.slotDivider]}>
                      <View style={styles.slotTile}>
                        <Icon size={18} color={colors.textMuted} strokeWidth={2} />
                      </View>
                      <Text style={styles.slotLabel}>{label}</Text>
                      <View style={styles.slotGhost} />
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          </Animated.View>
        ) : (
          <Animated.View key="manual" entering={fade} style={styles.stack}>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>פרטי הרכב</Text>
              <Text style={styles.panelSub}>שלושה שדות חובה, וזהו.</Text>

              <Field label="יצרן" value={maker} onChange={setMaker} placeholder="למשל Toyota" ltr />
              {suggestions.length > 0 && (
                <View style={styles.suggests}>
                  {suggestions.map((m) => (
                    <PressableScale key={m} onPress={() => setMaker(m)} style={styles.suggest} accessibilityRole="button" accessibilityLabel={`בחר ${m}`}>
                      <LtrText style={styles.suggestText}>{m}</LtrText>
                    </PressableScale>
                  ))}
                </View>
              )}

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>סוג דלק</Text>
              <View style={styles.fuels} accessibilityRole="radiogroup">
                {FUELS.map((f) => {
                  const on = fuel === f;
                  const Icon = FUEL_ICON[f];
                  return (
                    <PressableScale key={f} onPress={() => { haptic.select(); setFuel(f); }} style={[styles.fuelBtn, on && styles.fuelOn]} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={FUEL_LABEL[f]}>
                      <Icon size={18} color={on ? colors.accent : colors.textMuted} strokeWidth={2.2} />
                      <Text style={[styles.fuelText, on && styles.fuelTextOn]}>{FUEL_LABEL[f]}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              <Field label="צריכה ממוצעת" value={mCons} onChange={setMCons} suffix={consumptionUnit(mFuel)} keyboardType="decimal-pad" ltr />
              <Text style={styles.hint}>{mFuel === 'Electric' ? 'ברוב הרכבים החשמליים: 14–20 קוט״ש ל־100 ק״מ.' : 'ברוב הרכבים: 10–20 ק״מ לליטר. אפשר לראות במחשב הדרך של הרכב.'}</Text>

              <Pressable
                onPress={() => setMore(!more)}
                style={({ pressed }) => [styles.moreHead, pressed && styles.morePressed]}
                accessibilityRole="button"
                accessibilityState={{ expanded: more }}
                accessibilityLabel={`פרטים נוספים, לא חובה${extras ? `, ${extras} מולאו` : ''}`}
              >
                <View style={styles.moreTile}>
                  <ListPlus size={18} color={colors.text} strokeWidth={2} />
                </View>
                <View style={styles.moreText}>
                  <View style={styles.moreTitleRow}>
                    <Text style={styles.moreTitle}>פרטים נוספים</Text>
                    {extras > 0 ? (
                      <View style={styles.moreBadge}>
                        <Text style={styles.moreBadgeText}>{`⁦${extras}/4⁩`}</Text>
                      </View>
                    ) : (
                      <Text style={styles.moreOptional}>לא חובה</Text>
                    )}
                  </View>
                  <Text style={styles.moreSub} numberOfLines={1}>
                    דגם, מספר רישוי, מנוע ושנה
                  </Text>
                </View>
                <View style={[styles.moreChevron, more && styles.moreChevronOpen]}>
                  <ChevronDown size={16} color={colors.text} strokeWidth={2.4} />
                </View>
              </Pressable>
              {more && (
                <Animated.View entering={fade} style={styles.moreBody}>
                  <Field label="דגם" value={model} onChange={setModel} placeholder="למשל Corolla" ltr />
                  <Field label="מספר רישוי" value={mPlate} onChange={setMPlate} placeholder="12-345-67" keyboardType="number-pad" ltr />
                  <View style={styles.pair}>
                    <View style={styles.half}><Field label="מנוע" value={engine} onChange={setEngine} placeholder="למשל 1.6" ltr /></View>
                    <View style={styles.half}><Field label="שנת ייצור" value={year} onChange={setYear} placeholder={String(new Date().getFullYear())} keyboardType="number-pad" maxLength={4} ltr /></View>
                  </View>
                  <Text style={styles.hint}>בלי שנה נשמור את השנה הנוכחית.</Text>
                </Animated.View>
              )}

              <View style={styles.cta}>
                <FuelFillButton label="שמור רכב" onPress={saveManual} disabled={!manualOk} />
              </View>
            </View>
          </Animated.View>
        )}

        {!!error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 14 },
  // same header as the vehicles tab and the calculator
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 4, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  logo: { flexDirection: 'row', alignItems: 'flex-end' },
  mark: { width: 26, height: 26, marginRight: -1, marginBottom: 1 },
  heck: { fontFamily: Rubik.medium, fontSize: 24, letterSpacing: -0.5, lineHeight: 26, color: colors.text },
  fuelWord: { fontFamily: Rubik.bold, color: colors.accentTextLarge },
  intro: { marginHorizontal: 4, gap: 4 },
  h1: { fontFamily: Rubik.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.28, color: colors.text },
  lead: { fontFamily: Rubik.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  stack: { gap: 14 },

  // the dark stage: plate, search, source
  stage: { backgroundColor: colors.surfaceInverse, borderRadius: 24, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 },
  stageHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: 4 },
  stageTitle: { fontFamily: Rubik.bold, fontSize: 18, color: colors.textInverse },
  stageHint: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMutedInverse },
  searchBtn: { height: 56, marginTop: 14, borderRadius: 18, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchOff: { backgroundColor: colors.surfaceInverseRaised },
  searchText: { fontFamily: Rubik.bold, fontSize: 16, color: colors.text },
  searchTextOff: { color: colors.textMutedInverse },
  source: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  sourceText: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMutedInverse },

  // the white panel: preview, result, messages, manual form
  panel: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 18 },
  panelTitle: { fontFamily: Rubik.bold, fontSize: 17, color: colors.text },
  panelSub: { fontFamily: Rubik.regular, fontSize: 14, color: colors.textMuted, marginTop: 4 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  slotDivider: { borderTopWidth: 1, borderTopColor: colors.lineSubtle },
  slotTile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  slotLabel: { flex: 1, fontFamily: Rubik.medium, fontSize: 15, color: colors.text },
  slotGhost: { width: 44, height: 8, borderRadius: 4, backgroundColor: colors.lineSubtle },
  divider: { height: 1, backgroundColor: colors.lineSubtle, marginTop: 16 },
  editTitle: { fontFamily: Rubik.medium, fontSize: 13, color: colors.textMuted, marginTop: 14 },
  hint: { fontFamily: Rubik.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 10 },
  cta: { marginTop: 20 },

  suggests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggest: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  suggestText: { fontFamily: Rubik.semi, fontSize: 14, color: colors.text },
  fieldLabel: { fontFamily: Rubik.semi, fontSize: 14, color: colors.textMuted, marginBottom: 6 },
  fuels: { flexDirection: 'row', gap: 8 },
  fuelBtn: { flex: 1, height: 68, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 4 },
  fuelOn: { backgroundColor: colors.surfaceInverse },
  fuelText: { fontFamily: Rubik.bold, fontSize: 15, color: colors.textMuted },
  fuelTextOn: { color: colors.textInverse },
  moreHead: { minHeight: 64, marginTop: 20, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  morePressed: { opacity: 0.7 },
  moreTile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  moreText: { flex: 1, minWidth: 0, gap: 2 },
  moreTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreTitle: { fontFamily: Rubik.bold, fontSize: 15, color: colors.text },
  moreOptional: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMuted },
  moreBadge: { backgroundColor: colors.accentTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  moreBadgeText: { fontFamily: Rubik.semi, fontSize: 11, color: colors.accentText },
  moreSub: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted },
  moreChevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  moreChevronOpen: { transform: [{ rotate: '180deg' }] },
  moreBody: { paddingHorizontal: 2 },
  pair: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  error: { fontFamily: Rubik.bold, fontSize: 14, color: colors.danger, textAlign: 'center' },
});
