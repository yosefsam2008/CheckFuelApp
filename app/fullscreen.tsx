import React, { useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function FullScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    // הסתרת הטאב בר
    navigation.setOptions({ tabBarStyle: { display: "none" } });

    return () => {
      // החזרת הטאב בר כשעוזבים את המסך
      navigation.setOptions({ tabBarStyle: { display: "flex" } });
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Text style={styles.text}>זה מסך מלא 🌌</Text>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.exitButton}
      >
        <Text style={styles.exitText}>יציאה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "white",
    fontSize: 22,
  },
  exitButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 8,
  },
  exitText: {
    color: "white",
    fontSize: 16,
  },
});
