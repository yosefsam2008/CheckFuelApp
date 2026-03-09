// app/(tabs)/dashboard.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  I18nManager,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BannerAd from '../../components/BannerAd';
import LegalScreen from '../LegalScreen';
import UserGuideScreen from '../UserGuideScreen';

// --- Types ---
interface TripRecord {
  id: string;
  date: string;
  timestamp: number;
  distance: number;
  vehicleName: string;
  vehicleModel: string;
  fuelType: string;
  totalCost: number;
  fuelConsumed: number;
  costPerKm: number;
  consumption: number;
  energyType: 'fuel' | 'electricity';
}

interface DashboardStats {
  totalTrips: number;
  totalDistance: number;
  totalCost: number;
  avgCostPerKm: number;
}

// 'featured': horizontal full-width card; 'compact': vertical (default)
interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'featured' | 'compact';
  accessibilityLabel?: string;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  featured?: boolean;
  accessibilityLabel?: string;
}

// --- Constants ---
const Colors = {
  primary: '#009688',
  primaryLight: '#26a69a',
  primaryDark: '#00796b',
  accent: '#00897b',
  background: '#f5f9f8',
  card: '#ffffff',
  cardBorder: 'rgba(0, 150, 136, 0.1)',
  textDark: '#1a2e2a',
  textGray: '#5a6f6b',
  textLight: 'rgba(255, 255, 255, 0.9)',
  shadow: 'rgba(0, 150, 136, 0.15)',
  glassBg: 'rgba(255, 255, 255, 0.85)',
};

// Hebrew-compatible font stack.
// Expo: add `expo-font` + `@expo-google-fonts/heebo` and load via useFonts() in _layout.tsx.
// Fallback chain covers iOS (system Hebrew) → Android (Roboto w/ Hebrew glyphs) → default.
const HEB_FONT = Platform.select({
  ios: 'Heebo-Regular',   // loaded via expo-google-fonts; falls back to system if missing
  android: 'Heebo-Regular',
  default: undefined,
});
const HEB_FONT_BOLD = Platform.select({
  ios: 'Heebo-Bold',
  android: 'Heebo-Bold',
  default: undefined,
});

// Base RTL text style applied to every Text element
const rtlText = {
  writingDirection: 'rtl' as const,
  textAlign: 'right' as const,
};

// Typography scale — single source of truth for all text sizing
const Typography = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '900', color: '#fff', fontFamily: HEB_FONT_BOLD, textAlign: 'right' },
  h2: { fontSize: 22, fontWeight: '800', color: Colors.textDark, fontFamily: HEB_FONT_BOLD, ...rtlText, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '700', color: Colors.textDark, fontFamily: HEB_FONT_BOLD, ...rtlText },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textGray, fontFamily: HEB_FONT, ...rtlText, opacity: 0.8 },
  valueMain: { fontSize: 26, fontWeight: '900', color: Colors.primary, fontFamily: HEB_FONT_BOLD, writingDirection: 'rtl' },
  body: { fontSize: 15, fontWeight: '500', color: Colors.textDark, fontFamily: HEB_FONT, ...rtlText },
  caption: { fontSize: 12, fontWeight: '500', color: Colors.textGray, fontFamily: HEB_FONT, ...rtlText },
});

const sharedShadow = Platform.select({
  ios: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
});

// RTL-aware chevron: in RTL context "back" is visually rightward (›)
const ChevronBack = I18nManager.isRTL ? '›' : '‹';

