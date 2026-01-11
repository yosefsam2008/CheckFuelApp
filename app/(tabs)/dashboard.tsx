//app/(tabs)/dashboard.tsx
// Dashboard.tsx - Enhanced React Native Version with Banner Ads
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BannerAdComponent from '../../components/BannerAd';
import LegalScreen from '../LegalScreen';
import UserGuideScreen from '../UserGuideScreen';

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
interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
}
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

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalTrips: 0, totalDistance: 0, totalCost: 0, avgCostPerKm: 0,
  });
  const [recentTrips, setRecentTrips] = useState<TripRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim]);

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
    const tripHistoryStr = await AsyncStorage.getItem('tripHistory');
    if (!tripHistoryStr) {
      setStats({ totalTrips: 0, totalDistance: 0, totalCost: 0, avgCostPerKm: 0 });
      setRecentTrips([]);
      return;
    }
    
    const allTrips: TripRecord[] = JSON.parse(tripHistoryStr);
    const totalTrips = allTrips.length;
    const totalDistance = allTrips.reduce((sum, trip) => sum + trip.distance, 0);
    const totalCost = allTrips.reduce((sum, trip) => sum + trip.totalCost, 0);
    const avgCostPerKm = totalDistance > 0 ? totalCost / totalDistance : 0;
    setStats({ totalTrips, totalDistance, totalCost, avgCostPerKm });
    const sorted = allTrips.sort((a, b) => b.timestamp - a.timestamp);
    setRecentTrips(sorted.slice(0, 3));
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    showToast('שגיאה בטעינת הנתונים');
    setStats({ totalTrips: 0, totalDistance: 0, totalCost: 0, avgCostPerKm: 0 });
    setRecentTrips([]);
  }
}, [showToast]);

  useFocusEffect(useCallback(() => { loadDashboardData(); }, [loadDashboardData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    showToast('✓ נתונים עודכנו');
  }, [loadDashboardData, showToast]);

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, unit }) => (

    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueContainer}>
        <Text style={styles.statValue}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
    </View>
  );

  const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const RecentTripCard = ({ trip }: { trip: TripRecord }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripVehicle}>🚗 {trip.vehicleName}</Text>
        <Text style={styles.tripDate}>{new Date(trip.date).toLocaleDateString('he-IL')}</Text>
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

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.heroSection}>
          <View style={styles.heroDecoration1} />
          <View style={styles.heroDecoration2} />
          <Animated.View style={[styles.heroContent, { transform: [{ translateY: floatAnim }] }]}>
            <View style={styles.heroIconContainer}>
              <Text style={styles.heroIcon}>⛽</Text>
            </View>
            <Text style={styles.heroTitle}>ברוך הבא!</Text>
            <Text style={styles.heroSubtitle}>מחשבון חכם לניהול עלויות הדלק שלך</Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>📊 סיכום כולל</Text>
          <BannerAdComponent style={styles.bannerTop} />
          <View style={styles.statsGrid}>
            <View style={styles.statsColumn}>
              <StatCard icon="📈" label="נסיעות" value={stats.totalTrips} />
              <StatCard icon="🛣️" label="מרחק" value={stats.totalDistance.toFixed(0)} unit="km" />
            </View>
            <View style={styles.statsColumn}>
              <StatCard icon="💰" label="עלות כוללת" value={`₪${stats.totalCost.toFixed(0)}`} />
              <StatCard icon="🎯" label="ממוצע לק״מ" value={`₪${stats.avgCostPerKm.toFixed(2)}`} />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('./calculator')} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.primaryButtonGradient}>
              <Text style={styles.primaryButtonArrow}>‹</Text>
              <Text style={styles.primaryButtonText}>חישוב נסיעה חדשה</Text>
              <View style={styles.primaryButtonIcon}><Text style={{ fontSize: 28 }}>🧮</Text></View>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>פעולות מהירות</Text>
          <View style={styles.actionsGrid}>
            <ActionButton icon="🚗" label="הרכבים שלי" onPress={() => router.push('./vehicles')} />
            <ActionButton icon="📊" label="היסטוריה" onPress={() => router.push('./history')} />
          </View>
          <View style={styles.actionsGrid}>
            <ActionButton icon="❓" label="מדריך שימוש" onPress={() => setShowUserGuide(true)} />
            <ActionButton icon="⚖️" label="מדיניות ומשפט" onPress={() => setShowLegalModal(true)} />
          </View>

          <BannerAdComponent style={styles.bannerMiddle} />
          {recentTrips.length > 0 && (
            <>
              <View style={styles.recentHeader}>
                <TouchableOpacity onPress={() => router.push('./history')}>
                  <Text style={styles.viewAllLink}>‹ הצג הכל</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>נסיעות אחרונות</Text>
              </View>
              {recentTrips.map((trip) => <RecentTripCard key={trip.id} trip={trip} />)}
            </>
          )}
          {recentTrips.length > 3 && <BannerAdComponent style={styles.bannerBottom} />}
          <View style={{ height: 40 }} />
        </View>
      </Animated.ScrollView>

      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <Modal
        visible={showLegalModal}
        animationType="slide"
        onRequestClose={() => setShowLegalModal(false)}
      >
        <LegalScreen onClose={() => setShowLegalModal(false)} />
      </Modal>

      <Modal
        visible={showUserGuide}
        animationType="slide"
        onRequestClose={() => setShowUserGuide(false)}
      >
        <UserGuideScreen onClose={() => setShowUserGuide(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroSection: { paddingTop: 60, paddingBottom: 50, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  heroDecoration1: { position: 'absolute', top: 20, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroDecoration2: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroContent: { alignItems: 'center' },
  heroIconContainer: { width: 90, height: 90, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroIcon: { fontSize: 48 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: '#fff', marginBottom: 8 },
  heroSubtitle: { fontSize: 16, color: Colors.textLight, fontWeight: '500', textAlign: 'center' },
  content: { padding: 20, marginTop: -20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textDark, marginBottom: 16, textAlign: 'right' },
  bannerTop: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8
      },
      android: {
        elevation: 4
      }
    })
  },
  bannerMiddle: {
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8
      },
      android: {
        elevation: 4
      }
    })
  },
  bannerBottom: {
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8
      },
      android: {
        elevation: 4
      }
    })
  },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statsColumn: { flex: 1, gap: 12 },
  statCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 16 }, android: { elevation: 4 } }) },
  statIcon: { fontSize: 30, marginBottom: 10 },
  statLabel: { fontSize: 13, color: Colors.textGray, fontWeight: '600', marginBottom: 6 },
  statValueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  statUnit: { fontSize: 12, color: Colors.textGray, fontWeight: '500' },
  primaryButton: { marginBottom: 28, borderRadius: 20, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20 }, android: { elevation: 8 } }) },
  primaryButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, paddingHorizontal: 20 },
  primaryButtonIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { flex: 1, fontSize: 19, fontWeight: '700', color: '#fff', textAlign: 'right', marginRight: 12 },
  primaryButtonArrow: { fontSize: 28, color: '#fff', opacity: 0.8 },
  actionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionButton: { flex: 1, backgroundColor: Colors.card, borderRadius: 18, paddingVertical: 20, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.cardBorder, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }, android: { elevation: 3 } }) },
  actionIcon: { fontSize: 30 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 16 },
  viewAllLink: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  tripCard: { backgroundColor: Colors.card, borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: Colors.cardBorder, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }, android: { elevation: 3 } }) },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  tripVehicle: { fontSize: 16, fontWeight: '600', color: Colors.textDark },
  tripDate: { fontSize: 13, color: Colors.textGray, fontWeight: '500' },
  tripDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  tripDetail: { alignItems: 'center', flex: 1 },
  tripDetailLabel: { fontSize: 12, color: Colors.textGray, marginBottom: 4, fontWeight: '500' },
  tripDetailValue: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: Colors.textDark, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 } }) },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});