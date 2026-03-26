// app/VehiclesScreen.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Vehicle } from "../../lib/data/vehiclesData";
import { LEGAL_UI_STRINGS } from "../../legal/LEGAL_UI_STRINGS_HE";

// Conditional import for ads - only load on native platforms
const PlateDetectionRewardedAd =
  Platform.OS === "web"
    ? () => null
    : require("../../components/PlateDetectionRewardedAd").default;
    const AdBanner = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;

const IS_WEB = Platform.OS === "web";
const MAX_WIDTH = 600;

type FuelType = "Gasoline" | "Diesel" | "Electric";

// Unified configuration for fuel types for cleaner lookups
const FUEL_CONFIG: Record<FuelType, { label: string; emoji: string; color: string }> = {
  Electric: { label: "חשמלי ⚡", emoji: "⚡", color: "#4CAF50" },
  Gasoline: { label: "בנזין ⛽", emoji: "⛽", color: "#FF9800" },
  Diesel: { label: "דיזל ⛽", emoji: "⛽", color: "#607D8B" },
};

// Default fallback configuration
const DEFAULT_FUEL = { label: "לא ידוע", emoji: "⚡", color: "#009688" };

const getFuelData = (fuelType: string | undefined) => {
  return FUEL_CONFIG[fuelType as FuelType] || DEFAULT_FUEL;
};

