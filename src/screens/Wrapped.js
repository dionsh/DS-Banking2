// DS Banking Wrapped — a Spotify-Wrapped-style, full-screen story of the
// user's money life SO FAR (available any time, not just at year end).
//
// Data comes pre-aggregated from get_wrapped.php (numbers only); every label
// is translated here so the story follows the app language. Navigation works
// like stories everywhere: swipe between cards, tap the right side to go
// forward, the left side to go back. Built entirely with react-native's
// Animated + the already-installed react-native-svg — no new dependencies,
// fully OTA-safe.

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect, Circle } from "react-native-svg";
import { API_BASE } from "../config";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../currency/CurrencyContext";
import AnimatedNumber from "../components/AnimatedNumber";

const { width: SW, height: SH } = Dimensions.get("window");

/* One vibrant gradient per story card (white text sits on all of them). */
const THEMES = {
  intro:    { grad: ["#191970", "#4A3AFF"], icon: "star-four-points" },
  received: { grad: ["#0BA360", "#3CBA92"], icon: "tray-arrow-down" },
  sent:     { grad: ["#6A11CB", "#2575FC"], icon: "rocket-launch-outline" },
  biggest:  { grad: ["#F857A6", "#FF5858"], icon: "trophy-outline" },
  category: { grad: ["#FF512F", "#DD2476"], icon: "shape-outline" },
  friend:   { grad: ["#11998E", "#38EF7D"], icon: "account-heart-outline" },
  transfers:{ grad: ["#396AFC", "#2948FF"], icon: "swap-horizontal-circle-outline" },
  cashback: { grad: ["#F7971E", "#FFD200"], icon: "gift-outline" },
  savings:  { grad: ["#56AB2F", "#A8E063"], icon: "piggy-bank-outline" },
  subs:     { grad: ["#7F53AC", "#647DEE"], icon: "credit-card-multiple-outline" },
  trend:    { grad: ["#134E5E", "#71B280"], icon: "chart-bar" },
  records:  { grad: ["#FC466B", "#3F5EFB"], icon: "medal-outline" },
  finale:   { grad: ["#191970", "#3A2FA0"], icon: "party-popper" },
};

/* Full-screen gradient + soft decorative circles behind each card. */
function SlideBackground({ id, grad }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgGradient id={`wg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={grad[0]} />
          <Stop offset="1" stopColor={grad[1]} />
        </SvgGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#wg-${id})`} />
      <Circle cx="88%" cy="10%" r="95" fill="rgba(255,255,255,0.08)" />
      <Circle cx="6%" cy="88%" r="130" fill="rgba(255,255,255,0.07)" />
      <Circle cx="14%" cy="22%" r="42" fill="rgba(255,255,255,0.10)" />
      <Circle cx="80%" cy="72%" r="60" fill="rgba(255,255,255,0.06)" />
    </Svg>
  );
}

