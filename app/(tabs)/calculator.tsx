// calculator.tsx - Travel Cost Calculator with Integrated Google Ads

import { 
  Share2, RefreshCw, Car, Bus, MapPin, 
  Zap, Droplets, TrendingUp, CircleDollarSign, 
  Info, AlertTriangle, ChevronRight, Leaf,Lock
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
const PremiumUnlockAd = Platform.OS === 'web' ? () => null : require('../../components/PremiumUnlockAd').default;
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LEGAL_UI_STRINGS } from "../../legal/LEGAL_UI_STRINGS_HE";
import {
  calculateVehicleAge,
  calculateAdjustedConsumption
} from '../../lib/data/fuelConsumptionAdjustments';

// Conditional imports for ads - only load on native platforms
const BannerAd = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;
const VideoAd = Platform.OS === 'web' ? () => null : require('../../components/VideoAd').default;

// ============================================
// TYPES
// ============================================
interface Vehicle {
  id: string;
  name: string;
  model: string;
  engine: string;
  fueltype: string;
  avgConsumption?: number;
  type?: string;
  tankCapacity?: number; // Tank capacity in liters (for fuel) or kWh (for electric)
  year?: number; // Manufacturing year
}

interface CalculationResult {
  totalCost: number;
  consumption: number;
  costPerKm: number;
  fuelConsumed: number;
  energyType: "fuel" | "electricity";
  distance: number;
  adjustmentBreakdown?: {
    ageDegradation: number;
    drivingStyle: number;
    climate: number;
    tripType: number;
    vehicleCondition: number;
    acUsage: number;
    shortTrips: number;
  };
  totalAdjustmentFactor?: number;
  baseConsumption?: number;
}

interface SavedProgress {
  step: number;
  distance: string;
  vehicleId: string | null;
  fuelPrice: string;
  drivingStyle?: string;
  tripType?: string;
  acUsage?: string;
}

interface DrivingPreferences {
  drivingStyle: 'eco' | 'normal' | 'aggressive';
  tripType: 'city' | 'highway' | 'mixed';
  acUsage: 'always' | 'sometimes' | 'rarely';
}

interface QuickChipProps {
  label: string;
  onPress: () => void;
  isActive?: boolean;
  icon?: string;
}

interface ResultMetricCardProps {
  iconNode: React.ReactNode; 
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}

interface ComparisonCardProps {
  iconNode: React.ReactNode;
  title: string;
  cost: number;
  yourCost: number;
  subtitle?: string;
}

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

// ============================================
// CONSTANTS
// ============================================
const DEFAULT_FUEL_PRICES = {
  Gasoline: 7.08,
  Diesel: 9.58,
  Electric: 0.6,
};

const DEFAULT_BATTERY_CAPACITY = 50;
const ELECTRICITY_PRICE_PER_KWH = 0.6;
const DEFAULT_FUEL_TANK_CAPACITY = 60; // Default fuel tank capacity in liters
  
// Quick distance presets
const DISTANCE_PRESETS = [10, 50, 100, 200];

// Comparison estimates (approximate for Israel - updated April 2025)
const TAXI_COST_PER_KM = 6.5; // ₪ per km average (includes flag drop + per km rate)

// Official Bus Fare Structure - Israeli Ministry of Transport
// Source: Ministry of Transport Official Fare Table
// Updated: April 2025
const BUS_FARE_BRACKETS = [
  { maxDistance: 15, fare: 8, label: "0-15 ק״מ" },
  { maxDistance: 40, fare: 14.5, label: "15-40 ק״מ" },
  { maxDistance: 75, fare: 19, label: "40-75 ק״מ" },
  { maxDistance: 120, fare: 19, label: "75-120 ק״מ" },
  { maxDistance: 225, fare: 32.5, label: "120-225 ק״מ" },
  { maxDistance: Infinity, fare: 74, label: "225+ ק״מ" },
];

// CO2 emissions (kg per liter of fuel)
const CO2_PER_LITER_GASOLINE = 2.31;
const CO2_PER_LITER_DIESEL = 2.68;

// Steps
const STEPS = ["distance", "vehicle", "drivingPreferences", "fuelPrice", "results"] as const;
const STEP_LABELS = ["מרחק", "רכב", "העדפות", "מחיר", "תוצאות"];

// ============================================
// COLORS - iOS Style Green Theme
// ============================================
const COLORS = {
  // Primary palette
  primary: "#34C759",
  primaryDark: "#248A3D",
  primaryLight: "#A8E6CF",
  primaryGradientStart: "#34C759",
  primaryGradientEnd: "#00C7BE",
  
  // Accent colors
  accent: "#007AFF",
  accentLight: "#E8F4FF",
  
  // Status colors
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  
  // Neutral palette
  background: "#F2F2F7",
  backgroundSecondary: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "rgba(0, 0, 0, 0.04)",
  
  // Text colors
  textPrimary: "#000000",
  textSecondary: "#8E8E93",
  textTertiary: "#AEAEB2",
  textOnPrimary: "#FFFFFF",
  
  // Special
  overlay: "rgba(0, 0, 0, 0.4)",
  shadow: "#000000",
  electric: "#007AFF",
  fuel: "#FF9500",
  diesel: "#8E8E93",
};

// ============================================
// ANIMATED NUMBER COMPONENT
// ============================================
const AnimatedNumber: React.FC<{
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}> = ({ value, duration = 1500, prefix = "", suffix = "", style }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

useEffect(() => {
  animatedValue.setValue(0);
  Animated.timing(animatedValue, {
    toValue: value,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  }).start();

  const listener = animatedValue.addListener(({ value: v }) => {
    setDisplayValue(v);
  });

  return () => animatedValue.removeListener(listener);
}, [value, duration, animatedValue]); 

  return (
    <Text style={style}>
      {prefix}{displayValue.toFixed(2)}{suffix}
    </Text>
  );
};

// ============================================
// STEP INDICATOR COMPONENT
// ============================================
const StepIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  labels: string[];
}> = ({ currentStep, totalSteps, labels }) => {
  const progress = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.spring(progress, {
    toValue: (currentStep + 1) / totalSteps,
    useNativeDriver: false,
    friction: 8,
    tension: 40,
  }).start();
}, [currentStep, totalSteps, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.stepIndicatorContainer}>
      {/* Step dots */}
      <View style={styles.stepDotsRow}>
        {labels.map((label, index) => (
          <View key={index} style={styles.stepDotWrapper}>
            <View
              style={[
                styles.stepDot,
                index <= currentStep && styles.stepDotActive,
                index === currentStep && styles.stepDotCurrent,
              ]}
            >
              {index < currentStep ? (
                <Text style={styles.stepDotCheck}>✓</Text>
              ) : (
                <Text style={[
                  styles.stepDotNumber,
                  index <= currentStep && styles.stepDotNumberActive,
                ]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              index <= currentStep && styles.stepLabelActive,
            ]}>
              {label}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[styles.progressBarFill, { width: progressWidth }]}
        />
      </View>
    </View>
  );
};

// ============================================
// QUICK CHIP COMPONENT
// ============================================
const QuickChip: React.FC<QuickChipProps> = ({ label, onPress, isActive = false, icon }) => (

  <TouchableOpacity
    style={[styles.quickChip, isActive && styles.quickChipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && <Text style={styles.quickChipIcon}>{icon}</Text>}
    <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ============================================
// GLASS CARD COMPONENT
// ============================================
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
}> = ({ children, style, animated = true }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

useEffect(() => {
  if (animated) {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }
}, [animated, fadeAnim, scaleAnim]);

  if (!animated) {
    return <View style={[styles.glassCard, style]}>{children}</View>;
  }

  return (
    <Animated.View
      style={[
        styles.glassCard,
        style,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ============================================
// RESULT METRIC CARD (Clean Grid Item)
// ============================================
const ResultMetricCard: React.FC<ResultMetricCardProps> = ({ iconNode, label, value, subValue, color = COLORS.textPrimary }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricIconContainer}>
      {iconNode}
    </View>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {subValue && <Text style={styles.metricSubValue}>{subValue}</Text>}
  </View>
);

interface ComparisonCardProps {
  iconNode: React.ReactNode;
  title: string;
  cost: number;
  yourCost: number;
  subtitle?: string;
  isPremiumUnlocked: boolean; // Add this
}

// ============================================
// COMPARISON CARD (Modern Clean Look)
// ============================================
const ComparisonCard: React.FC<ComparisonCardProps> = ({ iconNode, title, cost, yourCost, subtitle, isPremiumUnlocked }) => {
  const savings = cost - yourCost;
  const isCheaper = savings > 0;
  
  return (
    <View style={styles.comparisonCard}>
      <View style={[styles.comparisonIconWrapper, { backgroundColor: isCheaper ? COLORS.success + '20' : COLORS.textTertiary + '20' }]}>
        {iconNode}
      </View>
      <View style={styles.comparisonContent}>
        <Text style={styles.comparisonTitle}>{title}</Text>
        {subtitle && <Text style={styles.comparisonSubtitle}>{subtitle}</Text>}
        
        <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.comparisonCost}>
          ₪{cost.toFixed(1)}
        </BlurredValue>
      </View>
      <View style={[
        styles.comparisonBadge,
        isCheaper ? styles.comparisonBadgeSavings : styles.comparisonBadgeNeutral,
      ]}>
        <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={[
          styles.comparisonBadgeText,
          isCheaper ? styles.comparisonBadgeTextSavings : styles.comparisonBadgeTextNeutral,
        ]}>
          {isCheaper ? `חיסכון ₪${savings.toFixed(0)}` : `ברכב יקר ב-₪${Math.abs(savings).toFixed(0)}`}
        </BlurredValue>
      </View>
    </View>
  );

};
// ============================================
// FUEL GAUGE COMPONENT (Visual)
// ============================================
const FuelGauge: React.FC<{
  percentage: number;
  isElectric: boolean;
}> = ({ percentage, isElectric }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedPercentage,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      // חייב להיות false כדי לתמוך באנימציה של מאפיין width
      useNativeDriver: false, 
    }).start();
  }, [clampedPercentage, animatedWidth]);

  // ממיר את המספר לאחוזים כדי שהמילוי יתחיל מהצד הנכון (לפי RTL)
  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.fuelGaugeContainer}>
      <View style={styles.fuelGaugeTrack}>
        <Animated.View
          style={[
            styles.fuelGaugeFill,
            {
              width: widthInterpolated, // חזרנו לאחוזים - המילוי יהיה מהצד!
              backgroundColor: isElectric ? COLORS.electric : COLORS.fuel,
            },
          ]}
        />
      </View>
      <View style={styles.fuelGaugeLabels}>
        <Text style={styles.fuelGaugeLabelLeft}>0%</Text>
        <Text style={styles.fuelGaugeIcon}>{isElectric ? "⚡" : "⛽"}</Text>
        <Text style={styles.fuelGaugeLabelRight}>100%</Text>
      </View>
      <Text style={styles.fuelGaugeValue}>
        {clampedPercentage.toFixed(1)}% {isElectric ? "סוללה" : "מיכל"}
      </Text>
    </View>
  );
};

