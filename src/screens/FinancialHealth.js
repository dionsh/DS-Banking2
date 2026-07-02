// Financial Health Score — a 0-100 score computed server-side
// (get_health_score.php) from the user's real transaction history: spending
// vs income, savings growth, saving consistency, large expenses,
// subscription costs and cashback/rewards usage. Deterministic (no AI), so
// the same data always produces the same score.

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import AnimatedBar from "../components/AnimatedBar";
import AnimatedNumber from "../components/AnimatedNumber";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 190;
const RING_STROKE = 15;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

// Gauge/band colors (fixed hex so they read the same in light and dark mode).
const bandColor = (score) => {
  if (score >= 80) return "#2E7D32"; // excellent
  if (score >= 65) return "#7CB342"; // good
  if (score >= 50) return "#F9A825"; // fair
  return "#E53935"; // needs attention
};

export default function FinancialHealth() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const gaugeAnim = useRef(new Animated.Value(0)).current;

  const load = async (quiet = false) => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;

      const res = await fetch(`${API_BASE}/get_health_score.php?user_id=${stored.user_id}`);
      const json = await res.json();
      if (json.status === "success") {
        setData(json);
        setError(null);
      } else {
        setError(json.message || "Could not calculate your score.");
      }
    } catch (err) {
      if (!quiet) console.log("FinancialHealth load error:", err);
      setError("Could not reach the server. Pull down to try again.");
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

  // Sweep the gauge to the score whenever a new score arrives.
  useEffect(() => {
    if (!data) return;
    gaugeAnim.setValue(0);
    Animated.timing(gaugeAnim, {
      toValue: data.score,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // SVG stroke props can't use the native driver
    }).start();
  }, [data]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const color = data ? bandColor(data.score) : colors.accent;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Health</Text>
        <MaterialCommunityIcons name="heart-pulse" size={24} color="#fff" />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="cloud-off-outline" size={40} color={colors.textMuted} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : data ? (
            <>
              {/* ----- gauge ----- */}
              <View style={styles.gaugeCard}>
                <View style={{ width: RING_SIZE, height: RING_SIZE }}>
                  <Svg width={RING_SIZE} height={RING_SIZE}>
                    <Circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RING_R}
                      stroke={colors.surfaceAlt}
                      strokeWidth={RING_STROKE}
                      fill="none"
                    />
                    <AnimatedCircle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RING_R}
                      stroke={color}
                      strokeWidth={RING_STROKE}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${RING_C} ${RING_C}`}
                      strokeDashoffset={gaugeAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: [RING_C, 0],
                      })}
                      rotation={-90}
                      origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                    />
                  </Svg>
                  <View style={styles.gaugeCenter}>
                    <AnimatedNumber
                      value={data.score}
                      format={(n) => String(Math.round(n))}
                      style={[styles.gaugeScore, { color }]}
                      duration={1100}
                    />
                    <Text style={styles.gaugeOutOf}>/ 100</Text>
                  </View>
                </View>

                <View style={[styles.bandChip, { backgroundColor: color }]}>
                  <MaterialCommunityIcons
                    name={data.score >= 65 ? "shield-check" : data.score >= 50 ? "shield-half-full" : "shield-alert"}
                    size={15}
                    color="#fff"
                  />
                  <Text style={styles.bandChipText}>{data.band}</Text>
                </View>

                <Text style={styles.explanation}>{data.explanation}</Text>
              </View>

              {/* ----- factor breakdown ----- */}
              <Text style={styles.sectionTitle}>Score breakdown</Text>
              <View style={styles.cardBox}>
                {data.factors.map((f, i) => {
                  const ratio = f.max > 0 ? (f.points / f.max) * 100 : 0;
                  return (
                    <View key={f.key} style={[i > 0 && styles.factorSpacing]}>
                      <View style={styles.factorHead}>
                        <View style={styles.factorIcon}>
                          <MaterialCommunityIcons name={f.icon} size={19} color={colors.accent} />
                        </View>
                        <Text style={styles.factorLabel}>{f.label}</Text>
                        <Text style={styles.factorPoints}>
                          {f.points}
                          <Text style={styles.factorMax}> / {f.max}</Text>
                        </Text>
                      </View>
                      <AnimatedBar
                        pct={ratio}
                        color={bandColor(ratio)}
                        trackColor={colors.surfaceAlt}
                        height={8}
                      />
                      <Text style={styles.factorDetail}>{f.detail}</Text>
                    </View>
                  );
                })}
              </View>

              {/* ----- suggestions ----- */}
              <Text style={styles.sectionTitle}>How to improve</Text>
              <View style={styles.cardBox}>
                {data.suggestions.map((s, i) => (
                  <View key={i} style={[styles.tipRow, i > 0 && { marginTop: 14 }]}>
                    <View style={styles.tipNum}>
                      <Text style={styles.tipNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.tipText}>{s}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.footNote}>
                Calculated from your real DS Banking activity — it updates as your habits change.
              </Text>
            </>
          ) : null}
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

    body: { padding: 20, paddingBottom: 50 },

    errorBox: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
    errorText: { color: c.textMuted, textAlign: "center", marginTop: 14, lineHeight: 20 },

    gaugeCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 24,
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    gaugeCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    gaugeScore: { fontSize: 52, fontWeight: "800", lineHeight: 58 },
    gaugeOutOf: { fontSize: 14, color: c.textMuted, fontWeight: "600", marginTop: -2 },

    bandChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 20,
      paddingVertical: 7,
      paddingHorizontal: 16,
      marginTop: 16,
    },
    bandChipText: { color: "#fff", fontWeight: "800", fontSize: 13.5 },

    explanation: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
      lineHeight: 21,
      marginTop: 14,
    },

    sectionTitle: { fontSize: 16, fontWeight: "700", color: c.text, marginTop: 22, marginBottom: 10 },

    cardBox: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 16,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },

    factorSpacing: { marginTop: 18 },
    factorHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    factorIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    factorLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: c.text },
    factorPoints: { fontSize: 14.5, fontWeight: "800", color: c.accent },
    factorMax: { fontSize: 12, fontWeight: "600", color: c.textMuted },
    factorDetail: { fontSize: 12, color: c.textMuted, marginTop: 7, lineHeight: 17 },

    tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    tipNum: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    tipNumText: { fontSize: 12, fontWeight: "800", color: c.accent },
    tipText: { flex: 1, fontSize: 13.5, color: c.textSecondary, lineHeight: 19 },

    footNote: { fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 20 },
  });
