import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Vehicle } from "./vehiclesData";
import { useRouter } from "expo-router";
import Toast from "./Toast";

const manufacturers = [
  "Toyota", "Kia", "Hyundai", "Mazda", "Honda", "Nissan",
  "Mitsubishi", "Subaru", "Ford", "Chevrolet", "Volkswagen",
  "Peugeot", "Renault", "Fiat", "Skoda", "Suzuki", "Seat",
  "BMW", "Mercedes-Benz", "Audi", "Opel",
];

export default function AddVehicle() {
  const [manufacturer, setManufacturer] = useState("");
  const [filteredManufacturers, setFilteredManufacturers] = useState<string[]>([]);
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [avgConsumption, setAvgConsumption] = useState("");
  const [year, setYear] = useState(""); // year field
  const [showToast, setShowToast] = useState(false);
  const [isElectric, setIsElectric] = useState(false);
  const router = useRouter();

  const handleManufacturerChange = (text: string) => {
    setManufacturer(text);
    if (!text) setFilteredManufacturers([]);
    else {
      const filtered = manufacturers.filter((item) =>
        item.toLowerCase().startsWith(text.toLowerCase())
      );
      setFilteredManufacturers(filtered);
    }
  };

  const handleManufacturerSelect = (selected: string) => {
    setManufacturer(selected);
    setFilteredManufacturers([]);
  };

  const handleSave = async () => {
    if (!manufacturer || !avgConsumption) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      return;
    }

    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      plate: plate || "",
      name: manufacturer,
      model: model || "",
      engine: engine || "",
      type: "car",
      avgConsumption: avgConsumption ? parseFloat(avgConsumption) : undefined,
      fueltype:"no" ,
      year: year ? parseInt(year) : new Date().getFullYear(), // save year
    };

    try {
      const stored = await AsyncStorage.getItem("vehicles");
      const existing = stored ? JSON.parse(stored) : [];
      existing.push(newVehicle);
      await AsyncStorage.setItem("vehicles", JSON.stringify(existing));
      router.back();
    } catch (error) {
      console.error("Error saving vehicle:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>הוספת רכב חדש 🚗</Text>

        <Text style={styles.label}>יצרן</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: Kia"
          placeholderTextColor="#999"
          value={manufacturer}
          onChangeText={handleManufacturerChange}
        />

        {filteredManufacturers.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={filteredManufacturers}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleManufacturerSelect(item)}
                >
                  <Text style={styles.dropdownText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <Text style={styles.label}>דגם (אופציונלי)</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: PICANTO"
          placeholderTextColor="#999"
          value={model}
          onChangeText={setModel}
        />

        <Text style={styles.label}>מנוע (אופציונלי)</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: G4LA"
          placeholderTextColor="#999"
          value={engine}
          onChangeText={setEngine}
        />

        <Text style={styles.label}>שנת ייצור</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: 2018"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={year}
          onChangeText={setYear}
        />

        <Text style={styles.label}>צריכה ממוצעת (km/l)</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: 16.5"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={avgConsumption}
          onChangeText={setAvgConsumption}
        />

        <View style={{flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12}}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>חשמלי ⚡</Text>
          <TouchableOpacity
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#333",
              backgroundColor: isElectric ? "#009688" : "#fff",
            }}
            onPress={() => setIsElectric(!isElectric)}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>💾 שמור רכב</Text>
        </TouchableOpacity>

        {showToast && <Toast message="אנא מלא לפחות את היצרן וצריכת הדלק" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F8FA" },
  scrollContent: { padding: 20 },
  title: { fontSize: 24, fontWeight: "700", color: "#222", marginBottom: 20, textAlign: "center" },
  label: { fontSize: 16, color: "#555", marginBottom: 5, fontWeight: "600" },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: "#ddd", marginBottom: 12 },
  dropdown: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 10, maxHeight: 150, marginBottom: 15 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  dropdownText: { fontSize: 16, color: "#333" },
  button: { backgroundColor: "#00796B", borderRadius: 12, padding: 15, alignItems: "center", marginTop: 15 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
