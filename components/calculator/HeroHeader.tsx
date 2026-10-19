import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEnter } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { colors, Heebo } from '../../constants/theme';
import { InfoHalo } from './Halo';
import { PressableScale } from './PressableScale';

export function HeroHeader({
  onInfo,
  onBack,
  title = 'כמה זה יעלה לי?',
  subtitle = 'המחיר המדויק לנסיעה, לפני שיוצאים',
}: {
  onInfo: () => void;
  /** sub-screens: a back button at the start edge replaces the info halo */
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}) {
  const insets = useSafeAreaInsets();
  const titleIn = useEnter(0);
  const subIn = useEnter(60);
  // halo center: 46px from the physical left edge, 38px below the status bar (8px floor for web, which has no inset)
  const haloTop = Math.max(insets.top, 8) + 38 - 44;
  return (
    <LinearGradient colors={colors.heroGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
      {onBack ? (
        <PressableScale onPress={onBack} style={[styles.back, { top: Math.max(insets.top, 8) + 38 - 22 }]} accessibilityRole="button" accessibilityLabel="חזרה">
          <ChevronRight size={22} color={colors.white} strokeWidth={2.2} />
        </PressableScale>
      ) : (
        <View {...LTR.props} style={[StyleSheet.absoluteFill, LTR.style, { pointerEvents: 'box-none' }]}>
          <View style={{ position: 'absolute', left: 46 - 44, top: haloTop }}>
            <InfoHalo onPress={onInfo} />
          </View>
        </View>
      )}

      <View style={[styles.topRow, !!onBack && styles.topRowBack]}>
        {/* transparent logo, tinted white so it reads on the green header */}
        <Image source={require('../../assets/images/logo-mark.png')} style={styles.logo} tintColor={colors.white} accessibilityIgnoresInvertColors />
        <Text style={styles.wordmark}>
          Check<Text style={{ opacity: 0.8 }}>Fuel</Text>
        </Text>
      </View>

      <Animated.Text style={[styles.title, titleIn]} accessibilityRole="header">
        {title}
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, subIn]} numberOfLines={1}>
        {subtitle}
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 70, overflow: 'hidden' },
  topRow: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  topRowBack: { marginStart: 56 },
  back: { position: 'absolute', start: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white18, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  logo: { width: 34, height: 37 },
  wordmark: { fontFamily: Heebo.extra, fontSize: 21, color: colors.white, writingDirection: 'ltr' },
  title: { fontFamily: Heebo.extra, fontSize: 30, lineHeight: 38, color: colors.white },
  subtitle: { fontFamily: Heebo.regular, fontSize: 14, color: colors.white80, marginTop: 4 },
});
