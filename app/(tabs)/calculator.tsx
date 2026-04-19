// calculator.tsx - Travel Cost Calculator with Integrated Google Ads
import { 
  Share2, RefreshCw, Car, Bus, MapPin, 
  Zap, Droplets, TrendingUp, CircleDollarSign, 
  Info, AlertTriangle, ChevronRight, Leaf, Lock,
  Building, Navigation, Compass, Wind, Sun, CloudOff, Fuel,
  Plus, Calculator, Gem, Shuffle, Route, User, Users,
  Calendar, Wrench, Globe, PartyPopper, Film, Heart, Snowflake
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
  tankCapacity?: number; 
  year?: number; 
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
  iconNode?: React.ReactNode;
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
  isPremiumUnlocked: boolean;
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
const DEFAULT_FUEL_TANK_CAPACITY = 60; 
  
const DISTANCE_PRESETS = [10, 50, 100, 200];

const TAXI_COST_PER_KM = 6.5;

const BUS_FARE_BRACKETS = [
  { maxDistance: 15, fare: 8, label: "0-15 ק״מ" },
  { maxDistance: 40, fare: 14.5, label: "15-40 ק״מ" },
  { maxDistance: 75, fare: 19, label: "40-75 ק״מ" },
  { maxDistance: 120, fare: 19, label: "75-120 ק״מ" },
  { maxDistance: 225, fare: 32.5, label: "120-225 ק״מ" },
  { maxDistance: Infinity, fare: 74, label: "225+ ק״מ" },
];

const CO2_PER_LITER_GASOLINE = 2.31;
const CO2_PER_LITER_DIESEL = 2.68;

const STEPS = ["distance", "vehicle", "drivingPreferences", "fuelPrice", "results"] as const;
const STEP_LABELS = ["מרחק", "רכב", "העדפות", "מחיר", "תוצאות"];

// ============================================
// COLORS
// ============================================
const COLORS = {
  primary: "#34C759",
  primaryDark: "#248A3D",
  primaryLight: "#A8E6CF",
  primaryGradientStart: "#34C759",
  primaryGradientEnd: "#00C7BE",
  accent: "#007AFF",
  accentLight: "#E8F4FF",
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  background: "#F2F2F7",
  backgroundSecondary: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "rgba(0, 0, 0, 0.04)",
  textPrimary: "#000000",
  textSecondary: "#8E8E93",
  textTertiary: "#AEAEB2",
  textOnPrimary: "#FFFFFF",
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
const QuickChip: React.FC<QuickChipProps> = ({ label, onPress, isActive = false, iconNode }) => (
  <Pressable
    style={({ pressed }) => [
      styles.quickChip, 
      isActive ? styles.quickChipActive : { backgroundColor: '#F1F5F9', borderWidth: 0 },
      pressed && { opacity: 0.8 }
    ]}
    onPress={onPress}
  >
    {iconNode && <View style={{ marginRight: 6 }}>{iconNode}</View>}
    <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>
      {label}
    </Text>
  </Pressable>
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
// RESULT METRIC CARD
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

// ============================================
// COMPARISON CARD
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
// FUEL GAUGE COMPONENT
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
      useNativeDriver: false, 
    }).start();
  }, [clampedPercentage, animatedWidth]);

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
              width: widthInterpolated,
              backgroundColor: isElectric ? COLORS.electric : COLORS.fuel,
            },
          ]}
        />
      </View>
      <View style={styles.fuelGaugeLabels}>
        <Text style={styles.fuelGaugeLabelLeft}>0%</Text>
        <View style={styles.iconWrapperCentered}>
          {isElectric ? <Zap size={16} color={COLORS.textTertiary} /> : <Fuel size={16} color={COLORS.textTertiary} />}
        </View>
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
// BLURRED VALUE COMPONENT
// ============================================
const BlurredValue: React.FC<{
  isUnlocked: boolean;
  children: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
}> = ({ isUnlocked, children, textStyle }) => {
  if (isUnlocked) return <Text style={textStyle}>{children}</Text>;

  return (
    <View style={styles.blurredValueWrapper}>
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
            colors={['#10B981', '#059669']} 
            style={styles.pulseButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Gem size={18} color="#FFFFFF" />
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

  const [drivingStyle, setDrivingStyle] = useState<'eco' | 'normal' | 'aggressive'>('normal');
  const [tripType, setTripType] = useState<'city' | 'highway' | 'mixed'>('mixed');
  const [acUsage, setAcUsage] = useState<'always' | 'sometimes' | 'rarely'>('always');

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
    }
  }, [vehicles]);

  useEffect(() => {
    if (step >= 4) return; 
    
    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 500);

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

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles])
  );

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

    if (!vehicle) {
      setToastMessage({ text: "בחר רכב", type: "error" });
      return;
    }

    const avgConsumption = vehicle.avgConsumption ?? 0;
    if (avgConsumption <= 0) {
      setToastMessage({ text: LEGAL_UI_STRINGS.errors.invalidConsumption, type: "error" });
      return;
    }

    const p = parseFloat(fuelPrice);
    if (vehicle.fueltype !== "Electric" && (isNaN(p) || p <= 0 || p > 100)) {
      setToastMessage({ text: LEGAL_UI_STRINGS.errors.invalidPrice, type: "error" });
      triggerShake();
      return;
    }

    let calculation: CalculationResult;

    const vehicleAge = calculateVehicleAge(vehicle.year || new Date().getFullYear());
    const fuelTypeNormalized = vehicle.fueltype === "Electric" ? "Electric"
      : vehicle.fueltype === "Diesel" ? "Diesel"
      : "Gasoline";

    const baseConsumptionForAdjustment = vehicle.fueltype === "Electric"
      ? avgConsumption * 100  
      : avgConsumption;       

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
      const kwhPer100Km = adjustedConsumption;
      const energyConsumed = (d / 100) * kwhPer100Km;
      const pricePerKwh = parseFloat(electricityPrice);
      const totalCost = energyConsumed * pricePerKwh;
      const costPerKm = totalCost / d;
      const kwhPerKm = kwhPer100Km / 100;

      calculation = {
        totalCost,
        consumption: kwhPerKm,  
        costPerKm,
        fuelConsumed: energyConsumed,
        energyType: "electricity",
        distance: d,
        adjustmentBreakdown: adjustmentResult.breakdown,
        totalAdjustmentFactor: adjustmentResult.totalAdjustmentFactor,
        baseConsumption: baseConsumptionForAdjustment,
      };
    } else {
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
        const currentCountStr = await AsyncStorage.getItem("calculationCount");
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        const nextCount = currentCount + 1;
        await AsyncStorage.setItem("calculationCount", nextCount.toString());

        if (nextCount % 2 === 0) {
          setShowVideoAd(true);
        } else {
          handleAdComplete(); 
        }
      } catch (error) {
        handleAdComplete();
      }
    } else {
      handleAdComplete(); 
    }
  };

  // ============================================
  // AD COMPLETE HANDLER
  // ============================================
  const handleAdComplete = () => {
    setShowVideoAd(false);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 1000);

    AsyncStorage.removeItem("calculatorProgress");
    next(); 
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
    setToastMessage({ text: "הנתונים המתקדמים נפתחו בהצלחה!", type: "success" });
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
    setIsPremiumUnlocked(false); 
  };

  // ============================================
  // CALCULATE COMPARISONS
  // ============================================
  const getTaxiCost = (dist: number) => dist * TAXI_COST_PER_KM;

  const getBusCostDetails = (dist: number): { fare: number; bracket: string } => {
    for (const bracket of BUS_FARE_BRACKETS) {
      if (dist <= bracket.maxDistance) {
        return { fare: bracket.fare, bracket: bracket.label };
      }
    }
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
  const getVehicleIcon = (fuelType: string, size = 24, color = COLORS.textPrimary) => {
    switch (fuelType) {
      case "Electric": return <Zap size={size} color={color} />;
      case "Diesel": return <Droplets size={size} color={color} />;
      default: return <Fuel size={size} color={color} />;
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <MapPin size={24} color={COLORS.textPrimary} />
              <Text style={[styles.questionTitle, { marginBottom: 0 }]}>מה המרחק?</Text>
            </View>
            <Text style={styles.questionSubtitle}>הכנס מרחק בקילומטרים (עד 5000)</Text>

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

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={[
                styles.inputContainer,
                getDistanceError(distance) && styles.inputContainerError,
              ]}>
                <Navigation size={20} color={COLORS.textTertiary} />
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
                <AlertTriangle size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{getDistanceError(distance)}</Text>
              </View>
            )}

            <View style={styles.tipContainer}>
              <Info size={16} color="#0369A1" />
              <Text style={[styles.tipText, { color: '#0369A1' }]}>
                אפשר לבדוק מרחק מדויק דרך Waze או Google Maps
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <Car size={24} color={COLORS.primary} />
              <Text style={[styles.questionTitle, { marginBottom: 0 }]}>בחר רכב</Text>
            </View>
            <Text style={styles.questionSubtitle}>בחר את הרכב שלך מהרשימה</Text>

            {isLoadingVehicles ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>טוען רכבים...</Text>
              </View>
            ) : vehicles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Car size={48} color={COLORS.primary} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>אין רכבים שמורים</Text>
                <TouchableOpacity
                  style={[styles.addVehicleButton, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => router.push("/addVehicle")}
                >
                  <Plus size={18} color={COLORS.primary} />
                  <Text style={styles.addVehicleButtonText}>הוסף רכב חדש</Text>
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
                      <View style={styles.iconWrapperCentered}>
                        {getVehicleIcon(vehicle.fueltype, 28, COLORS.primary)}
                      </View>
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
                      <Car size={24} color={COLORS.primary} style={{ opacity: 0.5 }} />
                      <Text style={styles.placeholderText}>בחר רכב</Text>
                      <Text style={styles.selectorArrow}>▼</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {vehicle?.avgConsumption && distance && (
                  <View style={styles.consumptionPreview}>
                    <View style={{ marginRight: 8 }}>
                      {vehicle.fueltype === "Electric" ? (
                        <Zap size={18} color={COLORS.primary} />
                      ) : (
                        <Fuel size={18} color={COLORS.primary} />
                      )}
                    </View>
                    <Text style={styles.consumptionPreviewText}>
                      {vehicle.fueltype === "Electric"
                        ? `צריכה משוערת: ${(parseFloat(distance) * vehicle.avgConsumption).toFixed(2)} kWh`
                        : `צריכה משוערת: ${(parseFloat(distance) / vehicle.avgConsumption).toFixed(1)} ליטרים`}
                    </Text>
                  </View>
                )}

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
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 8 }}>
                        <Car size={22} color={COLORS.primary} />
                        <Text style={[styles.modalTitle, { marginBottom: 0 }]}>בחר רכב</Text>
                      </View>
                      
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
                            <View style={styles.iconWrapperCentered}>
                              {getVehicleIcon(item.fueltype, 24, COLORS.primary)}
                            </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <Compass size={24} color={COLORS.textPrimary} />
              <Text style={[styles.questionTitle, { marginBottom: 0 }]}>העדפות נהיגה</Text>
            </View>
            <Text style={styles.questionSubtitle}>
              ספר לנו על הרגלי הנהיגה שלך לחישוב מדויק יותר
            </Text>

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
                  <View style={{ marginBottom: 8 }}>
                    <Leaf size={28} color={drivingStyle === 'eco' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
                  <Text style={[
                    styles.preferenceCardTitle,
                    drivingStyle === 'eco' && styles.preferenceCardTitleActive,
                  ]}>
                    חסכוני
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    האצה רכה, נהיגה רגועה
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    drivingStyle === 'normal' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setDrivingStyle('normal')}
                >
                  <View style={{ marginBottom: 8 }}>
                    <Car size={28} color={drivingStyle === 'normal' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
                  <Text style={[
                    styles.preferenceCardTitle,
                    drivingStyle === 'normal' && styles.preferenceCardTitleActive,
                  ]}>
                    רגיל
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    נהיגה סטנדרטית
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.preferenceCard,
                    drivingStyle === 'aggressive' && styles.preferenceCardActive,
                  ]}
                  onPress={() => setDrivingStyle('aggressive')}
                >
                  <View style={{ marginBottom: 8 }}>
                    <Zap size={28} color={drivingStyle === 'aggressive' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
                  <Text style={[
                    styles.preferenceCardTitle,
                    drivingStyle === 'aggressive' && styles.preferenceCardTitleActive,
                  ]}>
                    ספורט
                  </Text>
                  <Text style={styles.preferenceCardDesc}>
                    האצה מהירה, נהיגה דינמית
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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
                  <View style={{ marginBottom: 8 }}>
                    <Building size={28} color={tripType === 'city' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
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
                  <View style={{ marginBottom: 8 }}>
                    <Shuffle size={28} color={tripType === 'mixed' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
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
                  <View style={{ marginBottom: 8 }}>
                    <Route size={28} color={tripType === 'highway' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
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
                  <View style={{ marginBottom: 8 }}>
                    <Snowflake size={28} color={acUsage === 'always' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
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
                  <View style={{ marginBottom: 8 }}>
                    <Sun size={28} color={acUsage === 'sometimes' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
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
                  <View style={{ marginBottom: 8 }}>
                    <CloudOff size={28} color={acUsage === 'rarely' ? COLORS.primary : COLORS.textTertiary} />
                  </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              {isElectric ? <Zap size={24} color={COLORS.primary} /> : <Fuel size={24} color={COLORS.primary} />}
              <Text style={[styles.questionTitle, { marginBottom: 0 }]}>
                מחיר {priceType}
              </Text>
            </View>   
            <Text style={styles.questionSubtitle}>
              הכנס מחיר ל{priceUnit}
            </Text>

            <TouchableOpacity
              style={styles.priceHelperButton}
              onPress={() => setShowPriceHelper(!showPriceHelper)}
            >
              <Info size={16} color={COLORS.primary} style={{ marginLeft: 4 }} />
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Fuel size={16} color={COLORS.primary} />
                    <Text style={styles.priceHelperLabel}>בנזין 95:</Text>
                  </View>
                  <TouchableOpacity onPress={() => setFuelPrice("7.36")}>
                    <Text style={styles.priceHelperValue}>₪7.36</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.priceHelperRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Droplets size={16} color={COLORS.primary} />
                    <Text style={styles.priceHelperLabel}>סולר:</Text>
                  </View>
                  <TouchableOpacity onPress={() => setFuelPrice("9.58")}>
                    <Text style={styles.priceHelperValue}>₪9.58</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.priceHelperRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Zap size={16} color={COLORS.primary} />
                    <Text style={styles.priceHelperLabel}>חשמל:</Text>
                  </View>
                  <TouchableOpacity onPress={() => setFuelPrice("0.60")}>
                    <Text style={styles.priceHelperValue}>₪0.60/kWh</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.priceHelperNote}>
                  לחץ על מחיר להזנה אוטומטית
                </Text>
              </View>
            )}

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={styles.inputContainer}>
                <CircleDollarSign size={20} color={COLORS.primary} style={{ marginLeft: 4 }} />
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

            {!isElectric && (
              <View style={styles.presetsContainer}>
                <Text style={styles.presetsLabel}>בחירה מהירה:</Text>
                <View style={styles.presetsRow}>
                  <QuickChip
                    label="₪7.36"
                    iconNode={<Fuel size={16} color={fuelPrice === "7.36" ? COLORS.primary : COLORS.textSecondary} />}
                    onPress={() => setFuelPrice("7.36")}
                    isActive={fuelPrice === "7.36"}
                  />
                  <QuickChip
                    label="₪9.58"
                    iconNode={<Droplets size={16} color={fuelPrice === "9.58" ? COLORS.primary : COLORS.textSecondary} />}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Calculator size={20} color="#FFF" />
                  <Text style={styles.calculateButtonText}>חשב עלות</Text>
                </View>
              </TouchableOpacity>
            </View>
          </GlassCard>
        );

      // ========================================
      // STEP 5: RESULTS (Premium UI)
      // ========================================
      case "results":
        if (!result || !vehicle) return null;

        const taxiCost = getTaxiCost(result.distance);
        const busCostDetails = getBusCostDetails(result.distance);
        const busCost = busCostDetails.fare;
        
        const monthlyProjection = getMonthlyProjection(result.totalCost);
        const yearlyProjection = monthlyProjection * 12;
        const isElectricVehicle = result.energyType === "electricity";
        const co2Emissions = getCO2Emissions(result.fuelConsumed, vehicle.fueltype);
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
                <View style={styles.iconWrapperCentered}>
                  <PartyPopper size={64} color={COLORS.primary} />
                </View>
              </View>
            )}

            <View style={styles.premiumDashboardCard}>
              
              <View style={styles.totalCostHeader}>
                <Text style={styles.totalCostLabel}>עלות הנסיעה שלך</Text>
                <AnimatedNumber
                  value={result.totalCost}
                  prefix="₪"
                  style={styles.totalCostValueDark}
                  duration={1500}
                />
              </View>

              <View style={styles.dashboardGaugeSection}>
                <FuelGauge
                  percentage={fuelGaugePercentClamped}
                  isElectric={isElectricVehicle}
                />
              </View>

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

            <BannerAd style={styles.midBannerAd} />

            {/* ======================================= */}
            {/* 🔒 PREMIUM SECTION (Paywall/Blurred) 🔒 */}
            {/* ======================================= */}
            <View style={styles.premiumSectionContainer}>
              <Text style={styles.sectionTitle}>תובנות מתקדמות (Premium)</Text>

              <View style={[styles.premiumContent, !isPremiumUnlocked && styles.premiumContentLocked]}>
                
                {/* Comparisons */}
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

                {/* Carpool Splitter */}
                <Text style={styles.premiumSectionSubTitle}>חלוקת תשלום (קארפול)</Text>
                <View style={styles.carpoolContainer}>
                  <View style={styles.carpoolBox}>
                    <View style={{ marginBottom: 6 }}>
                      <User size={20} color={COLORS.textPrimary} />
                    </View>
                    <Text style={styles.carpoolLabel}>נוסע יחיד</Text>
                    <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.carpoolValue}>
                      ₪{result.totalCost.toFixed(1)}
                    </BlurredValue>
                  </View>
                  <View style={[styles.carpoolBox, styles.carpoolBoxHighlight]}>
                    <View style={{ marginBottom: 6 }}>
                      <Users size={20} color={COLORS.primaryDark} />
                    </View>
                    <Text style={styles.carpoolLabel}>זוג (חצי)</Text>
                    <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={[styles.carpoolValue, { color: COLORS.primaryDark }]}>
                      ₪{(result.totalCost / 2).toFixed(1)}
                    </BlurredValue>
                  </View>
                  <View style={styles.carpoolBox}>
                    <View style={{ marginBottom: 6 }}>
                      <Users size={24} color={COLORS.textPrimary} />
                    </View>
                    <Text style={styles.carpoolLabel}>4 נוסעים</Text>
                    <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.carpoolValue}>
                      ₪{(result.totalCost / 4).toFixed(1)}
                    </BlurredValue>
                  </View>
                </View>

                {/* Deep Financial Insights */}
                <Text style={styles.premiumSectionSubTitle}>תחזיות ובלאי רכב</Text>
                <View style={styles.premiumGrid}>
                  <View style={styles.premiumGridItem}>
                    <View style={{ marginBottom: 8 }}>
                      <Calendar size={24} color={COLORS.textPrimary} />
                    </View>
                    <Text style={styles.premiumGridTitle}>תחזית שנתית</Text>
                    <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.premiumGridValue}>
                      ₪{yearlyProjection.toFixed(0)}
                    </BlurredValue>
                    <Text style={styles.premiumGridSub}>לפי 20 נסיעות בחודש</Text>
                  </View>
                  <View style={styles.premiumGridItem}>
                    <View style={{ marginBottom: 8 }}>
                      <Wrench size={24} color={COLORS.textPrimary} />
                    </View>
                    <Text style={styles.premiumGridTitle}>עלות חודשית</Text>
                    <BlurredValue isUnlocked={isPremiumUnlocked} textStyle={styles.premiumGridValue}>
                      ₪{trueCost.toFixed(0)}
                    </BlurredValue>
                    <Text style={styles.premiumGridSub}>כולל בלאי, פחת וטיפולים</Text>
                  </View>
                </View>

                {/* Environmental Impact */}
                {!isElectricVehicle ? (
                  <View style={styles.environmentCard}>
                    <View style={{ marginRight: 16 }}>
                      <Globe size={32} color={COLORS.success} />
                    </View>
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
                    <View style={{ marginRight: 16 }}>
                      <Zap size={32} color={COLORS.electric} />
                    </View>
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
            <View style={{ height: 40 }} />
          </ScrollView>
        );

      default:
        return null;
    }
  };

  if (showUnlockAd) {
    return (
      <PremiumUnlockAd
        loadingTitle="פותח נתונים מתקדמים"
        loadingSubtitle="מיד בסיום הסרטון התוצאות ייפתחו"
        onAdComplete={handleUnlockAdComplete}
        onAdError={(error: any) => {
          if (__DEV__) { console.log('Unlock Ad error:', error); }
          handleUnlockAdComplete(); 
        }}
      />
    );
  }

  if (showVideoAd) {
    return (
      <View style={styles.adLoadingContainer}>
        <View style={styles.adLoadingContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <Film size={24} color={COLORS.textPrimary} />
            <Text style={[styles.adLoadingText, { marginTop: 0 }]}>מכינים תוצאות...</Text>
          </View>
          
          <Text style={styles.adLoadingSubtext}>
            זה יקח רק כמה שניות
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12 }}>
            <Text style={[styles.adLoadingNote, { marginTop: 0 }]}>
              צפייה בפרסומת קצרה תעזור לנו לשמור על האפליקציה חינמית
            </Text>
            <Heart size={14} color={COLORS.primary} />
          </View>
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
  
  return (
    <KeyboardAvoidingView style={styles.container} 
    behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <LinearGradient 
        colors={[COLORS.primary, COLORS.primaryGradientEnd]} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={styles.header}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <Calculator size={28} color={COLORS.textOnPrimary} />
          <Text style={[styles.headerTitle, { marginTop: 0 }]}>מחשבון עלות נסיעה</Text>
        </View>
      </LinearGradient>

      {step < STEPS.length - 1 && (
        <StepIndicator
          currentStep={step}
          totalSteps={STEPS.length}
          labels={STEP_LABELS}
        />
      )}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      {Platform.OS !== 'web' && !showVideoAd && step < STEPS.length - 1 && (
        <View style={{ paddingBottom: Platform.OS === 'ios' ? 6 : 3, paddingTop: 1, alignItems: 'center' }}>
          <BannerAd key={`banner-step-${step}`} />
        </View>
      )}

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
  questionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  questionSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  presetsContainer: {
    marginBottom: 20,
  },
  presetsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 10,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
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
  quickChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    writingDirection: "rtl",
  },
  quickChipTextActive: {
    color: COLORS.primary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: COLORS.error,
    backgroundColor: "#FEF5F5",
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    paddingVertical: 14,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  inputSuffix: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
    writingDirection: "rtl",
  },
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
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: "500",
    writingDirection: "rtl",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FEF9E7",
    borderRadius: 12,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    textAlign: "left", 
    lineHeight: 20,
    writingDirection: "rtl",
  },
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
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 10,
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
  selectedVehicleInfo: {
    flex: 1,
  },
  selectedVehicleName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  selectedVehicleModel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "left", 
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
  placeholderText: {
    flex: 1,
    fontSize: 18,
    color: COLORS.textTertiary,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  consumptionPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accentLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  consumptionPreviewText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: "500",
    writingDirection: "rtl",
  },
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
    paddingBottom: Platform.OS === "ios" ? 70 : 50,
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
  vehicleItemInfo: {
    flex: 1,
  },
  vehicleItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  vehicleItemDetails: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "left", 
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
  priceHelperButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  priceHelperText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "left", 
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
  fuelGaugeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 6,
    writingDirection: "rtl",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: "left", 
    paddingHorizontal: 4,
    writingDirection: "rtl",
  },
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
  comparisonContent: {
    flex: 1,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  comparisonSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "left", 
    marginTop: 2,
    writingDirection: "rtl",
  },
  comparisonCost: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "left", 
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
  comparisonBadgeNeutral: {
    backgroundColor: COLORS.background,
  },
  comparisonBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    writingDirection: "rtl",
  },
  comparisonBadgeTextSavings: {
    color: "#065F46",
  },
  comparisonBadgeTextNeutral: {
    color: COLORS.textSecondary,
  },
  environmentCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: COLORS.success,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  environmentContent: {
    flex: 1,
  },
  environmentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "left", 
    writingDirection: "rtl",
  },
  environmentValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.success,
    textAlign: "left", 
    marginTop: 2,
    writingDirection: "rtl",
  },
  environmentNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "left", 
    marginTop: 2,
    writingDirection: "rtl",
  },
  celebrationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 20,
    zIndex: 100,
  },
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
    textAlign: "left", 
    writingDirection: "rtl",
  },
  toastClose: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
    opacity: 0.8,
  },
  preferenceSection: {
    marginBottom: 24,
  },
  preferenceSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: "left", 
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
    color: COLORS.textPrimary, 
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
  comparisonIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12, 
  },
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
    backgroundColor: COLORS.primaryLight + '30', 
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  secondaryActionText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
  premiumSectionContainer: {
    position: 'relative',
    marginTop: 16,
  },
  premiumContent: {},
  premiumSectionSubTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
    writingDirection: "rtl",
  },
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
    backgroundColor: '#F0FDF4', 
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
  premiumContentLocked: {
    paddingBottom: 80, 
  },
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
  iconWrapperCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});