// ============================================
// TOAST COMPONENT
// ============================================
const Toast: React.FC<ToastProps> = ({ message, onClose, type = "info" }) => {

  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.parallel([
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      useNativeDriver: true,
    }),
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start();

  const timer = setTimeout(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, 3000);

  return () => clearTimeout(timer);
}, [slideAnim, fadeAnim, onClose]);

  const bgColor = {
    success: COLORS.success,
    error: COLORS.error,
    info: COLORS.accent,
  }[type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bgColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.toastClose}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
// ============================================
// BLURRED VALUE COMPONENT (Glassmorphic)
// ============================================
const BlurredValue: React.FC<{
  isUnlocked: boolean;
  children: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
}> = ({ isUnlocked, children, textStyle }) => {
  if (isUnlocked) return <Text style={textStyle}>{children}</Text>;

  return (
    <View style={styles.blurredValueWrapper}>
      {/* Invisible text defines the exact layout boundaries for the BlurView */}
      <Text style={[textStyle, { opacity: 0 }]} numberOfLines={1}>
        {children}
      </Text>
      
      <BlurView intensity={30} tint="light" style={styles.blurOverlayLayer} />
      
      <View style={styles.blurLockCenter}>
        <Lock size={14} color={COLORS.textSecondary} strokeWidth={2.5} />
      </View>
    </View>
  );
};

// ============================================
// ANIMATED PREMIUM UNLOCK BUTTON
// ============================================
const PulseUnlockCTA: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.paywallActionContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={styles.pulseButton} onPress={onPress} activeOpacity={0.85}>
          <LinearGradient
            colors={['#10B981', '#059669']} // Premium Emerald Gradient
            style={styles.pulseButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.pulseButtonIcon}>💎</Text>
            <Text style={styles.pulseButtonText}>פתיחת הנתונים המלאים</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      <Text style={styles.pulseMicroCopy}>צפייה בסרטון קצר לפתיחת כל התובנות</Text>
    </View>
  );
};
// ============================================
// MAIN CALCULATOR COMPONENT
// ============================================
export default function CalculatorScreen() {
  const router = useRouter();

  // State
  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [distance, setDistance] = useState("");
  const [fuelPrice, setFuelPrice] = useState(DEFAULT_FUEL_PRICES.Gasoline.toString());
  const [electricityPrice, setElectricityPrice] = useState(ELECTRICITY_PRICE_PER_KWH.toString());
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [showPriceHelper, setShowPriceHelper] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [showUnlockAd, setShowUnlockAd] = useState(false);

  // Driving preferences
  const [drivingStyle, setDrivingStyle] = useState<'eco' | 'normal' | 'aggressive'>('normal');
  const [tripType, setTripType] = useState<'city' | 'highway' | 'mixed'>('mixed');
  const [acUsage, setAcUsage] = useState<'always' | 'sometimes' | 'rarely'>('always');

  // Animation refs
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ============================================
  // AUTO-SAVE PROGRESS
  // ============================================
const saveProgress = useCallback(async () => {
  try {
    const progress: SavedProgress = {
      step,
      distance,
      vehicleId: vehicle?.id || null,
      fuelPrice,
      drivingStyle,
      tripType,
      acUsage,
    };
    await AsyncStorage.setItem("calculatorProgress", JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save progress:", error);
    // Silent fail - progress save is not critical
  }
}, [step, distance, vehicle, fuelPrice, drivingStyle, tripType, acUsage]);

const loadProgress = useCallback(async () => {
  try {
    const saved = await AsyncStorage.getItem("calculatorProgress");
    if (!saved) return;

    const progress: SavedProgress = JSON.parse(saved);
    setStep(progress.step);
    setDistance(progress.distance);
    setFuelPrice(progress.fuelPrice);
    if (progress.drivingStyle) setDrivingStyle(progress.drivingStyle as any);
    if (progress.tripType) setTripType(progress.tripType as any);
    if (progress.acUsage) setAcUsage(progress.acUsage as any);

    if (progress.vehicleId && vehicles.length > 0) {
      const savedVehicle = vehicles.find(v => v.id === progress.vehicleId);
      if (savedVehicle) setVehicle(savedVehicle);
    }
  } catch (error) {
    console.error("Failed to load progress:", error);
    // Start fresh if corrupted
  }
}, [vehicles]);

  // Auto-save on changes with simple debounce
  useEffect(() => {
    if (step >= 4) return; // Don't save results step
    
    // משהה את השמירה עד שהמשתמש מסיים להקליד (חצי שנייה)
    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 500);

    // ניקוי הטיימר אם המשתמש הקליד שוב לפני שעברה חצי שנייה
    return () => clearTimeout(timeoutId);
  }, [step, distance, vehicle, fuelPrice, drivingStyle, tripType, acUsage, saveProgress]);

  // ============================================
  // LOAD VEHICLES
  // ============================================
  const loadVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    try {
      const stored = await AsyncStorage.getItem("vehicles");
      if (stored) {
        const parsedVehicles = JSON.parse(stored) as Vehicle[];
        setVehicles(parsedVehicles);
      }
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      setToastMessage({ text: LEGAL_UI_STRINGS.errors.apiError, type: "error" });
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  // Load vehicles on mount and when screen is focused
  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Reload vehicles when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles])
  );

  // Load saved progress after vehicles are loaded
  useEffect(() => {
    if (vehicles.length > 0) {
      loadProgress();
    }
  }, [vehicles, loadProgress]);

  // ============================================
  // FUEL PRICE AUTO-FILL
  // ============================================
  useEffect(() => {
    if (!vehicle) return;

    if (vehicle.fueltype === "Electric") {
      setElectricityPrice(ELECTRICITY_PRICE_PER_KWH.toString());
      setFuelPrice(ELECTRICITY_PRICE_PER_KWH.toString());
      return;
    }

    let guessed = DEFAULT_FUEL_PRICES.Gasoline;
    if (vehicle.fueltype === "Diesel") {
      guessed = DEFAULT_FUEL_PRICES.Diesel;
    } else {
      if (vehicle.type) {
        const t = vehicle.type.toLowerCase();
        if (t.includes("truck") || t.includes("lorry")) {
          guessed = DEFAULT_FUEL_PRICES.Diesel;
        }
      }
    }
    setFuelPrice(guessed.toFixed(2));
  }, [vehicle]);

  // ============================================
  // NAVIGATION
  // ============================================
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // ============================================
  // VALIDATION
  // ============================================
  const validateDistance = (d: string): boolean => {
    const num = parseFloat(d);
    return !isNaN(num) && num > 0 && num <= 5000;
  };

  const getDistanceError = (d: string): string | null => {
    if (!d) return null;
    const num = parseFloat(d);
    if (isNaN(num)) return "המרחק חייב להיות מספר";
    if (num <= 0) return "המרחק חייב להיות גדול מ-0";
    if (num > 5000) return "המרחק חייב להיות עד 5000 ק״מ";
    return null;
  };

  const validateFuelPrice = (p: string): boolean => {
    const num = parseFloat(p);
    return !isNaN(num) && num > 0;
  };

  const validateVehicle = (): boolean => {
    return vehicle !== null && (vehicle.avgConsumption ?? 0) > 0;
  };

  // ============================================
  // SHAKE ANIMATION
  // ============================================
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // ============================================
  // CALCULATION
  // ============================================
