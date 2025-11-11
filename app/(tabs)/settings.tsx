import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
  const [fuelPrice, setFuelPrice] = useState("");

  // טוען את המחיר מהזיכרון כשנכנסים למסך
  useEffect(() => {
    const loadFuelPrice = async () => {
      try {
        const savedPrice = await AsyncStorage.getItem("fuelPrice");
        if (savedPrice !== null) setFuelPrice(savedPrice);
      } catch (err) {
        console.log("Error loading fuel price:", err);
      }
    };
    loadFuelPrice();
  }, []);

  // שומר את המחיר כל פעם שמשנים
  interface FuelPriceChangeHandler {
    (value: string): Promise<void>;
  }

  const handleFuelPriceChange: FuelPriceChangeHandler = async (value) => {
    setFuelPrice(value);
    try {
      await AsyncStorage.setItem("fuelPrice", value);
    } catch (err) {
      Alert.alert("שגיאה", "לא ניתן לשמור את המחיר");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ הגדרות</Text>

      <View style={styles.section}>
        <Text style={styles.label}>מחיר דלק נוכחי (₪ לליטר)</Text>
        <TextInput
          style={styles.input}
          value={fuelPrice}
          onChangeText={handleFuelPriceChange}
          placeholder="לדוגמה: 7.42"
          keyboardType="numeric"
        />
        <Text style={styles.hint}>המחיר נשמר אוטומטית 💾</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#009688",
  },
  section: {
    backgroundColor: "#f7f7f7",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    fontSize: 18,
    textAlign: "center",
  },
  hint: {
    textAlign: "center",
    marginTop: 10,
    color: "#888",
  },
});
