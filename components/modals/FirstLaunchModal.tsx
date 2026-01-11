import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { LEGAL_UI_STRINGS } from "../../legal/LEGAL_UI_STRINGS_HE";

const COLORS = {
  primary: "#34C759",
  primaryDark: "#248A3D",
  primaryLight: "#A8E6CF",
  accent: "#007AFF",
  accentLight: "#E8F4FF",
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  background: "#F2F2F7",
  card: "#FFFFFF",
  cardBorder: "rgba(0, 0, 0, 0.04)",
  textPrimary: "#000000",
  textSecondary: "#8E8E93",
  textTertiary: "#AEAEB2",
  textOnPrimary: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.4)",
  shadow: "#000000",
};

interface FirstLaunchModalProps {
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const FirstLaunchModal: React.FC<FirstLaunchModalProps> = ({
  visible,
  onAccept,
  onReject,
}) => {
  const [accepted, setAccepted] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem("app_launched", "true");
      await AsyncStorage.setItem("legal_accepted_date", new Date().toISOString());
      onAccept();
    } catch (error) {
      console.error("Failed to save acceptance:", error);
    }
  };

  const handleReject = () => {
    onReject();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      hardwareAccelerated={true}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: opacityAnim }]}
        />

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.centeredView,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modalContent}>
            {/* Header Icon */}
            <Text style={styles.headerIcon}>📜</Text>

            {/* Title */}
            <Text style={styles.title}>
              {LEGAL_UI_STRINGS.firstLaunch.title}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {LEGAL_UI_STRINGS.firstLaunch.message}
            </Text>

            {/* Scrollable Legal Text */}
            <ScrollView
              style={styles.legalTextContainer}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.legalSection}>
                <Text style={styles.legalSectionTitle}>📋 תנאי השימוש</Text>
                <Text style={styles.legalSectionText}>
                  באמצעות שימוש באפליקציה זו, אתה מסכים עם תנאי השימוש שלנו.{"\n\n"}
                  • אפליקציה זו מחושבת על ידי נתונים ממקורות שונים{"\n"}
                  • התוצאות הן הערכות בלבד ולא מהוות תחליף לבדיקה בפועל{"\n"}
                  • אנחנו לא אחראים לשגיאות חישוביות{"\n"}
                  • אתה עלול להשתמש באפליקציה לצרכים אישיים בלבד
                </Text>
              </View>

              <View style={styles.legalSection}>
                <Text style={styles.legalSectionTitle}>🔒 מדיניות הפרטיות</Text>
                <Text style={styles.legalSectionText}>
                  הנתונים שלך:
                  {"\n\n"}
                  • נשמרים רק בהתקן שלך{"\n"}
                  • לא משודרים לשום שרת{"\n"}
                  • לא משותפים עם צדדים שלישיים{"\n"}
                  • לא משמשים למטרות פרסום או עקיבה
                </Text>
              </View>

              <View style={styles.legalSection}>
                <Text style={styles.legalSectionTitle}>
                  ⚠️ הבהרה חשובה
                </Text>
                <Text style={styles.legalSectionText}>
                  התוצאות המוצגות בחישוב הן הערכות משוערות בלבד. אל תסתמוך עליהן כמקור יחידה. בדוק תמיד עם תחנת דלק או סוכן בפועל.
                </Text>
              </View>
            </ScrollView>

            {/* Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAccepted(!accepted)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  accepted && styles.checkboxChecked,
                ]}
              >
                {accepted && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                {LEGAL_UI_STRINGS.firstLaunch.checkboxLabel}
              </Text>
            </TouchableOpacity>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={handleReject}
                activeOpacity={0.7}
              >
                <Text style={styles.rejectButtonText}>
                  {LEGAL_UI_STRINGS.firstLaunch.buttonReject}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  !accepted && styles.acceptButtonDisabled,
                ]}
                onPress={handleAccept}
                disabled={!accepted}
                activeOpacity={0.7}
              >
                <Text style={styles.acceptButtonText}>
                  {LEGAL_UI_STRINGS.firstLaunch.buttonAccept}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "85%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  headerIcon: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  legalTextContainer: {
    maxHeight: 200,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  legalSection: {
    marginBottom: 16,
  },
  legalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "right",
  },
  legalSectionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    textAlign: "right",
  },
  checkboxContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 20,
    paddingHorizontal: 12,
    backgroundColor: "#F9F9FB",
    borderRadius: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textTertiary,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    textAlign: "right",
  },
  buttonContainer: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textTertiary,
    alignItems: "center",
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  acceptButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    shadowOpacity: 0,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