const handleCalculate = async () => {
  const d = parseFloat(distance);
  if (isNaN(d) || d <= 0 || d > 5000) {
    setToastMessage({ text: LEGAL_UI_STRINGS.errors.invalidDistance, type: "error" });
    triggerShake();
    return;
  }

  // 2. Validate vehicle
  if (!vehicle) {
    setToastMessage({ text: "בחר רכב", type: "error" });
    return;
  }

  const avgConsumption = vehicle.avgConsumption ?? 0;
  if (avgConsumption <= 0) {
    setToastMessage({ text: LEGAL_UI_STRINGS.errors.invalidConsumption, type: "error" });
    return;
  }

  // 3. Validate fuel price
  const p = parseFloat(fuelPrice);
  if (vehicle.fueltype !== "Electric" && (isNaN(p) || p <= 0 || p > 100)) {
    setToastMessage({ text: LEGAL_UI_STRINGS.errors.invalidPrice, type: "error" });
    triggerShake();
    return;
  }

  // 4. All validation passed - proceed with calculation
  let calculation: CalculationResult;

    // ✨ חישוב צריכה מתוקנת וריאלית יותר עם העדפות המשתמש
    const vehicleAge = calculateVehicleAge(vehicle.year || new Date().getFullYear());
    const fuelTypeNormalized = vehicle.fueltype === "Electric" ? "Electric"
      : vehicle.fueltype === "Diesel" ? "Diesel"
      : "Gasoline";

    // For Electric vehicles, convert kWh/km to kWh/100km for adjustment function
    const baseConsumptionForAdjustment = vehicle.fueltype === "Electric"
      ? avgConsumption * 100  // kWh/km → kWh/100km
      : avgConsumption;       // km/L stays as is

    // שימוש בפונקציית החישוב המלאה עם כל ההעדפות
    const adjustmentResult = calculateAdjustedConsumption(
      baseConsumptionForAdjustment,
      {
        vehicleAge,
        fuelType: fuelTypeNormalized as 'Gasoline' | 'Diesel' | 'Electric',
        drivingStyle,
        climate: 'hot',
        tripType,
        vehicleCondition: 'good',
        useAC: acUsage !== 'rarely', 
        acUsageLevel: acUsage,
        shortTrips: false,  
      }
    );

    const adjustedConsumption = adjustmentResult.adjustedConsumption;

    if (vehicle.fueltype === "Electric") {
      // חישוב לרכב חשמלי - adjustedConsumption הוא kWh/100km
      // צריכה מתוקנת גבוהה יותר = צריכת אנרגיה גבוהה יותר
      const kwhPer100Km = adjustedConsumption;
      const energyConsumed = (d / 100) * kwhPer100Km;
      const pricePerKwh = parseFloat(electricityPrice);
      const totalCost = energyConsumed * pricePerKwh;
      const costPerKm = totalCost / d;

      // Convert back to kWh/km for storage
      const kwhPerKm = kwhPer100Km / 100;

      calculation = {
        totalCost,
        consumption: kwhPerKm,  // Store as kWh/km
        costPerKm,
        fuelConsumed: energyConsumed,
        energyType: "electricity",
        distance: d,
        adjustmentBreakdown: adjustmentResult.breakdown,
        totalAdjustmentFactor: adjustmentResult.totalAdjustmentFactor,
        baseConsumption: baseConsumptionForAdjustment,
      };
      } else {
        // חישוב לרכב דלק - מוודאים שהצריכה תמיד גדולה מ-0 למניעת חלוקה באפס
        const safeConsumption = Math.max(adjustedConsumption, 0.1); 
        const fuelConsumed = d / safeConsumption;
        const totalCost = fuelConsumed * p;
        const costPerKm = totalCost / d;

      calculation = {
        totalCost,
        consumption: adjustedConsumption,
        costPerKm,
        fuelConsumed,
        energyType: "fuel",
        distance: d,
        adjustmentBreakdown: adjustmentResult.breakdown,
        totalAdjustmentFactor: adjustmentResult.totalAdjustmentFactor,
        baseConsumption: baseConsumptionForAdjustment,
      };
    }

    setResult(calculation);

    if (Platform.OS !== 'web') {
      try {
        // שולפים את המונה הנוכחי, מעלים ב-1 ושומרים
        const currentCountStr = await AsyncStorage.getItem("calculationCount");
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        const nextCount = currentCount + 1;
        await AsyncStorage.setItem("calculationCount", nextCount.toString());

        // מציגים וידאו רק כל חישוב שלישי (אפשר לשנות את ה-3 לכל מספר אחר)
        if (nextCount % 2 === 0) {
          setShowVideoAd(true);
        } else {
          // מדלגים על הפרסומת
          handleAdComplete(); 
        }
      } catch (error) {
        // במקרה של שגיאה בשמירה, נדלג על הפרסומת כדי לא לתקוע את המשתמש
        handleAdComplete();
      }
    } else {
      handleAdComplete(); // ב-web תמיד מדלגים
    }
  };

  // ============================================
  // AD COMPLETE HANDLER
  // ============================================
  const handleAdComplete = () => {
    setShowVideoAd(false);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 1000);

    // Clear saved progress since we completed calculation
    AsyncStorage.removeItem("calculatorProgress");

    next(); // Move to results
  };
  // ============================================
  // UNLOCK PREMIUM HANDLERS
  // ============================================
  const handleUnlockPremium = () => {
    setShowUnlockAd(true);
  };

  const handleUnlockAdComplete = () => {
    setShowUnlockAd(false);
    setIsPremiumUnlocked(true);
    setToastMessage({ text: "הנתונים המתקדמים נפתחו בהצלחה! 🔓", type: "success" });
  };

  // ============================================
  // SAVE TO HISTORY
  // ============================================
