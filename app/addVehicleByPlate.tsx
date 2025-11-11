// app/AddVehicleByPlate.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import Toast from "./Toast";
import { Vehicle } from "./vehiclesData";
import {fetchCarQueryKmPerL } from "./fetchCarQueryKmPerL";
import { translateBrandToEnglish } from "./fuelData";

const VEHICLE_APIS = [
  { type: "car", id: "053cea08-09bc-40ec-8f7a-156f0677aff3" },
  { type: "motorcycle", id: "bf9df4e2-d90d-4c0a-a400-19e15af8e95f" },
  { type: "truck", id: "cd3acc5c-03c3-4c89-9c54-d40f93c0d790" },
] as const;

type VehicleType = typeof VEHICLE_APIS[number]["type"];
type FuelType = "Electric" | "Gasoline" | "Diesel" | "Unknown";

const safeParseFloat = (v: any): number | undefined => {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function detectFuelTypeCanonical(record: any): FuelType {
  const raw = (record?.sug_delek_nm || "").toString().trim().toLowerCase();
  if (!raw) return "Unknown";

  const tokens = raw.split(/[\s,\/\-()]+/).filter(Boolean);

  const evKeywords = ["חשמל","אלקטרי","ev","electric","battery","פלאג-אין","plug-in","phev","bev"];
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

// פונקציה קטנה לוולידציה של km/L
function validateKmPerL(value?: number, vehicleType?: VehicleType): number | undefined {
  if (!value || value <= 0) return undefined;
  if (vehicleType === "motorcycle" && value > 60) return 60;
  if (vehicleType === "truck" && value > 20) return 20;
  if (value > 30) return 30;
  return value;
}

function manualEstimateKmPerL({
  cc,
  weightKg,
  year,
  vehicleType,
}: {
  cc?: number;
  weightKg?: number;
  year?: number;
  vehicleType: VehicleType;
}) {
  const currentYear = new Date().getFullYear();
  const ageFactor = Math.max(0, (year ? currentYear - year : 5) / 10);
  const CC = cc ?? (vehicleType === "motorcycle" ? 500 : vehicleType === "truck" ? 3000 : 1600);
  const KG = weightKg ?? (vehicleType === "motorcycle" ? 200 : vehicleType === "truck" ? 3500 : 1500);

  let est = 10;
  if (vehicleType === "car") est = 16 - 0.004*(CC-1600) - 0.006*(KG-1400) - 1.0*ageFactor;
  else if (vehicleType === "motorcycle") est = 30 - 0.02*(CC-500) - 0.5*ageFactor;
  else if (vehicleType === "truck") est = 6 - 0.001*(CC-3000) - 0.004*(KG-3500) - 0.5*ageFactor;

  if (!Number.isFinite(est) || est <= 0) est = vehicleType === "motorcycle" ? 25 : vehicleType === "truck" ? 6 : 12;
  return Number(clamp(parseFloat(est.toFixed(2)), 1, 60));
}

export default function AddVehicleByPlate() {
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleAddVehicleByPlate = async () => {
    const plateTrimmed = plate.trim();
    if (!plateTrimmed) {
      setToastMessage("❌ אנא הזן מספר רכב");
      return;
    }
    setLoading(true);

    try {
      let foundRecord: any = null;
      let foundType: VehicleType | null = null;

      for (const api of VEHICLE_APIS) {
        const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${api.id}&filters=${encodeURIComponent(JSON.stringify({ mispar_rechev: plateTrimmed }))}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json?.result?.records?.length) {
          foundRecord = json.result.records[0];
          foundType = api.type;
          break;
        }
      }

      if (!foundRecord || !foundType) {
        setToastMessage("❌ לא נמצאו נתונים עבור מספר זה באף מאגר");
        return;
      }

      const brandRaw = foundRecord.tozeret_nm || "";
          const brandEn = translateBrandToEnglish(brandRaw);
      const modelRaw = foundRecord.kinuy_mishari || foundRecord.degem_nm || "";
      const yearRaw = safeParseFloat(foundRecord.shnat_yitzur);
      const ccRaw = safeParseFloat(foundRecord.degem_manoa) ?? safeParseFloat(foundRecord.engine_cc);
      const weightRaw = safeParseFloat(foundRecord.mishkal) ?? safeParseFloat(foundRecord.weight_kg);
      const batteryCapacity = safeParseFloat(foundRecord.battery_capacity);
      const rangeKm = safeParseFloat(foundRecord.range_km);
      const fueltype = detectFuelTypeCanonical(foundRecord);
              


      // --- km/L computation
      let avgKmPerL: number | undefined;

      // ניסיון מ־API
      const apiFields = [
        foundRecord.avg_km_per_liter,
        foundRecord.avg_km_per_l,
        foundRecord.avg_kmpl,
        foundRecord.km_per_liter,
        foundRecord.km_per_l,
        foundRecord.l_per_100km,
        foundRecord.model_lkm_city,
      ];

      for (const f of apiFields) {
        const val = safeParseFloat(f);
        if (!val) continue;
        const converted = val > 0 && val <= 100 && String(f).toLowerCase().includes("l") ? 100/val : val;
        const validated = validateKmPerL(converted, foundType);
        if (validated) { avgKmPerL = validated; break; }
      }

      // --- local fuelData
      console.log("--------------------------------Fetching kmPerL from CarQuery API for", brandEn, modelRaw, yearRaw);
      if (!avgKmPerL && brandRaw && modelRaw) {
  try {

    // קריאה לשרת שלך שמדבר עם CarQuery
    const localKm = await fetchCarQueryKmPerL(
      brandEn,
      modelRaw,
      yearRaw ? Math.round(yearRaw) : undefined,
      foundType // אפשר להעביר סוג דלק אם יש
    );

    // בדיקה אם הנתון תקין
    const validated = validateKmPerL(localKm, foundType);
    if (validated) avgKmPerL = validated;
  } catch (err) {
    console.error("Error fetching kmPerL from CarQuery API:", err);
  }
}


      // --- fallback manual estimate
      if (!avgKmPerL) {
        const manual = manualEstimateKmPerL({ cc: ccRaw, weightKg: weightRaw, year: yearRaw ? Math.round(yearRaw) : undefined, vehicleType: foundType });
        avgKmPerL = validateKmPerL(manual, foundType) ?? manual;
        avgKmPerL =4;
      }

      let storedAvgConsumption: number | undefined;
      if (fueltype === "Electric") {
        if (rangeKm && rangeKm > 0) storedAvgConsumption = Number((rangeKm/100).toFixed(2));
        else storedAvgConsumption = 3; // conservative fallback
      } else storedAvgConsumption = avgKmPerL ? Number(avgKmPerL.toFixed(2)) : undefined;

      const carName = translateBrandToEnglish(foundRecord.tozeret_nm || "לא ידוע");

      const newVehicle: Vehicle = {
        id: String(foundRecord._id ?? Date.now()),
        plate: String(foundRecord.mispar_rechev ?? plateTrimmed).toUpperCase(),
        name: carName,
        model: String(foundRecord.kinuy_mishari ?? foundRecord.degem_nm ?? "לא ידוע"),
        engine: String(foundRecord.degem_manoa ?? foundRecord.engine_type ?? "לא ידוע"),
        type: foundType,
        avgConsumption: storedAvgConsumption,
        fueltype,
        year: Number(foundRecord.shnat_yitzur ?? new Date().getFullYear()),
      };

      const existing = await AsyncStorage.getItem("vehicles");
      const list: Vehicle[] = existing ? JSON.parse(existing) : [];
      list.push(newVehicle);
      await AsyncStorage.setItem("vehicles", JSON.stringify(list));

      setToastMessage(`✅ ${newVehicle.name} (${newVehicle.plate}) נוסף בהצלחה — סוג דלק: ${newVehicle.fueltype} — דגם: ${newVehicle.model}`);
      setTimeout(() => router.back(), 1400);

    } catch (error) {
      console.error("AddVehicleByPlate error:", error);
      setToastMessage("❌ אירעה שגיאה בעת הוספת הרכב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>הוסף כלי רכב לפי מספר רישוי</Text>
      {toastMessage && <Toast message={toastMessage} onHide={() => setToastMessage(null)} />}
      <TextInput
        style={styles.input}
        placeholder="הכנס מספר רכב"
        keyboardType="default"
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
      />
      <TouchableOpacity style={styles.btn} onPress={handleAddVehicleByPlate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>חפש והוסף</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>חזרה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", color: "#009688", textAlign: "center", marginBottom: 16 },
  input: { backgroundColor: "#fff", padding: 14, borderRadius: 12, fontSize: 16, borderColor: "#ccc", borderWidth: 1, marginBottom: 20 },
  btn: { backgroundColor: "#009688", padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  backBtn: { marginTop: 20, backgroundColor: "#eee", borderRadius: 12, padding: 14, alignItems: "center" },
  backBtnText: { color: "#333", fontWeight: "bold" },
});