// Detail Row Component
const DetailRow = ({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: string;
  label: string;
  value: string;
  isLast?: boolean;
}) => (
  <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
    <View style={styles.detailLeft}>
      <View style={styles.detailIconContainer}>
        <Text style={styles.detailIconText}>{icon}</Text>
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

export default function VehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  
  // Modals & Modes
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Plate detection states
  const [showPlateDetectionModal, setShowPlateDetectionModal] = useState(false);
  const [showPlateDetectionAd, setShowPlateDetectionAd] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [manufactureYear, setManufactureYear] = useState("");
  const [avgConsumption, setAvgConsumption] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("Gasoline");

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string, duration = 2000) => {
    setToastMessage(message);
    Animated.spring(toastOpacity, {
      toValue: 1,
      friction: 8,
      tension: 40,
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
  }, [toastOpacity]);

  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setBarStyle("dark-content");
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem("vehicles");
      if (saved) {
        const parsedVehicles = JSON.parse(saved);
        setVehicles(parsedVehicles);
      } else {
        setVehicles([]);
      }
    } catch (error) {
      console.error("❌ Error loading vehicles:", error);
      setVehicles([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles])
  );

  const openDetails = (item: Vehicle) => {
    setSelected(item);
    setName(item.name);
    setModel(item.model);
    setEngine(item.engine);
    setAvgConsumption(item.avgConsumption ? String(item.avgConsumption) : "");
    const safeFuelType = item.fueltype || ""; // מונע מצב של undefined
    const isValidFuel = Object.keys(FUEL_CONFIG).includes(safeFuelType);
    setFuelType(isValidFuel ? (safeFuelType as FuelType) : "Gasoline");
    
    setManufactureYear(item.year ? String(item.year) : "");
    setEditMode(false);
    setShowModal(true);

    modalScale.setValue(0.9);
    modalOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowModal(false));
  };

  const saveChanges = async () => {
    if (!selected) return;

    try {
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
      closeModal();
      showToast(LEGAL_UI_STRINGS.toasts.dataSaved);
    } catch (error) {
      console.error("Failed to save changes:", error);
      showToast("שגיאה בשמירה");
    }
  };

  const deleteVehicleById = async (id: string) => {
    try {
      const updatedList = vehicles.filter((v) => v.id !== id);
      
      // Update state first for instant UI response
      setVehicles(updatedList);
      await AsyncStorage.setItem("vehicles", JSON.stringify(updatedList));

      closeModal();
      setSelected(null);
      showToast("🗑️ הרכב נמחק בהצלחה");
    } catch (error) {
      console.error("❌ שגיאה במחיקה:", error);
      showToast("❌ שגיאה במחיקה");
    }
  };

  const confirmDelete = () => setShowDeleteConfirm(true);

  const handleDeleteConfirmed = async () => {
    if (!selected) return;
    setShowDeleteConfirm(false);
    await deleteVehicleById(selected.id);
  };

  const handleDeleteCancelled = () => setShowDeleteConfirm(false);

  const getVehicleEmoji = (type: Vehicle["type"]) => {
    switch (type) {
      case "car": return "🚗";
      case "motorcycle": return "🏍️";
      case "truck": return "🚛";
      default: return "❓";
    }
  };

  const handleShowPlateAd = () => {
    setShowPlateDetectionModal(false);
    if (Platform.OS === "web") {
      router.push("/addVehicleByPlate");
      return;
    }
    setShowPlateDetectionAd(true);
  };

  const onPlateAdComplete = () => {
    setShowPlateDetectionAd(false);
    router.push("/addVehicleByPlate");
    showToast("✓ זיהוי אוטומטי זמין!");
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.innerContainer}>
        {/* Animated Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerEmoji}>🚗</Text>
            <Text style={styles.title}>הרכבים שלי</Text>
          </View>
          <Text style={styles.subtitle}>
            {vehicles.length === 0
              ? "התחל להוסיף רכבים"
              : `${vehicles.length} רכב${vehicles.length === 1 ? "" : "ים"} שמור${vehicles.length === 1 ? "" : "ים"}`}
          </Text>
        </Animated.View>

        {/* Toast */}
        {toastMessage && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: toastOpacity,
                transform: [
                  {
                    translateY: toastOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}

        <Animated.FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            IS_WEB && { alignSelf: "center", width: "100%", maxWidth: MAX_WIDTH },
          ]}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          renderItem={({ item }) => {
            const fuelData = getFuelData(item.fueltype);
            return (
              <TouchableOpacity
                onPress={() => openDetails(item)}
                activeOpacity={0.7}
                style={[
                  styles.card,
                  { borderLeftColor: fuelData.color, borderLeftWidth: 5 },
                ]}
              >
                <View style={[styles.fuelBadge, { backgroundColor: fuelData.color }]}>
                  <Text style={styles.fuelBadgeText}>{fuelData.emoji}</Text>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.vehicleIconContainer}>
                    <Text style={styles.vehicleIcon}>{getVehicleEmoji(item.type)}</Text>
                  </View>

                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.vehicleModel} numberOfLines={1}>
                      {item.model} • {item.engine}
                    </Text>
                    <View style={styles.consumptionRow}>
                      <View style={styles.consumptionBadge}>
                        <Text style={styles.consumptionLabel}>צריכה:</Text>
                        <Text style={styles.consumptionValue}>
                          {item.avgConsumption
                            ? item.fueltype === "Electric"
                              ? `${item.avgConsumption.toFixed(4)} kWh/ק״מ`
                              : `${item.avgConsumption.toFixed(1)} km/l`
                            : "לא ידוע"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.arrowContainer}>
                    <Text style={styles.arrow}>‹</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyTitle}>{LEGAL_UI_STRINGS.empty.noVehicles}</Text>
              <Text style={styles.emptyText}>{LEGAL_UI_STRINGS.empty.addFirst}</Text>
              
              {/* התוספת שלנו: פרסומת מלבנית גדולה */}
              {Platform.OS !== 'web' && (
                <View style={styles.emptyAdWrapper}>
                  <Text style={styles.adTagSmall}>פרסומת</Text>
                  <AdBanner size="MEDIUM_RECTANGLE" />
                </View>
              )}
            </View>
          }
        />

        {/* Action Buttons */}
        <View style={[styles.bottomButtons, IS_WEB && { maxWidth: MAX_WIDTH, alignSelf: "center" }]}>
          <TouchableOpacity
            style={[styles.addBtn, styles.addBtnPrimary]}
            activeOpacity={0.8}
            onPress={() => setShowPlateDetectionModal(true)}
            testID="btn-add-by-plate"
          >
            <View style={styles.btnGradient}>
              <Text style={styles.addBtnIconPrimary}>📋</Text>
              <Text style={styles.addBtnTextPrimary}>הוסף לפי לוחית רישוי</Text>
              <Text style={styles.addBtnSubtext}>זיהוי אוטומטי מהיר</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, styles.addBtnSecondary]}
            activeOpacity={0.8}
            onPress={() => router.push("/addVehicle")}
            testID="btn-add-manual"
          >
            <View style={styles.btnGradientSecondary}>
              <Text style={styles.addBtnIconSecondary}>✏️</Text>
              <Text style={styles.addBtnTextSecondary}>הוסף ידני</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Details/Edit Modal */}
      <Modal visible={showModal} animationType="none" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
          <Animated.View
            style={[
              styles.modalContent,
              { opacity: modalOpacity, transform: [{ scale: modalScale }] },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
              <View
                style={[
                  styles.modalHeaderBadge,
                  { backgroundColor: getFuelData(selected?.fueltype).color },
                ]}
              >
                <Text style={styles.modalHeaderIcon}>
                  {selected && getFuelData(selected.fueltype).emoji}
                </Text>
              </View>
              <Text style={styles.modalTitle}>{editMode ? "עריכת רכב" : "פרטי רכב"}</Text>
            </View>

            <ScrollView
              style={styles.modalScrollArea}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {selected && !editMode && (
                <View style={styles.detailsContainer}>
                  <DetailRow icon="📝" label="שם" value={selected.name} />
                  <DetailRow icon="🔢" label="לוחית רישוי" value={selected.plate} />
                  <DetailRow icon="🚙" label="דגם" value={selected.model} />
                  <DetailRow icon="⚙️" label="מנוע" value={selected.engine} />
                  <DetailRow icon="📅" label="שנת ייצור" value={String(selected.year)} />
                  <DetailRow
                    icon={getFuelData(selected.fueltype).emoji}
                    label="סוג דלק"
                    value={getFuelData(selected.fueltype).label}
                  />
                  <DetailRow
                    icon="📊"
                    label="צריכה ממוצעת"
                    value={
                      selected.avgConsumption
                        ? selected.fueltype === "Electric"
                          ? `${selected.avgConsumption.toFixed(4)} kWh/ק״מ`
                          : `${selected.avgConsumption.toFixed(2)} km/l`
                        : "לא ידוע"
                    }
                    isLast
                  />
                </View>
              )}

              {selected && editMode && (
                <View style={styles.editContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>שם הרכב</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="הזן שם רכב"
                      placeholderTextColor="#999"
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>דגם</Text>
                    <TextInput
                      style={styles.input}
                      value={model}
                      onChangeText={setModel}
                      placeholder="לדוגמה: טויוטה קורולה"
                      placeholderTextColor="#999"
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>מנוע</Text>
                    <TextInput
                      style={styles.input}
                      value={engine}
                      onChangeText={setEngine}
                      placeholder="לדוגמה: 1.6L"
                      placeholderTextColor="#999"
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>שנת ייצור</Text>
                    <TextInput
                      style={styles.input}
                      value={manufactureYear}
                      onChangeText={setManufactureYear}
                      placeholder="לדוגמה: 2020"
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholderTextColor="#999"
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>צריכה ממוצעת</Text>
                    <TextInput
                      style={styles.input}
                      value={avgConsumption}
                      onChangeText={setAvgConsumption}
                      placeholder={
                        fuelType === "Electric" ? "לדוגמה: 0.15 kWh/ק״מ" : "לדוגמה: 15.5 km/l"
                      }
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholderTextColor="#999"
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>סוג דלק</Text>
                    <View style={styles.fuelSelector}>
                      {(Object.entries(FUEL_CONFIG) as [FuelType, any][]).map(([key, ft]) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.fuelBtn,
                            fuelType === key && [
                              styles.fuelBtnActive,
                              { backgroundColor: ft.color },
                            ],
                          ]}
                          onPress={() => setFuelType(key)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.fuelBtnText,
                              fuelType === key && styles.fuelBtnTextActive,
                            ]}
                          >
                            {ft.label.replace(/ \D$/, "")}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              {!editMode ? (
                <>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.editBtn]}
                    onPress={() => setEditMode(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editBtnText}>✏️ ערוך</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.deleteBtn]}
                    onPress={confirmDelete}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteBtnText}>🗑️ מחק</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={saveChanges}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveBtnText}>✓ שמור</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => setEditMode(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>✕ בטל</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Plate Detection Info Modal */}
      {showPlateDetectionModal && (
        <Modal
          visible={showPlateDetectionModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowPlateDetectionModal(false)}
        >
          <View style={styles.plateModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowPlateDetectionModal(false)}
            />
            <View style={styles.plateModalContent}>
              <Text style={styles.plateModalIcon}>🎬</Text>
              <Text style={styles.plateModalTitle}>זיהוי אוטומטי לפי לוחית רישוי</Text>
              <Text style={styles.plateModalDescription}>
                כדי לזהות את הרכב שלך אוטומטית,{'\n'}צפה בפרסומת קצרה של 15-30 שניות
              </Text>

              <View style={styles.plateBenefits}>
                <View style={styles.plateBenefit}>
                  <Text style={styles.plateBenefitIcon}>⚡</Text>
                  <Text style={styles.plateBenefitText}>זיהוי מיידי</Text>
                </View>
                <View style={styles.plateBenefit}>
                  <Text style={styles.plateBenefitIcon}>✓</Text>
                  <Text style={styles.plateBenefitText}>נתונים מדויקים</Text>
                </View>
                <View style={styles.plateBenefit}>
                  <Text style={styles.plateBenefitIcon}>🎁</Text>
                  <Text style={styles.plateBenefitText}>שירות חינמי</Text>
                </View>
              </View>

              <View style={styles.plateModalActions}>
                <TouchableOpacity
                  style={styles.plateCancelButton}
                  onPress={() => setShowPlateDetectionModal(false)}
                >
                  <Text style={styles.plateCancelButtonText}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.plateContinueButton}
                  onPress={handleShowPlateAd}
                >
                  <Text style={styles.plateContinueButtonText}>פתח זיהוי אוטומטי ◀</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Rewarded Ad Container */}
      {showPlateDetectionAd && (
        <PlateDetectionRewardedAd
          onAdComplete={onPlateAdComplete}
          onAdError={(error: Error) => {
            console.error("Plate detection ad error:", error);
            onPlateAdComplete(); // Fallback
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          visible={showDeleteConfirm}
          animationType="fade"
          transparent
          onRequestClose={handleDeleteCancelled}
        >
          <View style={styles.deleteModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleDeleteCancelled}
            />
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalIcon}>🗑️</Text>
              <Text style={styles.deleteModalTitle}>מחיקת רכב</Text>
              <Text style={styles.deleteModalDescription}>
                האם אתה בטוח שברצונך למחוק את{"\n"}
                <Text style={styles.deleteModalVehicleName}>{selected?.name}</Text>?
              </Text>

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.deleteCancelButton}
                  onPress={handleDeleteCancelled}
                >
                  <Text style={styles.deleteCancelButtonText}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteConfirmButton}
                  onPress={handleDeleteConfirmed}
                >
                  <Text style={styles.deleteConfirmButtonText}>🗑️ מחק</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 20 : 16,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    ...(IS_WEB && {
      maxWidth: MAX_WIDTH,
      width: "100%",
      alignSelf: "center",
    }),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#009688",
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
    writingDirection: "rtl",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 180,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#009688",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  fuelBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  fuelBadgeText: {
    fontSize: 18,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingRight: 56,
  },
  vehicleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#f0f9f8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  vehicleIcon: {
    fontSize: 36,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  vehicleModel: {
    fontSize: 15,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
    textAlign: "right",
    writingDirection: "rtl",
  },
  consumptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end", // מיישר את בועת הצריכה לימין
  },
  consumptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5f4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  consumptionLabel: {
    fontSize: 13,
    color: "#009688",
    fontWeight: "600",
    marginRight: 6,
    writingDirection: "rtl",
  },
  consumptionValue: {
    fontSize: 14,
    color: "#00695c",
    fontWeight: "700",
  },
  arrowContainer: {
    marginLeft: 8,
  },
  arrow: {
    fontSize: 24,
    color: "#009688",
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30, // הקטנו מ-80 כדי להשאיר מקום לפרסומת ולכפתורים למטה
    paddingHorizontal: 40,
  },
  // העיצובים החדשים לפרסומת:
  emptyAdWrapper: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 260,
  },
  adTagSmall: {
    fontSize: 10,
    color: "#999",
    marginBottom: 4,
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
    writingDirection: "rtl",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    writingDirection: "rtl",
  },
  bottomButtons: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row", // הוחזר ל-row
    gap: 12,
  },
  addBtn: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    minHeight: 88,
  },
  addBtnPrimary: {
    backgroundColor: "#009688",
  },
  addBtnSecondary: {
    backgroundColor: "#26a69a",
    maxWidth: 140,
  },
  btnGradient: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGradientSecondary: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnIconPrimary: {
    fontSize: 28,
    marginBottom: 6,
  },
  addBtnIconSecondary: {
    fontSize: 26,
    marginBottom: 4,
  },
  addBtnTextPrimary: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
    writingDirection: "rtl",
  },
  addBtnTextSecondary: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    writingDirection: "rtl",
  },
  addBtnSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
    writingDirection: "rtl",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    paddingBottom: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 24,
    maxHeight: "85%",
    direction: "rtl", // חובה כדי שהמודל יעבוד מימין לשמאל תמיד
  },
  modalHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalScrollContent: {
    paddingHorizontal: 35,
    paddingTop: 22,
    paddingBottom: 16,
  },
  modalScrollArea: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 420,
  },
  modalCloseButton: {
    position: "absolute",
    top: Platform.OS === "android" ? 18 : 16,
    left: Platform.OS === "android" ? 18 : 16,
    width: Platform.OS === "android" ? 36 : 32,
    height: Platform.OS === "android" ? 36 : 32,
    borderRadius: Platform.OS === "android" ? 18 : 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalCloseButtonText: {
    fontSize: Platform.OS === "android" ? 20 : 18,
    color: "#6b7280",
    fontWeight: "600",
  },
  modalHeaderBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  modalHeaderIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: -0.3,
    writingDirection: "rtl",
  },
  detailsContainer: {
    backgroundColor: "#fff",
    gap: 6,
  },
  detailRow: {
    flexDirection: "row", // תוקן מ-row-reverse
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    minHeight: 64,
  },
  detailRowLast: {
    marginBottom: 0,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
    minWidth: 120,
  },
  detailIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#e8f5f4",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailIconText: {
    fontSize: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
  },
  detailValue: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "700",
    textAlign: "left", // הערך ייצמד לשמאל השורה
    flex: 1,
    paddingLeft: 10,
    lineHeight: 22,
    writingDirection: "rtl",
  },
  editContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginRight: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  input: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1f2937",
    backgroundColor: "#fff",
    fontWeight: "500",
    textAlign: "right",
    writingDirection: "rtl", // זה מה שימנע מהנקודות לקפוץ לצד השני
    minHeight: 46,
  },
  fuelSelector: {
    flexDirection: "row",
    gap: 8,
  },
  fuelBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  fuelBtnActive: {
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fuelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
  fuelBtnTextActive: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row", // תוקן מ-row-reverse
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 50,
  },
  editBtn: {
    backgroundColor: "#009688",
  },
  editBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "#f44336",
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  saveBtn: {
    backgroundColor: "#009688",
    shadowColor: "#009688",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelBtn: {
    backgroundColor: "#f3f4f6",
  },
  cancelBtnText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "600",
  },
  toast: {
    position: "absolute",
    bottom: 120,
    left: 40,
    right: 40,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    ...(IS_WEB && {
      maxWidth: MAX_WIDTH,
      alignSelf: "center",
    }),
  },
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    writingDirection: "rtl",
  },

  // Plate Detection Modal
  plateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  plateModalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 24,
    direction: "rtl",
  },
  plateModalIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  plateModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
    writingDirection: "rtl",
  },
  plateModalDescription: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
    writingDirection: "rtl",
  },
  plateBenefits: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 32,
  },
  plateBenefit: {
    alignItems: "center",
    flex: 1,
  },
  plateBenefitIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  plateBenefitText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    writingDirection: "rtl",
  },
  plateModalActions: {
    flexDirection: "row", // תוקן מ-row-reverse
    gap: 12,
    width: "100%",
  },
  plateCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  plateCancelButtonText: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    borderRadius: 8,
    fontWeight: "700",
    textAlign: "center",
    writingDirection: "rtl",
  },
  plateContinueButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#009688",
    alignItems: "center",
    shadowColor: "#009688",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  plateContinueButtonText: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 14,
    borderRadius: 8,
    fontWeight: "700",
    textAlign: "center",
    writingDirection: "rtl",
  },

  // Delete Confirmation Modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteModalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 24,
    direction: "rtl",
  },
  deleteModalIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
    writingDirection: "rtl",
  },
  deleteModalDescription: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
    writingDirection: "rtl",
  },
  deleteModalVehicleName: {
    fontWeight: "700",
    color: "#f44336",
  },
  deleteModalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  deleteCancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6b7280",
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f44336",
    alignItems: "center",
    shadowColor: "#f44336",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteConfirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});