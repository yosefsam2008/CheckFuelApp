// app/AddVehicleByPlate.tsx 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import 'expo-router/entry';
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lookupPlate } from "../lib/vehicles/plateLookup";
import { Vehicle } from "../lib/data/vehiclesData";
import Toast from "./Toast";

// Unified Lucide Icons
import {
  Activity,
  Car,
  ChevronLeft,
  Search,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react-native";

// Conditional import for ads - only load on native platforms
let AdBannerComponent: any = null;
const AdBanner = ({ style }: { style?: any }) => {
  if (Platform.OS === 'web') return null;
  
  // Lazy load on first render (native only)
  if (!AdBannerComponent) {
    AdBannerComponent = require("../components/BannerAd").default;
  }
  
  return <AdBannerComponent style={style} />;
};

async function saveVehicle(vehicle: Vehicle): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem("vehicles");
    const list: Vehicle[] = existing ? JSON.parse(existing) : [];
    list.push(vehicle);
    await AsyncStorage.setItem("vehicles", JSON.stringify(list));
  } catch (error) {
    console.error("Failed to save vehicle:", error);
    throw new Error("Failed to save vehicle to storage");
  }
}

export default function AddVehicleByPlate() {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [focusAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const router = useRouter();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => { if (isMountedRef.current) setKeyboardVisible(true); }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => { if (isMountedRef.current) setKeyboardVisible(false); }
    );

    return () => {
      isMountedRef.current = false; 
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleFocus = () => {
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 40,
      friction: 7,
    }).start();
  };

  const handleBlur = () => {
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 7,
    }).start();
  };

  React.useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const handleAddVehicleByPlate = async () => {
    const plateTrimmed = plate.trim();
    if (!plateTrimmed) {
      setToastMessage("אנא הזן מספר רכב");
      return;
    }

    try {
      const existing = await AsyncStorage.getItem("vehicles");
      if (!isMountedRef.current) return;

      const vehicles: Vehicle[] = existing ? JSON.parse(existing) : [];
      
      const isDuplicate = vehicles.some(
        (v) => v.plate.toUpperCase() === plateTrimmed.toUpperCase()
      );
      
      if (isDuplicate) {
        setToastMessage("רכב עם לוחית רישוי זו כבר קיים במערכת");
        return;
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    }

    setLoading(true);

    if (__DEV__) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║  🚗 ADD VEHICLE BY LICENSE PLATE - PROCESS STARTED     ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log(`🔍 Searching for plate: ${plateTrimmed}`);
    }

    try {
      const result = await lookupPlate(plateTrimmed);
      if (result.status !== 'found') {
        setToastMessage(result.status === 'offline' ? "אין חיבור לאינטרנט" : "לא נמצאו נתונים עבור מספר זה באף מאגר");
        return;
      }
      const newVehicle = result.vehicle;

        await saveVehicle(newVehicle);

        
        if (isMountedRef.current) {
          setToastMessage(`${newVehicle.name} (${newVehicle.plate}) נוסף בהצלחה — סוג דלק: ${newVehicle.fueltype} — דגם: ${newVehicle.model}`);
          setTimeout(() => {
            if (isMountedRef.current) router.back();
          }, 1400);
        }

    } catch (error) {
      console.error('\n❌ ERROR in AddVehicleByPlate:', error);
      if (isMountedRef.current) {
        setToastMessage("אירעה שגיאה בעת הוספת הרכב");
      }
    } finally {
  
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#d1d5db', '#009688'],
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });

  return (
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Back Button - Fixed Position */}
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="חזור מסך אחורה"
          accessibilityRole="button"
        >
          <View style={styles.backBtnInner}>
            <ChevronLeft size={24} color="#374151" />
          </View>
        </TouchableOpacity>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentWrapper}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Car size={40} color="#009688" />
                </View>
              </View>
              <Text style={styles.title}>זיהוי אוטומטי של רכב</Text>
              <Text style={styles.subtitle}>הזן מספר רישוי לאיתור מיידי ממאגרי הממשלה</Text>
            </View>

            {/* Toast */}
            {toastMessage && <Toast message={toastMessage} onHide={() => setToastMessage(null)} />}

            {/* Main Content Card */}
            <View style={styles.card}>
              {/* License Plate Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>מספר רישוי</Text>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor,
                      shadowOpacity,
                    },
                  ]}
                >
                  <View style={styles.plateFrame}>
                    <View style={styles.plateInner}>
                      <TextInput
                        style={styles.input}
                        placeholder="12-345-67"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={plate}
                        onChangeText={setPlate}
                        autoCapitalize="characters"
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        editable={!loading}
                        accessibilityLabel="הזן מספר רישוי"
                        accessibilityHint="הזן את מספר הרכב ללא מקפים או רווחים"
                      />
                    </View>
                  </View>
                </Animated.View>
                <Text style={styles.inputHint}>תתבצע חיפוש אוטומטי במאגרי רכב, אופנוע ומשאית</Text>
              </View>

              {/* Search Button */}
              <TouchableOpacity
                style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
                onPress={handleAddVehicleByPlate}
                disabled={loading || !plate.trim()}
                activeOpacity={0.85}
                accessibilityLabel="חפש והוסף אוטומטית"
                accessibilityRole="button"
                accessibilityState={{ disabled: loading || !plate.trim(), busy: loading }}
              >
                {loading ? (
                  <Animated.View style={[styles.searchBtnContent, { transform: [{ scale: pulseAnim }] }]}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.searchBtnText}>מאתר רכב...</Text>
                  </Animated.View>
                ) : (
                  <View style={styles.searchBtnContent}>
                    <Sparkles size={20} color="#fff" />
                    <Text style={styles.searchBtnText}>חפש והוסף אוטומטית</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace("/addVehicle")}
                disabled={loading}
                accessibilityRole="link"
                style={{ alignItems: "center", paddingVertical: 12 }}
              >
                <Text style={[styles.inputHint, { textDecorationLine: "underline" }]}>
                  אין לוחית או לא נמצא? הזנה ידנית
                </Text>
              </TouchableOpacity>

              {/* Features List */}
              <View style={styles.featuresContainer}>
                <FeatureItem iconNode={<Search size={20} color="#009688" />} text="זיהוי מיידי מבסיס נתונים ממשלתי" />
                <FeatureItem iconNode={<Zap size={20} color="#009688" />} text="ניתוח אוטומטי של סוג דלק וצריכה" />
                <FeatureItem iconNode={<Activity size={20} color="#009688" />} text="חישוב חכם של יעילות הרכב" />
              </View>
            </View>

            {/* Trust Badge */}
            <View style={styles.trustBadge}>
              <ShieldCheck size={20} color="#00695c" />
              <Text style={styles.trustBadgeText}>נתונים מאומתים ממשרד התחבורה</Text>
            </View>

            {/* Bottom Spacer */}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Banner Ad at the bottom (Hidden when keyboard is open) */}
      <View style={[
        styles.adContainer, 
        { 
          paddingBottom: Math.max(insets.bottom + 10, 16),
          display: isKeyboardVisible ? 'none' : 'flex'
        }
      ]}>
        <AdBanner style={styles.bottomBanner} />
      </View>
    </View>
  );
}

// Feature Item Component
function FeatureItem({ iconNode, text }: { iconNode: React.ReactNode; text: string }) {
  return (
    <View style={styles.featureItem}>
      {iconNode}
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const MAX_WIDTH = 480;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  contentWrapper: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        alignSelf: 'center',
      },
    }),
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    zIndex: 10,
  },
  backBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#e0f2f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'right',
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#f9fafb',
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  plateFrame: {
    padding: 4,
  },
  plateInner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    padding: 18,
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputHint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  searchBtn: {
    backgroundColor: '#009688',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  searchBtnDisabled: {
    opacity: 0.7,
  },
  searchBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    textAlign: 'right',
    lineHeight: 20, 
  },
  trustBadge: {
    backgroundColor: '#e0f2f1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#b2dfdb',
  },
  trustBadgeText: {
    fontSize: 13,
    color: '#00695c',
    fontWeight: '600',
    textAlign: 'center',
  },
  adContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bottomBanner: {
    ...Platform.select({
      web: {
        maxWidth: MAX_WIDTH,
        alignSelf: 'center',
        width: '100%',
      },
    }),
  },
});