// "נווט ליעד": lists the navigation apps and opens the chosen one. iOS uses the native action sheet, others a small sheet.
import React from 'react';
import { ActionSheetIOS, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, Heebo, radius, space } from '../../constants/theme';

export interface NavApp {
  label: string;
  url: string;
}

const q = encodeURIComponent;

async function installed(scheme: string) {
  try {
    return await Linking.canOpenURL(scheme);
  } catch {
    return false;
  }
}

export async function getNavApps(dest: string): Promise<NavApp[]> {
  const apps: NavApp[] = [{ label: 'Waze', url: `https://waze.com/ul?navigate=yes&q=${q(dest)}` }];
  if (Platform.OS === 'ios') {
    apps.push({ label: 'Apple Maps', url: `http://maps.apple.com/?daddr=${q(dest)}` }); // always offered on iOS
    if (await installed('comgooglemaps://')) apps.push({ label: 'Google Maps', url: `comgooglemaps://?daddr=${q(dest)}&directionsmode=driving` });
  } else {
    // shortcut: no canOpenURL probe on Android (needs manifest <queries>); the universal link opens the app when present
    apps.push({ label: 'Google Maps', url: `https://www.google.com/maps/dir/?api=1&destination=${q(dest)}` });
  }
  return apps;
}

/** Shows the chooser; `setApps` drives the fallback sheet on non-iOS platforms. */
export async function chooseNavApp(dest: string, setApps: (a: NavApp[] | null) => void) {
  const apps = await getNavApps(dest);
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [...apps.map((a) => a.label), 'ביטול'], cancelButtonIndex: apps.length, title: 'נווט ליעד' },
      (i) => i < apps.length && Linking.openURL(apps[i].url),
    );
  } else {
    setApps(apps);
  }
}

export function NavSheet({ apps, onClose }: { apps: NavApp[] | null; onClose: () => void }) {
  return (
    <Modal visible={!!apps} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="סגור" />
      <View style={styles.sheet}>
        <Text style={styles.title}>נווט ליעד</Text>
        {apps?.map((a) => (
          <Pressable
            key={a.label}
            style={styles.item}
            onPress={() => {
              onClose();
              Linking.openURL(a.url);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.itemText}>{a.label}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.item} onPress={onClose} accessibilityRole="button">
          <Text style={[styles.itemText, { color: colors.textMuted }]}>ביטול</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: space.cardPad, paddingBottom: 32 },
  title: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text, marginBottom: 8 },
  item: { minHeight: 52, justifyContent: 'center' },
  itemText: { fontFamily: Heebo.bold, fontSize: 16, color: colors.text },
});
