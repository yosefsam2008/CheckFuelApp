// Origin/destination search sheet: favorites, recents (local, no API) and Google suggestions.
// Only a picked place can be confirmed; free text never reaches the route API.
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Briefcase from 'lucide-react-native/dist/esm/icons/briefcase';
import Clock from 'lucide-react-native/dist/esm/icons/clock';
import House from 'lucide-react-native/dist/esm/icons/house';
import LocateFixed from 'lucide-react-native/dist/esm/icons/locate-fixed';
import MapPin from 'lucide-react-native/dist/esm/icons/map-pin';
import WifiOff from 'lucide-react-native/dist/esm/icons/wifi-off';
import React, { RefObject, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { haptic } from '../../constants/motion';
import { NO_OUTLINE } from '../../constants/rtl';
import { colors, Heebo, radius } from '../../constants/theme';
import { markSessionError } from '../../lib/growth';
import { Favorites, FavKey, MY_LOCATION, Place, placeLabel } from '../../lib/places';
import type { LatLng } from '../../lib/route';
import { usePlaceSearch } from '../../lib/usePlaceSearch';
import { Shimmer } from './Shimmer';

interface Props {
  sheetRef: RefObject<BottomSheetModal | null>;
  title: string;
  placeholder: string;
  /** origin sheet: shows the "my location" chip, and an empty submit means GPS */
  allowMyLocation?: boolean;
  recents: Place[];
  favorites: Favorites;
  bias: LatLng | null;
  /** null = my location (GPS) */
  onPick: (p: Place | null) => void;
  onSaveFavorite: (key: FavKey, p: Place) => void;
}

// gorhom's keyboard-aware input calls a native-only API and crashes on react-native-web
const SheetInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

const FAV: Record<FavKey, { label: string; Icon: typeof House }> = { home: { label: 'בית', Icon: House }, work: { label: 'עבודה', Icon: Briefcase } };
// RLM: an RTL paragraph even when the text starts with Latin letters or a house number
const RLM = '‏';

function Highlight({ text, q }: { text: string; q: string }) {
  const n = q.trim().length;
  const i = n ? text.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
  return (
    <Text style={styles.rowMain} numberOfLines={1}>
      {RLM}
      {i < 0 ? text : (
        <>
          {text.slice(0, i)}
          <Text style={styles.hit}>{text.slice(i, i + n)}</Text>
          {text.slice(i + n)}
        </>
      )}
    </Text>
  );
}

function Row({ p, q, icon, onPress, onLongPress }: { p: Place; q: string; icon: React.ReactNode; onPress: () => void; onLongPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={placeLabel(p)}
      accessibilityHint="לחיצה ארוכה לשמירה כבית או כעבודה"
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Highlight text={p.main} q={q} />
        {!!p.secondary && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {RLM}
            {p.secondary}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.row}>
      <View style={styles.skelIcon} />
      <View style={{ gap: 6 }}>
        {[150, 90].map((w) => (
          <View key={w} style={{ width: w, height: w > 100 ? 14 : 11, borderRadius: 6, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <Shimmer width={w} period={1400} sweepMs={1400} band={w * 0.5} skew={0} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function PlaceSheet({ sheetRef, title, placeholder, allowMyLocation, recents, favorites, bias, onPick, onSaveFavorite }: Props) {
  const search = usePlaceSearch(recents, bias);
  const [settingFav, setSettingFav] = useState<FavKey | null>(null);
  const [menuFor, setMenuFor] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<React.ElementRef<typeof BottomSheetTextInput>>(null);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />,
    [],
  );

  const failMsg = (e: unknown) => (e instanceof TypeError ? 'אין חיבור לאינטרנט. נסו שוב' : 'לא הצלחנו לטעון את המקום. נסו שוב');

  const pick = async (p: Place) => {
    if (busy) return;
    haptic.press();
    setBusy(true);
    setError(null);
    try {
      const r = await search.select(p);
      if (settingFav) onSaveFavorite(settingFav, r);
      onPick(r);
      sheetRef.current?.dismiss();
    } catch (e) {
      markSessionError();
      setError(failMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const saveAs = async (k: FavKey) => {
    const p = menuFor;
    setMenuFor(null);
    if (!p) return;
    setBusy(true);
    try {
      onSaveFavorite(k, await search.select(p));
      haptic.success();
    } catch (e) {
      markSessionError();
      setError(failMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const myLocation = () => {
    haptic.select();
    onPick(null);
    sheetRef.current?.dismiss();
  };

  const onFavChip = (k: FavKey) => {
    const f = favorites[k];
    if (f) return pick(f);
    haptic.select();
    setSettingFav(k);
    inputRef.current?.focus();
  };

  const submit = () => {
    if (allowMyLocation && !search.query.trim()) return myLocation();
    setError('בחרו מקום מהרשימה');
  };

  const { status, local, remote, query } = search;
  const offline = status === 'offline';
  // offline: recents only, all of them if the typed filter matches none
  const localShown = offline && !local.length ? recents : local;
  const rowProps = (p: Place) => ({ p, q: query, onPress: () => pick(p), onLongPress: () => (haptic.press(), setMenuFor(p)) });

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['90%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      onChange={(i) => {
        if (i < 0) return;
        search.start();
        setSettingFav(null);
        setMenuFor(null);
        setError(null);
        // focus only once the sheet has settled; autoFocus opens the keyboard mid-animation and the sheet misses its height
        inputRef.current?.focus();
      }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          {settingFav ? `איפה ה${FAV[settingFav].label}?` : title}
        </Text>
        <View style={styles.field}>
          <SheetInput
            value={query}
            onChangeText={(t: string) => {
              search.setQuery(t);
              setError(null);
            }}
            placeholder={allowMyLocation && !settingFav ? `${placeholder} · ריק = ${MY_LOCATION}` : placeholder}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={submit}
            style={styles.input}
            ref={inputRef}
            accessibilityLabel={title}
          />
          {busy && <ActivityIndicator color={colors.brandGreen} />}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {!settingFav && (
          <View style={styles.chips}>
            {allowMyLocation && (
              <Pressable style={styles.chip} onPress={myLocation} accessibilityRole="button">
                <LocateFixed size={15} color={colors.selectedText} strokeWidth={2} />
                <Text style={styles.chipText}>{MY_LOCATION}</Text>
              </Pressable>
            )}
            {(Object.keys(FAV) as FavKey[]).map((k) => {
              const { label, Icon } = FAV[k];
              const set = !!favorites[k];
              return (
                <Pressable
                  key={k}
                  style={[styles.chip, !set && styles.chipUnset]}
                  onPress={() => onFavChip(k)}
                  accessibilityRole="button"
                  accessibilityLabel={set ? `${label}: ${placeLabel(favorites[k]!)}` : `הגדרת ${label}`}
                >
                  <Icon size={15} color={set ? colors.selectedText : colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.chipText, !set && { color: colors.textMuted }]}>{set ? label : `הוסף ${label}`}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {menuFor && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {RLM}
              {menuFor.main}
            </Text>
            <View style={styles.menuRow}>
              {(Object.keys(FAV) as FavKey[]).map((k) => (
                <Pressable key={k} style={styles.menuBtn} onPress={() => saveAs(k)} accessibilityRole="button">
                  <Text style={styles.menuBtnText}>שמור כ{FAV[k].label}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.menuBtn} onPress={() => setMenuFor(null)} accessibilityRole="button">
                <Text style={[styles.menuBtnText, { color: colors.textMuted }]}>ביטול</Text>
              </Pressable>
            </View>
          </View>
        )}

        {offline && (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <WifiOff size={15} color={colors.warnText} strokeWidth={2} />
            <Text style={styles.noticeText}>אין חיבור לאינטרנט · מוצגים מקומות אחרונים בלבד</Text>
          </View>
        )}

        <View>
          {localShown.map((p) => (
            <Row key={`l:${p.placeId ?? p.main}`} {...rowProps(p)} icon={<Clock size={18} color={colors.textMuted} strokeWidth={2} />} />
          ))}
          {remote.map((p) => (
            <Row key={`r:${p.placeId}`} {...rowProps(p)} icon={<MapPin size={18} color={colors.textMuted} strokeWidth={2} />} />
          ))}
          {status === 'loading' && [0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </View>

        {status === 'empty' && !localShown.length && (
          <Text style={styles.empty} accessibilityLiveRegion="polite">
            לא נמצאו תוצאות, נסו ניסוח אחר
          </Text>
        )}
        {status === 'error' && <Text style={styles.empty}>החיפוש לא זמין כרגע. אפשר לבחור מקום אחרון</Text>}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { backgroundColor: colors.divider, width: 40, height: 4 },
  body: { padding: 20, paddingBottom: 32, gap: 12 },
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: radius.tile, paddingHorizontal: 14, minHeight: 52 },
  input: { flex: 1, minWidth: 0, ...NO_OUTLINE, fontFamily: Heebo.bold, fontSize: 17, color: colors.text, paddingVertical: 12, textAlign: 'right', writingDirection: 'rtl' },
  error: { fontFamily: Heebo.medium, fontSize: 13, color: colors.error },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.guideFill },
  chipUnset: { backgroundColor: colors.surface, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.divider },
  chipText: { fontFamily: Heebo.bold, fontSize: 13, color: colors.selectedText },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.tile },
  rowMain: { fontFamily: Heebo.bold, fontSize: 16, color: colors.text, writingDirection: 'rtl' },
  hit: { color: colors.selectedText, fontFamily: Heebo.extra },
  rowSub: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted, writingDirection: 'rtl', marginTop: 1 },
  skelIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.bg },
  empty: { fontFamily: Heebo.medium, fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warnBg, borderRadius: radius.tile, paddingVertical: 8, paddingHorizontal: 12 },
  noticeText: { fontFamily: Heebo.medium, fontSize: 13, color: colors.warnText, flexShrink: 1 },
  menu: { backgroundColor: colors.bg, borderRadius: radius.tile, padding: 12, gap: 8 },
  menuTitle: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text, writingDirection: 'rtl' },
  menuRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  menuBtn: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface },
  menuBtnText: { fontFamily: Heebo.bold, fontSize: 13, color: colors.selectedText },
});
