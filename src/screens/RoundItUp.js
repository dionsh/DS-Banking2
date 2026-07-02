import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function RoundItUp() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [savings, setSavings] = useState(0);

  const [purchase, setPurchase] = useState("");
  const [label, setLabel] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Demo toggle: lives only while the screen is open (nothing is persisted).
  const [automatic, setAutomatic] = useState(false);

  const loadData = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUser(stored);

      const cardRes = await fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`);
      const cardData = await cardRes.json();
      if (cardData.status === "success") {
        setBalance(Number(cardData.card.balance) || 0);
      } else {
        setBalance(Number(stored.balance) || 0);
      }

      const savRes = await fetch(`${API_BASE}/get_savings.php?user_id=${stored.user_id}`);
      const savData = await savRes.json();
      if (savData.status === "success") {
        setSavings(Number(savData.balance) || 0);
      }
    } catch (err) {
      console.log("RoundItUp load error:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const purchaseNum = parseFloat(purchase) || 0;
  const rounded = purchaseNum > 0 ? Math.ceil(purchaseNum - 0.0000001) : 0;
  const saved = rounded > purchaseNum ? Math.round((rounded - purchaseNum) * 100) / 100 : 0;

  const handleConfirm = async () => {
    if (purchaseNum <= 0) {
      Alert.alert(t("common.error"), t("roundup.invalidAmount"));
      return;
    }
    if (saved <= 0) {
      Alert.alert(t("roundup.nothingTitle"), t("roundup.nothingMsg"));
      return;
    }
    if (purchaseNum + saved > balance) {
      Alert.alert(t("topup.insufficient"), t("roundup.insufficientMsg"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/round_up.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          purchase_amount: purchaseNum,
          label: label.trim(),
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setBalance(data.new_balance);
        setSavings(Number(data.savings_balance) || 0);
        const updatedUser = { ...user, balance: data.new_balance };
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        Alert.alert(
          t("roundup.savedTitle"),
          t("roundup.savedMsg", {
            purchase: purchaseNum.toFixed(2),
            rounded: Number(data.rounded).toFixed(2),
            saved: Number(data.saved).toFixed(2),
          }),
          [
            { text: t("roundup.viewSavings"), onPress: () => navigation.navigate("Savings") },
            { text: t("common.ok") },
          ]
        );
        setPurchase("");
        setLabel("");
      } else {
        Alert.alert(t("common.error"), data.message || t("common.somethingWrong"));
      }
    } catch (err) {
      console.log("RoundItUp confirm error:", err);
      Alert.alert(t("common.error"), t("notif.couldNotReach"));
    }
    setSubmitting(false);
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("menu.roundItUp")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Savings")}>
          <MaterialCommunityIcons name="piggy-bank-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.savingsBanner}>
          <MaterialCommunityIcons name="piggy-bank" size={30} color="#fff" />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.savingsBannerLabel}>{t("roundup.currentSavings")}</Text>
            <Text style={styles.savingsBannerValue}>{Number(savings).toFixed(2)} EUR</Text>
          </View>
        </View>

        <Text style={styles.helper}>
          {t("roundup.helper")}
        </Text>

        <TouchableOpacity
          style={[styles.autoBtn, automatic && styles.autoBtnOn]}
          onPress={() => setAutomatic((a) => !a)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={automatic ? "check-circle" : "autorenew"}
            size={20}
            color={automatic ? "#fff" : colors.accent}
          />
          <Text style={[styles.autoBtnText, automatic && styles.autoBtnTextOn]}>
            {automatic ? "Round It Up is Automatic ✓" : "Make Round It Up Automatic"}
          </Text>
        </TouchableOpacity>
        {automatic && (
          <Text style={styles.autoHint}>
            Every card purchase will now be rounded up and the difference saved automatically.
          </Text>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>{t("roundup.purchaseAmount")}</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            placeholder="1.75 EUR"
            placeholderTextColor={colors.placeholder}
            value={purchase}
            onChangeText={setPurchase}
          />

          <Text style={styles.label}>{t("roundup.whatBuy")}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("roundup.egWater")}
            placeholderTextColor={colors.placeholder}
            value={label}
            onChangeText={setLabel}
          />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>{t("roundup.sPurchase")}</Text>
            <Text style={styles.summaryLineValue}>{purchaseNum.toFixed(2)} EUR</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>{t("roundup.sRounded")}</Text>
            <Text style={styles.summaryLineValue}>{rounded.toFixed(2)} EUR</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryLine}>
            <Text style={styles.savedLabel}>{t("roundup.sSaved")}</Text>
            <Text style={styles.savedValue}>+{saved.toFixed(2)} EUR</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>{t("roundup.sNewBalance")}</Text>
            <Text style={styles.summaryLineValue}>
              {(Number(savings) + saved).toFixed(2)} EUR
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>{t("roundup.confirmSave")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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

    body: { padding: 20, paddingBottom: 50 },

    savingsBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.primary,
      borderRadius: 18,
      padding: 18,
      marginBottom: 18,
    },
    savingsBannerLabel: { color: "#C9CEE8", fontSize: 12, letterSpacing: 1 },
    savingsBannerValue: { color: "#fff", fontSize: 22, fontWeight: "bold", marginTop: 2 },

    helper: { fontSize: 13, color: c.textSecondary, marginBottom: 18, lineHeight: 19 },

    autoBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1.5,
      borderColor: c.accent,
      backgroundColor: c.card,
      borderRadius: 16,
      paddingVertical: 14,
      marginBottom: 18,
    },
    autoBtnOn: { backgroundColor: c.success, borderColor: c.success },
    autoBtnText: { color: c.accent, fontWeight: "700", fontSize: 14.5 },
    autoBtnTextOn: { color: "#fff" },
    autoHint: {
      fontSize: 12,
      color: c.success,
      marginTop: -8,
      marginBottom: 18,
      textAlign: "center",
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 22,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },

    label: { fontSize: 11, color: c.textMuted, letterSpacing: 1, marginTop: 18, marginBottom: 8 },

    amountInput: {
      backgroundColor: c.inputBg,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 16,
      fontSize: 22,
      fontWeight: "600",
      textAlign: "center",
      borderWidth: 1,
      borderColor: c.inputBorder,
      color: c.text,
    },

    textInput: {
      backgroundColor: c.inputBg,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: c.inputBorder,
      color: c.text,
    },

    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 22,
      marginTop: 20,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    summaryLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    summaryLineLabel: { fontSize: 14, color: c.textSecondary },
    summaryLineValue: { fontSize: 14, color: c.text, fontWeight: "500" },
    summaryDivider: { height: 1, backgroundColor: c.divider, marginVertical: 8 },
    savedLabel: { fontSize: 16, fontWeight: "700", color: c.success },
    savedValue: { fontSize: 18, fontWeight: "700", color: c.success },

    confirmBtn: {
      backgroundColor: c.primary,
      paddingVertical: 18,
      borderRadius: 16,
      marginTop: 25,
      alignItems: "center",
    },
    confirmText: { color: "#fff", fontWeight: "600", fontSize: 16, letterSpacing: 0.5 },
  });
