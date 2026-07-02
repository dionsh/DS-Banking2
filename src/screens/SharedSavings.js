// Shared Savings — save money together with other DS Banking users.
//
// A user creates a group (Dubai Trip, New Car...), invites existing users by
// email (the account is verified server-side), and invited users accept or
// decline right here. Every member can "Add Money" straight from their real
// account balance; contributions are recorded in the ledger and listed in the
// group's history. All of it is real PHP + MySQL (shared_goals tables).

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
import AnimatedBar from "../components/AnimatedBar";

// Icon choices offered when creating a group (stored as the icon name string).
const GROUP_ICONS = [
  "airplane",
  "car",
  "gamepad-variant",
  "beach",
  "ring",
  "home-outline",
  "gift-outline",
  "account-group",
];

// Quick contribution amounts (EUR) shown in the group detail view.
const QUICK_ADD = [10, 50, 100];

const eur = (n) => "€" + (Number(n) || 0).toFixed(2);
const GREEN = "#2E7D32";

export default function SharedSavings() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userId, setUserId] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [goals, setGoals] = useState([]);
  const [accountBalance, setAccountBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyInvite, setBusyInvite] = useState(null); // goal_id being answered

  // Create-group modal
  const [createVisible, setCreateVisible] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState("account-group");
  const [inviteEmail, setInviteEmail] = useState("");
  const [creating, setCreating] = useState(false);

  // Group detail modal
  const [detail, setDetail] = useState(null); // the opened goal object
  const [amount, setAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = async (quiet = false) => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUserId(stored.user_id);

      const [sharedRes, cardRes] = await Promise.all([
        fetch(`${API_BASE}/get_shared_goals.php?user_id=${stored.user_id}`),
        fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`),
      ]);

      const shared = await sharedRes.json();
      if (shared.status === "success") {
        setInvitations(shared.invitations || []);
        setGoals(shared.goals || []);
        // Keep an open detail view in sync after contributing / inviting.
        setDetail((prev) => (prev ? (shared.goals || []).find((g) => g.id === prev.id) || null : null));
      }

      const card = await cardRes.json();
      if (card.status === "success") {
        setAccountBalance(Number(card.card.balance) || 0);
      }
    } catch (err) {
      if (!quiet) console.log("Shared savings load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  /* ---------- create ---------- */

  const openCreate = () => {
    setName("");
    setTarget("");
    setIcon("account-group");
    setInviteEmail("");
    setCreateVisible(true);
  };

  const createGroup = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter a name for your group (e.g. Dubai Trip).");
      return;
    }
    const amt = parseFloat(String(target).replace(",", "."));
    if (!amt || amt <= 0) {
      Alert.alert("Invalid goal", "Please enter a valid goal amount.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/create_shared_goal.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: name.trim(),
          icon,
          target_amount: amt,
          invite_email: inviteEmail.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setCreateVisible(false);
        Alert.alert("Group created 🎉", data.message);
        load(true);
      } else {
        Alert.alert("Couldn't create group", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Could not create the group. Please try again.");
    }
    setCreating(false);
  };

  /* ---------- invitations ---------- */

  const respondInvite = async (inv, accept) => {
    setBusyInvite(inv.goal_id);
    try {
      const res = await fetch(`${API_BASE}/respond_shared_invite.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, goal_id: inv.goal_id, accept }),
      });
      const data = await res.json();
      if (data.status === "success") {
        load(true);
      } else {
        Alert.alert("Couldn't respond", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Could not respond. Please try again.");
    }
    setBusyInvite(null);
  };

  /* ---------- contribute ---------- */

  const addMoney = async (goal, amtArg) => {
    const amt = amtArg || parseFloat(String(amount).replace(",", "."));
    if (!amt || amt <= 0) {
      Alert.alert("Enter an amount", "Type how many € you want to add.");
      return;
    }
    if (Number(accountBalance) < amt) {
      Alert.alert("Insufficient balance", `You need ${eur(amt)} in your balance to add to this group.`);
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/contribute_shared_goal.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, goal_id: goal.id, amount: amt }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setAmount("");
        setAccountBalance(Number(data.new_balance));
        if (data.completed) {
          Alert.alert("🎉 Goal reached!", `"${goal.name}" reached its goal of ${eur(goal.target_amount)}!`);
        }
        await load(true);
      } else {
        Alert.alert("Couldn't add money", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Could not add money. Please try again.");
    }
    setAdding(false);
  };

  /* ---------- invite more members ---------- */

  const inviteMember = async (goal) => {
    const email = memberEmail.trim();
    if (!email) {
      Alert.alert("Missing email", "Enter the DS Banking email of the person you want to invite.");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`${API_BASE}/invite_shared_member.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, goal_id: goal.id, email }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMemberEmail("");
        Alert.alert("Invitation sent ✉️", data.message);
        load(true);
      } else {
        Alert.alert("Couldn't invite", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Could not send the invitation. Please try again.");
    }
    setInviting(false);
  };

  /* ---------- render helpers ---------- */

  const initials = (fullName) =>
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");

  const renderInvitation = (inv) => (
    <View key={inv.goal_id} style={styles.inviteCard}>
      <View style={styles.goalHead}>
        <View style={styles.goalIcon}>
          <MaterialCommunityIcons name={inv.icon || "account-group"} size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalName} numberOfLines={1}>{inv.name}</Text>
          <Text style={styles.goalDesc}>
            {inv.invited_by_name} invited you · goal {eur(inv.target_amount)}
          </Text>
        </View>
      </View>
      {busyInvite === inv.goal_id ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 12 }} />
      ) : (
        <View style={styles.inviteBtns}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => respondInvite(inv, true)}>
            <MaterialCommunityIcons name="check" size={17} color="#fff" />
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => respondInvite(inv, false)}>
            <MaterialCommunityIcons name="close" size={17} color={colors.dangerText} />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderGoal = (goal) => {
    const completed = goal.status === "completed";
    return (
      <TouchableOpacity
        key={goal.id}
        style={[styles.goalCard, completed && styles.goalCardDone]}
        onPress={() => {
          setAmount("");
          setMemberEmail("");
          setDetail(goal);
        }}
        activeOpacity={0.75}
      >
        <View style={styles.goalHead}>
          <View style={[styles.goalIcon, completed && styles.goalIconDone]}>
            <MaterialCommunityIcons
              name={goal.icon || "account-group"}
              size={22}
              color={completed ? GREEN : colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
            <Text style={styles.goalDesc}>
              {goal.members.length} member{goal.members.length !== 1 ? "s" : ""} · you added{" "}
              {eur(goal.my_contributed)}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
        </View>

        <AnimatedBar pct={goal.pct} color={completed ? GREEN : colors.accent} trackColor={colors.surfaceAlt} />

        <View style={styles.goalAmtRow}>
          <Text style={styles.goalSaved}>
            {eur(goal.current_amount)} <Text style={styles.goalTarget}>of {eur(goal.target_amount)}</Text>
          </Text>
          <Text style={[styles.goalPct, completed && { color: GREEN }]}>{Math.round(goal.pct)}%</Text>
        </View>

        {completed && (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="party-popper" size={18} color={GREEN} />
            <Text style={styles.successText}>Goal reached — congratulations to the whole group!</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const detailCompleted = detail?.status === "completed";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shared Savings</Text>
        <TouchableOpacity onPress={openCreate}>
          <MaterialCommunityIcons name="plus-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* ----- pending invitations ----- */}
          {invitations.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                Invitations ({invitations.length})
              </Text>
              {invitations.map(renderInvitation)}
            </>
          )}

          {/* ----- my groups ----- */}
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>My groups</Text>
            <TouchableOpacity style={styles.newBtn} onPress={openCreate}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.newBtnText}>New Group</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.availLine}>Available balance: {eur(accountBalance)}</Text>

          {goals.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                No shared groups yet. Create one and invite a friend — a Dubai trip, a new car, a
                gaming setup — and save toward it together.
              </Text>
            </View>
          ) : (
            goals.map(renderGoal)
          )}
        </ScrollView>
      )}

      {/* ----- create-group modal ----- */}
      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Shared Group</Text>

            <TextInput
              style={styles.input}
              placeholder="Group name (e.g. Dubai Trip)"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            <TextInput
              style={styles.input}
              placeholder="Goal amount (€)"
              placeholderTextColor={colors.textMuted}
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Invite by email (optional)"
              placeholderTextColor={colors.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.pickLabel}>Choose an icon</Text>
            <View style={styles.iconGrid}>
              {GROUP_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconChoice, icon === ic && styles.iconChoiceActive]}
                  onPress={() => setIcon(ic)}
                >
                  <MaterialCommunityIcons name={ic} size={22} color={icon === ic ? "#fff" : colors.accent} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={createGroup} disabled={creating}>
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Create Group</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ----- group detail modal ----- */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.detailBackdrop}
        >
          <View style={styles.detailCard}>
            {detail && (
              <>
                <View style={styles.detailHandleRow}>
                  <View style={styles.detailHandle} />
                </View>
                <View style={styles.detailHeadRow}>
                  <View style={[styles.goalIcon, detailCompleted && styles.goalIconDone]}>
                    <MaterialCommunityIcons
                      name={detail.icon || "account-group"}
                      size={24}
                      color={detailCompleted ? GREEN : colors.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName} numberOfLines={1}>{detail.name}</Text>
                    <Text style={styles.goalDesc}>
                      {detailCompleted ? "Goal reached 🎉" : `${Math.round(detail.pct)}% of ${eur(detail.target_amount)}`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetail(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* progress */}
                  <AnimatedBar
                    pct={detail.pct}
                    color={detailCompleted ? GREEN : colors.accent}
                    trackColor={colors.surfaceAlt}
                    height={12}
                  />
                  <View style={styles.goalAmtRow}>
                    <Text style={styles.goalSaved}>
                      {eur(detail.current_amount)}{" "}
                      <Text style={styles.goalTarget}>of {eur(detail.target_amount)}</Text>
                    </Text>
                    <Text style={[styles.goalPct, detailCompleted && { color: GREEN }]}>
                      {Math.round(detail.pct)}%
                    </Text>
                  </View>

                  {/* add money */}
                  {!detailCompleted && (
                    <View style={styles.addBox}>
                      <Text style={styles.addBoxTitle}>Add Money</Text>
                      <Text style={styles.availLineSmall}>From your balance ({eur(accountBalance)})</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Amount (€)"
                        placeholderTextColor={colors.textMuted}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                      />
                      <View style={styles.quickRow}>
                        {QUICK_ADD.map((a) => (
                          <TouchableOpacity
                            key={a}
                            style={styles.addChip}
                            onPress={() => addMoney(detail, a)}
                            disabled={adding}
                          >
                            <MaterialCommunityIcons name="plus" size={15} color={colors.accent} />
                            <Text style={styles.addChipText}>{eur(a)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[styles.addMoneyBtn, adding && { opacity: 0.6 }]}
                        onPress={() => addMoney(detail)}
                        disabled={adding}
                      >
                        {adding ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="bank-transfer-in" size={20} color="#fff" />
                            <Text style={styles.addMoneyText}>  Add Money</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* members */}
                  <Text style={styles.detailSection}>Members</Text>
                  {detail.members.map((m) => (
                    <View key={m.user_id} style={styles.memberRow}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberInitials}>{initials(m.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>
                          {m.name}
                          {m.user_id === userId ? " (you)" : ""}
                        </Text>
                        <Text style={styles.memberSub}>
                          {m.role === "owner" ? "👑 Owner" : m.status === "invited" ? "⏳ Invited" : "Member"}
                        </Text>
                      </View>
                      <Text style={styles.memberAmt}>{eur(m.contributed)}</Text>
                    </View>
                  ))}

                  {/* invite more */}
                  {!detailCompleted && (
                    <View style={styles.inviteBox}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="Invite by email"
                        placeholderTextColor={colors.textMuted}
                        value={memberEmail}
                        onChangeText={setMemberEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                      <TouchableOpacity
                        style={[styles.inviteSendBtn, inviting && { opacity: 0.6 }]}
                        onPress={() => inviteMember(detail)}
                        disabled={inviting}
                      >
                        {inviting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <MaterialCommunityIcons name="send" size={18} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* contribution history */}
                  <Text style={styles.detailSection}>Contribution history</Text>
                  {detail.contributions.length === 0 ? (
                    <Text style={styles.noHistory}>No contributions yet — be the first!</Text>
                  ) : (
                    detail.contributions.map((cItem, i) => (
                      <View key={i} style={styles.historyRow}>
                        <View style={styles.historyIcon}>
                          <MaterialCommunityIcons name="piggy-bank-outline" size={20} color={colors.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyName}>
                            {cItem.user_id === userId ? "You" : cItem.name}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(cItem.created_at.replace(" ", "T")).toLocaleDateString("de-DE")}
                          </Text>
                        </View>
                        <Text style={styles.historyAmt}>+{eur(cItem.amount)}</Text>
                      </View>
                    ))
                  )}

                  <View style={{ height: 24 }} />
                </ScrollView>
              </>
            )}
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

    sectionHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginTop: 18,
    },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: c.text, marginHorizontal: 20 },
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
    availLine: { fontSize: 12, color: c.textMuted, marginHorizontal: 20, marginTop: 6 },
    availLineSmall: { fontSize: 12, color: c.textMuted, marginBottom: 8 },

    inviteCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      marginHorizontal: 20,
      marginTop: 12,
      padding: 16,
      borderWidth: 1.5,
      borderColor: c.accent,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    inviteBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
    acceptBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: GREEN,
      borderRadius: 12,
      paddingVertical: 12,
    },
    acceptText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    declineBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: c.danger,
      borderRadius: 12,
      paddingVertical: 12,
    },
    declineText: { color: c.dangerText, fontWeight: "700", fontSize: 14 },

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
    goalCardDone: { borderWidth: 1.5, borderColor: GREEN },
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

    goalAmtRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
    },
    goalSaved: { fontSize: 15, fontWeight: "700", color: c.text },
    goalTarget: { fontSize: 13, fontWeight: "500", color: c.textMuted },
    goalPct: { fontSize: 14, fontWeight: "700", color: c.accent },

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
    successText: { color: GREEN, fontWeight: "700", fontSize: 13, flex: 1 },

    empty: { alignItems: "center", marginTop: 24, marginHorizontal: 40, paddingVertical: 20 },
    emptyText: { color: c.textMuted, textAlign: "center", marginTop: 12, lineHeight: 20 },

    // Create modal
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
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: c.primary,
    },
    saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    // Detail modal (bottom sheet style)
    detailBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    detailCard: {
      backgroundColor: c.card,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 20,
      paddingBottom: 18,
      maxHeight: "88%",
    },
    detailHandleRow: { alignItems: "center", paddingVertical: 10 },
    detailHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border },
    detailHeadRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    detailName: { fontSize: 18, fontWeight: "800", color: c.text },

    addBox: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 16,
      padding: 14,
      marginTop: 16,
    },
    addBoxTitle: { fontSize: 15, fontWeight: "800", color: c.text, marginBottom: 2 },
    quickRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    addChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: c.card,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    addChipText: { color: c.accent, fontWeight: "700", fontSize: 14 },
    addMoneyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 14,
    },
    addMoneyText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    detailSection: { fontSize: 15, fontWeight: "800", color: c.text, marginTop: 20, marginBottom: 8 },
    memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    memberInitials: { fontSize: 14, fontWeight: "800", color: c.accent },
    memberName: { fontSize: 14.5, fontWeight: "700", color: c.text },
    memberSub: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    memberAmt: { fontSize: 14.5, fontWeight: "800", color: c.success },

    inviteBox: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    inviteSendBtn: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
    historyIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    historyName: { fontSize: 14, fontWeight: "600", color: c.text },
    historyDate: { fontSize: 11.5, color: c.textMuted, marginTop: 1 },
    historyAmt: { fontSize: 14.5, fontWeight: "800", color: c.success },
    noHistory: { fontSize: 13, color: c.textMuted },
  });