// --- Sub-components ---
const StatCard = React.memo(function StatCard({
  icon, label, value, unit, variant = 'compact', accessibilityLabel,
}: StatCardProps) {
  if (variant === 'featured') {
    return (
      <View
        style={styles.statCardFeatured}
        accessible
        accessibilityLabel={accessibilityLabel ?? `${label}: ${value}${unit ?? ''}`}
      >
        {/* RTL: text first in JSX + row-reverse = text on right, icon on left */}
        <View style={styles.statFeaturedText}>
          <Text style={styles.statLabelFeatured}>{label}</Text>
          <View style={styles.statValueContainer}>
            <Text style={styles.statValueFeatured}>{value}</Text>
            {unit && <Text style={styles.statUnit}>{unit}</Text>}
          </View>
        </View>
        <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>{icon}</Text>
            </View>
      </View>
    );
  }
  return (
    <View
      style={styles.statCard}
      accessible
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}${unit ?? ''}`}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={Typography.sectionLabel}>{label}</Text>
      <View style={styles.statValueContainer}>
        <Text style={styles.statValue}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
</View>
    </View>
  );
});

const ActionButton = React.memo(function ActionButton({
  icon, label, onPress, featured = false, accessibilityLabel,
}: ActionButtonProps) {
  const button = (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // First action button gets a subtle tinted gradient to create visual hierarchy
  if (featured) {
    return (
      <LinearGradient
        colors={['rgba(0,150,136,0.06)', 'rgba(0,150,136,0.02)']}
        style={styles.actionButtonWrapper}
      >
        {button}
      </LinearGradient>
    );
  }
  return <View style={styles.actionButtonWrapper}>{button}</View>;
});

const RecentTripCard = React.memo(function RecentTripCard({ trip }: { trip: TripRecord }) {
  return (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={[Typography.body, { color: Colors.textDark, fontWeight: '600' }]}>
          🚗 {trip.vehicleName}
        </Text>
        <Text style={Typography.caption}>
          {new Date(trip.date).toLocaleDateString('he-IL')}
        </Text>
      </View>
      <View style={styles.tripDetails}>
        <View style={styles.tripDetail}>
          <Text style={styles.tripDetailLabel}>מרחק</Text>
          <Text style={styles.tripDetailValue}>{trip.distance} km</Text>
        </View>
        <View style={styles.tripDetail}>
          <Text style={styles.tripDetailLabel}>עלות</Text>
          <Text style={styles.tripDetailValue}>₪{trip.totalCost.toFixed(2)}</Text>
        </View>
        <View style={styles.tripDetail}>
          <Text style={styles.tripDetailLabel}>ממוצע</Text>
          <Text style={styles.tripDetailValue}>₪{trip.costPerKm.toFixed(2)}/km</Text>
        </View>
      </View>
    </View>
  );
});

// --- Main Component ---
export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // replaces hardcoded paddingTop: 60

  const [isLoading, setIsLoading] = useState(true);
  const [allTrips, setAllTrips] = useState<TripRecord[]>([]); // raw data; derived values via useMemo
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Respect system-level "Reduce Motion" accessibility setting before animating
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
      if (!enabled) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(floatAnim, { toValue: -8, duration: 1500, useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ])
        ).start();
      }
    });
  }, [floatAnim]);

  // Memoized stats — recomputes only when allTrips reference changes
  const stats: DashboardStats = useMemo(() => {
    if (!allTrips.length) return { totalTrips: 0, totalDistance: 0, totalCost: 0, avgCostPerKm: 0 };
    const totalTrips = allTrips.length;
    const totalDistance = allTrips.reduce((s, t) => s + t.distance, 0);
    const totalCost = allTrips.reduce((s, t) => s + t.totalCost, 0);
    return { totalTrips, totalDistance, totalCost, avgCostPerKm: totalDistance > 0 ? totalCost / totalDistance : 0 };
  }, [allTrips]);

  // Memoized sort — avoids O(n log n) re-sort on every render cycle
  const recentTrips = useMemo(
    () => [...allTrips].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3),
    [allTrips]
  );

  const showToast = useCallback((message: string, duration = 2000) => {
    setToastMessage(message);
    Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
          .start(() => setToastMessage(null));
      }, duration);
    });
  }, [toastOpacity]);

  const loadDashboardData = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('tripHistory');
      setAllTrips(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { loadDashboardData(); }, [loadDashboardData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    showToast('✓ נתונים עודכנו');
  }, [loadDashboardData, showToast]);

  const heroGreeting = 'ברוך הבא!';

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero — paddingTop driven by safe-area insets, not hardcoded */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={[styles.heroSection, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.heroDecoration1} />
          <View style={styles.heroDecoration2} />
          <Animated.View
            style={[styles.heroContent, { transform: [{ translateY: reduceMotion ? 0 : floatAnim }] }]}
          >
            <View style={styles.heroIconContainer}>
              <Text style={styles.heroIcon}>⛽</Text>
            </View>
            <Text style={Typography.h1}>{heroGreeting}</Text>
            <Text style={styles.heroSubtitle}>מחשבון חכם לניהול עלויות הדלק שלך</Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.content}>
          {/* h2 — larger section title with RTL-correct accent border */}
          <View style={styles.sectionTitleWrapper}>
            <Text style={styles.sectionTitleLarge}>📊 סיכום כולל</Text>
          </View>

          <View style={styles.bannerAdContainer}><BannerAd /></View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.statsContainer}>
              {/* Featured (horizontal) cards for high-priority metrics */}
              <StatCard
                icon="📈" label="נסיעות" value={stats.totalTrips}
                variant="featured"
                accessibilityLabel={`סך הכל ${stats.totalTrips} נסיעות`}
              />
              <StatCard
                icon="💰" label="עלות כוללת" value={`₪${stats.totalCost.toFixed(0)}`}
                variant="featured"
                accessibilityLabel={`עלות כוללת ${stats.totalCost.toFixed(0)} שקלים`}
              />
              {/* Compact 2-column grid for secondary metrics */}
              <View style={styles.statsGrid}>
                <View style={styles.statsColumn}>
                  <StatCard
                    icon="🛣️" label="מרחק" value={stats.totalDistance.toFixed(0)} unit="km"
                    accessibilityLabel={`מרחק כולל ${stats.totalDistance.toFixed(0)} קילומטרים`}
                  />
                </View>
                <View style={styles.statsColumn}>
                  <StatCard
                    icon="🎯" label="ממוצע לק״מ" value={`₪${stats.avgCostPerKm.toFixed(2)}`}
                    accessibilityLabel={`ממוצע לקילומטר ${stats.avgCostPerKm.toFixed(2)} שקלים`}
                  />
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('./calculator')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="חישוב נסיעה חדשה"
          >
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.primaryButtonGradient}>
              <Text style={styles.primaryButtonArrow}>{ChevronBack}</Text>
              <Text style={styles.primaryButtonText}>חישוב נסיעה חדשה</Text>
              <View style={styles.primaryButtonIcon}>
                <Text style={{ fontSize: 28 }}>🧮</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* h3 — smaller than h2 to establish visual size contrast */}
          <View style={styles.sectionTitleWrapper}>
            <Text style={styles.sectionTitleSmall}>פעולות מהירות</Text>
          </View>

          {/* Single flexWrap grid replaces two separate row grids */}
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="🚗" label="הרכבים שלי"
              onPress={() => router.push('./vehicles')}
              featured // subtle gradient to surface as primary action
              accessibilityLabel="נווט לרשימת הרכבים שלי"
            />
            <ActionButton
              icon="📊" label="היסטוריה"
              onPress={() => router.push('./history')}
              accessibilityLabel="נווט להיסטוריית הנסיעות"
            />
            <ActionButton
              icon="❓" label="מדריך שימוש"
              onPress={() => setShowUserGuide(true)}
              accessibilityLabel="פתח מדריך שימוש"
            />
            <ActionButton
              icon="⚖️" label="מדיניות ומשפט"
              onPress={() => setShowLegalModal(true)}
              accessibilityLabel="פתח מדיניות פרטיות ותנאים משפטיים"
            />
          </View>

          <View style={styles.bannerAdContainer}><BannerAd /></View>

          {!isLoading && recentTrips.length > 0 && (
            <>
              <View style={styles.recentHeader}>
                <TouchableOpacity
                  onPress={() => router.push('./history')}
                  accessibilityRole="button"
                  accessibilityLabel="הצג את כל הנסיעות"
                >
                  <Text style={styles.viewAllLink}>{ChevronBack} הצג הכל</Text>
                </TouchableOpacity>
                <View style={styles.sectionTitleWrapper}>
                  <Text style={styles.sectionTitleSmall}>נסיעות אחרונות</Text>
                </View>
              </View>
              {recentTrips.map((trip) => (
                // Stable string id avoids full unmount/remount on list updates
                <RecentTripCard key={trip.id} trip={trip} />
              ))}
            </>
          )}

          {recentTrips.length > 3 && (
            <View style={styles.bannerAdContainer}><BannerAd /></View>
          )}
        </View>
      </Animated.ScrollView>

      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <Modal visible={showLegalModal} animationType="slide" onRequestClose={() => setShowLegalModal(false)}>
        <LegalScreen onClose={() => setShowLegalModal(false)} />
      </Modal>
      <Modal visible={showUserGuide} animationType="slide" onRequestClose={() => setShowUserGuide(false)}>
        <UserGuideScreen onClose={() => setShowUserGuide(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },

  // Hero
  heroSection: {
    paddingBottom: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroDecoration1: { position: 'absolute', top: 20, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroDecoration2: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroContent: { alignItems: 'center' },
  heroIconContainer: { width: 90, height: 90, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroIcon: { fontSize: 48 },
  heroSubtitle: { fontSize: 16, color: Colors.textLight, fontWeight: '500', fontFamily: HEB_FONT, textAlign: 'center', writingDirection: 'rtl', marginTop: 8 },

  // marginTop: -20 pulls content under the hero curve; paddingTop compensates so
  // "סיכום כולל" has breathing room — not flush against the hero bottom edge.
  content: { padding: 20, marginTop: -20, paddingTop: 36 },

  // Section title wrapper — full-width View carries the accent border; Text inside aligns right
  sectionTitleWrapper: {
    marginBottom: 20,
    marginTop: 10,
    // מבטיח שהטקסט בתוך ה-View הזה ייצמד לימין של המסך בטלפון
    alignItems: 'flex-end', 
    width: '100%',
  },

  sectionTitleLarge: {
    ...Typography.h2,
    // ביטול Borders קודמים ליתר ביטחון
    borderLeftWidth: 0, 
    // הצמדה מפורשת לצד ימין
    borderRightWidth: 5,
    borderRightColor: Colors.primary,
    paddingRight: 12,
    paddingLeft: 0,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  sectionTitleSmall: {
    ...Typography.h3,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderRightColor: Colors.primary,
    paddingRight: 10,
    paddingLeft: 0,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  bannerAdContainer: { marginVertical: 16, borderRadius: 12, overflow: 'hidden', ...sharedShadow },
  loadingContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },

  // Stats layout
  statsContainer: { marginBottom: 24, gap: 12 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statsColumn: { flex: 1 },

  // Compact StatCard (vertical)
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 24, // יותר מעוגל = יותר מודרני
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)', // גבול כמעט בלתי נראה
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07, // צל מאוד עדין
        shadowRadius: 15,
      },
      android: { elevation: 3 },
    }),
  },
  statIcon: { fontSize: 30, marginBottom: 10 },
  statLabel: { ...Typography.caption, marginBottom: 6 },
  statValueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.primary, fontFamily: HEB_FONT_BOLD, writingDirection: 'rtl' as const },
  statUnit: { ...Typography.caption },

  // Featured StatCard (horizontal, full-width)
    statCardFeatured: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
    ...sharedShadow,
    shadowOpacity: 0.08,
  },
  statIconFeatured: { fontSize: 36 },
  statFeaturedText: { flex: 1, alignItems: 'flex-start' }, // flex-start = visual right in row-reverse
  statLabelFeatured: { ...Typography.caption, marginBottom: 4 },
  statValueFeatured: { fontSize: 30, fontWeight: '800', color: Colors.primary, fontFamily: HEB_FONT_BOLD, writingDirection: 'rtl' as const, textAlign: 'right' as const },

  // Primary CTA
  primaryButton: {
    marginBottom: 28,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  primaryButtonIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { flex: 1, fontSize: 19, fontWeight: '700', color: '#fff', fontFamily: HEB_FONT_BOLD, textAlign: 'right', writingDirection: 'rtl', marginRight: 12 },
  primaryButtonArrow: { fontSize: 28, color: '#fff', opacity: 0.8 },

  // Actions — single flexWrap grid; 47% width + aspectRatio: 1.1 for consistent touch targets
  actionsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  actionButtonWrapper: {
    width: '47%',
    aspectRatio: 1.1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...sharedShadow,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.card,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 44, // WCAG 2.5.5 minimum touch target
  },
  actionIcon: { fontSize: 30 },
  actionLabel: { ...Typography.body, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl' },

  // Recent trips
  recentHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  viewAllLink: { fontSize: 14, fontWeight: '600', color: Colors.primary, fontFamily: HEB_FONT, textAlign: 'left' },
  
  tripCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...sharedShadow,
  },
  tripHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  tripDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  tripDetail: { alignItems: 'center', flex: 1 },
  tripDetailLabel: { ...Typography.caption, marginBottom: 4, textAlign: 'center' },
  tripDetailValue: { fontSize: 15, fontWeight: '700', color: Colors.primary, fontFamily: HEB_FONT_BOLD, writingDirection: 'rtl', textAlign: 'center' },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: Colors.textDark,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: HEB_FONT, writingDirection: 'rtl', textAlign: 'center' },
statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 150, 136, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});