/* Shell shared by every card: gradient, big icon, animated entrance. */
function StorySlide({ id, theme, active, height, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      anim.setValue(0);
      iconAnim.setValue(0);
      Animated.stagger(120, [
        Animated.spring(iconAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.spring(anim, { toValue: 1, friction: 8, tension: 45, useNativeDriver: true }),
      ]).start();
    }
  }, [active]);

  return (
    <View style={{ width: SW, height }}>
      <SlideBackground id={id} grad={theme.grad} />
      <View style={ss.slideContent}>
        <Animated.View
          style={{
            opacity: iconAnim,
            transform: [
              { scale: iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            ],
          }}
        >
          <View style={ss.iconWrap}>
            <MaterialCommunityIcons name={theme.icon} size={44} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View
          style={{
            alignItems: "center",
            opacity: anim,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            ],
          }}
        >
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

export default function Wrapped() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { format } = useCurrency();

  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  // Real usable height, measured on layout (Dimensions can be off on Android
  // devices with notches / gesture bars).
  const [storyH, setStoryH] = useState(SH);

  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const loadWrapped = async () => {
    setLoading(true);
    setError(false);
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) throw new Error("no user");
      setUser(stored);
      const res = await fetch(`${API_BASE}/get_wrapped.php?user_id=${stored.user_id}`);
      const json = await res.json();
      if (json.status !== "success") throw new Error(json.message);
      setData(json.wrapped);
    } catch (e) {
      console.log("WRAPPED ERROR:", e);
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWrapped();
  }, []);

  /* ---------- translation helpers ---------- */

  const monthName = (m) => (t("months.short").split(",")[(m || 1) - 1] || "").trim();
  const dayName = (d) => (t("days.long").split(",")[d || 0] || "").trim();
  const catName = (name) => {
    const key = `wrapped.cat.${name}`;
    const s = t(key);
    return s === key ? name : s;
  };
  const prettyDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${monthName(m)} ${y}`;
  };
  // Turn raw ledger descriptions into something friendly for the big screen.
  const prettyLabel = (label, category) => {
    let s = String(label || "").trim();
    if (/^Cashback Purchase - /i.test(s)) s = s.replace(/^Cashback Purchase - /i, "");
    if (/^Subscription - /i.test(s)) s = s.replace(/^Subscription - /i, "");
    const ticket = s.lastIndexOf(" (Ticket");
    if (ticket !== -1) s = s.slice(0, ticket);
    return s || catName(category);
  };

  const money = (n) => format(n || 0);
  const moneyFmt = (n) => format(n);
  const intFmt = (n) => String(Math.round(n));

  /* ---------- build the story from the data ---------- */

  const slides = useMemo(() => {
    if (!data) return [];
    const s = [];
    const totals = data.totals || {};

    s.push({ id: "intro", theme: THEMES.intro, render: () => (
      <>
        <Text style={ss.kicker}>{t("wrapped.introSub", { name: user?.name || "" })}</Text>
        <Text style={ss.bigTitle}>{t("wrapped.introTitle")}</Text>
        {!!data.member_since && (
          <Text style={ss.subLine}>{t("wrapped.memberSince", { date: prettyDate(data.member_since) })}</Text>
        )}
        {!!data.days_with_bank && (
          <View style={ss.pill}>
            <MaterialCommunityIcons name="calendar-heart" size={16} color="#fff" />
            <Text style={ss.pillText}> {t("wrapped.daysTogether", { days: data.days_with_bank })}</Text>
          </View>
        )}
      </>
    )});

    if (totals.received > 0) {
      s.push({ id: "received", theme: THEMES.received, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.receivedTitle")}</Text>
          <Text style={ss.subLine}>{t("wrapped.receivedSub")}</Text>
          <AnimatedNumber value={active ? totals.received : 0} format={moneyFmt} style={ss.bigStat} duration={1200} />
          <Text style={ss.subLine}>{t("wrapped.receivedCount", { count: totals.received_count })}</Text>
        </>
      )});
    }

    if (totals.sent > 0) {
      s.push({ id: "sent", theme: THEMES.sent, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.sentTitle")}</Text>
          <Text style={ss.subLine}>{t("wrapped.sentSub")}</Text>
          <AnimatedNumber value={active ? totals.sent : 0} format={moneyFmt} style={ss.bigStat} duration={1200} />
          <Text style={ss.subLine}>{t("wrapped.sentCount", { count: totals.sent_count })}</Text>
        </>
      )});
    }

    if (data.biggest_purchase) {
      const bp = data.biggest_purchase;
      s.push({ id: "biggest", theme: THEMES.biggest, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.biggestSub")}</Text>
          <Text style={ss.midTitle}>{t("wrapped.biggestTitle")}</Text>
          <AnimatedNumber value={active ? bp.amount : 0} format={moneyFmt} style={ss.bigStat} duration={1200} />
          <Text style={ss.highlight} numberOfLines={2}>{prettyLabel(bp.label, bp.category)}</Text>
          <Text style={ss.subLine}>{prettyDate(bp.date)}</Text>
        </>
      )});
    }

    if ((data.top_categories || []).length > 0) {
      const [top, ...rest] = data.top_categories;
      s.push({ id: "category", theme: THEMES.category, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.categoryTitle")}</Text>
          <Text style={ss.bigTitle}>{catName(top.name)}</Text>
          <AnimatedNumber value={active ? top.amount : 0} format={moneyFmt} style={ss.midStat} duration={1100} />
          <Text style={ss.subLine}>{t("wrapped.categoryShare", { pct: top.share_pct })}</Text>
          {rest.length > 0 && (
            <View style={ss.listBox}>
              <Text style={ss.listTitle}>{t("wrapped.categoryRunners")}</Text>
              {rest.slice(0, 3).map((c, i) => (
                <View key={c.name} style={ss.listRow}>
                  <Text style={ss.listRank}>{i + 2}</Text>
                  <Text style={ss.listName} numberOfLines={1}>{catName(c.name)}</Text>
                  <Text style={ss.listValue}>{money(c.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )});
    }

    if (data.best_friend) {
      const bf = data.best_friend;
      s.push({ id: "friend", theme: THEMES.friend, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.friendTitle")}</Text>
          <Text style={ss.subLine}>{t("wrapped.friendSub")}</Text>
          <Text style={ss.bigTitle}>{bf.name}</Text>
          <AnimatedNumber value={active ? bf.amount : 0} format={moneyFmt} style={ss.midStat} duration={1100} />
          <Text style={ss.subLine}>{t("wrapped.friendCount", { count: bf.count })}</Text>
        </>
      )});
    }

    const tr = data.transfers || {};
    if ((tr.sent_count || 0) + (tr.received_count || 0) > 0) {
      s.push({ id: "transfers", theme: THEMES.transfers, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.transfersTitle")}</Text>
          <View style={ss.twinRow}>
            <View style={ss.twinCol}>
              <MaterialCommunityIcons name="arrow-up-circle-outline" size={26} color="#fff" />
              <AnimatedNumber value={active ? tr.sent_count : 0} format={intFmt} style={ss.twinStat} duration={900} />
              <Text style={ss.twinLabel}>{t("wrapped.transfersSent")}</Text>
              <Text style={ss.twinMoney}>{money(tr.sent_amount)}</Text>
            </View>
            <View style={ss.twinDivider} />
            <View style={ss.twinCol}>
              <MaterialCommunityIcons name="arrow-down-circle-outline" size={26} color="#fff" />
              <AnimatedNumber value={active ? tr.received_count : 0} format={intFmt} style={ss.twinStat} duration={900} />
              <Text style={ss.twinLabel}>{t("wrapped.transfersReceived")}</Text>
              <Text style={ss.twinMoney}>{money(tr.received_amount)}</Text>
            </View>
          </View>
          <Text style={ss.subLine}>{t("wrapped.transfersSub")}</Text>
        </>
      )});
    }

    const cb = data.cashback || {};
    const rw = data.rewards || {};
    if ((cb.total_earned || 0) > 0 || (rw.earned_total || 0) > 0) {
      s.push({ id: "cashback", theme: THEMES.cashback, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.cashbackTitle")}</Text>
          <AnimatedNumber value={active ? cb.total_earned : 0} format={moneyFmt} style={ss.bigStat} duration={1200} />
          <Text style={ss.subLine}>{t("wrapped.cashbackEarned")}</Text>
          {(rw.earned_total || 0) > 0 && (
            <View style={ss.pill}>
              <MaterialCommunityIcons name="star-circle-outline" size={16} color="#fff" />
              <Text style={ss.pillText}> {t("wrapped.pointsEarned", { points: rw.earned_total })}</Text>
            </View>
          )}
        </>
      )});
    }

    const sv = data.savings || {};
    if ((sv.total || 0) > 0 || (sv.completed_goals || 0) > 0) {
      s.push({ id: "savings", theme: THEMES.savings, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.savingsTitle")}</Text>
          <Text style={ss.subLine}>{t("wrapped.savingsSub")}</Text>
          <AnimatedNumber value={active ? sv.total : 0} format={moneyFmt} style={ss.bigStat} duration={1200} />
          {(sv.completed_goals || 0) > 0 && (
            <View style={ss.pill}>
              <MaterialCommunityIcons name="flag-checkered" size={16} color="#fff" />
              <Text style={ss.pillText}> {t("wrapped.goalsDone", { count: sv.completed_goals })}</Text>
            </View>
          )}
        </>
      )});
    }

    const sub = data.subscriptions || {};
    if ((sub.count || 0) > 0) {
      s.push({ id: "subs", theme: THEMES.subs, render: (active) => (
        <>
          <Text style={ss.kicker}>{t("wrapped.subsTitle")}</Text>
          <Text style={ss.subLine}>{t("wrapped.subsCount", { count: sub.count })}</Text>
          <AnimatedNumber value={active ? sub.monthly_cost : 0} format={moneyFmt} style={ss.bigStat} duration={1100} />
          <Text style={ss.subLine}>{t("wrapped.subsMonthly")}</Text>
          {!!sub.top_name && (
            <View style={ss.pill}>
              <MaterialCommunityIcons name="crown-outline" size={16} color="#fff" />
              <Text style={ss.pillText}> {t("wrapped.subsTop", { name: sub.top_name })}</Text>
            </View>
          )}
        </>
      )});
    }

    const trend = data.monthly_trend || [];
    const trendMax = Math.max(...trend.map((m) => m.expenses), 0);
    if (trendMax > 0) {
      s.push({ id: "trend", theme: THEMES.trend, render: () => (
        <>
          <Text style={ss.kicker}>{t("wrapped.trendTitle")}</Text>
          <Text style={ss.subLine}>{t("wrapped.trendSub")}</Text>
          <View style={ss.chartRow}>
            {trend.map((m, i) => {
              const hPct = m.expenses / trendMax;
              const isTop = m.expenses === trendMax;
              return (
                <View key={i} style={ss.chartCol}>
                  <Text style={ss.chartValue} numberOfLines={1}>
                    {m.expenses > 0 ? money(m.expenses) : ""}
                  </Text>
                  <View style={ss.chartBarTrack}>
                    <View
                      style={[
                        ss.chartBar,
                        {
                          height: `${Math.max(4, Math.round(hPct * 100))}%`,
                          backgroundColor: isTop ? "#FFD200" : "rgba(255,255,255,0.85)",
                        },
                      ]}
                    />
                  </View>
                  <Text style={ss.chartLabel}>{monthName(m.month)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )});
    }

    if (data.most_active_month || data.busiest_weekday || data.highest_balance) {
      const am = data.most_active_month;
      const bw = data.busiest_weekday;
      const hb = data.highest_balance;
      s.push({ id: "records", theme: THEMES.records, render: () => (
        <>
          <Text style={ss.kicker}>{t("wrapped.recordsTitle")}</Text>
          <View style={ss.listBox}>
            {am && (
              <View style={ss.recordRow}>
                <MaterialCommunityIcons name="calendar-star" size={24} color="#fff" />
                <View style={ss.recordTextWrap}>
                  <Text style={ss.recordLabel}>{t("wrapped.recordMonth")}</Text>
                  <Text style={ss.recordValue}>
                    {t("wrapped.recordMonthValue", {
                      month: monthName(am.month), year: am.year, count: am.tx_count,
                    })}
                  </Text>
                </View>
              </View>
            )}
            {bw && (
              <View style={ss.recordRow}>
                <MaterialCommunityIcons name="calendar-today" size={24} color="#fff" />
                <View style={ss.recordTextWrap}>
                  <Text style={ss.recordLabel}>{t("wrapped.recordDay")}</Text>
                  <Text style={ss.recordValue}>{dayName(bw.day)}</Text>
                </View>
              </View>
            )}
            {hb && (
              <View style={ss.recordRow}>
                <MaterialCommunityIcons name="chart-line" size={24} color="#fff" />
                <View style={ss.recordTextWrap}>
                  <Text style={ss.recordLabel}>{t("wrapped.recordBalance")}</Text>
                  <Text style={ss.recordValue}>
                    {money(hb.amount)} · {monthName(hb.month)} {hb.year}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </>
      )});
    }

    const topCat = (data.top_categories || [])[0];
    s.push({ id: "finale", theme: THEMES.finale, render: () => (
      <>
        <Text style={ss.bigTitle}>{t("wrapped.finaleTitle")}</Text>
        <Text style={ss.subLine}>{t("wrapped.finaleSub")}</Text>
        <View style={ss.summaryBox}>
          <View style={ss.summaryRow}>
            <Text style={ss.summaryLabel}>{t("wrapped.statReceived")}</Text>
            <Text style={ss.summaryValue}>{money(totals.received)}</Text>
          </View>
          <View style={ss.summaryRow}>
            <Text style={ss.summaryLabel}>{t("wrapped.statSpent")}</Text>
            <Text style={ss.summaryValue}>{money(totals.sent)}</Text>
          </View>
          {!!topCat && (
            <View style={ss.summaryRow}>
              <Text style={ss.summaryLabel}>{t("wrapped.statTopCategory")}</Text>
              <Text style={ss.summaryValue}>{catName(topCat.name)}</Text>
            </View>
          )}
          <View style={ss.summaryRow}>
            <Text style={ss.summaryLabel}>{t("wrapped.statSaved")}</Text>
            <Text style={ss.summaryValue}>{money(sv.total)}</Text>
          </View>
          <View style={ss.summaryRow}>
            <Text style={ss.summaryLabel}>{t("wrapped.statCashback")}</Text>
            <Text style={ss.summaryValue}>{money(cb.total_earned)}</Text>
          </View>
          <View style={[ss.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={ss.summaryLabel}>{t("wrapped.statDays")}</Text>
            <Text style={ss.summaryValue}>{data.days_with_bank || "—"}</Text>
          </View>
        </View>
        <TouchableOpacity style={ss.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={ss.doneText}>{t("wrapped.done")}</Text>
        </TouchableOpacity>
      </>
    )});

    return s;
  }, [data, t, format, user]);

  /* ---------- story navigation ---------- */

  const goTo = (i) => {
    if (i < 0 || i >= slides.length) return;
    scrollRef.current?.scrollTo({ x: i * SW, animated: true });
    setPage(i);
  };

  const onTap = (e) => {
    const x = e.nativeEvent.locationX;
    if (x < SW * 0.3) goTo(page - 1);
    else goTo(page + 1);
  };

  /* ---------- loading / error ---------- */

  if (loading || error) {
    return (
      <View style={ss.loadingWrap}>
        <SlideBackground id="load" grad={THEMES.intro.grad} />
        <MaterialCommunityIcons name="star-four-points" size={54} color="#fff" />
        {loading ? (
          <>
            <Text style={ss.loadingText}>{t("wrapped.loading")}</Text>
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 18 }} />
          </>
        ) : (
          <>
            <Text style={ss.loadingText}>{t("wrapped.error")}</Text>
            <TouchableOpacity style={ss.doneBtn} onPress={loadWrapped}>
              <Text style={ss.doneText}>{t("wrapped.retry")}</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={ss.loadingClose} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={ss.container}
      onLayout={(e) => setStoryH(e.nativeEvent.layout.height)}
    >
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / SW))
        }
        scrollEventThrottle={16}
      >
        {slides.map((slide, i) => (
          <Pressable key={slide.id} onPress={onTap}>
            <StorySlide id={slide.id} theme={slide.theme} active={page === i} height={storyH}>
              {slide.render(page === i)}
            </StorySlide>
          </Pressable>
        ))}
      </Animated.ScrollView>

      {/* Progress segments + close, floating above the story */}
      <SafeAreaView edges={["top"]} style={ss.topOverlay} pointerEvents="box-none">
        <View style={ss.progressRow} pointerEvents="none">
          {slides.map((_, i) => (
            <View key={i} style={ss.progressTrack}>
              <Animated.View
                style={[
                  ss.progressFill,
                  {
                    width: scrollX.interpolate({
                      inputRange: [(i - 1) * SW, i * SW],
                      outputRange: ["0%", "100%"],
                      extrapolate: "clamp",
                    }),
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <TouchableOpacity style={ss.closeBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#191970" },

  slideContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
  },

  kicker: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  bigTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    marginVertical: 6,
  },
  midTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  bigStat: {
    color: "#FFFFFF",
    fontSize: 52,
    fontWeight: "900",
    textAlign: "center",
    marginVertical: 10,
  },
  midStat: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center",
    marginVertical: 8,
  },
  highlight: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  subLine: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 21,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    marginTop: 18,
  },
  pillText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  /* runner-up categories + records list */
  listBox: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 24,
  },
  listTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7 },
  listRank: { color: "rgba(255,255,255,0.7)", width: 22, fontSize: 15, fontWeight: "800" },
  listName: { color: "#FFFFFF", flex: 1, fontSize: 15, fontWeight: "600" },
  listValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  recordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  recordTextWrap: { marginLeft: 14, flex: 1 },
  recordLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  recordValue: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", marginTop: 2 },

  /* transfers twin columns */
  twinRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 10,
  },
  twinCol: { flex: 1, alignItems: "center" },
  twinDivider: { width: 1, height: 90, backgroundColor: "rgba(255,255,255,0.3)" },
  twinStat: { color: "#FFFFFF", fontSize: 40, fontWeight: "900", marginTop: 6 },
  twinLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  twinMoney: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginTop: 4 },

  /* monthly trend bar chart */
  chartRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  chartCol: { flex: 1, alignItems: "center" },
  chartValue: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "700", marginBottom: 5 },
  chartBarTrack: { height: 130, width: 18, justifyContent: "flex-end" },
  chartBar: { width: "100%", borderRadius: 9 },
  chartLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700", marginTop: 7 },

  /* finale */
  summaryBox: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginTop: 24,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  summaryLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600" },
  summaryValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  doneBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 44,
    paddingVertical: 15,
    borderRadius: 26,
    marginTop: 26,
  },
  doneText: { color: "#191970", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },

  /* header overlay */
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  progressRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  closeBtn: {
    alignSelf: "flex-end",
    marginTop: 14,
    marginRight: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* loading / error */
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
  },
  loadingClose: {
    position: "absolute",
    top: 54,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
});
