// AI Coach — NOVA as a personal financial coach.
//
// nova_coach.php computes every number in PHP from MySQL and returns:
//   - ai_message : a short personalized message (LLM-written when a provider
//                  key is configured on Render, PHP-composed otherwise)
//   - insights   : deterministic tips (spending, subscriptions, goals, budget,
//                  cash flow, rewards) — always available
//   - summary    : the month's aggregates for the header stats
//
// The AI only phrases numbers PHP computed — it never invents them.

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import AnimatedNumber from "../components/AnimatedNumber";

const eur = (n) => "€" + (Number(n) || 0).toFixed(2);

// Accent color per insight type (works on both themes).
const TYPE_COLORS = {
  spending: "#5C6BC0",
  budget: "#FF7A00",
  saving: "#26A69A",
  cashflow: "#66BB6A",
  rewards: "#C9A227",
};

export default function AICoach() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      const res = await fetch(`${API_BASE}/nova_coach.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: stored.user_id }),
      });
      const json = await res.json();
      if (json.status === "success") setData(json);
    } catch (err) {
      console.log("AICoach load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.openDrawer()}>
        <MaterialCommunityIcons name="menu" size={28} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>AI Coach</Text>
      <TouchableOpacity onPress={onRefresh}>
        <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {Header}
        <View style={{ alignItems: "center", marginTop: 60, gap: 14 }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            NOVA is analyzing your finances...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { summary, insights, ai_message, source } = data;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {Header}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* ----- NOVA's personal message ----- */}
        <View style={styles.novaCard}>
          <View style={styles.novaTopRow}>
            <View style={styles.novaAvatar}>
              <MaterialCommunityIcons name="robot-happy-outline" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.novaName}>NOVA</Text>
              <Text style={styles.novaRole}>
                Your financial coach {source === "ai" ? "· AI analysis" : "· smart analysis"}
              </Text>
            </View>
          </View>
          <Text style={styles.novaMessage}>{ai_message}</Text>
        </View>

        {/* ----- month at a glance ----- */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryMonth}>{summary.month_label} at a glance</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <AnimatedNumber value={summary.this_month_expenses} style={[styles.summaryValue, { color: colors.danger }]} />
              <Text style={styles.summaryLabel}>SPENT</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AnimatedNumber value={summary.this_month_income} style={[styles.summaryValue, { color: colors.success }]} />
              <Text style={styles.summaryLabel}>INCOME</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AnimatedNumber value={summary.avg_daily_spend} style={styles.summaryValue} />
              <Text style={styles.summaryLabel}>PER DAY</Text>
            </View>
          </View>
          {summary.top_category ? (
            <Text style={styles.topCatLine}>
              Top category: {summary.top_category.name} ({eur(summary.top_category.amount)} ·{" "}
              {summary.top_category.share_pct}% of spending)
            </Text>
          ) : null}
        </View>

        {/* ----- insights ----- */}
        <Text style={styles.sectionTitle}>Personal insights</Text>
        {insights.map((ins, i) => {
          const tint = TYPE_COLORS[ins.type] || colors.accent;
          return (
            <View key={i} style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: tint }]}>
                <MaterialCommunityIcons name={ins.icon} size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>{ins.title}</Text>
                <Text style={styles.insightText}>{ins.text}</Text>
              </View>
            </View>
          );
        })}

        {insights.length === 0 && (
          <View style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: colors.accent }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitle}>Not enough data yet</Text>
              <Text style={styles.insightText}>
                Use DS Banking for a while (transfers, subscriptions, savings) and NOVA will start
                coaching you with real numbers.
              </Text>
            </View>
          </View>
        )}

        {/* ----- ask NOVA ----- */}
        <TouchableOpacity style={styles.askBtn} onPress={() => navigation.navigate("NOVA")}>
          <MaterialCommunityIcons name="chat-question-outline" size={20} color="#fff" />
          <Text style={styles.askText}>  Ask NOVA about your spending</Text>
        </TouchableOpacity>

        <Text style={styles.footNote}>
          All figures are computed from your real DS Banking data. Educational guidance only — not
          professional financial advice.
        </Text>
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

    novaCard: {
      backgroundColor: c.primary,
      borderRadius: 20,
      margin: 20,
      marginBottom: 6,
      padding: 18,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    novaTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    novaAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    novaName: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 1 },
    novaRole: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
    novaMessage: { color: "#fff", fontSize: 14.5, lineHeight: 22 },

    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      marginHorizontal: 20,
      marginTop: 14,
      paddingVertical: 18,
      paddingHorizontal: 14,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    summaryMonth: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: 12,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    summaryRow: { flexDirection: "row", alignItems: "center" },
    summaryItem: { flex: 1, alignItems: "center" },
    summaryValue: { fontSize: 19, fontWeight: "bold", color: c.text },
    summaryLabel: { fontSize: 11, color: c.textMuted, letterSpacing: 1, marginTop: 4 },
    summaryDivider: { width: 1, height: 40, backgroundColor: c.divider },
    topCatLine: {
      textAlign: "center",
      color: c.textSecondary,
      fontSize: 13,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 4,
    },

    insightCard: {
      flexDirection: "row",
      backgroundColor: c.card,
      borderRadius: 18,
      marginHorizontal: 20,
      marginTop: 12,
      padding: 16,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    insightIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    insightTitle: { fontSize: 14.5, fontWeight: "700", color: c.text, marginBottom: 4 },
    insightText: { fontSize: 13.5, color: c.textSecondary, lineHeight: 20 },

    askBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
      borderRadius: 14,
      marginHorizontal: 20,
      marginTop: 22,
      paddingVertical: 14,
    },
    askText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    footNote: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      marginHorizontal: 30,
      marginTop: 22,
      lineHeight: 18,
    },
  });
