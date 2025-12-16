import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet
} from "react-native";
import { Vehicle, vehicles } from "../vehiclesData";
import { getAirDistance } from "../airDistance";

// Default average fuel price in Israel (ILS/L) — mocked for now
const DEFAULT_FUEL_PRICE = 7.56;

// Steps: distance -> fuel price -> vehicle
const steps = ["distance", "fuelPrice", "vehicle"] as const;

interface CalculationResult {
  totalCost: number;
  consumption: number; // km per liter
  costPerKm: number;
}

export default function CalculatorScreen() {
  const router = useRouter();

  // Step control
  const [step, setStep] = useState(0);

  // Inputs
  const [distance, setDistance] = useState("");
  const [fuelPrice, setFuelPrice] = useState(DEFAULT_FUEL_PRICE.toString());
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // Results
  const [result, setResult] = useState<CalculationResult | null>(null);

  // Location helpers for auto distance
  const [start, setStart] = useState<{ latitude: number; longitude: number } | null>(null);
  const [end, setEnd] = useState<{ latitude: number; longitude: number } | null>(null);
  const [airDistance, setAirDistance] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, steps.length));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // request and save current position
  const handleSetLocation = async (type: "start" | "end") => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("הרשאת מיקום לא ניתנה");
      return;
    }
    setIsCalculating(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      if (type === "start") setStart(coords);
      else setEnd(coords);
    } catch (e) {
      console.warn(e);
    }
    setIsCalculating(false);
  };

  // when both points exist, calculate air distance and set as distance
  useEffect(() => {
    if (start && end) {
      const km = getAirDistance(start, end);
      const rounded = parseFloat(km.toFixed(2));
      setAirDistance(rounded);
      setDistance(rounded.toFixed(2));
    }
  }, [start, end]);

  const resetLocations = () => {
    setStart(null);
    setEnd(null);
    setAirDistance(null);
    setDistance("");
  };

  // calculate using vehicle.avgConsumption (km per liter)
  const handleCalculate = () => {
    const d = parseFloat(distance);
    const p = parseFloat(fuelPrice);
    const avgConsumption = vehicle?.avgConsumption;
    if (!d || !p || !avgConsumption) return;
    const f = d / avgConsumption; // liters used
    const totalCost = f * p;
    const consumption = avgConsumption;
    const costPerKm = totalCost / d;
    setResult({ totalCost, consumption, costPerKm });
  };

  // render steps
  const renderStep = () => {
    const s = steps[step];
    switch (s) {
      case "distance":
        return (
          <View style={styles.card}>
            <Text style={styles.question}>כמה קילומטרים נסעת?</Text>
            <TextInput
              style={styles.input}
              placeholder="לדוגמה 250"
              keyboardType="numeric"
              value={distance}
              onChangeText={setDistance}
            />

            <View style={{ marginTop: 20 }}>
              <Text style={styles.question}>או חשב אוטומטית באמצעות המיקום שלך:</Text>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleSetLocation("start")}
                disabled={isCalculating}
              >
                <Text>{start ? "✅ נקודת התחלה נשמרה" : "הגדר נקודת התחלה"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleSetLocation("end")}
                disabled={isCalculating}
              >
                <Text>{end ? "✅ נקודת סיום נשמרה" : "הגדר נקודת סיום"}</Text>
              </TouchableOpacity>

              {airDistance && (
                <Text style={styles.hint}>המרחק האווירי: {airDistance} ק&quot;מ</Text>
              )}

              {(start || end) && (
                <TouchableOpacity style={styles.resetBtn} onPress={resetLocations}>
                  <Text style={styles.resetText}>אפס מיקומים</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.nextBtn} onPress={next} disabled={!distance}>
                <Text style={styles.nextBtnText}>המשך</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case "fuelPrice":
        return (
          <View style={styles.card}>
            <Text style={styles.question}>מה מחיר הדלק לליטר?</Text>
            <Text style={styles.hint}>(ממוצע נוכחי בישראל: {DEFAULT_FUEL_PRICE} ש&quot;ח\ל)</Text>
            <TextInput
              style={styles.input}
              placeholder={DEFAULT_FUEL_PRICE.toString()}
              keyboardType="numeric"
              value={fuelPrice}
              onChangeText={setFuelPrice}
            />
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.prevBtn} onPress={prev}>
                <Text style={styles.prevBtnText}>חזור</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={next} disabled={!fuelPrice}>
                <Text style={styles.nextBtnText}>המשך</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case "vehicle":
        return (
          <View style={styles.card}>
            <Text style={styles.question}>בחר רכב</Text>
            <TouchableOpacity style={styles.vehicleSelectBtn} onPress={() => setShowVehicleModal(true)}>
              <Text style={styles.vehicleSelectText}>{vehicle ? `${vehicle.name} (${vehicle.model})` : "בחר רכב"}</Text>
            </TouchableOpacity>

            {vehicle?.avgConsumption && distance && (
              <Text style={styles.hint}>צריכת דלק מוערכת: {(parseFloat(distance) / vehicle.avgConsumption).toFixed(2)} ליטרים</Text>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.prevBtn} onPress={prev}>
                <Text style={styles.prevBtnText}>חזור</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => {
                  handleCalculate();
                  next();
                }}
                disabled={!vehicle || !vehicle.avgConsumption}
              >
                <Text style={styles.nextBtnText}>חשב</Text>
              </TouchableOpacity>
            </View>

            <Modal visible={showVehicleModal} animationType="slide" transparent onRequestClose={() => setShowVehicleModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>בחר רכב</Text>
                  <FlatList
                    data={vehicles}
                    keyExtractor={(it) => it.id}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.vehicleItem}
                        onPress={() => {
                          setVehicle(item);
                          setShowVehicleModal(false);
                        }}
                      >
                        <Text style={styles.vehicleName}>{item.name} ({item.model})</Text>
                        <Text style={styles.vehicleDetails}>{item.engine} {item.avgConsumption ? `| ${item.avgConsumption} km/l` : ""}</Text>
                      </Pressable>
                    )}
                  />
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowVehicleModal(false)}>
                    <Text style={styles.closeModalText}>סגור</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );

      default:
        return (
          <View style={styles.card}>
            <Text style={styles.resultTitle}>התוצאות שלך</Text>
            {result && (
              <>
                <Text style={styles.resultText}>יעילות דלק: {result.consumption.toFixed(2)} קמ&quot;ל</Text> 
                <Text style={styles.resultText}>עלות לכל קילומטר: {result.costPerKm.toFixed(2)}ש&quot;ח</Text>
                <Text style={styles.resultText}>עלות כוללת: {result.totalCost.toFixed(2)} ש&quot;ח </Text>
                <Text style={styles.resultText}>רכב: {vehicle ? `${vehicle.name} (${vehicle.model})` : "-"}</Text>
                {vehicle?.avgConsumption && distance && (
                  <Text style={styles.resultText}>צריכת דלק מוערכת: {(parseFloat(distance) / vehicle.avgConsumption).toFixed(2)} ליטרים</Text>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => {
                setStep(0);
                setResult(null);
                setDistance("");
                setFuelPrice(DEFAULT_FUEL_PRICE.toString());
                setVehicle(null);
                resetLocations();
              }}
            >
              <Text style={styles.nextBtnText}>התחל מחדש</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>מחשב צריכת דלק</Text>

      <View style={styles.progressBarWrap}>
        <View style={[styles.progressBar, { width: `${((step + 1) / (steps.length + 1)) * 100}%` }]} />
      </View>

      {renderStep()}

      <TouchableOpacity style={styles.viewVehiclesBtn} onPress={() => router.push("/vehicles") }>
        <Text style={styles.viewVehiclesBtnText}>הצג את כל הרכבים</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  question: {
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  hint: {
    color: "#666",
    marginTop: 8,
  },
  btn: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 6,
    marginTop: 8,
  },
  resetBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  resetText: {
    color: "#d00",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  nextBtn: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 6,
  },
  nextBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  prevBtn: {
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 6,
  },
  prevBtnText: {
    color: "#000",
  },
  vehicleSelectBtn: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  vehicleSelectText: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  vehicleItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  vehicleName: {
    fontWeight: "600",
  },
  vehicleDetails: {
    color: "#666",
  },
  closeModalBtn: {
    marginTop: 12,
    alignSelf: "center",
  },
  closeModalText: {
    color: "#007AFF",
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    marginTop: 4,
  },
  progressBarWrap: {
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
  },
  viewVehiclesBtn: {
    marginTop: 8,
    alignSelf: "center",
  },
  viewVehiclesBtnText: {
    color: "#007AFF",
  },
});