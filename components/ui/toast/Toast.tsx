import React, { useState, useCallback, useRef } from 'react';
import { Animated, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ToastState {
  message: string;
  visible: boolean;
}

interface ToastStyles {
  toast?: ViewStyle;
  toastText?: TextStyle;
}

interface UseToastOptions {
  defaultDuration?: number;
  styles?: ToastStyles;
}

/**
 * Unified Toast Hook
 * Consolidates toast functionality across the app
 *
 * @example
 * const { showToast, ToastComponent } = useToast();
 *
 * // Show a toast
 * showToast('הפעולה הושלמה בהצלחה');
 *
 * // Render the toast component
 * return (
 *   <View>
 *     {children}
 *     <ToastComponent />
 *   </View>
 * );
 */
export function useToast(options: UseToastOptions = {}) {
  const { defaultDuration = 2000, styles: customStyles = {} } = options;

  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message: string, duration: number = defaultDuration) => {
    setToast({ message, visible: true });

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast({ message: '', visible: false });
    });
  }, [fadeAnim, defaultDuration]);

  const ToastComponent = () => {
    if (!toast.visible) return null;

    return (
      <Animated.View
        style={[
          styles.toast,
          customStyles.toast,
          { opacity: fadeAnim }
        ]}
      >
        <Text style={[styles.toastText, customStyles.toastText]}>
          {toast.message}
        </Text>
      </Animated.View>
    );
  };

  return { showToast, ToastComponent };
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default useToast;
