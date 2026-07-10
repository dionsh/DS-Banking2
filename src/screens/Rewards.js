import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../currency/CurrencyContext";
import { formatDate } from "../utils/datetime";

export default function Rewards() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { format } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [pointsPerEur, setPointsPerEur] = useState(100);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState(100);
  const [redeeming, setRedeeming] = useState(false);

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUser(stored);

      const res = await fetch(`${API_BASE}/get_rewards.php?user_id=${stored.user_id}`);
      const data = await res.json();
      if (data.status === "success") {
        setPoints(Number(data.points) || 0);
        setPointsPerEur(Number(data.points_per_eur) || 100);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.log("Rewards load error:", err);
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

  const maxRedeemable = Math.floor(points / pointsPerEur) * pointsPerEur;
  // Point values are EUR in the backend — shown in the display currency.
  const cashValue = format(points / pointsPerEur);
  const redeemEuros = format(redeemAmount / pointsPerEur);

  const handleRedeem = async () => {
    if (redeemAmount <= 0 || redeemAmount > points) {
      Alert.alert(t("common.error"), t("rewards.notEnough"));
      return;
    }
    Alert.alert(
      t("rewards.redeemTitle"),
      t("rewards.redeemConfirm", { points: redeemAmount, euros: redeemEuros }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("rewards.redeem"),
          onPress: async () => {
            setRedeeming(true);
            try {
              const res = await fetch(`${API_BASE}/redeem_points.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.user_id, points: redeemAmount }),
              });
              const data = await res.json();
              if (data.status === "success") {
                setPoints(data.total_points);
                // keep AsyncStorage balance in sync for other screens
                const updatedUser = { ...user, balance: data.new_balance };
                await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
                setUser(updatedUser);
                Alert.alert(t("rewards.redeemedTitle"), t("rewards.redeemedMsg", { amount: format(data.redeemed) }));
                load();
              } else {
                Alert.alert(t("common.error"), data.message || t("rewards.couldNotRedeem"));
              }
            } catch (err) {
              console.log("Redeem error:", err);
              Alert.alert(t("common.error"), t("notif.couldNotReach"));
            }
            setRedeeming(false);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isWin = item.type === "wordle_win";
    const isDriving = item.type === "driving_win";
    const isAvatar = item.type === "avatar_purchase";
    const iconName = isWin
      ? "puzzle-outline"
      : isDriving
      ? "car-sports"
      : isAvatar
      ? "tshirt-crew-outline"
      : "cash-multiple";
    return (
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <MaterialCommunityIcons name={iconName} size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.description}</Text>
          <Text style={styles.rowSub}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Text style={[styles.rowAmount, { color: item.points >= 0 ? colors.success : colors.dangerText }]}>
          {item.points >= 0 ? "+" : ""}
          {item.points} pts
        </Text>
      </View>
    );
  };

  const RedeemChip = ({ value, text }) => {
    const disabled = value > maxRedeemable;
    const active = redeemAmount === value;
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          active && styles.chipActive,
          disabled && styles.chipDisabled,
        ]}
        disabled={disabled}
        onPress={() => setRedeemAmount(value)}
      >
        <Text style={[styles.chipText, active && { color: "#fff" }, disabled && { color: colors.textMuted }]}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("menu.rewards")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Wordle Rewards")}>
          <MaterialCommunityIcons name="gamepad-variant-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading ? [] : history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListHeaderComponent={
          <View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>{t("rewards.points")}</Text>
              <Text style={styles.balanceValue}>{points}</Text>
              <Text style={styles.cashHint}>
                {t("rewards.worth", { cash: cashValue, ppe: pointsPerEur, unit: format(1) })}
              </Text>
            </View>

            <View style={styles.redeemCard}>
              <Text style={styles.redeemTitle}>{t("rewards.redeemForCash")}</Text>
              <Text style={styles.redeemSub}>
                {t("rewards.selected", { points: redeemAmount, euros: redeemEuros })}
              </Text>
              <View style={styles.chipRow}>
                <RedeemChip value={100} text="100" />
                <RedeemChip value={200} text="200" />
                <RedeemChip value={500} text="500" />
                <RedeemChip
                  value={maxRedeemable > 0 ? maxRedeemable : 0}
                  text={maxRedeemable > 0 ? t("rewards.maxN", { n: maxRedeemable }) : t("rewards.max")}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.redeemBtn,
                  (redeeming || maxRedeemable < pointsPerEur) && { opacity: 0.6 },
                ]}
                onPress={handleRedeem}
                disabled={redeeming || maxRedeemable < pointsPerEur}
              >
                {redeeming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.redeemBtnText}>
                    {maxRedeemable < pointsPerEur
                      ? t("rewards.earnToRedeem", { ppe: pointsPerEur })
                      : t("rewards.redeemToBalance")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{t("rewards.history")}</Text>
            {loading && (
              <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
            )}
            {!loading && history.length === 0 && (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {t("rewards.empty")}
                </Text>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => navigation.navigate("Wordle Rewards")}
                >
                  <Text style={styles.playBtnText}>{t("rewards.playWordle")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
      />
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

    balanceCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      margin: 20,
      marginBottom: 12,
      padding: 24,
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    balanceLabel: { fontSize: 12, color: c.textMuted, letterSpacing: 1 },
    balanceValue: { fontSize: 42, fontWeight: "bold", color: c.accent, marginTop: 4 },
    cashHint: { fontSize: 13, color: c.textSecondary, marginTop: 6 },

    redeemCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      marginHorizontal: 20,
      marginBottom: 18,
      padding: 22,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    redeemTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    redeemSub: { fontSize: 13, color: c.textSecondary, marginTop: 4, marginBottom: 14 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipDisabled: { backgroundColor: c.surfaceAlt, borderColor: c.border, opacity: 0.6 },
    chipText: { fontSize: 14, fontWeight: "600", color: c.accent },

    redeemBtn: {
      backgroundColor: c.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
    },
    redeemBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },

    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      marginHorizontal: 20,
      marginBottom: 6,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    rowIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    rowTitle: { fontSize: 15, fontWeight: "600", color: c.text },
    rowSub: { fontSize: 12, color: c.textMuted, marginTop: 3 },
    rowAmount: { fontSize: 15, fontWeight: "bold" },

    separator: { height: 1, backgroundColor: c.divider, marginLeft: 20 },

    empty: { alignItems: "center", marginTop: 20, paddingHorizontal: 40 },
    emptyText: { color: c.textMuted, textAlign: "center", marginTop: 12, lineHeight: 20 },
    playBtn: {
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 14,
      marginTop: 16,
    },
    playBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  });
