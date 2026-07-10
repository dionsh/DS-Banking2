import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { formatDate as fmtKosovoDate } from "../utils/datetime";

const maskCard = (num) => {
  if (!num) return "•••• •••• •••• ••••";
  return num.replace(/(\d{4})\d+(\d{4})/, "$1 •••• •••• $2");
};

// Kosovo local date (see utils/datetime — device-timezone-independent).
function formatDate(s) {
  return fmtKosovoDate(s);
}

export default function ApplePay() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Reached both as a Drawer destination (show a menu button) and as a Stack
  // push from the Card screen / login prompt (show a back arrow). openDrawer
  // only exists on the navigation object when this is the drawer's screen.
  const inDrawer = typeof navigation.openDrawer === "function";

  const [user, setUser] = useState(null);
  const [info, setInfo] = useState(null); // { in_wallet, card_number, expiry_date, added_at }
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUser(stored);

      const res = await fetch(`${API_BASE}/get_applepay.php?user_id=${stored.user_id}`);
      const data = await res.json();
      if (data.status === "success") {
        setInfo(data);
      } else {
        Alert.alert(t("common.error"), data.message || t("applepay.couldNotLoad"));
      }
    } catch (err) {
      console.log("ApplePay load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const handleAdd = async () => {
    setWorking(true);
    try {
      const res = await fetch(`${API_BASE}/add_applepay.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          device_name: Platform.OS === "ios" ? "iPhone" : "This device",
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setInfo((prev) => ({ ...prev, in_wallet: true, added_at: data.added_at }));
        Alert.alert(t("applepay.addedTitle"), t("applepay.addedMsg"));
      } else {
        Alert.alert(t("common.error"), data.message || t("applepay.couldNotAdd"));
      }
    } catch (err) {
      console.log("ApplePay add error:", err);
      Alert.alert(t("common.error"), t("notif.couldNotReach"));
    }
    setWorking(false);
  };

  const handleRemove = () => {
    Alert.alert(
      t("applepay.removeTitle"),
      t("applepay.removeMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("applepay.removeAction"),
          style: "destructive",
          onPress: async () => {
            setWorking(true);
            try {
              const res = await fetch(`${API_BASE}/remove_applepay.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.user_id }),
              });
              const data = await res.json();
              if (data.status === "success") {
                setInfo((prev) => ({ ...prev, in_wallet: false, added_at: null }));
              } else {
                Alert.alert(t("common.error"), data.message || t("applepay.couldNotRemove"));
              }
            } catch (err) {
              console.log("ApplePay remove error:", err);
              Alert.alert(t("common.error"), t("notif.couldNotReach"));
            }
            setWorking(false);
          },
        },
      ]
    );
  };

  const inWallet = info?.in_wallet;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (inDrawer ? navigation.openDrawer() : navigation.goBack())}
        >
          <MaterialCommunityIcons
            name={inDrawer ? "menu" : "arrow-left"}
            size={26}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("applepay.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.body}>
          {/* Apple Pay logo */}
          <View style={styles.logoRow}>
            <FontAwesome5 name="apple" size={34} color={colors.text} />
            <Text style={styles.payText}>Pay</Text>
          </View>

          {/* Card visual */}
          <View style={styles.cardBox}>
            <Text style={styles.cardBrand}>DS Banking</Text>
            <Text style={styles.cardNumber}>{maskCard(info?.card_number)}</Text>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardSmallLabel}>{t("applepay.expires")}</Text>
                <Text style={styles.cardSmallValue}>{info?.expiry_date || "--/--"}</Text>
              </View>
              <FontAwesome5 name="cc-visa" size={30} color="#fff" />
            </View>
          </View>

          {/* Status pill */}
          <View
            style={[
              styles.statusPill,
              { backgroundColor: inWallet ? "rgba(46,125,50,0.12)" : colors.surfaceAlt },
            ]}
          >
            <MaterialCommunityIcons
              name={inWallet ? "check-circle" : "information-outline"}
              size={20}
              color={inWallet ? colors.success : colors.textSecondary}
            />
            <Text
              style={[
                styles.statusText,
                { color: inWallet ? colors.success : colors.textSecondary },
              ]}
            >
              {inWallet
                ? `${t("applepay.inWallet")}${info?.added_at ? " · " + t("applepay.since", { date: formatDate(info.added_at) }) : ""}`
                : t("applepay.notAdded")}
            </Text>
          </View>

          <Text style={styles.helper}>
            {t("applepay.helper")}
          </Text>

          <View style={{ flex: 1 }} />

          {/* Action button */}
          {inWallet ? (
            <TouchableOpacity
              style={[styles.removeBtn, working && { opacity: 0.6 }]}
              onPress={handleRemove}
              disabled={working}
            >
              {working ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
                  <Text style={styles.removeBtnText}>{t("applepay.removeTitle")}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, working && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={working}
            >
              {working ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="apple" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>  {t("card.addToWallet")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 18,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },

    body: { flex: 1, padding: 22 },

    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
      marginBottom: 22,
    },
    payText: { fontSize: 32, fontWeight: "500", color: c.text, marginLeft: 6 },

    cardBox: {
      backgroundColor: c.primary,
      borderRadius: 20,
      padding: 22,
      minHeight: 170,
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    cardBrand: { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
    cardNumber: { color: "#fff", fontSize: 20, letterSpacing: 2, marginVertical: 22 },
    cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    cardSmallLabel: { color: "#C9CEE8", fontSize: 10, letterSpacing: 1 },
    cardSmallValue: { color: "#fff", fontSize: 15, fontWeight: "600", marginTop: 2 },

    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 22,
    },
    statusText: { fontSize: 14, fontWeight: "600", flex: 1 },

    helper: { fontSize: 13, color: c.textSecondary, lineHeight: 20, marginTop: 16 },

    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000",
      paddingVertical: 18,
      borderRadius: 16,
    },
    addBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

    removeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.danger,
      paddingVertical: 17,
      borderRadius: 16,
    },
    removeBtnText: { color: c.danger, fontSize: 16, fontWeight: "600" },
  });
