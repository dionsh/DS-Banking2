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

export default function SplitBill() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);

  const [total, setTotal] = useState("");
  const [people, setPeople] = useState(2);
  const [label, setLabel] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Refresh the user + current balance whenever the screen is focused.
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const stored = JSON.parse(await AsyncStorage.getItem("user"));
          if (!stored) return;
          setUser(stored);

          const res = await fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`);
          const data = await res.json();
          if (data.status === "success") {
            setBalance(Number(data.card.balance) || 0);
          } else {
            setBalance(Number(stored.balance) || 0);
          }
        } catch (err) {
          console.log("SplitBill load error:", err);
        }
      };
      load();
    }, [])
  );

  const totalNum = parseFloat(total) || 0;
  const share = people >= 2 && totalNum > 0 ? totalNum / people : 0;

  const changePeople = (delta) => {
    setPeople((p) => Math.max(2, p + delta));
  };

  const handleConfirm = async () => {
    if (totalNum <= 0) {
      Alert.alert(t("common.error"), t("split.invalidAmount"));
      return;
    }
    if (people < 2) {
      Alert.alert(t("common.error"), t("split.min2"));
      return;
    }
    if (share > balance) {
      Alert.alert(t("topup.insufficient"), t("split.shareTooBig"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/split_bill.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          total: totalNum,
          people,
          label: label.trim(),
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setBalance(data.new_balance);
        const updatedUser = { ...user, balance: data.new_balance };
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        Alert.alert(
          t("split.doneTitle"),
          t("split.doneMsg", { desc: data.description, share: Number(data.share).toFixed(2) }),
          [{ text: t("common.ok") }]
        );
        setTotal("");
        setLabel("");
        setPeople(2);
      } else {
        Alert.alert(t("common.error"), data.message || t("common.somethingWrong"));
      }
    } catch (err) {
      console.log("SplitBill confirm error:", err);
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
        <Text style={styles.headerTitle}>{t("menu.splitBill")}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>{t("split.availableBalance")}</Text>
          <Text style={styles.balanceValue}>{Number(balance).toFixed(2)} EUR</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("split.totalBill")}</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            placeholder="0.00 EUR"
            placeholderTextColor={colors.placeholder}
            value={total}
            onChangeText={setTotal}
          />

          <Text style={styles.label}>{t("split.whatFor")}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("split.egDinner")}
            placeholderTextColor={colors.placeholder}
            value={label}
            onChangeText={setLabel}
          />

          <Text style={styles.label}>{t("split.numberOfPeople")}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepBtn, people <= 2 && styles.stepBtnDisabled]}
              onPress={() => changePeople(-1)}
              disabled={people <= 2}
            >
              <MaterialCommunityIcons name="minus" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.peopleCount}>{people}</Text>

            <TouchableOpacity style={styles.stepBtn} onPress={() => changePeople(1)}>
              <MaterialCommunityIcons name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t("split.eachOwes")}</Text>
          <Text style={styles.summaryAmount}>{share.toFixed(2)} EUR</Text>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>{t("split.sTotal")}</Text>
            <Text style={styles.summaryLineValue}>{totalNum.toFixed(2)} EUR</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>{t("split.sSplitBetween")}</Text>
            <Text style={styles.summaryLineValue}>{t("split.peopleCount", { count: people })}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLineLabel, { fontWeight: "700", color: colors.accent }]}>
              {t("split.yourShare")}
            </Text>
            <Text style={[styles.summaryLineValue, { fontWeight: "700", color: colors.accent }]}>
              {share.toFixed(2)} EUR
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
            <Text style={styles.confirmText}>{t("split.payShare")}</Text>
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

    balanceRow: {
      alignItems: "center",
      marginBottom: 20,
    },
    balanceLabel: { fontSize: 12, color: c.textSecondary, letterSpacing: 1 },
    balanceValue: { fontSize: 22, fontWeight: "bold", color: c.accent, marginTop: 4 },

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

    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 5,
    },
    stepBtn: {
      backgroundColor: c.primary,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
    },
    stepBtnDisabled: { backgroundColor: c.textMuted },
    peopleCount: {
      fontSize: 30,
      fontWeight: "bold",
      color: c.accent,
      marginHorizontal: 40,
      minWidth: 50,
      textAlign: "center",
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
    summaryTitle: { fontSize: 14, color: c.textSecondary, textAlign: "center" },
    summaryAmount: {
      fontSize: 38,
      fontWeight: "bold",
      color: c.accent,
      textAlign: "center",
      marginTop: 6,
    },
    summaryDivider: { height: 1, backgroundColor: c.divider, marginVertical: 18 },
    summaryLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    summaryLineLabel: { fontSize: 14, color: c.textSecondary },
    summaryLineValue: { fontSize: 14, color: c.text, fontWeight: "500" },

    confirmBtn: {
      backgroundColor: c.primary,
      paddingVertical: 18,
      borderRadius: 16,
      marginTop: 25,
      alignItems: "center",
    },
    confirmText: { color: "#fff", fontWeight: "600", fontSize: 16, letterSpacing: 0.5 },
  });
