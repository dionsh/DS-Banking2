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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

// Icon choices offered when creating a goal (stored as the icon name string).
const GOAL_ICONS = [
  "laptop",
  "airplane",
  "cellphone",
  "car",
  "home-outline",
  "gift-outline",
  "school-outline",
  "target",
];

// Quick contribution amounts (EUR) shown on each active goal.
const QUICK_ADD = [10, 50, 100];

const eur = (n) => "€" + (Number(n) || 0).toFixed(2);
const pctOf = (saved, target) => {
  const t = Number(target) || 0;
  if (t <= 0) return 0;
  return Math.min(100, Math.round((Number(saved) / t) * 100));
};

export default function MySavings() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userId, setUserId] = useState(null);
  const [balance, setBalance] = useState(0); // round-up savings total
  const [history, setHistory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [accountBalance, setAccountBalance] = useState(0); // main balance
  const [loading, setLoading] = useState(true);
  const [busyGoalId, setBusyGoalId] = useState(null);

  // Create-goal modal
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("target");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUserId(stored.user_id);

      const [savingsRes, goalsRes, cardRes] = await Promise.all([
        fetch(`${API_BASE}/get_savings.php?user_id=${stored.user_id}`),
        fetch(`${API_BASE}/get_goals.php?user_id=${stored.user_id}`),
        fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`),
      ]);

      const savings = await savingsRes.json();
      if (savings.status === "success") {
        setBalance(Number(savings.balance) || 0);
        setHistory(savings.history || []);
      }

      const goalsData = await goalsRes.json();
      if (goalsData.status === "success") {
        setGoals(goalsData.goals || []);
      }

      const card = await cardRes.json();
      if (card.status === "success") {
        setAccountBalance(Number(card.card.balance) || 0);
      }
    } catch (err) {
      console.log("Savings load error:", err);
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

  const openCreate = () => {
    setName("");
    setTarget("");
    setDescription("");
    setIcon("target");
    setModalVisible(true);
  };

  const createGoal = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter a name for your goal.");
      return;
    }
    const amt = parseFloat(String(target).replace(",", "."));
    if (!amt || amt <= 0) {
      Alert.alert("Invalid target", "Please enter a valid target amount.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/create_goal.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: name.trim(),
          target_amount: amt,
          description: description.trim(),
          icon,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setModalVisible(false);
        load();
      } else {
        Alert.alert("Couldn't create goal", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Could not create the goal. Please try again.");
    }
    setCreating(false);
  };

  const addToGoal = async (goal, amount) => {
    if (Number(accountBalance) < amount) {
      Alert.alert("Insufficient balance", `You need ${eur(amount)} in your balance to add to this goal.`);
      return;
    }
    setBusyGoalId(goal.id);
    try {
      const res = await fetch(`${API_BASE}/add_to_goal.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, goal_id: goal.id, amount }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setAccountBalance(Number(data.new_balance));
        setGoals((prev) => prev.map((g) => (g.id === data.goal.id ? data.goal : g)));
        if (data.completed) {
          Alert.alert("🎉 Goal reached!", `Congratulations! You have reached your savings goal: ${goal.name}.`);
        }
      } else {
        Alert.alert("Couldn't add", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Could not add to the goal. Please try again.");
    }
    setBusyGoalId(null);
  };

  const transferGoal = (goal) => {
    Alert.alert(
      "Transfer to balance",
      `Move ${eur(goal.saved_amount)} from "${goal.name}" back into your balance?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          onPress: async () => {
            setBusyGoalId(goal.id);
            try {
              const res = await fetch(`${API_BASE}/transfer_goal.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, goal_id: goal.id }),
              });
              const data = await res.json();
              if (data.status === "success") {
                setAccountBalance(Number(data.new_balance));
                setGoals((prev) => prev.filter((g) => g.id !== goal.id));
              } else {
                Alert.alert("Couldn't transfer", data.message || "Please try again.");
              }
            } catch (e) {
              Alert.alert("Connection error", "Could not transfer. Please try again.");
            }
            setBusyGoalId(null);
          },
        },
      ]
    );
  };

  const deleteGoal = (goal) => {
    const hasMoney = Number(goal.saved_amount) > 0;
    Alert.alert(
      "Delete goal?",
      hasMoney
        ? `"${goal.name}" holds ${eur(goal.saved_amount)}. It will be returned to your balance.`
        : `Delete "${goal.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyGoalId(goal.id);
            try {
              const res = await fetch(`${API_BASE}/delete_goal.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, goal_id: goal.id }),
              });
              const data = await res.json();
              if (data.status === "success") {
                if (data.new_balance != null) setAccountBalance(Number(data.new_balance));
                setGoals((prev) => prev.filter((g) => g.id !== goal.id));
              } else {
                Alert.alert("Couldn't delete", data.message || "Please try again.");
              }
            } catch (e) {
              Alert.alert("Connection error", "Could not delete the goal. Please try again.");
            }
            setBusyGoalId(null);
          },
        },
      ]
    );
  };

  const renderGoal = (goal) => {
    const completed = goal.status === "completed";
    const pct = completed ? 100 : pctOf(goal.saved_amount, goal.target_amount);
    const busy = busyGoalId === goal.id;

    return (
      <View key={goal.id} style={[styles.goalCard, completed && styles.goalCardDone]}>
        <View style={styles.goalHead}>
          <View style={[styles.goalIcon, completed && styles.goalIconDone]}>
            <MaterialCommunityIcons
              name={goal.icon || "target"}
              size={22}
              color={completed ? "#2E7D32" : colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
            {goal.description ? (
              <Text style={styles.goalDesc} numberOfLines={1}>{goal.description}</Text>
            ) : (
              <Text style={styles.goalDesc}>{completed ? "Goal reached" : `${pct}% complete`}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => deleteGoal(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%`, backgroundColor: completed ? "#2E7D32" : colors.accent },
            ]}
          />
        </View>

        <View style={styles.goalAmtRow}>
          <Text style={styles.goalSaved}>
            {eur(goal.saved_amount)} <Text style={styles.goalTarget}>of {eur(goal.target_amount)}</Text>
          </Text>
          <Text style={[styles.goalPct, completed && { color: "#2E7D32" }]}>{pct}%</Text>
        </View>

        {completed ? (
          <>
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="party-popper" size={18} color="#2E7D32" />
              <Text style={styles.successText}>Congratulations! Goal reached.</Text>
            </View>
            <TouchableOpacity style={styles.transferBtn} onPress={() => transferGoal(goal)} disabled={busy}>
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="bank-transfer-in" size={20} color="#fff" />
                  <Text style={styles.transferText}>  Transfer Savings to Balance</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.addRow}>
            {busy ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 4 }} />
            ) : (
              QUICK_ADD.map((a) => (
                <TouchableOpacity key={a} style={styles.addChip} onPress={() => addToGoal(goal, a)}>
                  <MaterialCommunityIcons name="plus" size={15} color={colors.accent} />
                  <Text style={styles.addChipText}>{eur(a)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("menu.savings")}</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Round-up savings total */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t("mysavings.totalSaved")}</Text>
            <Text style={styles.balanceValue}>{Number(balance).toFixed(2)} EUR</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("Round It Up")}>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" />
              <Text style={styles.addBtnText}>{t("mysavings.roundUpPurchase")}</Text>
            </TouchableOpacity>
          </View>

          {/* Savings Goals */}
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Savings Goals</Text>
            <TouchableOpacity style={styles.newGoalBtn} onPress={openCreate}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.newGoalText}>New Goal</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.availLine}>Available balance: {eur(accountBalance)}</Text>

          {goals.length === 0 ? (
            <View style={styles.emptyGoals}>
              <MaterialCommunityIcons name="flag-checkered" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                No goals yet. Create one to start saving toward something — a laptop, a vacation, a new phone.
              </Text>
            </View>
          ) : (
            goals.map(renderGoal)
          )}

          {/* Round-up history */}
          {history.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 22 }]}>{t("mysavings.history")}</Text>
              {history.map((item) => (
                <View key={item.id.toString()} style={styles.row}>
                  <View style={styles.rowIcon}>
                    <MaterialCommunityIcons name="piggy-bank-outline" size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.label ? item.label : t("mysavings.roundUp")}</Text>
                    <Text style={styles.rowSub}>
                      {t("mysavings.purchase", { amount: Number(item.purchase_amount).toFixed(2) })} ·{" "}
                      {new Date(item.created_at).toLocaleDateString("de-DE")}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>+{Number(item.saved_amount).toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Create-goal modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Savings Goal</Text>

            <TextInput
              style={styles.input}
              placeholder="Goal name (e.g. Buy a Laptop)"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            <TextInput
              style={styles.input}
              placeholder="Target amount (€)"
              placeholderTextColor={colors.textMuted}
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              maxLength={120}
            />

            <Text style={styles.pickLabel}>Choose an icon</Text>
            <View style={styles.iconGrid}>
              {GOAL_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconChoice, icon === ic && styles.iconChoiceActive]}
                  onPress={() => setIcon(ic)}
                >
                  <MaterialCommunityIcons
                    name={ic}
                    size={22}
                    color={icon === ic ? "#fff" : colors.accent}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={createGoal} disabled={creating}>
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createText}>Create Goal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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

    balanceCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      margin: 20,
      marginBottom: 10,
      padding: 24,
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    balanceLabel: { fontSize: 12, color: c.textMuted, letterSpacing: 1 },
    balanceValue: { fontSize: 34, fontWeight: "bold", color: c.accent, marginTop: 6 },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 14,
      marginTop: 18,
      gap: 8,
    },
    addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

    sectionHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginTop: 12,
    },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: c.text, marginHorizontal: 20 },
    newGoalBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.primary,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 20,
    },
    newGoalText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    availLine: { fontSize: 12, color: c.textMuted, marginHorizontal: 20, marginTop: 6, marginBottom: 6 },

    goalCard: {
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
    goalCardDone: { borderWidth: 1.5, borderColor: "#2E7D32" },
    goalHead: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    goalIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    goalIconDone: { backgroundColor: "#E7F6EC" },
    goalName: { fontSize: 16, fontWeight: "700", color: c.text },
    goalDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    progressTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.surfaceAlt,
      overflow: "hidden",
    },
    progressFill: { height: 10, borderRadius: 5 },

    goalAmtRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
    },
    goalSaved: { fontSize: 15, fontWeight: "700", color: c.text },
    goalTarget: { fontSize: 13, fontWeight: "500", color: c.textMuted },
    goalPct: { fontSize: 14, fontWeight: "700", color: c.accent },

    addRow: { flexDirection: "row", gap: 10, marginTop: 14, minHeight: 38, alignItems: "center" },
    addChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: c.surfaceAlt,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    addChipText: { color: c.accent, fontWeight: "700", fontSize: 14 },

    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#E7F6EC",
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginTop: 14,
    },
    successText: { color: "#2E7D32", fontWeight: "700", fontSize: 13 },
    transferBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2E7D32",
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 12,
    },
    transferText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    emptyGoals: { alignItems: "center", marginTop: 20, marginHorizontal: 40, paddingVertical: 20 },
    emptyText: { color: c.textMuted, textAlign: "center", marginTop: 12, lineHeight: 20 },

    row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 },
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
    rowAmount: { fontSize: 16, fontWeight: "bold", color: c.success },

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
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text,
      marginBottom: 12,
    },
    pickLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginBottom: 10, marginTop: 2 },
    iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
    iconChoice: {
      width: 46,
      height: 46,
      borderRadius: 13,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },
    iconChoiceActive: { backgroundColor: c.primary },
    modalBtns: { flexDirection: "row", gap: 12 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
    },
    cancelText: { color: c.text, fontWeight: "700", fontSize: 15 },
    createBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: c.primary,
    },
    createText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
