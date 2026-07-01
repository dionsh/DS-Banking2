// Subscriptions — a modern subscription manager, similar to what digital banking
// apps show. Lists available subscriptions (Netflix, Spotify, Gym, Codex, Prime),
// their monthly price and status, and lets the user subscribe / cancel.
//
// Status persists in the backend (subscription_plans + user_subscriptions tables).
// Toggling only changes status — no money is moved — and each change creates an
// Inbox notification server-side.

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";

const eur = (n) => "€" + (Number(n) || 0).toFixed(2);

export default function Subscriptions() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userId, setUserId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUserId(stored.user_id);

      const res = await fetch(`${API_BASE}/get_subscriptions.php?user_id=${stored.user_id}`);
      const data = await res.json();
      if (data.status === "success") {
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.log("Subscriptions load error:", err);
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

  const activeCount = plans.filter((p) => p.active).length;
  const monthlyTotal = plans.reduce((sum, p) => (p.active ? sum + Number(p.price) : sum), 0);

  const toggle = async (plan) => {
    const endpoint = plan.active ? "cancel_subscription.php" : "subscribe.php";
    setBusyKey(plan.plan_key);
    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan_key: plan.plan_key }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setPlans((prev) =>
          prev.map((p) => (p.plan_key === plan.plan_key ? { ...p, active: !!data.active } : p))
        );
      }
    } catch (e) {
      // silently ignore — UI stays as-is
    }
    setBusyKey(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{eur(monthlyTotal)}</Text>
              <Text style={styles.summaryLabel}>Per month</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Manage subscriptions</Text>

          {plans.map((plan) => {
            const busy = busyKey === plan.plan_key;
            return (
              <View key={plan.plan_key} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: plan.color }]}>
                    <MaterialCommunityIcons name={plan.icon} size={24} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>{eur(plan.price)} / month</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: plan.active ? "#E7F6EC" : colors.surfaceAlt },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: plan.active ? "#2E7D32" : colors.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: plan.active ? "#2E7D32" : colors.textMuted },
                      ]}
                    >
                      {plan.active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, plan.active ? styles.cancelBtn : styles.subscribeBtn]}
                  onPress={() => toggle(plan)}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={plan.active ? "#D32F2F" : "#fff"} />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name={plan.active ? "close-circle-outline" : "check-circle-outline"}
                        size={19}
                        color={plan.active ? "#D32F2F" : "#fff"}
                      />
                      <Text style={[styles.actionText, plan.active && styles.cancelText]}>
                        {"  "}
                        {plan.active ? "Cancel Subscription" : "Subscribe"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.footNote}>
            Subscriptions here are for demonstration — managing them updates your status only and
            does not charge your balance.
          </Text>
        </ScrollView>
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

    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 20,
      margin: 20,
      marginBottom: 6,
      paddingVertical: 22,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    summaryItem: { flex: 1, alignItems: "center" },
    summaryValue: { fontSize: 28, fontWeight: "bold", color: c.accent },
    summaryLabel: { fontSize: 12, color: c.textMuted, letterSpacing: 1, marginTop: 4 },
    summaryDivider: { width: 1, height: 44, backgroundColor: c.divider },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 4,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 18,
      marginHorizontal: 20,
      marginTop: 12,
      padding: 18,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    cardTop: { flexDirection: "row", alignItems: "center" },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    planName: { fontSize: 16, fontWeight: "700", color: c.text },
    planPrice: { fontSize: 13, color: c.textSecondary, marginTop: 3 },

    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: "700" },

    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      paddingVertical: 13,
      marginTop: 16,
    },
    subscribeBtn: { backgroundColor: c.primary },
    cancelBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#D32F2F" },
    actionText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    cancelText: { color: "#D32F2F" },

    footNote: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      marginHorizontal: 30,
      marginTop: 22,
      lineHeight: 18,
    },
  });
