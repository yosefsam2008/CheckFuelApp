// app/VehiclesScreen.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState, useRef, useEffect } from "react";
import { StatusBar, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { Vehicle } from "../vehiclesData";
const fuelOptions = [
  { label: "⚡ חשמלי", value: "Electric" as const },
  { label: "⛽ בנזין", value: "Gasoline" as const },
  { label: "⛽ דיזל", value: "Diesel" as const },
];

export default function VehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [manufactureYear, setManufactureYear] = useState("");
  const [avgConsumption, setAvgConsumption] = useState<string>("");
  const [fuelType, setFuelType] = useState<"Gasoline" | "Diesel" | "Electric" | "Unknown">("Unknown");
  const validFuelTypes = ["Gasoline", "Diesel", "Electric"] as const;

  // --- Toast ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = (message: string, duration = 2000) => {
    setToastMessage(message);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToastMessage(null));
      }, duration);
    });
  };

  // --- Fullscreen effect ---
  useEffect(() => {
    StatusBar.setHidden(true, "slide");
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("immersive" as any);
    }
  }, []);

  // --- Load vehicles ---
  useFocusEffect(
    useCallback(() => {
      const loadVehicles = async () => {
        const saved = await AsyncStorage.getItem("vehicles");
        if (saved) setVehicles(JSON.parse(saved));
      };
      loadVehicles();
    }, [])
  );

  // --- Open details ---
  const openDetails = (item: Vehicle) => {
    setSelected(item);
    setName(item.name);
    setModel(item.model);
    setEngine(item.engine);
    setAvgConsumption(item.avgConsumption ? String(item.avgConsumption) : "");
setFuelType(
  validFuelTypes.includes(item.fueltype as any)
    ? (item.fueltype as "Gasoline" | "Diesel" | "Electric")
    : "Unknown"
);    setManufactureYear(item.year ? String(item.year) : "");
    setEditMode(false);
    setShowModal(true);
  };

  // --- Save changes ---
  const saveChanges = async () => {
    if (!selected) return;

    const updated: Vehicle = {
      ...selected,
      name: name.trim() || selected.name,
      model: model.trim() || selected.model,
      engine: engine.trim() || selected.engine,
      avgConsumption: avgConsumption ? parseFloat(avgConsumption) : selected.avgConsumption,
      year: manufactureYear ? parseInt(manufactureYear) : selected.year,
      fueltype: fuelType,
    };

    const updatedList = vehicles.map((v) => (v.id === selected.id ? updated : v));

    setVehicles(updatedList);
    await AsyncStorage.setItem("vehicles", JSON.stringify(updatedList));
    setShowModal(false);
    showToast("✅ השינויים נשמרו בהצלחה");
  };

  // --- Delete vehicle ---
  const deleteVehicleById = async (id: string) => {
    try {
      const updatedList = vehicles.filter((v) => v.id !== id);
      setVehicles(updatedList);
      await AsyncStorage.setItem("vehicles", JSON.stringify(updatedList));
      setShowModal(false);
      setSelected(null);
      showToast("🗑️ הרכב נמחק בהצלחה");
    } catch (error) {
      console.error("שגיאה במחיקה:", error);
      showToast("❌ שגיאה במחיקה");
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    await deleteVehicleById(selected.id);
  };

  // --- Get emoji based on vehicle type ---
  const getVehicleEmoji = (type: Vehicle["type"]) => {
    switch (type) {
      case "car":
        return "🚗";
      case "motorcycle":
        return "🏍️";
      case "truck":
        return "🚛";
      default:
        return "❓";
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>הרכבים שלי</Text>

      {/* --- Toast --- */}
      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openDetails(item)}
            style={[styles.card, item.fueltype === "Electric" ? { backgroundColor: "#e0f7fa" } : {}]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 36 }}>
                {item.fueltype === "Electric" ? "⚡" : getVehicleEmoji(item.type)}
              </Text>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.vehicleName}>{item.name}</Text>
                <Text style={styles.vehicleDetails}>
                  דגם: {item.model} | מנוע: {item.engine}{" "}
                  {item.avgConsumption
                    ? item.fueltype === "Electric"
                      ? `| ${item.avgConsumption.toFixed(1)} km/% סוללה`
                      : `| ${item.avgConsumption.toFixed(1)} km/l`
                    : ""}
                </Text>

                <Text style={styles.vehicleDetails}>סוג דלק: {item.fueltype === "Electric" ? "חשמלי ⚡" : 
                item.fueltype === "Diesel" ? "⛽ דיזל" :"⛽ בנזין" }</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#888", marginTop: 50 }}>
            אין רכבים שמורים
          </Text>
        }
      />

      {/* --- שני כפתורים בתחתית המסך --- */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.addBtn, { flex: 1, marginRight: 8 }]}
          onPress={() => router.push("/addVehicleByPlate")}
        >
          <Text style={styles.addBtnText}>➕ הוסף רכב לפי מספר רישוי</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addBtn, { flex: 1 }]}
          onPress={() => router.push("/addVehicle")}
        >
          <Text style={styles.addBtnText}>➕ הוסף רכב</Text>
        </TouchableOpacity>
      </View>

      {/* --- Modal --- */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>פרטי רכב</Text>

            {selected && !editMode && (
              <>
                <Text style={styles.modalField}>שם: {selected.name}</Text>
                <Text style={styles.modalField}>מספר רישוי: {selected.plate}</Text>
                <Text style={styles.modalField}>דגם: {selected.model}</Text>
                <Text style={styles.modalField}>מנוע: {selected.engine}</Text>
                <Text style={styles.modalField}>שנת ייצור: {selected.year}</Text>
                <Text style={styles.modalField}>
                  סוג דלק: {selected.fueltype === "Electric" ? "חשמלי ⚡" : 
                selected.fueltype === "Diesel" ? "⛽ דיזל" :"⛽ בנזין" }
                </Text>
                <Text style={styles.modalField}>
                  צריכה ממוצעת:{" "}
                  {selected.avgConsumption
                    ? selected.fueltype === "Electric"
                      ? `${selected.avgConsumption.toFixed(2)} km/%`
                      : `${selected.avgConsumption.toFixed(2)} km/l`
                    : "לא ידוע"}
                </Text>
              </>
            )}

            {selected && editMode && (
              <>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="שם" />
                <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="דגם" />
                <TextInput style={styles.input} value={engine} onChangeText={setEngine} placeholder="מנוע" />
                <TextInput
                  style={styles.input}
                  value={avgConsumption}
                  onChangeText={setAvgConsumption}
                  placeholder={
                    fuelType === "Electric" ? "צריכה ממוצעת (km/%)" : "צריכה ממוצעת (km/l)"
                  }
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={manufactureYear}
                  onChangeText={setManufactureYear}
                  placeholder="שנת ייצור"
                  keyboardType="numeric"
                />

                {/* --- Fuel type selection buttons --- */}
                
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
  {fuelOptions.map((ft) => (
    <TouchableOpacity
      key={ft.value}
      style={[
        styles.fuelBtn,
        fuelType === ft.value ? { backgroundColor: "#009688" } : { backgroundColor: "#fff" },
      ]}
      onPress={() => setFuelType(ft.value)}
    >
      <Text style={{ color: fuelType === ft.value ? "#fff" : "#333", fontWeight: "700" }}>
        {ft.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>
  
              </>
            )}

            <View style={styles.modalActions}>
              {!editMode ? (
                <>
                  <TouchableOpacity style={styles.modalBtn} onPress={() => setEditMode(true)}>
                    <Text style={styles.modalBtnText}>ערוך</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.deleteBtn]} onPress={confirmDelete}>
                    <Text style={[styles.modalBtnText, { color: "#fff" }]}>מחק</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.modalBtn} onPress={saveChanges}>
                    <Text style={styles.modalBtnText}>שמור</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtn} onPress={() => setEditMode(false)}>
                    <Text style={styles.modalBtnText}>בטל</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.closeModalText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f9f9f9" },
  title: { fontSize: 26, fontWeight: "700", color: "#009688ff", textAlign: "center", marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  vehicleName: { fontSize: 18, fontWeight: "600", color: "#222" },
  vehicleDetails: { fontSize: 14, color: "#666", marginTop: 4 },
  bottomButtons: { position: "absolute", bottom: 20, left: 20, right: 20, flexDirection: "row" },
  addBtn: {
    backgroundColor: "#009688",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 3,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", paddingHorizontal: 10 },
  modalContent: { width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 16, textAlign: "center", color: "#009688" },
  modalField: { marginVertical: 6, color: "#333", fontSize: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 16 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  modalBtn: { flex: 1, marginHorizontal: 5, paddingVertical: 12, borderRadius: 12, backgroundColor: "#ddd", alignItems: "center" },
  modalBtnText: { fontWeight: "700", color: "#333", fontSize: 16 },
  deleteBtn: { backgroundColor: "#d32f2f" },
  closeModalText: { textAlign: "center", marginTop: 16, fontWeight: "700", color: "#009688", fontSize: 16 },
  toast: { position: "absolute", bottom: 90, left: 40, right: 40, backgroundColor: "rgba(0,0,0,0.85)", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 25, alignItems: "center", justifyContent: "center", zIndex: 999, elevation: 10 },
  toastText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  fuelBtn: { flex: 1, marginHorizontal: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#333", alignItems: "center" },
});
