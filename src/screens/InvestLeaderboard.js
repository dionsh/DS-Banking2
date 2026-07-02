// Investment Leaderboard — who's the best (virtual) investor?
//
// Rankings come from real MySQL data (get_invest_leaderboard.php): portfolio
// value = virtual cash + holdings valued at current prices (Bitcoin at the
// live market price). The top 3 get the podium with medals; everyone else is
// listed below, and your own rank is always shown.

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

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS = ["#F5B301", "#B0BEC5", "#CD7F32"]; // gold, silver, bronze

// Manual thousands formatting (Hermes' toLocaleString isn't always reliable).
const money = (n) => {
  const v = Number(n) || 0;
  const [int, dec] = Math.abs(v).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (v < 0 ? "-" : "") + "€" + grouped + "." + dec;
};

export default function InvestLeaderboard() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      const res = await fetch(`${API_BASE}/get_invest_leaderboard.php?user_id=${stored.user_id}`);
      const json = await res.json();
      if (json.status === "success") setData(json);
    } catch (err) {
      if (!quiet) console.log("Leaderboard load error:", err);
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
    load(true);
  };

  const leaders = data?.leaders || [];
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);
  const me = data?.me;

  const profitColor = (pct) => (pct >= 0 ? colors.success : colors.danger);
  const signedPct = (pct) => (pct >= 0 ? "+" : "") + pct + "%";

  // Podium display order: 2nd, 1st, 3rd (classic podium layout).
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  const renderPodium = (p) => {
    const idx = p.rank - 1; // 0..2
    const first = p.rank === 1;
    return (
      <View key={p.user_id} style={[styles.podiumCol, first && styles.podiumColFirst]}>
        <Text style={[styles.medal, first && { fontSize: 42 }]}>{MEDALS[idx]}</Text>
        <View
          style={[
            styles.podiumAvatar,
            first && styles.podiumAvatarFirst,
            { borderColor: PODIUM_COLORS[idx] },
            p.is_me && { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[styles.podiumInitial, p.is_me && { color: "#fff" }]}>
            {p.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.podiumName} numberOfLines={1}>
          {p.is_me ? "You" : p.name}
        </Text>
        <Text style={[styles.podiumValue, first && { fontSize: 16 }]}>{money(p.value)}</Text>
        <View style={[styles.pctBadge, { backgroundColor: p.profit_pct >= 0 ? "rgba(46,125,50,0.12)" : "rgba(211,47,47,0.12)" }]}>
          <MaterialCommunityIcons
            name={p.profit_pct >= 0 ? "trending-up" : "trending-down"}
            size={13}
            color={profitColor(p.profit_pct)}
          />
          <Text style={[styles.pctBadgeText, { color: profitColor(p.profit_pct) }]}>
            {signedPct(p.profit_pct)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <MaterialCommunityIcons name="trophy-outline" size={24} color="#fff" />
      </View>

      {loading || !data ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          <Text style={styles.subtitle}>
            Top investors by virtual portfolio value — everyone starts with{" "}
            {money(data.start_cash)}.
          </Text>

          {leaders.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="podium-gold" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                Nobody is on the board yet. Make a trade in the Invest Simulator and claim the 🥇!
              </Text>
            </View>
          ) : (
            <>
              {/* ----- podium ----- */}
              <View style={styles.podiumCard}>
                <View style={styles.podiumRow}>{podiumOrder.map(renderPodium)}</View>
              </View>

              {/* ----- ranks 4+ ----- */}
              {rest.length > 0 && (
                <View style={styles.listCard}>
                  {rest.map((p, i) => (
                    <View
                      key={p.user_id}
                      style={[
                        styles.listRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider },
                        p.is_me && styles.listRowMe,
                      ]}
                    >
                      <Text style={styles.listRank}>{p.rank}</Text>
                      <View style={[styles.listAvatar, p.is_me && { backgroundColor: colors.primary }]}>
                        <Text style={[styles.listInitial, p.is_me && { color: "#fff" }]}>
                          {p.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listName}>{p.is_me ? "You" : p.name}</Text>
                        <Text style={styles.listTrades}>
                          {p.trades} trade{p.trades !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.listValue}>{money(p.value)}</Text>
                        <Text style={[styles.listPct, { color: profitColor(p.profit_pct) }]}>
                          {signedPct(p.profit_pct)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* ----- your rank ----- */}
              <View style={styles.meCard}>
                {me?.ranked ? (
                  <>
                    <MaterialCommunityIcons
                      name={me.rank <= 3 ? "party-popper" : "account-star-outline"}
                      size={26}
                      color={colors.accent}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.meTitle}>
                        You're ranked #{me.rank} of {leaders.length >= 10 ? "the top players" : leaders.length}
                      </Text>
                      <Text style={styles.meSub}>
                        Portfolio {money(me.value)} ·{" "}
                        <Text style={{ color: profitColor(me.profit_pct), fontWeight: "700" }}>
                          {signedPct(me.profit_pct)}
                        </Text>
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="rocket-launch-outline" size={26} color={colors.accent} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.meTitle}>You're not on the board yet</Text>
                      <Text style={styles.meSub}>Make your first trade to join the ranking!</Text>
                    </View>
                  </>
                )}
              </View>
            </>
          )}

          <Text style={styles.footNote}>
            Rankings use virtual money only. Bitcoin is valued at the real live market price.
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

    subtitle: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 16,
      marginHorizontal: 30,
      lineHeight: 19,
    },

    podiumCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      marginHorizontal: 20,
      marginTop: 16,
      paddingVertical: 20,
      paddingHorizontal: 10,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    podiumRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" },
    podiumCol: { alignItems: "center", flex: 1 },
    podiumColFirst: { marginBottom: 14 },
    medal: { fontSize: 32, marginBottom: 6 },
    podiumAvatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 3,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    podiumAvatarFirst: { width: 72, height: 72, borderRadius: 36 },
    podiumInitial: { fontSize: 24, fontWeight: "800", color: c.accent },
    podiumName: { fontSize: 13, fontWeight: "700", color: c.text, marginTop: 8, maxWidth: 100 },
    podiumValue: { fontSize: 14, fontWeight: "800", color: c.text, marginTop: 2 },
    pctBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 6,
    },
    pctBadgeText: { fontSize: 11.5, fontWeight: "800" },

    listCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      marginHorizontal: 20,
      marginTop: 14,
      paddingHorizontal: 14,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
    listRowMe: { backgroundColor: c.surfaceAlt, marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 12 },
    listRank: { width: 26, fontSize: 14, fontWeight: "800", color: c.textMuted },
    listAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    listInitial: { fontSize: 15, fontWeight: "800", color: c.accent },
    listName: { fontSize: 14.5, fontWeight: "700", color: c.text },
    listTrades: { fontSize: 11.5, color: c.textMuted, marginTop: 1 },
    listValue: { fontSize: 14.5, fontWeight: "800", color: c.text },
    listPct: { fontSize: 12, fontWeight: "700", marginTop: 1 },

    meCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 18,
      marginHorizontal: 20,
      marginTop: 14,
      padding: 16,
      borderWidth: 1.5,
      borderColor: c.accent,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    meTitle: { fontSize: 15, fontWeight: "800", color: c.text },
    meSub: { fontSize: 13, color: c.textSecondary, marginTop: 2 },

    empty: { alignItems: "center", marginTop: 40, marginHorizontal: 40 },
    emptyText: { color: c.textMuted, textAlign: "center", marginTop: 12, lineHeight: 20 },

    footNote: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      marginHorizontal: 30,
      marginTop: 20,
      lineHeight: 18,
    },
  });
