//app/tabs/dev-tester
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// 1. Import your exported functions from the main file
import { fetchRecordByPlate, parseRelevantFields, extractEngineCC } from "../addVehicleByPlate"; 

// 2. Import all the calculation dependencies exactly as they are in your main file
import { calculateEVConsumptionAdvanced } from "../../lib/data/advancedEvConsumption";
import {
  calculateICEConsumptionEnhanced,
  estimateWeightBySegment,
  fetchFallbackVehicleData,
  fetchWLTPData,
  getSmartCCFallback,
  translateBrandToEnglish
} from "../../lib/data/fuelData";
import { estimateVehicleWeight } from "../../lib/data/vehicleWeightLookup";

// Expanded Test Fleet covering multiple vehicle segments
const TEST_PLATES = [
  // User's Original Plates
  "9751174",
  "93197301",
  "92391001",
  "92729601",
  "91398701",
  "38491904",
  "36662004",
  
  // High-Performance / Heavy SUVs (To test the new getSmartCCFallback)
  "2002002", // Placeholder 7-digit format
  "3003003", 
  
  // Standard Family Cars / Compacts
  "8877665",
  "1234567",
  
  // Electric Vehicles (EVs)
  "4004004", 
  "5005005",

  // Modern 8-Digit Plates (Post-2017)
  "12345678",
  "87654321",
  "11223344"
];

type TestResult = {
  plate: string;
  status: "pending" | "success" | "failed";
  data?: {
    brand: string;
    model: string;
    type: string;
    fuel: string;
    weight: number | undefined;
    year: number | undefined;
    engineCC: number | undefined;
    consumptionDisplay: string;
  };
  error?: string;
};

