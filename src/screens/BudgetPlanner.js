// Budget Planner — monthly spending limits per category.
//
// Budgets live in MySQL (budgets table) and "spent so far" is the user's REAL
// spending, classified with the same rules as the Analytics dashboard
// (get_budgets.php). Each category shows a progress bar that turns amber at
// 80% and red once the limit is exceeded.

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useCurrency } from "../currency/CurrencyContext";
import AnimatedBar from "../components/AnimatedBar";
import { MotionView, PressableScale } from "../components/motion";

const WARN_PCT = 80; // amber warning threshold

// "2026-07" -> shifted by delta months -> "2026-08"
const shiftMonth = (key, delta) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function BudgetPlanner() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { format, convert, toEur, code } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Budgets are stored in EUR — display them in the chosen currency.
  const eur = format;

  const [userId, setUserId] = useState(null);
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add / edit budget modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null); // budget being edited, or null
  const [category, setCategory] = useState(null); // catalog entry
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (monthArg, quiet = false) => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUserId(stored.user_id);
      const m = monthArg || month;
      const res = await fetch(`${API_BASE}/get_budgets.php?user_id=${stored.user_id}&month=${m}`);
      const json = await res.json();
      if (json.status === "success") setData(json);
    } catch (err) {
      if (!quiet) console.log("Budget load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [month])
  );

  const changeMonth = (delta) => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setLoading(true);
    load(next);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(null, true);
  };

  const openCreate = () => {
    setEditing(null);
    setCategory(null);
    setLimit("");
    setModalVisible(true);
  };

  const openEdit = (budget) => {
    setEditing(budget);
    setCategory({ key: budget.category, label: budget.label, icon: budget.icon, color: budget.color });
    // Prefill in the display currency (the input is typed in that currency).
    setLimit(String(Math.round(convert(budget.limit_amount) * 100) / 100));
    setModalVisible(true);
  };

  const saveBudget = async () => {
    if (!category) {
      Alert.alert("Pick a category", "Please choose a category for this budget.");
      return;
    }
    // The limit is typed in the display currency; the backend stores EUR.
    const amt = parseFloat(String(limit).replace(",", "."));
    if (!amt || amt <= 0) {
      Alert.alert("Invalid limit", "Please enter a valid limit amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/set_budget.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          month,
          category: category.key,
          limit_amount: Math.round(toEur(amt) * 100) / 100,
        }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setModalVisible(false);
        load(null, true);
      } else {
        Alert.alert("Couldn't save", json.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Could not save the budget. Please try again.");
    }
    setSaving(false);
  };

  const deleteBudget = (budget) => {
    Alert.alert("Remove budget?", `Remove the ${budget.label} budget for this month?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE}/delete_budget.php`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: userId, budget_id: budget.id }),
            });
            const json = await res.json();
            if (json.status === "success") {
              load(null, true);
            } else {
              Alert.alert("Couldn't remove", json.message || "Please try again.");
            }
          } catch (e) {
            Alert.alert("Connection error", "Could not remove the budget. Please try again.");
          }
        },
      },
    ]);
  };

  // Categories still available in the picker (no budget for them yet).
  const availableCategories = useMemo(() => {
    if (!data) return [];
    const used = new Set((data.budgets || []).map((b) => b.category));
    return (data.categories || []).filter((c) => !used.has(c.key));
  }, [data]);

  const barColor = (pct) => {
    if (pct >= 100) return colors.danger;
    if (pct >= WARN_PCT) return colors.warning;
    return colors.success;
  };

  const renderBudget = (b, index = 0) => {
    const over = b.pct >= 100;
    const warn = !over && b.pct >= WARN_PCT;

    return (
      <MotionView key={b.id} from="down" delay={100 + Math.min(index, 8) * 60}>
      <PressableScale style={styles.budgetCard} scaleTo={0.98} onPress={() => openEdit(b)}>
        <View style={styles.budgetHead}>
          <View style={[styles.catIcon, { backgroundColor: b.color + "22" }]}>
            <MaterialCommunityIcons name={b.icon} size={22} color={b.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.catName} numberOfLines={1}>{b.label}</Text>
            <Text style={styles.catSub}>
              {eur(b.spent)} of {eur(b.limit_amount)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.pctText, { color: barColor(b.pct) }]}>{Math.round(b.pct)}%</Text>
            <TouchableOpacity
              onPress={() => deleteBudget(b)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <AnimatedBar pct={b.pct} color={barColor(b.pct)} trackColor={colors.surfaceAlt} />

        <View style={styles.budgetFoot}>
          {over ? (
            <View style={styles.warnRow}>
              <MaterialCommunityIcons name="alert-circle" size={15} color={colors.danger} />
              <Text style={[styles.warnText, { color: colors.dangerText }]}>
                Over budget by {eur(b.spent - b.limit_amount)}
              </Text>
            </View>
          ) : warn ? (
            <View style={styles.warnRow}>
              <MaterialCommunityIcons name="alert" size={15} color={colors.warning} />
              <Text style={[styles.warnText, { color: colors.warning }]}>
                Almost there — {eur(b.remaining)} left
              </Text>
            </View>
          ) : (
            <Text style={styles.remainingText}>{eur(b.remaining)} remaining</Text>
          )}
        </View>
      </PressableScale>
      </MotionView>
    );
  };

  const totals = data?.totals;
  const totalPct = totals?.pct || 0;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </PressableScale>
        <Text style={styles.headerTitle}>Budget Planner</Text>
        <PressableScale scaleTo={0.85} hitSlop={8} onPress={openCreate}>
          <MaterialCommunityIcons name="plus-circle-outline" size={26} color="#fff" />
        </PressableScale>
      </View>

      {loading || !data ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* ----- month selector ----- */}
          <View style={styles.monthRow}>
            <PressableScale style={styles.monthBtn} scaleTo={0.85} onPress={() => changeMonth(-1)}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={colors.accent} />
            </PressableScale>
            <Text style={styles.monthLabel}>{data.month_label}</Text>
            <PressableScale
              style={[styles.monthBtn, month >= currentMonthKey() && { opacity: 0.35 }]}
              scaleTo={0.85}
              onPress={() => changeMonth(1)}
              disabled={month >= currentMonthKey()}
            >
              <MaterialCommunityIcons name="chevron-right" size={26} color={colors.accent} />
            </PressableScale>
          </View>

          {/* ----- overall summary ----- */}
          {data.budgets.length > 0 && (
            <MotionView from="down" delay={0} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>SPENT THIS MONTH</Text>
              <Text style={styles.summaryValue}>
                {eur(totals.spent)} <Text style={styles.summaryOf}>of {eur(totals.limit)}</Text>
              </Text>
              <View style={{ alignSelf: "stretch", marginTop: 14 }}>
                <AnimatedBar
                  pct={totalPct}
                  color={barColor(totalPct)}
                  trackColor={colors.surfaceAlt}
                  height={12}
                />
              </View>
              <Text style={[styles.summaryRemaining, totals.remaining < 0 && { color: colors.dangerText }]}>
                {totals.remaining >= 0
                  ? `${eur(totals.remaining)} left to spend`
                  : `${eur(Math.abs(totals.remaining))} over your total budget`}
              </Text>
            </MotionView>
          )}

          {/* ----- budgets ----- */}
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Category budgets</Text>
            <PressableScale style={styles.newBtn} scaleTo={0.93} onPress={openCreate}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.newBtnText}>Add Budget</Text>
            </PressableScale>
          </View>

          {data.budgets.length === 0 ? (
            <MotionView from="zoom" spring style={styles.empty}>
              <MaterialCommunityIcons name="chart-donut" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                No budgets for {data.month_label} yet. Set a monthly limit for a category — food,
                shopping, bills — and track your real spending against it.
              </Text>
            </MotionView>
          ) : (
            data.budgets.map(renderBudget)
          )}

          {/* ----- spending without a budget ----- */}
          {data.unbudgeted.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Spending without a budget</Text>
              <Text style={styles.sectionHint}>Tap a category to give it a limit.</Text>
              {data.unbudgeted.map((u) => (
                <PressableScale
                  key={u.category}
                  style={styles.unbudgetedRow}
                  scaleTo={0.98}
                  onPress={() => {
                    setEditing(null);
                    setCategory({ key: u.category, label: u.label, icon: u.icon, color: u.color });
                    setLimit("");
                    setModalVisible(true);
                  }}
                >
                  <View style={[styles.catIcon, { backgroundColor: u.color + "22", width: 40, height: 40 }]}>
                    <MaterialCommunityIcons name={u.icon} size={20} color={u.color} />
                  </View>
                  <Text style={styles.unbudgetedName}>{u.label}</Text>
                  <Text style={styles.unbudgetedAmt}>{eur(u.spent)}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                </PressableScale>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ----- add / edit budget modal ----- */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <MotionView from="zoom" spring style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? "Edit Budget" : "New Budget"}</Text>

            {editing || (category && !availableCategories.some((c) => c.key === category.key)) ? (
              // Editing (or adding from the unbudgeted list): category is fixed.
              <View style={styles.fixedCatRow}>
                <View style={[styles.catIcon, { backgroundColor: (category?.color || "#888") + "22" }]}>
                  <MaterialCommunityIcons name={category?.icon || "shape-outline"} size={22} color={category?.color || "#888"} />
                </View>
                <Text style={styles.fixedCatName}>{category?.label}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.pickLabel}>Choose a category</Text>
                <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.catGrid}>
                    {availableCategories.map((c) => {
                      const active = category?.key === c.key;
                      return (
                        <PressableScale
                          key={c.key}
                          style={[styles.catChoice, active && { backgroundColor: c.color, borderColor: c.color }]}
                          scaleTo={0.93}
                          onPress={() => setCategory(c)}
                        >
                          <MaterialCommunityIcons name={c.icon} size={18} color={active ? "#fff" : c.color} />
                          <Text style={[styles.catChoiceText, active && { color: "#fff" }]} numberOfLines={1}>
                            {c.label}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder={`Monthly limit (${code})`}
              placeholderTextColor={colors.textMuted}
              value={limit}
              onChangeText={setLimit}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalBtns}>
              <PressableScale style={styles.cancelBtn} scaleTo={0.95} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </PressableScale>
              <PressableScale style={styles.saveBtn} scaleTo={0.95} onPress={saveBudget} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>{editing ? "Save" : "Create"}</Text>
                )}
              </PressableScale>
            </View>
          </MotionView>
        </KeyboardAvoidingView>
      </Modal>
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

    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginTop: 16,
    },
    monthBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    monthLabel: { fontSize: 17, fontWeight: "800", color: c.text },

    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      marginHorizontal: 20,
      marginTop: 14,
      padding: 22,
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    summaryLabel: { fontSize: 11, color: c.textMuted, letterSpacing: 2 },
    summaryValue: { fontSize: 28, fontWeight: "bold", color: c.text, marginTop: 6 },
    summaryOf: { fontSize: 15, fontWeight: "600", color: c.textMuted },
    summaryRemaining: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginTop: 10 },

    sectionHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginTop: 20,
    },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: c.text, marginHorizontal: 20 },
    sectionHint: { fontSize: 12, color: c.textMuted, marginHorizontal: 20, marginTop: 4 },
    newBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.primary,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 20,
    },
    newBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    budgetCard: {
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
    budgetHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    catIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    catName: { fontSize: 15, fontWeight: "700", color: c.text },
    catSub: { fontSize: 12.5, color: c.textMuted, marginTop: 2 },
    pctText: { fontSize: 15, fontWeight: "800", marginBottom: 6 },

    budgetFoot: { marginTop: 10 },
    warnRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    warnText: { fontSize: 12.5, fontWeight: "700" },
    remainingText: { fontSize: 12.5, color: c.textSecondary, fontWeight: "600" },

    empty: { alignItems: "center", marginTop: 24, marginHorizontal: 40, paddingVertical: 20 },
    emptyText: { color: c.textMuted, textAlign: "center", marginTop: 12, lineHeight: 20 },

    unbudgetedRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 16,
      marginHorizontal: 20,
      marginTop: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    unbudgetedName: { flex: 1, fontSize: 14.5, fontWeight: "600", color: c.text },
    unbudgetedAmt: { fontSize: 14.5, fontWeight: "700", color: c.textSecondary },

    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 22,
    },
    modalTitle: { fontSize: 19, fontWeight: "800", color: c.text, marginBottom: 16 },

    pickLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginBottom: 10 },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
    catChoice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.2,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      maxWidth: "48%",
    },
    catChoiceText: { fontSize: 12.5, fontWeight: "700", color: c.text, flexShrink: 1 },

    fixedCatRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    fixedCatName: { fontSize: 16, fontWeight: "700", color: c.text },

    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text,
      marginTop: 12,
      marginBottom: 16,
    },

    modalBtns: { flexDirection: "row", gap: 12 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
    },
    cancelText: { color: c.text, fontWeight: "700", fontSize: 15 },
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: c.primary,
    },
    saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
