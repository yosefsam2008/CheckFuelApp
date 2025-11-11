// Toast.tsx
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, Dimensions } from "react-native";

const { height } = Dimensions.get("window");

interface ToastProps {
  message: string;
  duration?: number;
  onHide?: () => void;
}

export default function Toast({ message, duration = 2000, onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Fade in + slide up
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      // Fade out + slide down
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 50, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 80, // מעל ה-TabBar
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  text: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