const saveCalculationToHistory = async () => {
  if (!result || !vehicle) return;

  try {
    const tripRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("he-IL"),
      timestamp: Date.now(),
      distance: result.distance,
      vehicleName: vehicle.name,
      vehicleModel: vehicle.model,
      fuelType: vehicle.fueltype,
      totalCost: result.totalCost,
      fuelConsumed: result.fuelConsumed,
      costPerKm: result.costPerKm,
      consumption: result.consumption,
      energyType: result.energyType,
    };

    const stored = await AsyncStorage.getItem("tripHistory");
    const history = stored ? JSON.parse(stored) : [];
    history.push(tripRecord);
    await AsyncStorage.setItem("tripHistory", JSON.stringify(history));
    setToastMessage({ text: LEGAL_UI_STRINGS.toasts.dataSaved, type: "success" });
  } catch (error) {
    console.error("Failed to save calculation:", error);
    setToastMessage({ text: LEGAL_UI_STRINGS.errors.apiError, type: "error" });
  }
};

  // ============================================
  // SHARE RESULTS
  // ============================================
  const shareResults = async () => {
    if (!result || !vehicle) return;

    const message = `🚗 חישוב עלות נסיעה

📍 מרחק: ${result.distance} ק״מ
🚘 רכב: ${vehicle.name} (${vehicle.model})
⛽ סוג דלק: ${vehicle.fueltype}

💰 עלות כוללת: ₪${result.totalCost.toFixed(2)}
📊 עלות לק״מ: ₪${result.costPerKm.toFixed(2)}
${result.energyType === "electricity" ? `⚡ צריכת חשמל: ${result.fuelConsumed.toFixed(2)} kWh` : `⛽ צריכת דלק: ${result.fuelConsumed.toFixed(2)} ליטרים`}

חושב באמצעות המחשבון החכם CheckFuel!🧮`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  // ============================================
  // RESET
  // ============================================
const handleReset = async () => {
  try {
    await saveCalculationToHistory();
    await AsyncStorage.removeItem("calculatorProgress");
  } catch (error) {
    console.error("Failed to save/clear data:", error);
  }

  setStep(0);
  setResult(null);
  setDistance("");
  setFuelPrice(DEFAULT_FUEL_PRICES.Gasoline.toString());
  setElectricityPrice(ELECTRICITY_PRICE_PER_KWH.toString());
  setVehicle(null);
  setDrivingStyle('normal');
  setTripType('mixed');
  setAcUsage('always');
  setShowCelebration(false);
  // ============================================
  // RESET
  // ============================================
  const handleReset = async () => {
    try {
      await saveCalculationToHistory();
      await AsyncStorage.removeItem("calculatorProgress");
    } catch (error) {
      console.error("Failed to save/clear data:", error);
    }

    setStep(0);
    setResult(null);
    setDistance("");
    setFuelPrice(DEFAULT_FUEL_PRICES.Gasoline.toString());
    setElectricityPrice(ELECTRICITY_PRICE_PER_KWH.toString());
    setVehicle(null);
    setDrivingStyle('normal');
    setTripType('mixed');
    setAcUsage('always');
    setShowCelebration(false);
    
    // ✨ נועל בחזרה את הנתונים לחישוב הבא ✨
    setIsPremiumUnlocked(false); 
  
  };
};

  // ============================================
  // CALCULATE COMPARISONS
  // ============================================
  const getTaxiCost = (dist: number) => dist * TAXI_COST_PER_KM;

  /**
   * Calculate bus fare based on official Israeli Ministry of Transport fare brackets
   * @param dist - Distance in kilometers
   * @returns Object containing fare and bracket information
   */
  const getBusCostDetails = (dist: number): { fare: number; bracket: string } => {
    for (const bracket of BUS_FARE_BRACKETS) {
      if (dist <= bracket.maxDistance) {
        return { fare: bracket.fare, bracket: bracket.label };
      }
    }
    // Fallback (should never reach here due to Infinity in last bracket)
    return { fare: 74, bracket: "225+ ק״מ" };
  };

  const getBusCost = (dist: number) => getBusCostDetails(dist).fare;
  const getMonthlyProjection = (cost: number, tripsPerMonth: number = 20) => cost * tripsPerMonth;
  const getCO2Emissions = (liters: number, fuelType: string): number => {
    if (fuelType === "Electric") return 0;
    return liters * (fuelType === "Diesel" ? CO2_PER_LITER_DIESEL : CO2_PER_LITER_GASOLINE);
  };

  // ============================================
  // GET VEHICLE ICON
  // ============================================
  const getVehicleIcon = (fuelType: string): string => {
    switch (fuelType) {
      case "Electric": return "⚡";
      case "Diesel": return "🛢️";
      default: return "⛽";
    }
  };

  // ============================================
  // RENDER STEP CONTENT
  // ============================================
  const renderStep = () => {
    const currentStep = STEPS[step];

    switch (currentStep) {
      // ========================================
      // STEP 1: DISTANCE
      // ========================================
      case "distance":
        return (
          <GlassCard style={styles.stepCard}>
            <Text style={styles.questionTitle}>📍 מה המרחק?</Text>
            <Text style={styles.questionSubtitle}>הכנס מרחק בקילומטרים (עד 5000)</Text>

            {/* Quick distance presets */}
            <View style={styles.presetsContainer}>
              <Text style={styles.presetsLabel}>בחירה מהירה:</Text>
              <View style={styles.presetsRow}>
                {DISTANCE_PRESETS.map((preset) => (
                  <QuickChip
                    key={preset}
                    label={`${preset} ק״מ`}
                    onPress={() => setDistance(preset.toString())}
                    isActive={distance === preset.toString()}
                  />
                ))}
              </View>
            </View>

            {/* Distance input */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={[
                styles.inputContainer,
                getDistanceError(distance) && styles.inputContainerError,
              ]}>
                <Text style={styles.inputIcon}>🛣️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="לדוגמה: 150"
                  keyboardType="numeric"
                  inputMode="numeric"
                  returnKeyType="done"
                  value={distance}
                  onChangeText={setDistance}
                  placeholderTextColor={COLORS.textTertiary}
                  textAlign="right"
                />
                <Text style={styles.inputSuffix}>ק״מ</Text>
              </View>
            </Animated.View>

            {getDistanceError(distance) && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{getDistanceError(distance)}</Text>
              </View>
            )}

            <View style={styles.tipContainer}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>
                טיפ: אפשר לבדוק מרחק מדויק דרך Waze או Google Maps
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.back()}
              >
                <Text style={styles.secondaryButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !validateDistance(distance) && styles.primaryButtonDisabled,
                ]}
                onPress={() => setStep(1)}
                disabled={!validateDistance(distance)}
              >
                <Text style={styles.primaryButtonText}>המשך</Text>
                <Text style={styles.buttonArrow}>←</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        );

      // ========================================
      // STEP 2: VEHICLE
      // ========================================
      case "vehicle":
        return (
          <GlassCard style={styles.stepCard}>
            <Text style={styles.questionTitle}>🚗 בחר רכב</Text>
            <Text style={styles.questionSubtitle}>בחר את הרכב שלך מהרשימה</Text>

            {isLoadingVehicles ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>טוען רכבים...</Text>
              </View>
            ) : vehicles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🚙</Text>
                <Text style={styles.emptyText}>אין רכבים שמורים</Text>
                <TouchableOpacity
                  style={styles.addVehicleButton}
                  onPress={() => router.push("/addVehicle")}
                >
                  <Text style={styles.addVehicleButtonText}>➕ הוסף רכב חדש</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.vehicleSelector,
                    vehicle && styles.vehicleSelectorActive,
                  ]}
                  onPress={() => setShowVehicleModal(true)}
                >
                  {vehicle ? (
                    <View style={styles.selectedVehicle}>
                      <Text style={styles.selectedVehicleIcon}>
                        {getVehicleIcon(vehicle.fueltype)}
                      </Text>
                      <View style={styles.selectedVehicleInfo}>
                        <Text style={styles.selectedVehicleName}>
                          {vehicle.name}
                        </Text>
                        <Text style={styles.selectedVehicleModel}>
                          {vehicle.model} • {vehicle.fueltype}
                        </Text>
                      </View>
                      <Text style={styles.selectorArrow}>▼</Text>
                    </View>
                  ) : (
                    <View style={styles.placeholderVehicle}>
                      <Text style={styles.placeholderIcon}>🚗</Text>
                      <Text style={styles.placeholderText}>בחר רכב</Text>
                      <Text style={styles.selectorArrow}>▼</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {vehicle?.avgConsumption && distance && (
                  <View style={styles.consumptionPreview}>
                    <Text style={styles.consumptionPreviewIcon}>
                      {vehicle.fueltype === "Electric" ? "🔋" : "⛽"}
                    </Text>
                    <Text style={styles.consumptionPreviewText}>
                      {vehicle.fueltype === "Electric"
                        ? `צריכה משוערת: ${(parseFloat(distance) * vehicle.avgConsumption).toFixed(2)} kWh`
                        : `צריכה משוערת: ${(parseFloat(distance) / vehicle.avgConsumption).toFixed(1)} ליטרים`}
                    </Text>
                  </View>
                )}

                {/* Vehicle Selection Modal */}
                <Modal
                  visible={showVehicleModal}
                  animationType="slide"
                  transparent
                  onRequestClose={() => setShowVehicleModal(false)}
                >
                  <View style={styles.modalOverlay}>
                    <Pressable
                      style={styles.modalBackdrop}
                      onPress={() => setShowVehicleModal(false)}
                    />
                    <View style={styles.modalContent}>
                      <View style={styles.modalHandle} />
                      <Text style={styles.modalTitle}>🚗 בחר רכב</Text>
                      
                      <FlatList
                        data={vehicles}
                        keyExtractor={(it) => it.id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                          <Pressable
                            style={[
                              styles.vehicleItem,
                              vehicle?.id === item.id && styles.vehicleItemActive,
                            ]}
                            onPress={() => {
                              setVehicle(item);
                              setShowVehicleModal(false);
                            }}
                          >
                            <Text style={styles.vehicleItemIcon}>
                              {getVehicleIcon(item.fueltype)}
                            </Text>
                            <View style={styles.vehicleItemInfo}>
                              <Text style={styles.vehicleItemName}>
                                {item.name}
                              </Text>
                              <Text style={styles.vehicleItemDetails}>
                                {item.model} • {item.engine} • {item.fueltype}
                                {item.avgConsumption
                                  ? ` • ${item.avgConsumption.toFixed(item.fueltype === "Electric" ? 4 : 1)} ${item.fueltype === "Electric" ? "kWh/ק״מ" : "km/l"}`
                                  : ""}
                              </Text>
                            </View>
                            {vehicle?.id === item.id && (
                              <Text style={styles.vehicleItemCheck}>✓</Text>
                            )}
                          </Pressable>
                        )}
                        contentContainerStyle={styles.vehicleList}
                      />
                      
                      <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={() => setShowVehicleModal(false)}
                      >
                        <Text style={styles.modalCloseText}>סגור</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.secondaryButton} onPress={prev}>
                <Text style={styles.buttonArrowBack}>→</Text>
                <Text style={styles.secondaryButtonText}>חזור</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !validateVehicle() && styles.primaryButtonDisabled,
                ]}
                onPress={() => setStep(2)}
                disabled={!validateVehicle()}
              >
                <Text style={styles.primaryButtonText}>המשך</Text>
                <Text style={styles.buttonArrow}>←</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        );

      // ========================================
      // STEP 3: DRIVING PREFERENCES
      // ========================================
      case "drivingPreferences":
        return (
          <GlassCard style={styles.stepCard}>
            <Text style={styles.questionTitle}>🎯 העדפות נהיגה</Text>
            <Text style={styles.questionSubtitle}>
              ספר לנו על הרגלי הנהיגה שלך לחישוב מדויק יותר
            </Text>

            {/* Driving Style */}
            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceSectionTitle}>סגנון נהיגה</Text>
              <View style={styles.preferenceGrid}>
                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    drivingStyle === 'eco' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setDrivingStyle('eco')}
                >
                  <Text style={styles.preferenceCardIcon}>🌱</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    drivingStyle === 'eco' && styles.preferenceCardTitleActive,
                  ]}>
                    חסכוני
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    האצה רכה, נהיגה רגועה
                  </Text>
                  {drivingStyle === 'eco' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    drivingStyle === 'normal' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setDrivingStyle('normal')}
                >
                  <Text style={styles.preferenceCardIcon}>🚗</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    drivingStyle === 'normal' && styles.preferenceCardTitleActive,
                  ]}>
                    רגיל
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    נהיגה סטנדרטית
                  </Text>
                  {drivingStyle === 'normal' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    drivingStyle === 'aggressive' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setDrivingStyle('aggressive')}
                >
                  <Text style={styles.preferenceCardIcon}>⚡</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    drivingStyle === 'aggressive' && styles.preferenceCardTitleActive,
                  ]}>
                    ספורטיבי
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    האצה מהירה, נהיגה דינמית
                  </Text>
                  {drivingStyle === 'aggressive' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Trip Type */}
            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceSectionTitle}>סוג נסיעות רגיל</Text>
              <View style={styles.preferenceGrid}>
                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    tripType === 'city' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setTripType('city')}
                >
                  <Text style={styles.preferenceCardIcon}>🏙️</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    tripType === 'city' && styles.preferenceCardTitleActive,
                  ]}>
                    עיר
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    בעיקר נסיעות עירוניות
                  </Text>
                  {tripType === 'city' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    tripType === 'mixed' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setTripType('mixed')}
                >
                  <Text style={styles.preferenceCardIcon}>🔀</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    tripType === 'mixed' && styles.preferenceCardTitleActive,
                  ]}>
                    מעורב
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    עיר + כביש מהיר
                  </Text>
                  {tripType === 'mixed' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    tripType === 'highway' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setTripType('highway')}
                >
                  <Text style={styles.preferenceCardIcon}>🛣️</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    tripType === 'highway' && styles.preferenceCardTitleActive,
                  ]}>
                    כביש מהיר
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    בעיקר נסיעות בין-עירוניות
                  </Text>
                  {tripType === 'highway' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* AC Usage */}
            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceSectionTitle}>שימוש במיזוג אוויר</Text>
              <View style={styles.preferenceGrid}>
                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    acUsage === 'always' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setAcUsage('always')}
                >
                  <Text style={styles.preferenceCardIcon}>❄️</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    acUsage === 'always' && styles.preferenceCardTitleActive,
                  ]}>
                    כמעט תמיד
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    מיזוג פועל רוב הזמן
                  </Text>
                  {acUsage === 'always' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    acUsage === 'sometimes' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setAcUsage('sometimes')}
                >
                  <Text style={styles.preferenceCardIcon}>🌤️</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    acUsage === 'sometimes' && styles.preferenceCardTitleActive,
                  ]}>
                    לפעמים
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    רק בימים חמים
                  </Text>
                  {acUsage === 'sometimes' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    acUsage === 'rarely' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setAcUsage('rarely')}
                >
                  <Text style={styles.preferenceCardIcon}>🪟</Text>
                  <Text style={[
                    styles.preferenceCardTitle,
                    acUsage === 'rarely' && styles.preferenceCardTitleActive,
                  ]}>
                    כמעט אף פעם
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    מעדיף חלונות פתוחים
                  </Text>
                  {acUsage === 'rarely' && (
                    <Text style={styles.preferenceCardCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.secondaryButton} onPress={prev}>
                <Text style={styles.buttonArrowBack}>→</Text>
                <Text style={styles.secondaryButtonText}>חזור</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setStep(3)}
              >
                <Text style={styles.primaryButtonText}>המשך</Text>
                <Text style={styles.buttonArrow}>←</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        );

      // ========================================
      // STEP 4: FUEL PRICE
      // ========================================
      case "fuelPrice":
        const isElectric = vehicle?.fueltype === "Electric";
        const priceType = isElectric ? "חשמל" : "דלק";
        const priceUnit = isElectric ? "kWh" : "ליטר";
        
        return (
          <GlassCard style={styles.stepCard}>
            <Text style={styles.questionTitle}>
              {isElectric ? "⚡" : "⛽"} מחיר {priceType}
            </Text>
            <Text style={styles.questionSubtitle}>
              הכנס מחיר ל{priceUnit}
            </Text>

            {/* Price helper button */}
            <TouchableOpacity
              style={styles.priceHelperButton}
              onPress={() => setShowPriceHelper(!showPriceHelper)}
            >
              <Text style={styles.priceHelperIcon}>ℹ️</Text>
              <Text style={styles.priceHelperText}>
                מחירים ממוצעים בישראל
              </Text>
              <Text style={styles.priceHelperArrow}>
                {showPriceHelper ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showPriceHelper && (
              <View style={styles.priceHelperPanel}>
                <View style={styles.priceHelperRow}>
                  <Text style={styles.priceHelperLabel}>⛽ בנזין 95:</Text>
                  <TouchableOpacity onPress={() => setFuelPrice("7.36")}>
                    <Text style={styles.priceHelperValue}>₪7.36</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.priceHelperRow}>
                  <Text style={styles.priceHelperLabel}>🛢️ סולר:</Text>
                  <TouchableOpacity onPress={() => setFuelPrice("9.58")}>
                    <Text style={styles.priceHelperValue}>₪9.58</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.priceHelperRow}>
                  <Text style={styles.priceHelperLabel}>⚡ חשמל:</Text>
                  <TouchableOpacity onPress={() => setFuelPrice("0.60")}>
                    <Text style={styles.priceHelperValue}>₪0.60/kWh</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.priceHelperNote}>
                  לחץ על מחיר להזנה אוטומטית
                </Text>
              </View>
            )}

            {/* Price input */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>💰</Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    isElectric
                      ? DEFAULT_FUEL_PRICES.Electric.toString()
                      : vehicle?.fueltype === "Diesel"
                      ? DEFAULT_FUEL_PRICES.Diesel.toString()
                      : DEFAULT_FUEL_PRICES.Gasoline.toString()
                  }
                  keyboardType="numeric"
                  inputMode="numeric"
                  returnKeyType="done"
                  value={fuelPrice}
                  onChangeText={setFuelPrice}
                  placeholderTextColor={COLORS.textTertiary}
                  textAlign="right"
                />
                <Text style={styles.inputSuffix}>₪/{priceUnit}</Text>
              </View>
            </Animated.View>

            {/* Quick price chips */}
            {!isElectric && (
              <View style={styles.presetsContainer}>
                <Text style={styles.presetsLabel}>בחירה מהירה:</Text>
                <View style={styles.presetsRow}>
                  <QuickChip
                    label="₪7.36"
                    icon="⛽"
                    onPress={() => setFuelPrice("7.36")}
                    isActive={fuelPrice === "7.36"}
                  />
                  <QuickChip
                    label="₪9.58"
                    icon="🛢️"
                    onPress={() => setFuelPrice("9.58")}
                    isActive={fuelPrice === "9.58"}
                  />
                </View>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.secondaryButton} onPress={prev}>
                <Text style={styles.buttonArrowBack}>→</Text>
                <Text style={styles.secondaryButtonText}>חזור</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.calculateButton,
                  (!validateFuelPrice(fuelPrice)) && styles.primaryButtonDisabled,
                ]}
                onPress={handleCalculate}
                disabled={!validateFuelPrice(fuelPrice)}
              >
                <Text style={styles.calculateButtonText}>🧮 חשב עלות</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        );

      // ========================================
      // STEP 4: RESULTS (Premium UI)
      // ========================================
      case "results":
        if (!result || !vehicle) return null;

        const taxiCost = getTaxiCost(result.distance);
        const busCostDetails = getBusCostDetails(result.distance);
        const busCost = busCostDetails.fare;
        
        // --- ✨ נתוני פרימיום חדשים ✨ ---
        const monthlyProjection = getMonthlyProjection(result.totalCost);
        const yearlyProjection = monthlyProjection * 12;
        const isElectricVehicle = result.energyType === "electricity";
        const co2Emissions = getCO2Emissions(result.fuelConsumed, vehicle.fueltype);
        // העלות האמיתית בישראל כוללת פחת, ירידת ערך, ביטוחים וטיפולים - מוערך בכ-85% תוספת לעלות האנרגיה
        const trueCost = result.totalCost * 1.85; 
        
        const tankCapacity = vehicle.tankCapacity || (isElectricVehicle ? DEFAULT_BATTERY_CAPACITY : DEFAULT_FUEL_TANK_CAPACITY);
        const fuelGaugePercent = (result.fuelConsumed / tankCapacity) * 100;
        const fuelGaugePercentClamped = Math.min(100, Math.max(0, fuelGaugePercent));

        return (
          <ScrollView
            showsVerticalScrollIndicator={false} 
            style={styles.resultsScroll}
            contentContainerStyle={styles.resultsScrollContent}
          >
            {showCelebration && (
              <View style={styles.celebrationOverlay}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
              </View>
            )}

            {/* Main Premium Dashboard Card */}
            <View style={styles.premiumDashboardCard}>
              
              {/* Header: Total Cost */}
              <View style={styles.totalCostHeader}>
                <Text style={styles.totalCostLabel}>עלות הנסיעה שלך</Text>
                <AnimatedNumber
                  value={result.totalCost}
                  prefix="₪"
                  style={styles.totalCostValueDark}
                  duration={1500}
                />
              </View>

              {/* Fuel Gauge */}
              <View style={styles.dashboardGaugeSection}>
                <FuelGauge
                  percentage={fuelGaugePercentClamped}
                  isElectric={isElectricVehicle}
                />
              </View>

              {/* 4-Grid Dashboard Details */}
              <View style={styles.dashboardGrid}>
                <ResultMetricCard
                  iconNode={<MapPin size={24} color={COLORS.accent} />}
                  label="מרחק"
                  value={`${result.distance} ק״מ`}
                />
                <ResultMetricCard
                  iconNode={isElectricVehicle ? <Zap size={24} color={COLORS.electric} /> : <Droplets size={24} color={COLORS.fuel} />}
                  label={isElectricVehicle ? "חשמל" : "דלק"}
                  value={`${result.fuelConsumed.toFixed(2)} ${isElectricVehicle ? "kWh" : "ל'"}`}
                />
                <ResultMetricCard
                  iconNode={<TrendingUp size={24} color={COLORS.primary} />}
                  label="יעילות"
                  value={`${result.consumption.toFixed(isElectricVehicle ? 2 : 1)} ${isElectricVehicle ? "kWh/km" : "km/l"}`}
                />
                <ResultMetricCard
                  iconNode={<CircleDollarSign size={24} color={COLORS.textSecondary} />}
                  label="עלות לק״מ"
                  value={`₪${result.costPerKm.toFixed(2)}`}
                />
              </View>
            </View>

            {/* Action Buttons Moved Up (Directly below main results) */}
            <View style={[styles.bottomActionsContainer, { marginTop: 24, marginBottom: 16 }]}>
              <TouchableOpacity style={styles.primaryActionButton} onPress={handleReset}>
                <RefreshCw size={20} color="#FFF" />
                <Text style={styles.primaryActionText}>שמור והתחל מחדש</Text>
              </TouchableOpacity>
              
              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity style={styles.secondaryActionButton} onPress={shareResults}>
                  <Share2 size={18} color={COLORS.primary} />
                  <Text style={styles.secondaryActionText}>שתף תוצאות</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryActionButton} onPress={() => router.push("/vehicles")}>
                  <Car size={18} color={COLORS.primary} />
                  <Text style={styles.secondaryActionText}>הרכבים שלי</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Banner Ad separates the free tools from the premium content */}
            <BannerAd style={styles.midBannerAd} />

            {/* ======================================= */}
{/* 🔒 PREMIUM SECTION (Paywall/Blurred) 🔒 */}
{/* ======================================= */}
<View style={styles.premiumSectionContainer}>
  <Text style={styles.sectionTitle}>תובנות מתקדמות (Premium)</Text>

  <View style={[styles.premiumContent, !isPremiumUnlocked && styles.premiumContentLocked]}>
    
    {/* 1. Comparisons */}
    <View style={styles.comparisonsContainer}>
      <ComparisonCard
        iconNode={<Car size={24} color={COLORS.textPrimary} />}
        title="מונית ספיישל"
        cost={taxiCost}
        yourCost={result.totalCost}
        isPremiumUnlocked={isPremiumUnlocked}
      />
      <ComparisonCard
        iconNode={<Bus size={24} color={COLORS.textPrimary} />}
        title="אוטובוס ציבורי"
        subtitle={`תעריף ארצי: ${busCostDetails.bracket}`}
        cost={busCost}
        yourCost={result.totalCost}
        isPremiumUnlocked={isPremiumUnlocked}
      />
    </View>

    {/* 2. Carpool Splitter */}
    <Text style={styles.premiumSectionSubTitle}>חלוקת תשלום (קארפול)</Text>
    <View style={styles.carpoolContainer}>
      <View style={styles.carpoolBox}>
        <Text style={styles.carpoolIcon}>👤</Text>
        <Text style={styles.carpoolLabel}>נוסע יחיד</Text>
        <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.carpoolValue}>
          ₪{result.totalCost.toFixed(1)}
        </BlurredValue>
      </View>
      <View style={[styles.carpoolBox, styles.carpoolBoxHighlight]}>
        <Text style={styles.carpoolIcon}>👥</Text>
        <Text style={styles.carpoolLabel}>זוג (חצי)</Text>
        <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={[styles.carpoolValue, { color: COLORS.primaryDark }]}>
          ₪{(result.totalCost / 2).toFixed(1)}
        </BlurredValue>
      </View>
      <View style={styles.carpoolBox}>
        <Text style={styles.carpoolIcon}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.carpoolLabel}>4 נוסעים</Text>
        <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.carpoolValue}>
          ₪{(result.totalCost / 4).toFixed(1)}
        </BlurredValue>
      </View>
    </View>

    {/* 3. Deep Financial Insights */}
    <Text style={styles.premiumSectionSubTitle}>תחזיות ובלאי רכב</Text>
    <View style={styles.premiumGrid}>
      <View style={styles.premiumGridItem}>
        <Text style={styles.premiumGridIcon}>📅</Text>
        <Text style={styles.premiumGridTitle}>תחזית שנתית</Text>
        <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.premiumGridValue}>
          ₪{yearlyProjection.toFixed(0)}
        </BlurredValue>
        <Text style={styles.premiumGridSub}>לפי 20 נסיעות בחודש</Text>
      </View>
      <View style={styles.premiumGridItem}>
        <Text style={styles.premiumGridIcon}>🔧</Text>
        <Text style={styles.premiumGridTitle}>עלות חודשית</Text>
        <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.premiumGridValue}>
          ₪{trueCost.toFixed(0)}
        </BlurredValue>
        <Text style={styles.premiumGridSub}>כולל בלאי, פחת וטיפולים</Text>
      </View>
    </View>

    {/* 4. Environmental Impact */}
    {!isElectricVehicle ? (
      <View style={styles.environmentCard}>
        <Text style={styles.environmentIcon}>🌍</Text>
        <View style={styles.environmentContent}>
          <Text style={styles.environmentTitle}>זיהום אוויר משוער</Text>
          <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.environmentValue}>
            {co2Emissions.toFixed(1)} ק״ג CO₂
          </BlurredValue>
          <Text style={styles.environmentNote}>פליטת פחמן פוטנציאלית בנסיעה זו</Text>
        </View>
      </View>
    ) : (
      <View style={[styles.environmentCard, { borderColor: COLORS.electric, backgroundColor: COLORS.accentLight }]}>
        <Text style={styles.environmentIcon}>⚡</Text>
        <View style={styles.environmentContent}>
          <Text style={styles.environmentTitle}>נסיעה ירוקה!</Text>
          <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={[styles.environmentValue, { color: COLORS.electric }]}>
            0 ק״ג CO₂
          </BlurredValue>
          <Text style={styles.environmentNote}>חסכת פליטת מזהמים לחלוטין</Text>
        </View>
      </View>
    )}

  </View>

  {/* 🔒 THE STICKY FADE-OUT CTA OVERLAY 🔒 */}
  {!isPremiumUnlocked && (
    <View style={styles.paywallFadeContainer}>
      <LinearGradient
        colors={['rgba(242, 242, 247, 0)', 'rgba(242, 242, 247, 0.8)', 'rgba(242, 242, 247, 1)']}
        style={styles.paywallGradient}
        pointerEvents="none"
      />
      <PulseUnlockCTA onPress={handleUnlockPremium} />
    </View>
  )}
