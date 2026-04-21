// app/AddVehicleByPlate.tsx 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import 'expo-router/entry';
import React, { useEffect, useState } from "react";
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
import { calculateEVConsumptionAdvanced } from "../lib/data/advancedEvConsumption";
import { getKnownEngineCCs, lookupEngineCC } from "../lib/data/engineDatabase";
import {
  calculateICEConsumptionEnhanced,
  estimateWeightBySegment,
  fetchFallbackVehicleData,
  fetchWLTPData,
  getSmartCCFallback,
  translateBrandToEnglish
} from "../lib/data/fuelData";
import { Vehicle } from "../lib/data/vehiclesData";
import { estimateVehicleWeight } from "../lib/data/vehicleWeightLookup";
import Toast from "./Toast";

// Unified Lucide Icons
import {
  Car,
  ChevronLeft,
  Sparkles,
  Search,
  Zap,
  Activity,
  ShieldCheck
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

const VEHICLE_APIS = [
  { type: "car", id: "053cea08-09bc-40ec-8f7a-156f0677aff3" },
  { type: "motorcycle", id: "bf9df4e2-d90d-4c0a-a400-19e15af8e95f" },
  { type: "truck", id: "cd3acc5c-03c3-4c89-9c54-d40f93c0d790" },
] as const;

type VehicleType = typeof VEHICLE_APIS[number]["type"];
type FuelType = "Electric" | "Gasoline" | "Diesel" | "PHEV" | "Unknown";
const MAX_WIDTH = 480;

function detectFuelTypeCanonical(record: any): FuelType {
  const raw = (record?.sug_delek_nm || "").toString().trim().toLowerCase();
  if (!raw) return "Unknown";

  if ((raw.includes('חשמל') && raw.includes('בנזין')) ||
       raw.includes('phev') ||
       raw.includes('plug-in') ||
       raw.includes('פלאג')) {
        console.log('---------------------- Detected PHEV fuel type based on:', raw);
    return "PHEV";
  }

  const tokens = raw.split(/[\s,\/\-()]+/).filter(Boolean);
  const evKeywords = ["חשמל","אלקטרי","ev","electric","battery","bev"];
  const dieselKeywords = ["דיזל","diesel","dsl"];
  const gasKeywords = ["בנזין","gasoline","petrol","gas","כ״א","כחול לבן"];

  if (tokens.some((t: string) => evKeywords.includes(t))) return "Electric";
  if (tokens.some((t: string) => dieselKeywords.includes(t))) return "Diesel";
  if (tokens.some((t: string) => gasKeywords.includes(t))) return "Gasoline";

  if (raw.includes("ev") || raw.includes("battery")) return "Electric";
  if (raw.includes("diesel")) return "Diesel";
  if (raw.includes("benz") || raw.includes("benzin") || raw.includes("gas")) return "Gasoline";

  return "Unknown";
}

function parseIntSafeLocal(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseFloatSafeLocal(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;

  const str = String(value).trim();

  if (/[a-zA-Z]/.test(str)) {
    if (__DEV__) {
      console.warn(`⚠️  Weight field contains letters, likely VIN or text: "${str}"`);
      console.warn(`   Rejecting this value - will try fallback weight sources`);
    }
    return undefined;
  }

  const n = parseFloat(str.replace(',', '.'));

  if (Number.isFinite(n)) {
    const isWeightField = str.length >= 3 && n >= 100;
    if (isWeightField && (n < 80 || n > 15000)) {
      if (__DEV__) {
        console.warn(`Invalid weight value detected: ${n}kg (outside 80-15000kg range)`);
      }
      return undefined;
    }
    return n;
  }

  return undefined;
}

type DataGovResult = { record: Record<string, any>; type: VehicleType; degem_nm?: string } | null;

export async function fetchRecordByPlate(plate: string): Promise<DataGovResult> {
  const promises = VEHICLE_APIS.map(async (api) => {
    const filtersJson = JSON.stringify({ mispar_rechev: plate });
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${api.id}&filters=${encodeURIComponent(filtersJson)}&limit=1`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const rec = json?.result?.records?.[0];
      if (rec) {
        const degem_nm = rec.degem_nm || rec.degem || rec.model_code;
        return { record: rec, type: api.type, degem_nm: degem_nm ? String(degem_nm).trim() : undefined };
      }
      return null;
    } catch {
      console.warn('fetchRecordByPlate error for', api.id);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.find(r => r !== null) ?? null;
}

export async function parseRelevantFields(record: Record<string, any>, _degem_nm?: string, vehicleType?: VehicleType) {
  const fuelTypeRaw = record.sug_delek_nm ?? record.fuel ?? '';
  const fuelType = detectFuelTypeCanonical({ sug_delek_nm: fuelTypeRaw });

  const brand = (record.tozeret_nm || record.tozeret || '').toString().trim();
  const model = (record.kinuy_mishari || record.degem_nm || '').toString().trim();
  const year = parseIntSafeLocal(record.shnat_yitzur) ?? undefined;

  if (__DEV__) {
    console.log('\n⚖️  WEIGHT EXTRACTION STRATEGY:');
    console.log(`   Vehicle Type: ${vehicleType || 'unknown'}`);
   
  }

  let mishkal_kolel: number | undefined;

  if (vehicleType === 'motorcycle') {
    if (__DEV__) {
      console.log('🏍️  Motorcycle detected: using primary API for mishkal_kolel');
    }
    mishkal_kolel = parseFloatSafeLocal(
      record.mishkal_kolel ??
      record.mishkal_atzmi ??
      record.total_weight ??
      record.gross_weight ??
      record.gvwr ??
      record.mishkal
    );

    if (mishkal_kolel) {
      if (__DEV__) console.log(`✅ mishkal_kolel (gross weight) from primary API: ${mishkal_kolel}kg`);
    } else {
      if (__DEV__) console.log('⚠️  mishkal_kolel not found in primary API');
    }
  } else {
    if (__DEV__) {
      console.log('🚗 Car/Truck detected: extracting weight from primary API');
      console.log('   (Fallback via fetchFallbackVehicleData will be used in main flow if needed)');
    }

    mishkal_kolel = parseFloatSafeLocal(
      record.mishkal_kolel ??
      record.mishkal_atzmi ??
      record.total_weight ??
      record.gross_weight ??
      record.gvwr ??
      record.mishkal
    );

    if (mishkal_kolel) {
      if (__DEV__) console.log(`✅ mishkal_kolel (gross weight) from primary API: ${mishkal_kolel}kg`);
      if (__DEV__) console.log(`📊 FINAL WEIGHT: mishkal_kolel=${mishkal_kolel || 'N/A'}kg\n`);
    } else {
      //if (__DEV__) console.log('⚠️  mishkal_kolel not found in primary API - will use fallback');
    }
  }

  

  const weightKg = mishkal_kolel ?? parseFloatSafeLocal(record.weight_kg ?? record.mass_kg) ?? undefined;
  const batteryCapacity = parseFloatSafeLocal(record.battery_capacity ?? record.battery_kwh ?? record.batt_kwh ?? record.battery) ?? undefined;
  const rangeKm = parseFloatSafeLocal(record.range_km ?? record.range) ?? undefined;

  return {
    fuelType,
    brand,
    model,
    year,
    mishkal_kolel,
    weightKg,
    batteryCapacity,
    rangeKm,
  } as const;
}

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

function validateKmPerL(value?: number, vehicleType?: VehicleType): number | undefined {
  if (!value || value <= 0) return undefined;
  if (vehicleType === "motorcycle" && value > 60) return 60;
  if (vehicleType === "truck" && value > 20) return 20;
  if (value > 30) return 30;
  return value;
}

const engineCodeCache = new Map<string, number | null>();

function extractCCDirect(record: Record<string, any>): number | undefined {
  const ccFields = [
    'nefach_manoa',
    'kobah_pnimiyt',
    'nefach',
    'volume_cm3',
    'displacement_cc',
    'engine_displacement',
    'engine_cc',
    'cubic_capacity',
    'displacement',
    'cc',
  ];

  for (const field of ccFields) {
    const value = record[field];
    if (!value || value === '0' || value === 0) continue;

    const strValue = String(value).trim();
    if (strValue === '') continue;

    if (/[a-zA-Z]/.test(strValue) && strValue.length > 6) continue;

    const cleanedValue = strValue.replace(/[^\d]/g, '');
    if (cleanedValue === '') continue;

    const cc = parseInt(cleanedValue, 10);
    if (Number.isFinite(cc) && cc >= 50 && cc <= 15000) {
      if (__DEV__) console.log(`   ✅ ${field}: ${cc}cc`);
      return cc;
    }
  }

  return undefined;
}

async function searchCCByEngineCode(
  engineCode: string,
  vehicleType: VehicleType
): Promise<number | undefined> {
  if (__DEV__) console.log(`🔍 Searching API for engine: "${engineCode}"`);

  const apiId = VEHICLE_APIS.find(api => api.type === vehicleType)?.id;
  if (!apiId) return undefined;

  const filtersJson = JSON.stringify({ degem_manoa: engineCode });
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${apiId}&filters=${encodeURIComponent(filtersJson)}&limit=10`;

  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;

    const data = await response.json();
    const records = data?.result?.records || [];

    for (const record of records) {
      const cc = extractCCDirect(record);
      if (cc) return cc;
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
}

async function searchCCByEngineCodeCached(
  engineCode: string,
  vehicleType: VehicleType
): Promise<number | undefined> {
  const cacheKey = `${vehicleType}:${engineCode}`;

  if (engineCodeCache.has(cacheKey)) {
    return engineCodeCache.get(cacheKey) || undefined;
  }

  const cc = await searchCCByEngineCode(engineCode, vehicleType);
  engineCodeCache.set(cacheKey, cc || null);
  return cc;
}

export async function extractEngineCC(
  record: Record<string, any>,
  vehicleType: VehicleType
): Promise<number | undefined> {
  if (__DEV__) console.log('\n🔍 CC Extraction - Engine:', record.degem_manoa ?? 'N/A');

  const engineCode = record.degem_manoa || record.engine_model || record.engine_type;
  const brand = record.tozeret_nm || record.brand;
  const model = record.kinuy_mishari || record.degem_nm || record.model;

  const directCC = extractCCDirect(record);
  if (directCC) return directCC;

  if (engineCode && String(engineCode).trim().length > 1) {
    const apiCC = await searchCCByEngineCodeCached(String(engineCode).trim(), vehicleType);
    if (apiCC) return apiCC;
  }

  if (engineCode && String(engineCode).trim().length > 1) {
    const staticCC = lookupEngineCC(String(engineCode).trim());
    if (staticCC) return staticCC;
  }

  if (brand && model) {
    const brandModelCCs = getKnownEngineCCs(brand, model);
    if (brandModelCCs && brandModelCCs.length > 0) {
      const sorted = [...brandModelCCs].sort((a, b) => a - b);
      const midIndex = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? Math.round((sorted[midIndex - 1] + sorted[midIndex]) / 2)
        : sorted[midIndex];
    }
  }

  return undefined;
}

function estimateEngineCCFromWeight(
  weight: number | undefined,
  vehicleType: VehicleType
): number {
  if (!weight) {
    if (vehicleType === 'motorcycle') return 250;
    if (vehicleType === 'truck') return 3000;
    return 1600;
  }

  if (vehicleType === 'motorcycle') {
    if (weight < 150) return 125;
    if (weight < 200) return 150;
    if (weight < 250) return 250;
    if (weight < 350) return 400;
    return 650;
  }

  if (vehicleType === 'truck') {
    if (weight < 4000) return 3000;
    if (weight < 6000) return 4000;
    if (weight < 8000) return 5000;
    if (weight < 10000) return 7000;
    return 9000;
  }

  if (weight < 1000) return 1000;
  if (weight < 1200) return 1200;
  if (weight < 1400) return 1400;
  if (weight < 1600) return 1600;
  if (weight < 1800) return 2000;
  if (weight < 2200) return 2500;
  return 3000;
}

export function adjustCCByYear(baseCC: number, year: number | undefined): number {
  if (!year) return baseCC;
  if (year >= 2020) return Math.round(baseCC * 0.85);
  if (year >= 2010) return Math.round(baseCC * 0.95);
  return baseCC;
}

function calculateSmartEngineCC(params: {
  apiCC?: number;
  weight?: number;
  year?: number;
  vehicleType: VehicleType;
}): number {
  const { apiCC, weight, year, vehicleType } = params;

  if (apiCC) return apiCC;

  const estimatedCC = estimateEngineCCFromWeight(weight, vehicleType);
  return adjustCCByYear(estimatedCC, year);
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

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
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
      const found = await fetchRecordByPlate(plateTrimmed);
      if (!found) {
        setToastMessage("לא נמצאו נתונים עבור מספר זה באף מאגר");
        return;
      }

        if (__DEV__) {
          console.log(`\n✅ Found: ${found.record.tozeret_nm || found.record.tozeret} ${found.record.degem_nm || found.record.kinuy_mishari}`);
          console.log(`   Type: ${found.type} | Engine: ${found.record.degem_manoa} | Year: ${found.record.shnat_yitzur}`);
        }

        const parsed = await parseRelevantFields(found.record, found.degem_nm, found.type);

        let kwhPerKm: number | undefined;
        let avgConsumption: number | undefined = undefined;

        let effectiveMishkalKolel = parsed.mishkal_kolel;
        let cc = parsed.fuelType !== "Electric" ? await extractEngineCC(found.record, found.type) : undefined;

        let fallbackData: any = null;
        const needsFallbackWeight = !effectiveMishkalKolel;
        const needsFallbackCC = parsed.fuelType !== "Electric" && !cc;

        if (needsFallbackWeight || needsFallbackCC) {
          fallbackData = await fetchFallbackVehicleData({
            brand: parsed.brand,
            model: parsed.model,
            year: parsed.year,
            engineCode: found.record.degem_manoa,
            plateNumber: plateTrimmed,
            degem_nm: found.degem_nm,
            isElectric: parsed.fuelType === "Electric",
          });

          if (fallbackData) {
            if (needsFallbackWeight && fallbackData.mishkal_kolel) {
              effectiveMishkalKolel = fallbackData.mishkal_kolel;
            }
            if (needsFallbackCC && fallbackData.nefach_manoa) {
              cc = fallbackData.nefach_manoa;
            }
          }
        }

        if (!effectiveMishkalKolel && parsed.brand && parsed.model) {
          const estimatedWeight = estimateVehicleWeight(parsed.brand, parsed.model, parsed.year);
          if (estimatedWeight) {
            effectiveMishkalKolel = estimatedWeight.gross;
          }
        }

        let officialSUV = false;
        let officialHybrid = false;
        let officialHybridType: 'MHEV' | 'PHEV' | 'HEV' | null = null;
        let officialWltpConsumption: number | null = null;

        if (found.type === 'car' && (!parsed.year || parsed.year >= 2018)) {
          const wltpData = await fetchWLTPData(found.record, found.degem_nm);
          if (wltpData) {
            officialSUV = wltpData.isOfficialSUV;
            officialHybrid = wltpData.isOfficialHybrid;
            officialHybridType = wltpData.hybridType;
            if (wltpData.wltpConsumption && wltpData.wltpConsumption > 0) {
               // Convert Government L/100km to km/L
               officialWltpConsumption = 100 / wltpData.wltpConsumption;
            }
          }
        }

        const isElectricOrPhev = parsed.fuelType === "Electric" || parsed.fuelType === "PHEV";
        const isPhev = parsed.fuelType === "PHEV";

        if (isElectricOrPhev) {
          const evData = await calculateEVConsumptionAdvanced({
            brand: parsed.brand,
            model: parsed.model,
            year: parsed.year || new Date().getFullYear(),
            vehicleType: found.type,
            mishkal_kolel: effectiveMishkalKolel,
            isPhev,                    
          });
          kwhPerKm = Number((evData.kwhPer100Km / 100).toFixed(4));
          
        } else {
          if (!effectiveMishkalKolel && parsed.brand && parsed.model) {
            const smartWeight = estimateWeightBySegment(parsed.model, parsed.brand, officialSUV);
            effectiveMishkalKolel = smartWeight;
          }

          if (!cc && parsed.brand && effectiveMishkalKolel) {
            // Pass model and type so the fallback can detect performance trims like BMW M40i
            const smartCC = getSmartCCFallback(parsed.brand, parsed.model || '', effectiveMishkalKolel, found.type);
            cc = smartCC;
          }

          const modelStr = typeof parsed.model === 'string' ? parsed.model.toUpperCase() : '';
          const brandStr = typeof parsed.brand === 'string' ? parsed.brand.toUpperCase() : '';

          let isHybridCar = officialHybrid;

          if (!officialHybrid) {
            const hybridKeywords = ['PRIUS', 'HYBRID', 'IONIQ', 'INSIGHT', 'HSD', 'CT200H', 'NIRO'];
            const isHybridByKeyword = hybridKeywords.some(keyword => modelStr.includes(keyword));
            const isHybridBrand = brandStr === 'TOYOTA' || brandStr === 'LEXUS' || brandStr === 'HONDA' || brandStr === 'HYUNDAI';
            const isToyotaLexusHybridCode = isHybridBrand && /[A-Z]{2,3}\d{2,3}H/i.test(modelStr);
            isHybridCar = isHybridByKeyword || isToyotaLexusHybridCode;
          }

          let isActualSUV = officialSUV;

          if (!officialSUV) {
            const suvKeywords = ['RAV4', 'PRADO', 'LAND CRUISER', 'CHEROKEE', 'GRAND', 'TUCSON', 'SPORTAGE', 'IX35', 'CR-V', 'CAYENNE', 'VITARA', 'SUV', 'CROSS'];
            const isSUVByKeyword = suvKeywords.some(keyword => modelStr.includes(keyword));
            const isSUVBrand = brandStr === 'JEEP' || brandStr === 'LAND ROVER';
            isActualSUV = isSUVByKeyword || isSUVBrand;
          }

          if (officialWltpConsumption) {
             if (__DEV__) console.log(`✅ Using Official WLTP Data: ${officialWltpConsumption.toFixed(2)} km/L`);
             avgConsumption = Number(officialWltpConsumption.toFixed(2));
          } else {
             if (__DEV__) console.log(`⚠️ No WLTP data found. Falling back to Physics Engine.`);
             avgConsumption = calculateICEConsumptionEnhanced({
               mishkal_kolel: effectiveMishkalKolel,
               engineCC: cc,
               year: parsed.year,
               fuelType: parsed.fuelType === 'Diesel' ? 'Diesel' : 'Gasoline',
               vehicleType: found.type,
               isHybrid: isHybridCar,
               hybridType: officialHybridType,
               isOfficialSUV: isActualSUV,
               brand: parsed.brand,
               model: parsed.model,
             });
          }
        }

        const vehicleName = translateBrandToEnglish(parsed.brand || "לא ידוע");
        const newVehicle: Vehicle = {
          id: String(found.record._id ?? Date.now()),
          plate: String(found.record.mispar_rechev ?? plateTrimmed).toUpperCase(),
          name: vehicleName,
          model: parsed.model || "לא ידוע",
          engine: String(found.record.degem_manoa ?? found.record.engine_type ?? "לא ידוע"),
          type: found.type,
          avgConsumption: (parsed.fuelType === "Electric" || parsed.fuelType === "PHEV") ? kwhPerKm : avgConsumption,
          fueltype: parsed.fuelType, 
          year: parsed.year ?? new Date().getFullYear(),
          mishkal_kolel: parsed.mishkal_kolel,
        };

        await saveVehicle(newVehicle);

        setToastMessage(`${newVehicle.name} (${newVehicle.plate}) נוסף בהצלחה — סוג דלק: ${newVehicle.fueltype} — דגם: ${newVehicle.model}`);
        setTimeout(() => router.back(), 1400);

    } catch (error) {
      console.error('\n❌ ERROR in AddVehicleByPlate:', error);
      setToastMessage("אירעה שגיאה בעת הוספת הרכב");
    } finally {
      setLoading(false);
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