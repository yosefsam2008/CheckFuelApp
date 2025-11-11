// app/VehicleDetails.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { Vehicle } from "./vehiclesData";

/**
 * VehicleDetails
 * Simple details screen to present:
 * - Fuel type (canonical)
 * - Model and make
 * - avgConsumption (km/L for ICE, km/% for Electric) with clear label
 *
 * Expects route param `id` for vehicle id.
 */

export default function VehicleDetails() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const existing = await AsyncStorage.getItem("vehicles");
        const list: Vehicle[] = existing ? JSON.parse(existing) : [];
        const found = list.find((v) => v.id === id);
        setVehicle(found ?? null);
      } catch (err) {
        console.error("VehicleDetails load error", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!vehicle)
    return (
      <View style={styles.container}>
        <Text style={styles.title}>לא נמצא רכב</Text>
      </View>
    );

  const isElectric = vehicle.fueltype === "Electric";
  const consumptionLabel = isElectric ? "km / %battery" : "km / liter (km/L)";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{vehicle.name}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>לוחית:</Text>
        <Text style={styles.value}>{vehicle.plate}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>דגם:</Text>
        <Text style={styles.value}>{vehicle.model}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>סוג דלק:</Text>
        <Text style={styles.value}>{vehicle.fueltype}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>צריכה ממוצעת:</Text>
        <Text style={styles.value}>
          {vehicle.avgConsumption !== undefined ? `${vehicle.avgConsumption} ${consumptionLabel}` : "לא זמין"}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>שנת ייצור:</Text>
        <Text style={styles.value}>{vehicle.year}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>מנוע:</Text>
        <Text style={styles.value}>{vehicle.engine}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 18, color: "#263238" },
  row: { flexDirection: "row", marginBottom: 12 },
  label: { width: 120, color: "#757575", fontWeight: "700" },
  value: { flex: 1, color: "#212121" },
});