</View>
{/* ======================================= */}

            <View style={{ height: 40 }} />
          </ScrollView>
        );

      default:
        return null;
    }
  };

  // ============================================
  // VIDEO AD LOADING SCREEN
  // ============================================
  
  // ============================================
  // UNLOCK PREMIUM AD SCREEN
  // ============================================
  if (showUnlockAd) {
    return (
      <PremiumUnlockAd
        loadingTitle="פותח נתונים מתקדמים 🚀"
        loadingSubtitle="מיד בסיום הסרטון התוצאות ייפתחו"
        onAdComplete={handleUnlockAdComplete}
        onAdError={(error: any) => {
          if (__DEV__) { console.log('Unlock Ad error:', error); }
          handleUnlockAdComplete(); // ממשיכים ופותחים את הנתונים גם אם יש שגיאה
        }}
      />
    );
  }
if (showVideoAd) {
    return (
      <View style={styles.adLoadingContainer}>
        <View style={styles.adLoadingContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.adLoadingText}>🎬 מכינים תוצאות...</Text>
          <Text style={styles.adLoadingSubtext}>
            זה יקח רק כמה שניות
          </Text>
          <Text style={styles.adLoadingNote}>
            צפייה בפרסומת קצרה תעזור לנו לשמור על האפליקציה חינמית 💚
          </Text>        
        </View>
        
        <VideoAd
          onAdComplete={handleAdComplete}
          onAdError={(error: any) => {
            if (__DEV__) { console.log('Ad error:', error); }
            handleAdComplete();
          }}
        />
      </View>
    );
  }
  

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧮 מחשבון עלות נסיעה</Text>
      </View>

      {/* Step indicator עבר למעלה להיות צמוד להדר */}
      {step < STEPS.length - 1 && (
        <StepIndicator
          currentStep={step}
          totalSteps={STEPS.length}
          labels={STEP_LABELS}
        />
      )}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      {/* הבאנר עבר לכאן - לתחתית המסך מעל המקלדת */}
      {Platform.OS !== 'web' && !showVideoAd && step < STEPS.length - 1 && (
        <View style={{ paddingBottom: Platform.OS === 'ios' ? 6 : 3, paddingTop: 1, alignItems: 'center' }}>
          <BannerAd key={`banner-step-${step}`} />
        </View>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}
// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  // Container & Layout
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    direction: "rtl", 
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsScrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Header
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
    textAlign: "center",
    writingDirection: "rtl",
  },

  // Banner Ad Styles
  topBannerAd: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  midBannerAd: {
    marginVertical: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomBannerAd: {
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Video Ad Loading
  adLoadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adLoadingContent: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxWidth: '85%',
  },
  adLoadingText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
    writingDirection: "rtl",
  },
  adLoadingSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    writingDirection: "rtl",
  },
  adLoadingNote: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
    writingDirection: "rtl",
  },

  // Step Indicator
  stepIndicatorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepDotsRow: {
    flexDirection: "row", 
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stepDotWrapper: {
    alignItems: "center",
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.textTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  stepDotCurrent: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.1 }],
  },
  stepDotNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  stepDotNumberActive: {
    color: COLORS.primary,
  },
  stepDotCheck: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  stepLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
    writingDirection: "rtl",
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  // Glass Card
  glassCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  stepCard: {
    marginTop: 16,
  },

  // Questions
  questionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  questionSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },

  // Presets
  presetsContainer: {
    marginBottom: 20,
  },
  presetsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 10,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  // Quick Chip
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    gap: 6,
  },
  quickChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  quickChipIcon: {
    fontSize: 14,
  },
  quickChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    writingDirection: "rtl",
  },
  quickChipTextActive: {
    color: COLORS.primary,
  },

  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  inputContainerError: {
    borderColor: COLORS.error,
    backgroundColor: "#FEF5F5",
  },
  inputIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    paddingVertical: 14,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  inputSuffix: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
    writingDirection: "rtl",
  },

  // Error
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    gap: 8,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: "500",
    writingDirection: "rtl",
  },

  // Tip
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FEF9E7",
    borderRadius: 12,
    gap: 10,
  },
  tipIcon: {
    fontSize: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    textAlign: "left", // תוקן מ-right
    lineHeight: 20,
    writingDirection: "rtl",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
    writingDirection: "rtl",
  },
  buttonArrow: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  buttonArrowBack: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
    writingDirection: "rtl",
  },
  calculateButton: {
    flex: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  calculateButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
    writingDirection: "rtl",
  },

  // Loading
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
    writingDirection: "rtl",
  },

  // Empty state
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 20,
    writingDirection: "rtl",
  },
  addVehicleButton: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  addVehicleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    writingDirection: "rtl",
  },

  // Vehicle Selector
  vehicleSelector: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  vehicleSelectorActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  selectedVehicle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedVehicleIcon: {
    fontSize: 28,
  },
  selectedVehicleInfo: {
    flex: 1,
  },
  selectedVehicleName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  selectedVehicleModel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    marginTop: 2,
    writingDirection: "rtl",
  },
  selectorArrow: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  placeholderVehicle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  placeholderIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  placeholderText: {
    flex: 1,
    fontSize: 18,
    color: COLORS.textTertiary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },

  // Consumption Preview
  consumptionPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accentLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  consumptionPreviewIcon: {
    fontSize: 18,
  },
  consumptionPreviewText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: "500",
    writingDirection: "rtl",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    paddingHorizontal: 20,
    maxHeight: "80%",
    direction: "rtl", 
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textTertiary,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 16,
    writingDirection: "rtl",
  },
  vehicleList: {
    paddingBottom: 16,
  },
  vehicleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginBottom: 10,
    gap: 12,
  },
  vehicleItemActive: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  vehicleItemIcon: {
    fontSize: 24,
  },
  vehicleItemInfo: {
    flex: 1,
  },
  vehicleItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  vehicleItemDetails: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    marginTop: 2,
    writingDirection: "rtl",
  },
  vehicleItemCheck: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  modalCloseButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.accent,
    writingDirection: "rtl",
  },

  // Price Helper
  priceHelperButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  priceHelperIcon: {
    fontSize: 16,
  },
  priceHelperText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  priceHelperArrow: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  priceHelperPanel: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  priceHelperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  priceHelperLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    writingDirection: "rtl",
  },
  priceHelperValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    textDecorationLine: "underline",
    writingDirection: "rtl",
  },
  priceHelperNote: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: 12,
    writingDirection: "rtl",
  },

  // Results
  mainResultCard: {
    marginTop: 16,
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 20,
    writingDirection: "rtl",
  },
  totalCostContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  totalCostValue: {
    fontSize: 48,
    fontWeight: "800",
    color: COLORS.primary,
    writingDirection: "rtl",
  },

  // Fuel Gauge
  fuelGaugeContainer: {
    width: "100%",
    alignItems: "center",
  },
  fuelGaugeTrack: {
    width: "100%",
    height: 20,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    overflow: "hidden",
  },
  fuelGaugeFill: {
    height: "100%",
    borderRadius: 10,
  },
  fuelGaugeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
    marginTop: 6,
  },
  fuelGaugeLabelLeft: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  fuelGaugeLabelRight: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  fuelGaugeIcon: {
    fontSize: 16,
  },
  fuelGaugeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 6,
    writingDirection: "rtl",
  },

  // Tank Usage Detail
  tankUsageDetail: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    alignItems: "center",
  },
  tankUsageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
    textAlign: "center",
    writingDirection: "rtl",
  },
  tankUsageValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
    writingDirection: "rtl",
  },
  tankUsagePercentage: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 2,
    writingDirection: "rtl",
  },
  tankUsageWarning: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.warning,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.warning,
    writingDirection: "rtl",
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    writingDirection: "rtl",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    writingDirection: "rtl",
  },
  metricSubValue: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
    writingDirection: "rtl",
  },

  // Vehicle Info Card
  vehicleInfoCard: {
    marginTop: 16,
    paddingVertical: 16,
  },
  vehicleInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  vehicleInfoIcon: {
    fontSize: 28,
  },
  vehicleInfoContent: {
    flex: 1,
  },
  vehicleInfoName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  vehicleInfoDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    marginTop: 2,
    writingDirection: "rtl",
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: "left", // תוקן מ-right
    paddingHorizontal: 4,
    writingDirection: "rtl",
  },

  // Comparisons
  comparisonsContainer: {
    gap: 12,
  },
  comparisonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 12,
  },
  comparisonCardSavings: {
    borderColor: COLORS.success,
    borderWidth: 2,
  },
  comparisonIcon: {
    fontSize: 28,
  },
  comparisonContent: {
    flex: 1,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  comparisonSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    marginTop: 2,
    writingDirection: "rtl",
  },
  comparisonCost: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    marginTop: 2,
    writingDirection: "rtl",
  },
  comparisonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  comparisonBadgeSavings: {
    backgroundColor: "#D1FAE5",
  },
  comparisonBadgeLoss: {
    backgroundColor: "#FEE2E2",
  },
  comparisonBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    writingDirection: "rtl",
  },
  comparisonBadgeTextSavings: {
    color: "#065F46",
  },
  comparisonBadgeTextLoss: {
    color: "#991B1B",
  },

  // Bus Fare Disclaimer
  busFareDisclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#0EA5E9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  busDisclaimerIcon: {
    fontSize: 14,
  },
  busDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "#075985",
    lineHeight: 16,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },

  // Projection Card
  projectionCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  projectionIcon: {
    fontSize: 32,
  },
  projectionContent: {
    flex: 1,
  },
  projectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  projectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    marginTop: 2,
    writingDirection: "rtl",
  },
  projectionValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.accent,
    textAlign: "left", // תוקן מ-right
    marginTop: 4,
    writingDirection: "rtl",
  },

  // Environment Card
  environmentCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: COLORS.success,
    borderWidth: 1,
    gap: 16,
  },
  environmentIcon: {
    fontSize: 32,
  },
  environmentContent: {
    flex: 1,
  },
  environmentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  environmentValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.success,
    textAlign: "left", // תוקן מ-right
    marginTop: 2,
    writingDirection: "rtl",
  },
  environmentNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    marginTop: 2,
    writingDirection: "rtl",
  },

  // Results Actions
  resultsActions: {
    marginTop: 24,
    gap: 12,
  },
  shareButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
    writingDirection: "rtl",
  },
  newCalculationButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newCalculationButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
    writingDirection: "rtl",
  },
  viewVehiclesButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  viewVehiclesButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    writingDirection: "rtl",
  },

  // Disclaimer Banner
  disclaimerBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  disclaimerIcon: {
    fontSize: 20,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 4,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#B45309",
    lineHeight: 16,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },

  // Attribution Footer
  attributionFooter: {
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    borderRadius: 8,
  },
  attributionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    lineHeight: 16,
    writingDirection: "rtl",
  },

  // Celebration
  celebrationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 20,
    zIndex: 100,
  },
  celebrationEmoji: {
    fontSize: 48,
  },

  // Toast
  toast: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textOnPrimary,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  toastClose: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
    opacity: 0.8,
  },

  // Driving Preferences
  preferenceSection: {
    marginBottom: 24,
  },
  preferenceSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: "left", // תוקן מ-right
    writingDirection: "rtl",
  },
  preferenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  preferenceCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    position: "relative",
  },
  preferenceCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  preferenceCardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  preferenceCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
    writingDirection: "rtl",
  },
  preferenceCardTitleActive: {
    color: COLORS.primary,
  },
  preferenceCardDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 14,
    writingDirection: "rtl",
  },
  preferenceCardCheck: {
    position: "absolute",
    top: 6,
    left: 6,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // Savings Card
  savingsCard: {
    marginTop: 16,
    backgroundColor: "#FFF9E6",
    borderColor: "#F59E0B",
    borderWidth: 2,
  },
  savingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  savingsIcon: {
    fontSize: 28,
  },
  savingsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    writingDirection: "rtl",
  },
  savingsSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "left", // תוקן מ-right
    marginBottom: 16,
    writingDirection: "rtl",
  },
  savingsAmount: {
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F59E0B",
    marginBottom: 16,
  },
  savingsValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#D97706",
    writingDirection: "rtl",
  },
  savingsPercent: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
    marginTop: 4,
    writingDirection: "rtl",
  },
  savingsTips: {
    marginBottom: 16,
  },
  savingsTipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "left", // תוקן מ-right
    marginBottom: 10,
    writingDirection: "rtl",
  },
  savingsTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 8,
    gap: 10,
  },
  savingsTipIcon: {
    fontSize: 18,
  },
  savingsTipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: "left",
    lineHeight: 20,
    writingDirection: "rtl",
  },
  savingsMonthly: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  savingsMonthlyLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    writingDirection: "rtl",
  },
  savingsMonthlyValue: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
    writingDirection: "rtl",
  },
  savingsMonthlyNote: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 4,
    writingDirection: "rtl",
  },
  // --- Premium Dashboard Card ---
  premiumDashboardCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    marginTop: 16,
    paddingTop: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    overflow: 'hidden',
  },
  totalCostHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  totalCostLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  totalCostValueDark: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.textPrimary, // שחור/אפור כהה במקום ירוק
    letterSpacing: -1,
    writingDirection: 'rtl',
  },
  dashboardGaugeSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FAFAFC', 
  },
  metricCard: {
    width: '50%',
    padding: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  metricIconContainer: {
    marginBottom: 8,
    opacity: 0.9,
  },
  
  // --- Modern Comparisons ---
  comparisonIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12, 
  },
  comparisonBadgeNeutral: {
    backgroundColor: COLORS.background,
  },
  comparisonBadgeTextNeutral: {
    color: COLORS.textSecondary,
  },
  
  // --- Clean Notice ---
  cleanNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  cleanNoticeText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    writingDirection: 'rtl',
  },
  
  // --- Bottom Actions ---
  bottomActionsContainer: {
    marginTop: 32,
    gap: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight + '30', // רקע ירוק שקוף ועדין
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  secondaryActionText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
  // --- Premium Paywall Section ---
  premiumSectionContainer: {
    position: 'relative',
    marginTop: 16,
  },
  premiumContent: {
    // Content behaves normally when unlocked
  },
  premiumContentBlurred: {
    opacity: 0.15, // Creates the unreadable "blur" effect
  },
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(242, 242, 247, 0.4)', // רקע חלבי עדין
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    zIndex: 10,
    marginTop: 45, // דוחף את זה טיפה מתחת לכותרת כדי שהיא תישאר קריאה
  },
  premiumLockCircle: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.card,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  premiumLockIcon: {
    fontSize: 28,
  },
  premiumOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    writingDirection: 'rtl',
  },
  premiumOverlayText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 20,
    writingDirection: 'rtl',
  },
  unlockPremiumButton: {
    backgroundColor: COLORS.textPrimary, // כפתור שחור למראה יוקרתי
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  unlockPremiumButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  // --- Premium Additional UI ---
  premiumSectionSubTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
    writingDirection: "rtl",
  },
  
  // Carpool Component
  carpoolContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  carpoolBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  carpoolBoxHighlight: {
    borderColor: COLORS.primaryLight,
    backgroundColor: '#F0FDF4', // ירוק עדין מאוד
  },
  carpoolIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  carpoolLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  carpoolValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Premium Grid (Projections & True Cost)
  premiumGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumGridItem: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumGridIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  premiumGridTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  premiumGridValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
  },
  premiumGridSub: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 4,
    writingDirection: 'rtl',
  },
  blurredValueWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  blurOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurLockCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Premium Paywall Section Updates ---
  premiumContentLocked: {
    paddingBottom: 80, 
  },
  
  // --- Sticky Fade-out Overlay ---
  paywallFadeContainer: {
    position: 'absolute',
    bottom: 0,
    left: -16, 
    right: -16, 
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  paywallGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  paywallActionContainer: {
    paddingBottom: 24,
    alignItems: 'center',
    width: '100%',
  },

  // --- Pulse Unlock Button ---
  pulseButton: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 24,
    marginBottom: 8,
  },
  pulseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    gap: 8,
  },
  pulseButtonIcon: {
    fontSize: 18,
  },
  pulseButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  pulseMicroCopy: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    writingDirection: 'rtl',
  },
});