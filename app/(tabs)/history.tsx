// app/(tabs)/history.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LEGAL_UI_STRINGS } from "../../legal/LEGAL_UI_STRINGS_HE";

// Conditional import for ads - only load on native platforms
const AdBanner = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;

interface TripRecord {
  id: string;
  date: string;
  timestamp: number;
  distance: number;
  vehicleName: string;
  vehicleModel: string;
  fuelType: string;
  totalCost: number;
  fuelConsumed: number;
  costPerKm: number;
  consumption: number;
  energyType: "fuel" | "electricity";
}

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<TripRecord[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const cardAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;

  const showToast = (message: string, duration = 2000) => {
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
  };

const loadHistory = useCallback(async () => {
  try {
    const stored = await AsyncStorage.getItem("tripHistory");
    if (!stored) {
      setHistory([]);
      return;
    }
    
    const parsed = JSON.parse(stored) as TripRecord[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid history data format");
    }
    
    const sorted = parsed.sort((a, b) => b.timestamp - a.timestamp);
    setHistory(sorted);
    
    sorted.forEach((trip, index) => {
      if (!cardAnimations[trip.id]) {
        cardAnimations[trip.id] = new Animated.Value(0);
        Animated.spring(cardAnimations[trip.id], {
          toValue: 1,
          delay: index * 50,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    });
  } catch (error) {
    console.error("Failed to load history:", error);
    showToast(LEGAL_UI_STRINGS.errors.apiError);
    setHistory([]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

const deleteTrip = async (id: string) => {
  try {
    const updated = history.filter((trip) => trip.id !== id);
    setHistory(updated);
    await AsyncStorage.setItem("tripHistory", JSON.stringify(updated));
    closeDetailsModal();
    setShowDeleteConfirm(false);
    setSelectedTrip(null);
    showToast(LEGAL_UI_STRINGS.toasts.dataDeleted);
  } catch (error) {
    console.error("Failed to delete trip:", error);
    showToast(LEGAL_UI_STRINGS.errors.apiError);
  }
};

const clearAllHistory = async () => {
  try {
    await AsyncStorage.removeItem("tripHistory");
    setHistory([]);
    setShowClearAllConfirm(false);
    showToast(LEGAL_UI_STRINGS.toasts.dataDeleted);
  } catch (error) {
    console.error("Failed to clear history:", error);
    showToast(LEGAL_UI_STRINGS.errors.apiError);
  }
};

const confirmClearAllHistory = () => {
  setShowClearAllConfirm(true);
};

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `היום, ${date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `אתמול, ${date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const getFuelEmoji = (fuelType: string): string => {
    if (fuelType === "Electric") return "⚡";
    return "⛽";
  };

  const openTripDetails = (trip: TripRecord) => {
    setSelectedTrip(trip);
    setShowDetailsModal(true);
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

  const closeDetailsModal = () => {
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
    ]).start(() => setShowDetailsModal(false));
  };

  const TripCard = ({ item, index }: { item: TripRecord; index: number }) => {
    const isElectric = item.energyType === "electricity";
    const cardAnim = cardAnimations[item.id] || new Animated.Value(1);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        friction: 8,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={[
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.tripCard}
          onPress={() => openTripDetails(item)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View
            style={[
              styles.cardGradient,
              isElectric ? styles.cardGradientElectric : styles.cardGradientFuel,
            ]}
          />

          <Text style={styles.cardBgEmoji}>{getFuelEmoji(item.fuelType)}</Text>

          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <View style={styles.cardTopRight}>
                <View style={styles.emojiCircle}>
                  <Text style={styles.cardEmoji}>{getFuelEmoji(item.fuelType)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardVehicle} numberOfLines={1}>
                    {item.vehicleName}
                  </Text>
                  <Text style={styles.cardModel} numberOfLines={1}>
                    {item.vehicleModel}
                  </Text>
                </View>
              </View>
              <View style={styles.cardDate}>
                <Text style={styles.cardDateText}>{formatDate(item.timestamp)}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBottom}>
              <View style={styles.cardStat}>
                <Text style={styles.cardStatValue}>₪{item.totalCost.toFixed(2)}</Text>
                <Text style={styles.cardStatLabel}>עלות כוללת</Text>
              </View>
              <View style={styles.cardStatDivider} />
              <View style={styles.cardStat}>
                <Text style={styles.cardStatValue}>{item.distance}</Text>
                <Text style={styles.cardStatLabel}>ק״מ</Text>
              </View>
              <View style={styles.cardStatDivider} />
              <View style={styles.cardStat}>
                <Text style={styles.cardStatValue}>₪{item.costPerKm.toFixed(2)}</Text>
                <Text style={styles.cardStatLabel}>לק״מ</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Native-looking ad card that blends with trip cards
  const AdCardNative = () => (
    <View style={[styles.tripCard, styles.adCard]}>
      <View style={styles.adLabelContainer}>
        <Text style={styles.adLabel}>ממומן</Text>
      </View>
      <View style={styles.adContent}>
        <AdBanner />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerGradient} />
        <Text style={styles.title}>היסטוריית נסיעות</Text>
        <Text style={styles.subtitle}>
          {history.length > 0 ? `${history.length} נסיעות שמורות` : "התחל לחשב"}
        </Text>
      </View>

      {/* 🎯 פרסומת מתחת להדר */}
      <AdBanner />
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

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyEmoji}>📋</Text>
          </View>
          <Text style={styles.emptyTitle}>{LEGAL_UI_STRINGS.empty.noHistory}</Text>
          <Text style={styles.emptyText}>
            {LEGAL_UI_STRINGS.empty.addFirst}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push("/calculator")}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>🧮 צור חישוב ראשון</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={history}
            keyExtractor={(item, index) => item.id || `item-${index}`}
            renderItem={({ item, index }) => {
              // Show native ad after every 3rd trip (after indices 2, 5, 8, etc.)
              const showAdAfterThisItem = (index + 1) % 3 === 0 && index < history.length - 1;
              return (
                <>
                  <TripCard item={item} index={index} />
                  {showAdAfterThisItem && Platform.OS !== 'web' && <AdCardNative />}
                </>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={confirmClearAllHistory}
            activeOpacity={0.8}
          >
            <View style={styles.clearAllGradient} />
            <Text style={styles.clearAllText}>🗑️ נקה הכל</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Trip Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="none"
        transparent
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeDetailsModal}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTrip && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalEmojiCircle}>
                      <Text style={styles.modalEmoji}>
                        {getFuelEmoji(selectedTrip.fuelType)}
                      </Text>
                    </View>
                    <Text style={styles.modalTitle}>{selectedTrip.vehicleName}</Text>
                    <Text style={styles.modalSubtitle}>{selectedTrip.vehicleModel}</Text>
                  </View>

                  <View style={styles.costHero}>
                    <View style={styles.costHeroGradient} />
                    <Text style={styles.costHeroLabel}>עלות כוללת</Text>
                    <Text style={styles.costHeroValue}>₪{selectedTrip.totalCost.toFixed(2)}</Text>
                    <View style={styles.costHeroStats}>
                      <View style={styles.costHeroStat}>
                        <Text style={styles.costHeroStatValue}>
                          {selectedTrip.distance}
                        </Text>
                        <Text style={styles.costHeroStatLabel}>ק״מ</Text>
                      </View>
                      <View style={styles.costHeroDivider} />
                      <View style={styles.costHeroStat}>
                        <Text style={styles.costHeroStatValue}>
                          ₪{selectedTrip.costPerKm.toFixed(2)}
                        </Text>
                        <Text style={styles.costHeroStatLabel}>לק״מ</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsContainer}>
                    <DetailRow
                      icon="📅"
                      label="תאריך"
                      value={formatDate(selectedTrip.timestamp)}
                    />
                    <DetailRow
                      icon={selectedTrip.energyType === "electricity" ? "⚡" : "⛽"}
                      label={selectedTrip.energyType === "electricity" ? "חשמל" : "דלק"}
                      value={`${selectedTrip.fuelConsumed.toFixed(2)} ${
                        selectedTrip.energyType === "electricity" ? "kWh" : "ליטר"
                      }`}
                    />
                    <DetailRow
                      icon="📊"
                      label="יעילות"
                      value={`${selectedTrip.consumption.toFixed(2)} ${
                        selectedTrip.energyType === "electricity" ? "km/%" : "km/l"
                      }`}
                    />
                    <DetailRow
                      icon="🔋"
                      label="סוג"
                      value={selectedTrip.fuelType}
                      isLast
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => setShowDeleteConfirm(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ מחק נסיעה</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeDetailsModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeButtonText}>סגור</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDeleteConfirm(false)}
          />
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconCircle}>
              <Text style={styles.confirmIcon}>🗑️</Text>
            </View>
            <Text style={styles.confirmTitle}>מחיקת נסיעה</Text>
            <Text style={styles.confirmText}>
              האם אתה בטוח שברצונך למחוק{"\n"}נסיעה זו? הפעולה בלתי הפיכה.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancel]}
                onPress={() => setShowDeleteConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmDelete]}
                onPress={() => {
                  if (selectedTrip) {
                    if (Platform.OS === "web") {
                      const confirmed = confirm(LEGAL_UI_STRINGS.confirmations.deleteHistory);
                      if (confirmed) {
                        deleteTrip(selectedTrip.id);
                      }
                    } else {
                      Alert.alert(
                        "מחק נסיעה",
                        LEGAL_UI_STRINGS.confirmations.deleteHistory,
                        [
                          {
                            text: "ביטול",
                            onPress: () => {},
                            style: "cancel",
                          },
                          {
                            text: "מחק",
                            onPress: () => deleteTrip(selectedTrip.id),
                            style: "destructive",
                          },
                        ]
                      );
                    }
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmDeleteText}>מחק</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear All History Confirmation Modal */}
      <Modal
        visible={showClearAllConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowClearAllConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowClearAllConfirm(false)}
          />
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconCircle}>
              <Text style={styles.confirmIcon}>⚠️</Text>
            </View>
            <Text style={styles.confirmTitle}>מחיקת כל ההיסטוריה</Text>
            <Text style={styles.confirmText}>
              האם אתה בטוח שברצונך למחוק את כל{"\n"}
              היסטוריית הנסיעות?{"\n\n"}
              פעולה זו תמחק לצמיתות את כל הרשומות{"\n"}
              שלך ולא ניתן יהיה לשחזר אותן.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancel]}
                onPress={() => setShowClearAllConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmDelete]}
                onPress={clearAllHistory}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmDeleteText}>מחק הכל</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "#00BFA5",
    opacity: 0.08,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#00BFA5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: "#00BFA5",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: "#00BFA5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Trip Cards
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  tripCard: {
    height: 160,
    borderRadius: 24,
    marginBottom: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  cardGradientFuel: {
    backgroundColor: "#FF6B6B",
    opacity: 0.05,
  },
  cardGradientElectric: {
    backgroundColor: "#4ECDC4",
    opacity: 0.08,
  },
  cardBgEmoji: {
    position: "absolute",
    fontSize: 140,
    right: -20,
    bottom: -30,
    opacity: 0.04,
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 191, 165, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardVehicle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  cardModel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  cardDate: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cardDateText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.06)",
    marginBottom: 16,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  cardStat: {
    flex: 1,
    alignItems: "center",
  },
  cardStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00BFA5",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  cardStatLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
  },
  cardStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(0, 0, 0, 0.06)",
  },

  clearAllButton: {
    position: "absolute",
    bottom: 32,
    left: 20,
    right: 20,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FF5252",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF5252",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  clearAllGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  clearAllText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
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
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 24,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalEmojiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 191, 165, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalEmoji: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },

  costHero: {
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  costHeroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00BFA5",
    opacity: 0.05,
  },
  costHeroLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginBottom: 8,
  },
  costHeroValue: {
    fontSize: 48,
    fontWeight: "900",
    color: "#00BFA5",
    marginBottom: 16,
    letterSpacing: -1,
  },
  costHeroStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  costHeroStat: {
    alignItems: "center",
  },
  costHeroStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  costHeroStatLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
  },
  costHeroDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },

  detailsContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    fontSize: 24,
  },
  detailLabel: {
    fontSize: 15,
    color: "#666",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "700",
    textAlign: "right",
  },

  deleteButton: {
    backgroundColor: "#FFF0F0",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FF5252",
  },
  deleteButtonText: {
    color: "#FF5252",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  closeButton: {
    paddingVertical: 14,
  },
  closeButtonText: {
    color: "#00BFA5",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  confirmModal: {
    width: "90%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 24,
  },
  confirmIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  confirmIcon: {
    fontSize: 40,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  confirmText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancel: {
    backgroundColor: "#f0f0f0",
  },
  confirmCancelText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  confirmDelete: {
    backgroundColor: "#FF5252",
    shadowColor: "#FF5252",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmDeleteText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
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
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // Native Ad Card Styles
  adCard: {
    backgroundColor: "rgba(0, 191, 165, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 191, 165, 0.2)",
    borderStyle: "dashed",
  },
  adLabelContainer: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  adLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
    letterSpacing: 0.5,
  },
  adContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
});