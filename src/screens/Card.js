import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../currency/CurrencyContext";

export default function Card() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user_id } = route.params || {};

  const { colors } = useTheme();
  const { t } = useLanguage();
  const { format } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [frozen, setFrozen] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Funksioni per me ba fetch tdhenat e karteles (+ statusin frozen)
  const fetchCardData = async () => {
    if (!user_id) {
      console.log("No user_id received");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [cardRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/get_card.php?user_id=${user_id}`),
        fetch(`${API_BASE}/get_card_status.php?user_id=${user_id}`),
      ]);
      const data = await cardRes.json();
      console.log("CARD RESPONSE:", data);

      if (data.status === "success") {
        setCardData(data.card);
      } else {
        console.log("CARD ERROR:", data.message);
      }

      try {
        const status = await statusRes.json();
        if (status.status === "success") {
          setFrozen(!!status.frozen);
        }
      } catch (e) {
        // ignore status errors — default stays unfrozen
      }
    } catch (err) {
      console.log("CARD FETCH ERROR:", err);
    }
    setLoading(false);
  };

  //  Kodi per refresh t'screenit ne focus
  useFocusEffect(
    useCallback(() => {
      fetchCardData();
    }, [user_id])
  );

  // Freeze / unfreeze the card (persisted in the backend).
  const applyFreeze = async (nextFrozen) => {
    setToggling(true);
    try {
      const res = await fetch(`${API_BASE}/set_card_freeze.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, frozen: nextFrozen }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setFrozen(!!data.frozen);
      } else {
        Alert.alert("Something went wrong", data.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Connection error", "Could not update your card. Please try again.");
    }
    setToggling(false);
  };

  const toggleFreeze = () => {
    if (frozen) {
      applyFreeze(false);
      return;
    }
    Alert.alert(
      "Freeze card?",
      "Your card will be temporarily blocked and payments will be rejected until you unfreeze it. You can unfreeze it anytime.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Freeze", style: "destructive", onPress: () => applyFreeze(true) },
      ]
    );
  };

  const maskCard = (num) => {
    if (!num) return "---- ---- ---- ----";
    return num.replace(/(\d{4})\d+(\d{4})/, "$1 **** **** $2");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.primary }}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("menu.card")}</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={[styles.cardBox, frozen && styles.cardBoxFrozen]}>
            <Text style={styles.visa}>VISA</Text>
            <Text style={styles.cardNumber}>{maskCard(cardData?.card_number)}</Text>
            <View style={styles.row}>
              <View>
                <Text style={styles.label}>CVV</Text>
                <Text style={styles.value}>{cardData?.cvv || "---"}</Text>
              </View>
              <View>
                <Text style={styles.label}>{t("card.expiry")}</Text>
                <Text style={styles.value}>{cardData?.expiry_date || "--/--"}</Text>
              </View>
            </View>

            {/* Frosted overlay shown while the card is frozen */}
            {frozen && (
              <View style={styles.frozenOverlay} pointerEvents="none">
                <MaterialCommunityIcons name="snowflake" size={40} color="#EAF6FF" />
                <Text style={styles.frozenText}>FROZEN</Text>
              </View>
            )}
          </View>

          {/* Card status pill */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: frozen ? "#E8F1FB" : "#E7F6EC" },
              ]}
            >
              <MaterialCommunityIcons
                name={frozen ? "snowflake" : "check-circle"}
                size={16}
                color={frozen ? "#2B6CB0" : "#2E7D32"}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: frozen ? "#2B6CB0" : "#2E7D32" },
                ]}
              >
                {frozen ? "Card frozen" : "Card active"}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>{t("card.availableCondition")}</Text>
            <Text style={styles.balance}>{format(cardData?.balance || 0)}</Text>

            <Text style={styles.infoLabel}>{t("card.accountNumber")}</Text>
            <Text style={styles.infoValue}>{cardData?.account_number || "--------"}</Text>
          </View>

          <TouchableOpacity style={styles.walletBtn} onPress={() => navigation.navigate("ApplePay")}>
            <FontAwesome5 name="apple" size={20} color="white" />
            <Text style={styles.walletText}>  {t("card.addToWallet")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.personalizeBtn}
            onPress={() => navigation.navigate("PersonalizeCard")}
          >
            <MaterialCommunityIcons name="palette-outline" size={20} color="#fff" />
            <Text style={styles.personalizeText}>  Personalize Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.freezeBtn, frozen ? styles.freezeBtnActive : styles.freezeBtnIdle]}
            onPress={toggleFreeze}
            disabled={toggling}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={frozen ? "#2B6CB0" : "#fff"} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={frozen ? "lock-open-outline" : "snowflake"}
                  size={20}
                  color={frozen ? "#2B6CB0" : "#fff"}
                />
                <Text style={[styles.freezeText, frozen && styles.freezeTextActive]}>
                  {"  "}
                  {frozen ? "Unfreeze Card" : "Freeze Card"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingTop: 10,
      paddingBottom: 18,
      paddingHorizontal: 20,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      position: "absolute",
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "600",
      color: "white",
    },
    cardBox: {
      backgroundColor: c.primary,
      margin: 20,
      borderRadius: 18,
      padding: 22,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
      overflow: "hidden",
    },
    cardBoxFrozen: {
      backgroundColor: "#3A4A63",
    },
    frozenOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(173, 208, 235, 0.30)",
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    frozenText: {
      color: "#EAF6FF",
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: 3,
      marginTop: 6,
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: -6,
      marginBottom: 4,
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    statusText: { fontSize: 13, fontWeight: "700" },
    visa: { color: "white", fontSize: 26, fontWeight: "bold", alignSelf: "flex-end" },
    cardNumber: { color: "white", fontSize: 19, letterSpacing: 2, marginVertical: 25 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    label: { color: "#bbb", fontSize: 12 },
    value: { color: "white", fontSize: 17, fontWeight: "600" },
    infoSection: { paddingHorizontal: 20, paddingTop: 10 },
    infoLabel: { color: c.textSecondary, fontSize: 14, marginTop: 22 },
    balance: { fontSize: 26, fontWeight: "700", marginTop: 5, color: c.accent },
    infoValue: { fontSize: 18, marginTop: 6, fontWeight: "500", color: c.text },
    walletBtn: {
      backgroundColor: "black",
      marginHorizontal: 20,
      marginTop: 35,
      padding: 18,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    walletText: { color: "white", fontSize: 16, fontWeight: "600" },
    personalizeBtn: {
      backgroundColor: c.primary,
      marginHorizontal: 20,
      marginTop: 14,
      padding: 18,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    personalizeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    freezeBtn: {
      marginHorizontal: 20,
      marginTop: 14,
      marginBottom: 24,
      padding: 18,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    freezeBtnIdle: { backgroundColor: "#2B6CB0" },
    freezeBtnActive: {
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: "#2B6CB0",
    },
    freezeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    freezeTextActive: { color: "#2B6CB0" },
  });
