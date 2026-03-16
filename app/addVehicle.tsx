// app/AddVehicle.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "./Toast";
import { Vehicle } from "../lib/data/vehiclesData";

// Conditional import for ads
const VehicleRewardedAd = Platform.OS === 'web' ? () => null : require('../components/VehicleRewardedAd').default;

const manufacturers = [
  "Toyota", "Kia", "Hyundai", "Mazda", "Honda", "Nissan",
  "Mitsubishi", "Subaru", "Ford", "Chevrolet", "Volkswagen",
  "Peugeot", "Renault", "Fiat", "Skoda", "Suzuki", "Seat",
  "BMW", "Mercedes-Benz", "Audi", "Opel",
];

type FuelType = "Gasoline" | "Diesel" | "Electric" | "";

export default function AddVehicle() {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState("");
  const [filteredManufacturers, setFilteredManufacturers] = useState<string[]>([]);
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [avgConsumption, setAvgConsumption] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("");
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Ad and pending state
  const [showAd, setShowAd] = useState(false);
  const [pendingVehicle, setPendingVehicle] = useState<Vehicle | null>(null);

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

  const showTemporaryToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setToastMessage("");
    }, 2500);
  };

  const validate = () => {
    if (!manufacturer.trim()) {
      showTemporaryToast("אנא מלא את היצרן");
      return false;
    }
    if (!fuelType) {
      showTemporaryToast("אנא בחר סוג דלק");
      return false;
    }
    if (!avgConsumption.trim()) {
      showTemporaryToast(
        fuelType === "Electric" ? "אנא מלא את צריכת האנרגיה (kWh/ק״מ)" : "אנא מלא את הצריכה הממוצעת (km/l)"
      );
      return false;
    }
    if (isNaN(Number(avgConsumption))) {
      showTemporaryToast("אנא הזן ערך מספרי לצריכה הממוצעת");
      return false;
    }
    return true;
  };

  const saveVehicleToStorage = async (vehicleToSave: Vehicle) => {
    try {
      const stored = await AsyncStorage.getItem("vehicles");
      const existing: Vehicle[] = stored ? JSON.parse(stored) : [];
      existing.push(vehicleToSave);
      await AsyncStorage.setItem("vehicles", JSON.stringify(existing));
      router.back();
    } catch (error) {
      console.error("Error saving vehicle:", error);
      showTemporaryToast("שגיאה בשמירה");
    }
  };

  const handleSaveBtnClick = () => {
    if (!validate()) return;

    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      plate: plate.trim() || "",
      name: manufacturer.trim(),
      model: model.trim() || "",
      engine: engine.trim() || "",
      type: "car",
      avgConsumption: parseFloat(avgConsumption),
      fueltype: fuelType || "Gasoline",
      year: year ? parseInt(year) : new Date().getFullYear(),
    };

    setPendingVehicle(newVehicle);

    // On Web, skip ad logic completely
    if (Platform.OS === 'web') {
      saveVehicleToStorage(newVehicle);
      return;
    }

    // On Native, trigger the ad overlay
    setShowAd(true);
  };

  const handleAdComplete = () => {
    setShowAd(false);
    if (pendingVehicle) {
      saveVehicleToStorage(pendingVehicle);
    }
  };

  const handleAdError = (error: any) => {
    console.error("Ad error:", error);
    // You don't need to call handleAdComplete here because the Ad Component
    // already calls onAdComplete when onAdError fires (Fail-safe mechanism).
  };

  const avgPlaceholder = fuelType === "Electric" ? "לדוגמה: 0.15 (kWh/ק״מ)" : "לדוגמה: 16.5 (km/l)";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtnTop} onPress={() => router.back()}>
            <Text style={styles.backBtnTopText}>→</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.emoji}>🚗</Text>
            <Text style={styles.title}>הוספת רכב חדש</Text>
            <Text style={styles.subtitle}>מלא את הפרטים להוספת הרכב שלך</Text>
          </View>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Required Fields Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>פרטים חובה</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>נדרש</Text>
              </View>
            </View>

            {/* Manufacturer Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                יצרן <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "manufacturer" && styles.inputFocused,
                ]}
                placeholder="חפש או הקלד יצרן..."
                placeholderTextColor="#999"
                value={manufacturer}
                onChangeText={handleManufacturerChange}
                onFocus={() => setFocusedField("manufacturer")}
                onBlur={() => setFocusedField(null)}
                returnKeyType="done"
                textAlign="right"
              />
            </View>

            {/* Autocomplete Dropdown */}
            {filteredManufacturers.length > 0 && (
              <View style={styles.dropdown}>
                <ScrollView 
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredManufacturers.map((item, index) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.dropdownItem,
                        index === filteredManufacturers.length - 1 && styles.dropdownItemLast
                      ]}
                      onPress={() => handleManufacturerSelect(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownIcon}>🏢</Text>
                      <Text style={styles.dropdownText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Fuel Type Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                סוג דלק <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.fuelRow}>
                <TouchableOpacity
                  style={[
                    styles.fuelBtn,
                    fuelType === "Electric" && styles.fuelBtnActiveElectric
                  ]}
                  onPress={() => setFuelType("Electric")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fuelIcon}>⚡</Text>
                  <Text style={[
                    styles.fuelBtnText,
                    fuelType === "Electric" && styles.fuelBtnTextActive
                  ]}>חשמלי</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fuelBtn,
                    fuelType === "Diesel" && styles.fuelBtnActiveDiesel
                  ]}
                  onPress={() => setFuelType("Diesel")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fuelIcon}>🛢</Text>
                  <Text style={[
                    styles.fuelBtnText,
                    fuelType === "Diesel" && styles.fuelBtnTextActive
                  ]}>דיזל</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fuelBtn,
                    fuelType === "Gasoline" && styles.fuelBtnActiveGasoline
                  ]}
                  onPress={() => setFuelType("Gasoline")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fuelIcon}>⛽</Text>
                  <Text style={[
                    styles.fuelBtnText,
                    fuelType === "Gasoline" && styles.fuelBtnTextActive
                  ]}>בנזין</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Average Consumption */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                צריכה ממוצעת <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "consumption" && styles.inputFocused,
                ]}
                placeholder={avgPlaceholder}
                placeholderTextColor="#999"
                keyboardType="numeric"
                inputMode="numeric"
                returnKeyType="done"
                value={avgConsumption}
                onChangeText={setAvgConsumption}
                onFocus={() => setFocusedField("consumption")}
                onBlur={() => setFocusedField(null)}
                textAlign="right"
              />
            </View>
          </View>

          {/* Optional Fields Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>פרטים נוספים</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>אופציונלי</Text>
              </View>
            </View>

            {/* License Plate */}
            <View style={styles.fieldContainer}>
              <Text style={styles.labelOptional}>מספר רישוי</Text>
              <TextInput
                style={[
                  styles.inputOptional,
                  focusedField === "plate" && styles.inputFocused,
                ]}
                placeholder="לדוגמה: 12-345-67"
                placeholderTextColor="#aaa"
                value={plate}
                onChangeText={setPlate}
                onFocus={() => setFocusedField("plate")}
                onBlur={() => setFocusedField(null)}
                textAlign="right"
              />
            </View>

            {/* Model */}
            <View style={styles.fieldContainer}>
              <Text style={styles.labelOptional}>דגם</Text>
              <TextInput
                style={[
                  styles.inputOptional,
                  focusedField === "model" && styles.inputFocused,
                ]}
                placeholder="לדוגמה: PICANTO"
                placeholderTextColor="#aaa"
                value={model}
                onChangeText={setModel}
                onFocus={() => setFocusedField("model")}
                onBlur={() => setFocusedField(null)}
                textAlign="right"
              />
            </View>

            {/* Engine */}
            <View style={styles.fieldContainer}>
              <Text style={styles.labelOptional}>מנוע</Text>
              <TextInput
                style={[
                  styles.inputOptional,
                  focusedField === "engine" && styles.inputFocused,
                ]}
                placeholder="לדוגמה: G4LA"
                placeholderTextColor="#aaa"
                value={engine}
                onChangeText={setEngine}
                onFocus={() => setFocusedField("engine")}
                onBlur={() => setFocusedField(null)}
                textAlign="right"
              />
            </View>

            {/* Year */}
            <View style={styles.fieldContainer}>
              <Text style={styles.labelOptional}>שנת ייצור</Text>
              <TextInput
                style={[
                  styles.inputOptional,
                  focusedField === "year" && styles.inputFocused,
                ]}
                placeholder={`לדוגמה: ${new Date().getFullYear()}`}
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                inputMode="numeric"
                returnKeyType="done"
                value={year}
                onChangeText={setYear}
                onFocus={() => setFocusedField("year")}
                onBlur={() => setFocusedField(null)}
                textAlign="right"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSaveBtnClick}
          activeOpacity={0.9}
        >
          <View style={styles.saveButtonContent}>
            <Text style={styles.saveButtonIcon}>💾</Text>
            <Text style={styles.saveButtonText}>שמור רכב</Text>
          </View>
        </TouchableOpacity>

        {/* Toast */}
        {showToast && <Toast message={toastMessage || "אנא מלא את השדות הנדרשים"} />}

        {/* Rewarded Interstitial Ad */}
        {showAd && (
          <VehicleRewardedAd
            onAdComplete={handleAdComplete}
            onAdError={handleAdError}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ... styles remain unchanged (השארתי את כל העיצוב בדיוק כמו במקור) ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
    alignItems: "center",
    position: "relative",
  },
  backBtnTop: {
  position: "absolute",
  right: 0,
  top: 0,
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#fff",
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
},
  backBtnTopText: {
    fontSize: 24,
    color: "#333",
    fontWeight: "600",
    transform: [{ scaleX: -1 }],
  },
  titleContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  requiredBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  optionalBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  optionalBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
  },
  fieldContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
    writingDirection: "rtl",
    textAlign: "right",  
  },
  labelOptional: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 10,
    writingDirection: "rtl",
    textAlign: "right",
  },
  asterisk: {
    color: "#DC2626",
    writingDirection: "rtl", 
    textAlign: "right",
    fontSize: 16,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    fontWeight: "500",
  },
  inputOptional: {
    backgroundColor: "#FAFBFC",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  inputFocused: {
    borderColor: "#009688",
    backgroundColor: "#fff",
    shadowColor: "#009688",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: -10,
    marginBottom: 18,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  fuelRow: {
    flexDirection: "row",
    gap: 10,
  },
  fuelBtn: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  fuelBtnActiveElectric: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fuelBtnActiveDiesel: {
    backgroundColor: "#DBEAFE",
    borderColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fuelBtnActiveGasoline: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fuelIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  fuelBtnText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#6B7280",
  },
  fuelBtnTextActive: {
    color: "#1F2937",
  },
  saveButton: {
    backgroundColor: "#009688",
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
    shadowColor: "#009688",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});