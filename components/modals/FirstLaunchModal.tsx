// Welcome sheet: three key points + click-to-accept terms and privacy. Shown on first launch and after a LEGAL_VERSION bump.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Calculator, Smartphone, TriangleAlert } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LegalScreen from '../../app/LegalScreen';
import { haptic } from '../../constants/motion';
import { colors, Heebo, radius, shadow } from '../../constants/theme';
import { LEGAL_VERSION, LegalTab } from '../../legal/LEGAL_CONTENT_HE';
import { PressableScale } from '../calculator/PressableScale';

export const LEGAL_VERSION_KEY = 'legal_accepted_version';

const POINTS = [
  { Icon: Calculator, warn: false, title: 'התוצאה היא הערכה', text: 'המחיר והצריכה משוערים. לפני תשלום או התחשבנות, בדקו בעצמכם.' },
  { Icon: TriangleAlert, warn: true, title: 'לא בזמן נהיגה', text: 'הזינו את היעד לפני שיוצאים לדרך.' },
  { Icon: Smartphone, warn: false, title: 'הנתונים נשארים אצלכם', text: 'רכבים והיסטוריה נשמרים במכשיר. המיקום נשלח רק לחישוב מרחק.' },
];

export function FirstLaunchModal({ visible, onAccept }: { visible: boolean; onAccept: () => void }) {
  const insets = useSafeAreaInsets();
  const [reading, setReading] = useState<LegalTab | null>(null);

  const accept = async () => {
    haptic.press();
    try {
      await AsyncStorage.multiSet([
        ['app_launched', 'true'],
        [LEGAL_VERSION_KEY, LEGAL_VERSION],
        ['legal_accepted_date', new Date().toISOString()],
      ]);
      onAccept();
    } catch {
      Alert.alert('שגיאה בשמירה', 'לא הצלחנו לשמור את האישור. נסו שוב.', [
        { text: 'נסה שוב', onPress: accept },
        { text: 'המשך בכל זאת', onPress: onAccept, style: 'destructive' },
      ]);
    }
  };

  return (
    // onRequestClose is a no-op: the Android back button must not skip acceptance
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => (reading ? setReading(null) : undefined)} statusBarTranslucent>
      {reading ? (
        // same Modal: iOS can't present a second modal on top of this one
        <LegalScreen initialTab={reading} onClose={() => setReading(null)} />
      ) : (
        <View style={styles.scrim}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <Image source={require('../../assets/images/logo-mark.png')} style={styles.logo} accessibilityIgnoresInvertColors />
            <Text style={styles.title} accessibilityRole="header">
              ברוכים הבאים ל־CheckFuel
            </Text>
            <Text style={styles.sub}>לפני שמתחילים, שלושה דברים חשובים:</Text>

            <View style={styles.points}>
              {POINTS.map(({ Icon, warn, title, text }, i) => (
                <View key={title} style={[styles.point, i > 0 && styles.divider]}>
                  <View style={[styles.icon, warn && { backgroundColor: colors.warnBg }]}>
                    <Icon size={18} color={warn ? colors.warnText : colors.selectedText} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pointTitle}>{title}</Text>
                    <Text style={styles.pointText}>{text}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.legal}>
              בלחיצה על {'"מסכים וממשיך"'} אתם מאשרים שאתם בני 18 ומעלה, ושקראתם ואתם מסכימים ל
              <Text style={styles.link} onPress={() => setReading('terms')} accessibilityRole="link">
                תנאי השימוש
              </Text>
              {' '}ול
              <Text style={styles.link} onPress={() => setReading('privacy')} accessibilityRole="link">
                מדיניות הפרטיות
              </Text>
              .
            </Text>

            <PressableScale onPress={accept} style={[styles.cta, shadow.cta]} accessibilityRole="button">
              <LinearGradient colors={colors.ctaGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={styles.ctaText}>מסכים וממשיך</Text>
            </PressableScale>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 28, paddingHorizontal: 20, width: '100%', maxWidth: 560, alignSelf: 'center' },
  logo: { width: 44, height: 48, alignSelf: 'center', marginBottom: 12 },
  title: { fontFamily: Heebo.extra, fontSize: 24, lineHeight: 32, color: colors.text, textAlign: 'center' },
  sub: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  points: { marginTop: 16 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  pointTitle: { fontFamily: Heebo.extra, fontSize: 15, color: colors.text },
  pointText: { fontFamily: Heebo.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: 1 },
  legal: { fontFamily: Heebo.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 12 },
  link: { fontFamily: Heebo.bold, color: colors.infoText, textDecorationLine: 'underline' },
  cta: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 16 },
  ctaText: { fontFamily: Heebo.extra, fontSize: 17, color: colors.white, textShadowColor: colors.textShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
