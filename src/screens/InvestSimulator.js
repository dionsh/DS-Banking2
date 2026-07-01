// Invest Simulator — practice investing with VIRTUAL money.
//
// Every user gets €10,000 of fake cash (separate from their real balance) to
// buy simulated Tesla / Apple / Bitcoin / Gold / NASDAQ. Prices come from the
// backend's deterministic price engine (get_invest.php), so charts look alive
// and everyone sees the same market — no external API involved.
//
// This is a learning tool: no real money ever moves and nothing here is
// investment advice.

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import AnimatedNumber from "../components/AnimatedNumber";
import { makeChartConfig, hexToRgba } from "../utils/chartTheme";

const screenWidth = Dimensions.get("window").width;
const CHART_WIDTH = screenWidth - 60;
const RANGES = ["1D", "1W", "1M"];

// Manual thousands formatting (Hermes' toLocaleString isn't always reliable).
const money = (n) => {
  const v = Number(n) || 0;
  const [int, dec] = Math.abs(v).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (v < 0 ? "-" : "") + "€" + grouped + "." + dec;
};
const signed = (n) => (n >= 0 ? "+" : "−") + money(Math.abs(n));

export default function InvestSimulator() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const chartConfig = useMemo(() => makeChartConfig(colors), [colors]);

  const [userId, setUserId] = useState(null);
  const [data, setData] = useState(null);
  const [range, setRange] = useState("1M");
  const [selected, setSelected] = useState("tesla");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  const load = async (rangeArg, quiet = false) => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUserId(stored.user_id);
      const r = rangeArg || range;
      const res = await fetch(`${API_BASE}/get_invest.php?user_id=${stored.user_id}&range=${r}`);
      const json = await res.json();
      if (json.status === "success") setData(json);
    } catch (err) {
      if (!quiet) console.log("Invest load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload on focus + a gentle 45s "market tick" while the screen is open.
  useFocusEffect(
    useCallback(() => {
      load();
      pollRef.current = setInterval(() => load(null, true), 45000);
      return () => clearInterval(pollRef.current);
    }, [range])
  );

  const changeRange = (r) => {
    setRange(r);
    load(r);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const trade = async (action) => {
    if (!data || busy) return;
    const asset = data.assets.find((a) => a.key === selected);
    const holding = data.holdings.find((h) => h.asset === selected);

    let amt = parseFloat((amount || "").replace(",", "."));
    if (action === "sell" && (!amt || amt <= 0) && holding) {
      // Empty amount + Sell = sell the whole position.
      amt = Math.max(1, Math.ceil(holding.value));
    }
    if (!amt || amt < 1) {
      Alert.alert("Enter an amount", "Type how many € you want to " + action + " (minimum €1).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/invest_trade.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action, asset: selected, amount: amt }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setAmount("");
        await load();
      } else {
        Alert.alert("Trade failed", json.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Please try again.");
    }
    setBusy(false);
  };

  const confirmReset = () => {
    Alert.alert(
      "Reset portfolio",
      "Start over with €10,000 of virtual money? Your simulated holdings and history will be cleared.",
      [
        { text: "Keep playing", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await fetch(`${API_BASE}/invest_trade.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, action: "reset" }),
              });
              await load();
            } catch (e) {}
            setBusy(false);
          },
        },
      ]
    );
  };

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.openDrawer()}>
        <MaterialCommunityIcons name="menu" size={28} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Invest Simulator</Text>
      <TouchableOpacity onPress={confirmReset}>
        <MaterialCommunityIcons name="restart" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {Header}
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const { portfolio, assets, holdings, trades, wallet } = data;
  const asset = assets.find((a) => a.key === selected) || assets[0];
  const holding = holdings.find((h) => h.asset === selected);
  const up = asset.change_24h_pct >= 0;
  const plColor = portfolio.pl >= 0 ? colors.success : colors.danger;

  const assetChart = {
    labels: [],
    datasets: [
      {
        data: asset.series,
        color: (o = 1) => hexToRgba(asset.color, Math.max(o, 0.9)),
        strokeWidth: 2,
      },
    ],
  };
  const portfolioChart = {
    labels: [],
    datasets: [
      {
        data: portfolio.series.length > 1 ? portfolio.series : [portfolio.value, portfolio.value],
        color: (o = 1) => hexToRgba(colors.accent, Math.max(o, 0.9)),
        strokeWidth: 2,
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {Header}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* ----- simulation disclaimer ----- */}
        <View style={styles.simBanner}>
          <MaterialCommunityIcons name="school-outline" size={16} color={colors.accent} />
          <Text style={styles.simText}>
            {"  "}Simulation — virtual money only. Your real balance is never used.
          </Text>
        </View>

        {/* ----- portfolio summary ----- */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabelTop}>PORTFOLIO VALUE</Text>
          <AnimatedNumber value={portfolio.value} format={money} style={styles.portfolioValue} />
          <View style={styles.plRow}>
            <MaterialCommunityIcons
              name={portfolio.pl >= 0 ? "trending-up" : "trending-down"}
              size={18}
              color={plColor}
            />
            <Text style={[styles.plText, { color: plColor }]}>
              {"  "}{signed(portfolio.pl)} ({portfolio.pl_pct >= 0 ? "+" : ""}
              {portfolio.pl_pct}%) all time
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <AnimatedNumber value={wallet.cash} format={money} style={styles.summaryValue} />
              <Text style={styles.summaryLabel}>FREE CASH</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AnimatedNumber value={portfolio.invested} format={money} style={styles.summaryValue} />
              <Text style={styles.summaryLabel}>INVESTED</Text>
            </View>
          </View>

          <LineChart
            data={portfolioChart}
            width={CHART_WIDTH}
            height={130}
            chartConfig={chartConfig}
            bezier
            withDots={false}
            withVerticalLines={false}
            withHorizontalLabels={false}
            style={styles.chart}
          />
        </View>

        {/* ----- range selector ----- */}
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
              onPress={() => changeRange(r)}
            >
              <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ----- asset picker ----- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.assetRow}
        >
          {assets.map((a) => {
            const active = a.key === selected;
            return (
              <TouchableOpacity
                key={a.key}
                style={[styles.assetChip, active && { backgroundColor: a.color, borderColor: a.color }]}
                onPress={() => setSelected(a.key)}
              >
                <MaterialCommunityIcons
                  name={a.icon}
                  size={17}
                  color={active ? "#fff" : colors.accent}
                />
                <Text style={[styles.assetChipText, active && { color: "#fff" }]}>{a.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ----- selected asset card ----- */}
        <View style={styles.card}>
          <View style={styles.assetHeader}>
            <View style={[styles.assetIcon, { backgroundColor: asset.color }]}>
              <MaterialCommunityIcons name={asset.icon} size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.assetName}>
                {asset.name} <Text style={styles.assetSymbol}>{asset.symbol}</Text>
              </Text>
              <AnimatedNumber value={asset.price} format={money} style={styles.assetPrice} />
            </View>
            <View
              style={[
                styles.changeBadge,
                { backgroundColor: up ? "rgba(46,125,50,0.12)" : "rgba(211,47,47,0.12)" },
              ]}
            >
              <MaterialCommunityIcons
                name={up ? "arrow-up-bold" : "arrow-down-bold"}
                size={14}
                color={up ? colors.success : colors.danger}
              />
              <Text style={[styles.changeText, { color: up ? colors.success : colors.danger }]}>
                {Math.abs(asset.change_24h_pct)}% 24h
              </Text>
            </View>
          </View>

          <LineChart
            data={assetChart}
            width={CHART_WIDTH}
            height={190}
            chartConfig={chartConfig}
            bezier
            withDots={false}
            withVerticalLines={false}
            yAxisLabel="€"
            style={styles.chart}
          />

          {holding && (
            <View style={styles.holdingLine}>
              <Text style={styles.holdingLineText}>
                You own {holding.units} {asset.symbol} · worth {money(holding.value)} ·{" "}
                <Text style={{ color: holding.pl >= 0 ? colors.success : colors.danger, fontWeight: "700" }}>
                  {signed(holding.pl)} ({holding.pl_pct >= 0 ? "+" : ""}
                  {holding.pl_pct}%)
                </Text>
              </Text>
            </View>
          )}

          {/* ----- trade box ----- */}
          <View style={styles.tradeBox}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount in €"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />
            <View style={styles.quickAmounts}>
              {[100, 500, 1000].map((q) => (
                <TouchableOpacity key={q} style={styles.quickAmountBtn} onPress={() => setAmount(String(q))}>
                  <Text style={styles.quickAmountText}>€{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.tradeBtnRow}>
              <TouchableOpacity
                style={[styles.tradeBtn, styles.buyBtn, busy && { opacity: 0.5 }]}
                onPress={() => trade("buy")}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.tradeBtnText}>Buy</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tradeBtn,
                  styles.sellBtn,
                  (!holding || busy) && { opacity: 0.4 },
                ]}
                onPress={() => trade("sell")}
                disabled={!holding || busy}
              >
                <Text style={[styles.tradeBtnText, { color: colors.danger }]}>
                  Sell{holding && !amount ? " all" : ""}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ----- holdings ----- */}
        {holdings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your holdings</Text>
            {holdings.map((h) => (
              <TouchableOpacity key={h.asset} style={styles.holdingCard} onPress={() => setSelected(h.asset)}>
                <View style={[styles.assetIcon, { backgroundColor: h.color, width: 40, height: 40 }]}>
                  <MaterialCommunityIcons name={h.icon} size={20} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.holdingName}>{h.name}</Text>
                  <Text style={styles.holdingSub}>
                    {h.units} {h.symbol} · invested {money(h.invested)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.holdingValue}>{money(h.value)}</Text>
                  <Text
                    style={{
                      color: h.pl >= 0 ? colors.success : colors.danger,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {signed(h.pl)} ({h.pl_pct >= 0 ? "+" : ""}
                    {h.pl_pct}%)
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ----- recent trades ----- */}
        {trades.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent trades</Text>
            <View style={styles.card}>
              {trades.map((t, i) => (
                <View key={i} style={[styles.tradeRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                  <MaterialCommunityIcons
                    name={t.action === "buy" ? "cart-arrow-down" : "cash-plus"}
                    size={20}
                    color={t.action === "buy" ? colors.accent : colors.success}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.tradeRowTitle}>
                      {t.action === "buy" ? "Bought" : "Sold"} {t.name}
                    </Text>
                    <Text style={styles.tradeRowSub}>
                      {t.units} @ {money(t.price)} · {t.created_at}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.tradeRowAmount,
                      { color: t.action === "buy" ? colors.text : colors.success },
                    ]}
                  >
                    {t.action === "buy" ? "−" : "+"}
                    {money(t.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footNote}>
          Prices are simulated for learning purposes and do not reflect real markets. This is not
          investment advice.
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

    simBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceAlt,
      marginHorizontal: 20,
      marginTop: 14,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    simText: { color: c.textSecondary, fontSize: 12, fontWeight: "600" },

    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      margin: 20,
      marginBottom: 8,
      paddingVertical: 18,
      paddingHorizontal: 10,
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    summaryLabelTop: { fontSize: 11, color: c.textMuted, letterSpacing: 2 },
    portfolioValue: { fontSize: 32, fontWeight: "bold", color: c.text, marginTop: 6 },
    plRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    plText: { fontSize: 14, fontWeight: "700" },

    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
      marginBottom: 6,
      alignSelf: "stretch",
    },
    summaryItem: { flex: 1, alignItems: "center" },
    summaryValue: { fontSize: 16, fontWeight: "bold", color: c.accent },
    summaryLabel: { fontSize: 10.5, color: c.textMuted, letterSpacing: 1, marginTop: 3 },
    summaryDivider: { width: 1, height: 34, backgroundColor: c.divider },

    chart: { borderRadius: 12, marginTop: 8, marginLeft: -6 },

    rangeRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      marginTop: 6,
    },
    rangeBtn: {
      paddingHorizontal: 22,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: c.surfaceAlt,
    },
    rangeBtnActive: { backgroundColor: c.primary },
    rangeText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
    rangeTextActive: { color: "#fff" },

    assetRow: { paddingHorizontal: 20, paddingTop: 14, gap: 8 },
    assetChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.2,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    assetChipText: { fontSize: 13, fontWeight: "700", color: c.text },

    card: {
      backgroundColor: c.card,
      borderRadius: 18,
      marginHorizontal: 20,
      marginTop: 12,
      padding: 12,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },

    assetHeader: { flexDirection: "row", alignItems: "center", padding: 6 },
    assetIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    assetName: { fontSize: 16, fontWeight: "800", color: c.text },
    assetSymbol: { fontSize: 12, fontWeight: "600", color: c.textMuted },
    assetPrice: { fontSize: 18, fontWeight: "bold", color: c.accent, marginTop: 2 },
    changeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderRadius: 14,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    changeText: { fontSize: 12, fontWeight: "800" },

    holdingLine: { paddingHorizontal: 8, paddingBottom: 4 },
    holdingLineText: { fontSize: 13, color: c.textSecondary },

    tradeBox: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      padding: 12,
      marginTop: 8,
    },
    amountInput: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
    },
    quickAmounts: { flexDirection: "row", gap: 8, marginTop: 10 },
    quickAmountBtn: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    quickAmountText: { fontSize: 13, fontWeight: "700", color: c.accent },

    tradeBtnRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    tradeBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    buyBtn: { backgroundColor: c.primary },
    sellBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: c.danger },
    tradeBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
      marginHorizontal: 20,
      marginTop: 18,
      marginBottom: 2,
    },

    holdingCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 16,
      marginHorizontal: 20,
      marginTop: 10,
      padding: 14,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    holdingName: { fontSize: 15, fontWeight: "700", color: c.text },
    holdingSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    holdingValue: { fontSize: 15, fontWeight: "800", color: c.text },

    tradeRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 6,
    },
    tradeRowTitle: { fontSize: 13.5, fontWeight: "700", color: c.text },
    tradeRowSub: { fontSize: 11.5, color: c.textMuted, marginTop: 1 },
    tradeRowAmount: { fontSize: 14, fontWeight: "800" },

    footNote: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      marginHorizontal: 30,
      marginTop: 22,
      lineHeight: 18,
    },
  });
