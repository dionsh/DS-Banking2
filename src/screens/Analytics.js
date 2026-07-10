// Analytics — the Spending Analytics dashboard.
//
// Everything is aggregated server-side by get_analytics.php (PHP + MySQL);
// this screen only renders it: animated counters, a category pie, income vs
// expenses lines, weekly bars, savings growth, cashback / reward points and
// the subscription cost breakdown. Charts are react-native-chart-kit (already
// a project dependency) themed for light + dark mode.

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useCurrency } from "../currency/CurrencyContext";
import AnimatedNumber from "../components/AnimatedNumber";
import { MotionView, PressableScale, SkeletonBlock } from "../components/motion";
import { makeChartConfig, hexToRgba, CATEGORY_COLORS } from "../utils/chartTheme";

const screenWidth = Dimensions.get("window").width;
const CHART_WIDTH = screenWidth - 60; // card margins (20) + card padding (10)

export default function Analytics() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { format, convert, symbol } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const chartConfig = useMemo(() => makeChartConfig(colors), [colors]);

  // Server aggregates are EUR — every displayed number goes through the
  // active display currency (charts included, so axes match the labels).
  const eur = format;
  const eurShort = (n) => {
    const v = Math.round(convert(n));
    return symbol.length > 1 ? `${symbol} ${v}` : `${symbol}${v}`;
  };
  const axisLabel = symbol.length > 1 ? "" : symbol;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      const res = await fetch(`${API_BASE}/get_analytics.php?user_id=${stored.user_id}`);
      const json = await res.json();
      if (json.status === "success") setData(json.analytics);
    } catch (err) {
      console.log("Analytics load error:", err);
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
      <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => navigation.openDrawer()}>
        <MaterialCommunityIcons name="menu" size={28} color="#fff" />
      </PressableScale>
      <Text style={styles.headerTitle}>Analytics</Text>
      <PressableScale scaleTo={0.85} hitSlop={8} onPress={onRefresh}>
        <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
      </PressableScale>
    </View>
  );

  if (loading || !data) {
    // Skeleton dashboard — summary card + chart placeholders.
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {Header}
        <View style={{ padding: 20 }}>
          <SkeletonBlock height={120} radius={20} />
          <SkeletonBlock width={180} height={16} radius={6} style={{ marginTop: 26 }} />
          <SkeletonBlock height={200} radius={18} style={{ marginTop: 12 }} />
          <SkeletonBlock width={180} height={16} radius={6} style={{ marginTop: 26 }} />
          <SkeletonBlock height={200} radius={18} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const { summary, months, weeks, categories, savings, cashback, rewards, subscriptions } = data;

  // ----- chart data -----

  const pieData = categories.slice(0, 8).map((c, i) => ({
    name: c.name,
    amount: Math.round(convert(c.amount)),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  }));

  const incomeExpenseData = {
    labels: months.map((m) => m.label),
    datasets: [
      {
        data: months.map((m) => Math.round(convert(m.income))),
        color: (o = 1) => hexToRgba(colors.success, o),
        strokeWidth: 2,
      },
      {
        data: months.map((m) => Math.round(convert(m.expenses))),
        color: (o = 1) => hexToRgba(colors.danger, o),
        strokeWidth: 2,
      },
    ],
    legend: ["Income", "Expenses"],
  };

  const weeklyData = {
    labels: weeks.map((w) => w.label.split(" ")[0]), // day of the week start
    datasets: [{ data: weeks.map((w) => Math.round(convert(w.expenses))) }],
  };

  const savingsData = {
    labels: savings.monthly.map((m) => m.label),
    datasets: [
      {
        data: savings.monthly.map((m) => Math.round(convert(m.balance))),
        color: (o = 1) => hexToRgba("#26A69A", o),
        strokeWidth: 2,
      },
    ],
  };

  const changePct = summary.expenses_change_pct;

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
        {/* ----- animated summary counters ----- */}
        <MotionView from="down" delay={0} style={styles.summaryCard}>
          <Text style={styles.summaryMonth}>{summary.month_label}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <AnimatedNumber value={summary.this_month_expenses} format={format} style={[styles.summaryValue, { color: colors.danger }]} />
              <Text style={styles.summaryLabel}>SPENT</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AnimatedNumber value={summary.this_month_income} format={format} style={[styles.summaryValue, { color: colors.success }]} />
              <Text style={styles.summaryLabel}>INCOME</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AnimatedNumber
                value={summary.net}
                format={format}
                style={[styles.summaryValue, { color: summary.net >= 0 ? colors.success : colors.danger }]}
              />
              <Text style={styles.summaryLabel}>NET</Text>
            </View>
          </View>

          {changePct !== null && (
            <View style={styles.trendRow}>
              <MaterialCommunityIcons
                name={changePct >= 0 ? "trending-up" : "trending-down"}
                size={18}
                color={changePct >= 0 ? colors.danger : colors.success}
              />
              <Text style={styles.trendText}>
                {"  "}Spending is {Math.abs(changePct)}% {changePct >= 0 ? "higher" : "lower"} than last
                month ({eur(summary.last_month_expenses)})
              </Text>
            </View>
          )}
        </MotionView>

        {/* ----- spending categories pie ----- */}
        <MotionView from="down" delay={100}>
        <Text style={styles.sectionTitle}>Spending categories</Text>
        <View style={styles.card}>
          {pieData.length > 0 ? (
            <PieChart
              data={pieData}
              width={CHART_WIDTH}
              height={200}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="10"
              absolute
            />
          ) : (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="chart-pie" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No spending yet this month</Text>
            </View>
          )}
        </View>
        </MotionView>

        {/* ----- income vs expenses ----- */}
        <MotionView from="down" delay={180}>
        <Text style={styles.sectionTitle}>Income vs expenses</Text>
        <View style={styles.card}>
          <LineChart
            data={incomeExpenseData}
            width={CHART_WIDTH}
            height={210}
            chartConfig={chartConfig}
            bezier
            fromZero
            yAxisLabel={axisLabel}
            style={styles.chart}
          />
        </View>
        </MotionView>

        {/* ----- weekly comparison ----- */}
        <MotionView from="down" delay={240}>
        <Text style={styles.sectionTitle}>Weekly spending</Text>
        <View style={styles.card}>
          <BarChart
            data={weeklyData}
            width={CHART_WIDTH}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (o = 1) => hexToRgba(colors.accent, Math.max(o, 0.35)),
            }}
            fromZero
            yAxisLabel={axisLabel}
            yAxisSuffix=""
            showValuesOnTopOfBars={false}
            style={styles.chart}
          />
          <Text style={styles.chartCaption}>Last 8 weeks · labels show the first day of each week</Text>
        </View>
        </MotionView>

        {/* ----- savings growth ----- */}
        <MotionView from="down" delay={300}>
        <Text style={styles.sectionTitle}>Savings growth</Text>
        <View style={styles.card}>
          <View style={styles.inlineStat}>
            <MaterialCommunityIcons name="piggy-bank-outline" size={22} color={colors.accent} />
            <AnimatedNumber value={savings.total} format={format} style={styles.inlineStatValue} />
            <Text style={styles.inlineStatLabel}> saved in total</Text>
          </View>
          <LineChart
            data={savingsData}
            width={CHART_WIDTH}
            height={180}
            chartConfig={chartConfig}
            bezier
            fromZero
            yAxisLabel={axisLabel}
            style={styles.chart}
          />
        </View>
        </MotionView>

        {/* ----- cashback + reward points counters ----- */}
        <MotionView from="down" delay={360}>
        <Text style={styles.sectionTitle}>Rewards & cashback</Text>
        <View style={styles.twinRow}>
          <View style={[styles.card, styles.twinCard]}>
            <MaterialCommunityIcons name="sale" size={24} color="#FF7A00" />
            <AnimatedNumber value={cashback.total_earned} format={format} style={styles.twinValue} />
            <Text style={styles.twinLabel}>Cashback earned</Text>
            <Text style={styles.twinSub}>{eur(cashback.balance)} unredeemed</Text>
          </View>
          <View style={[styles.card, styles.twinCard]}>
            <MaterialCommunityIcons name="trophy-outline" size={24} color="#C9A227" />
            <AnimatedNumber
              value={rewards.earned_total}
              format={(n) => Math.round(n).toString()}
              style={styles.twinValue}
            />
            <Text style={styles.twinLabel}>Points earned</Text>
            <Text style={styles.twinSub}>{rewards.points} available (≈{eurShort(rewards.points / 100)})</Text>
          </View>
        </View>
        </MotionView>

        {/* ----- subscriptions ----- */}
        <MotionView from="down" delay={420}>
        <Text style={styles.sectionTitle}>Subscription expenses</Text>
        <View style={styles.card}>
          <View style={styles.subsRow}>
            <View style={{ flex: 1 }}>
              <AnimatedNumber value={subscriptions.monthly_cost} format={format} style={styles.subsValue} />
              <Text style={styles.twinLabel}>per month · {subscriptions.active_count} active</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.subsYear}>{eur(subscriptions.monthly_cost * 12)}</Text>
              <Text style={styles.twinLabel}>per year</Text>
            </View>
          </View>

          {subscriptions.items.length > 0 ? (
            <View style={styles.pillWrap}>
              {subscriptions.items.map((s) => (
                <View key={s.name} style={[styles.pill, { borderColor: s.color || colors.border }]}>
                  <MaterialCommunityIcons
                    name={s.icon || "credit-card-outline"}
                    size={14}
                    color={s.color || colors.accent}
                  />
                  <Text style={styles.pillText}>
                    {s.name} · {eur(s.price)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No active subscriptions — {format(0)} recurring cost. 🎉</Text>
          )}
        </View>
        </MotionView>

        <Text style={styles.footNote}>
          Numbers come from your real DS Banking transactions. Moving money into savings is not
          counted as spending.
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

    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      margin: 20,
      marginBottom: 6,
      paddingVertical: 18,
      paddingHorizontal: 14,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
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
    summaryValue: { fontSize: 20, fontWeight: "bold" },
    summaryLabel: { fontSize: 11, color: c.textMuted, letterSpacing: 1, marginTop: 4 },
    summaryDivider: { width: 1, height: 40, backgroundColor: c.divider },

    trendRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    trendText: { color: c.textSecondary, fontSize: 13 },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
      marginHorizontal: 20,
      marginTop: 18,
      marginBottom: 4,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 18,
      marginHorizontal: 20,
      marginTop: 10,
      padding: 10,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    chart: { borderRadius: 12, marginLeft: -6 },
    chartCaption: {
      fontSize: 11,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 4,
    },

    emptyBox: { alignItems: "center", paddingVertical: 30, gap: 8 },
    emptyText: { color: c.textMuted, fontSize: 13, textAlign: "center", padding: 8 },

    inlineStat: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 2,
    },
    inlineStatValue: { fontSize: 18, fontWeight: "bold", color: c.accent, marginLeft: 8 },
    inlineStatLabel: { fontSize: 13, color: c.textSecondary },

    twinRow: { flexDirection: "row", marginRight: 20 },
    twinCard: {
      flex: 1,
      marginRight: 0,
      alignItems: "center",
      paddingVertical: 18,
    },
    twinValue: { fontSize: 22, fontWeight: "bold", color: c.text, marginTop: 8 },
    twinLabel: { fontSize: 12, color: c.textMuted, marginTop: 3 },
    twinSub: { fontSize: 12, color: c.textSecondary, marginTop: 6, fontWeight: "600" },

    subsRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 4,
    },
    subsValue: { fontSize: 24, fontWeight: "bold", color: c.accent },
    subsYear: { fontSize: 16, fontWeight: "700", color: c.text },

    pillWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      padding: 8,
      paddingTop: 12,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.2,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: c.surfaceAlt,
    },
    pillText: { fontSize: 12, fontWeight: "600", color: c.text },

    footNote: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      marginHorizontal: 30,
      marginTop: 22,
      lineHeight: 18,
    },
  });