export default function DevTester() {
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<TestResult[]>(
    TEST_PLATES.map(plate => ({ plate, status: "pending" }))
  );
  const [isTesting, setIsTesting] = useState(false);

  const runTests = async () => {
    setIsTesting(true);
    const updatedResults: TestResult[] = [];

    for (const plate of TEST_PLATES) {
      try {
        // --- STEP 1: Fetch and Parse ---
        const found = await fetchRecordByPlate(plate);
        if (!found) {
          updatedResults.push({ plate, status: "failed", error: "Not found in API" });
          // Update UI progressively even on fail
          setResults([...updatedResults, ...results.slice(updatedResults.length)]);
          continue;
        }

        const parsed = await parseRelevantFields(found.record, found.degem_nm, found.type);

        // --- STEP 2: Replicate Weight & CC Extraction ---
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
            plateNumber: plate,
            degem_nm: found.degem_nm,
            isElectric: parsed.fuelType === "Electric",
          });

          if (fallbackData) {
            if (needsFallbackWeight && fallbackData.mishkal_kolel) effectiveMishkalKolel = fallbackData.mishkal_kolel;
            if (needsFallbackCC && fallbackData.nefach_manoa) cc = fallbackData.nefach_manoa;
          }
        }

        if (!effectiveMishkalKolel && parsed.brand && parsed.model) {
          const estimatedWeight = estimateVehicleWeight(parsed.brand, parsed.model, parsed.year);
          if (estimatedWeight) effectiveMishkalKolel = estimatedWeight.gross;
        }

        // --- STEP 3: SUV / Hybrid / WLTP Logic ---
        let officialSUV = false;
        let officialHybrid = false;

        if (found.type === 'car' && (!parsed.year || parsed.year >= 2018)) {
          const wltpData = await fetchWLTPData(found.record, found.degem_nm);
          if (wltpData) {
            officialSUV = wltpData.isOfficialSUV;
            officialHybrid = wltpData.isOfficialHybrid;
          }
        }

        // --- STEP 4: Calculate Consumption ---
        let kwhPerKm: number | undefined;
        let avgConsumption: number | undefined;
        let consumptionDisplay = "Unknown";

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
          consumptionDisplay = `${kwhPerKm} kWh/km`;
          
        } else {
          if (!effectiveMishkalKolel && parsed.brand && parsed.model) {
            effectiveMishkalKolel = estimateWeightBySegment(parsed.model, parsed.brand, officialSUV);
          }

          // FIXED: Now using the advanced 4-parameter signature for getSmartCCFallback
          if (!cc && parsed.brand && effectiveMishkalKolel) {
            cc = getSmartCCFallback(parsed.brand, parsed.model || "", effectiveMishkalKolel, found.type);
          }

          const modelStr = typeof parsed.model === 'string' ? parsed.model.toUpperCase() : '';
          const brandStr = typeof parsed.brand === 'string' ? parsed.brand.toUpperCase() : '';

          let isHybridCar = officialHybrid;
          if (!officialHybrid) {
            const hybridKeywords = ['PRIUS', 'HYBRID', 'IONIQ', 'INSIGHT', 'HSD', 'CT200H', 'NIRO'];
            const isHybridBrand = brandStr === 'TOYOTA' || brandStr === 'LEXUS' || brandStr === 'HONDA' || brandStr === 'HYUNDAI';
            isHybridCar = hybridKeywords.some(k => modelStr.includes(k)) || (isHybridBrand && /[A-Z]{2,3}\d{2,3}H/i.test(modelStr));
          }

          let isActualSUV = officialSUV;
          if (!officialSUV) {
            const suvKeywords = ['RAV4', 'PRADO', 'LAND CRUISER', 'CHEROKEE', 'GRAND', 'TUCSON', 'SPORTAGE', 'IX35', 'CR-V', 'CAYENNE', 'VITARA', 'SUV', 'CROSS'];
            const isSUVBrand = brandStr === 'JEEP' || brandStr === 'LAND ROVER';
            isActualSUV = suvKeywords.some(k => modelStr.includes(k)) || isSUVBrand;
          }

          avgConsumption = calculateICEConsumptionEnhanced({
            mishkal_kolel: effectiveMishkalKolel,
            engineCC: cc,
            year: parsed.year,
            fuelType: parsed.fuelType === 'Diesel' ? 'Diesel' : 'Gasoline',
            vehicleType: found.type,
            isHybrid: isHybridCar,
            isOfficialSUV: isActualSUV,
            brand: parsed.brand,
            model: parsed.model,
          });
          
          consumptionDisplay = avgConsumption ? `${avgConsumption.toFixed(1)} km/L` : "N/A km/L";
        }

        const vehicleName = translateBrandToEnglish(parsed.brand || "לא ידוע");

        // --- STEP 5: Push Results ---
        updatedResults.push({
          plate,
          status: "success",
          data: {
            brand: vehicleName,
            model: parsed.model || "לא ידוע",
            type: found.type,
            fuel: parsed.fuelType,
            weight: effectiveMishkalKolel,
            year: parsed.year,
            engineCC: cc,
            consumptionDisplay: consumptionDisplay
          }
        });

      } catch (err: any) {
        updatedResults.push({ plate, status: "failed", error: err.message });
      }
      
      // Update UI progressively so the app doesn't freeze while testing
      setResults([...updatedResults, ...results.slice(updatedResults.length)]);
    }
    
    setIsTesting(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>API Batch Tester</Text>
        <TouchableOpacity 
          style={[styles.btn, isTesting && styles.btnDisabled]} 
          onPress={runTests}
          disabled={isTesting}
        >
          {isTesting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Run {TEST_PLATES.length} Tests</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll}>
        {results.map((res, index) => (
          <View key={index} style={[styles.card, res.status === 'failed' ? styles.cardError : null]}>
            <Text style={styles.plateNumber}>Plate: {res.plate}</Text>
            
            {res.status === 'pending' && <Text style={styles.pending}>Waiting to run...</Text>}
            {res.status === 'failed' && <Text style={styles.error}>Error: {res.error}</Text>}
            
            {res.status === 'success' && res.data && (
              <View style={styles.dataGrid}>
                <Text style={styles.mainTitle}>🚗 {res.data.brand} {res.data.model}</Text>
                
                <View style={styles.row}>
                  <Text style={styles.label}>Type:</Text>
                  <Text style={styles.value}>{res.data.type}</Text>
                </View>
                
                <View style={styles.row}>
                  <Text style={styles.label}>Year:</Text>
                  <Text style={styles.value}>{res.data.year || "N/A"}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Weight:</Text>
                  <Text style={styles.value}>{res.data.weight ? `${res.data.weight} kg` : "N/A"}</Text>
                </View>

                {res.data.engineCC && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Engine:</Text>
                    <Text style={styles.value}>{res.data.engineCC} cc</Text>
                  </View>
                )}
                
                {/* Visual Separator for Fuel Data */}
                <View style={styles.divider} />
                
                <View style={styles.row}>
                  <Text style={styles.label}>Fuel Type:</Text>
                  <Text style={[styles.value, { color: '#009688', fontWeight: 'bold' }]}>{res.data.fuel}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Consumption:</Text>
                  <Text style={[styles.value, { color: '#ef4444', fontWeight: 'bold' }]}>{res.data.consumptionDisplay}</Text>
                </View>
                
              </View>
            )}
          </View>
        ))}
        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: { padding: 20, borderBottomWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 15, color: '#1f2937' },
  btn: { backgroundColor: "#009688", padding: 16, borderRadius: 12, alignItems: "center", shadowColor: '#009688', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 0.5 },
  scroll: { padding: 16 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardError: { borderColor: "#ef4444", borderWidth: 1, backgroundColor: "#fef2f2" },
  plateNumber: { fontSize: 18, fontWeight: "800", color: '#374151', marginBottom: 12, letterSpacing: 1 },
  dataGrid: { gap: 8, marginTop: 4 },
  mainTitle: { fontSize: 16, fontWeight: "bold", color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  label: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
  value: { color: '#1f2937', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  pending: { color: "#9ca3af", fontStyle: "italic", marginTop: 8 },
  error: { color: "#ef4444", fontWeight: "600", marginTop: 8 },
});