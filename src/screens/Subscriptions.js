// Subscriptions — a modern subscription manager plus a Gift Cards shop.
//
// Two tabs (animated segmented control):
//   Subscriptions — lists available plans (Netflix, Spotify, ...), their
//     monthly price and status, and lets the user subscribe / cancel.
//     Subscribing charges the first month from the balance; cancelling
//     refunds it (both appear in Transactions).
//   Gift Cards — buy Netflix / PlayStation / Steam / ... gift cards at fixed
//     values. Buying deducts the price from the balance, generates a
//     realistic-looking code (server-side) and saves it to a purchase
//     history so codes can be copied again later.
//
// All prices are stored in EUR and displayed in the user's chosen currency.

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useCurrency } from "../currency/CurrencyContext";
import { confirmOverBudget } from "../utils/budgetGuard";
import { formatDate, nowStamp } from "../utils/datetime";
import {
  MotionView,
  PressableScale,
  SkeletonBlock,
  TiltCard,
  FlipCard,
  FloatingView,
  SPRING_SOFT,
} from "../components/motion";

export default function Subscriptions() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userId, setUserId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  // ----- gift cards state -----
  const [brands, setBrands] = useState([]);
  const [denominations, setDenominations] = useState([10, 20, 50, 100]);
  const [purchases, setPurchases] = useState([]);
  const [buyBrand, setBuyBrand] = useState(null); // brand being bought (modal open)
  const [buyAmount, setBuyAmount] = useState(null); // chosen EUR face value
  const [buying, setBuying] = useState(false);
  const [boughtCard, setBoughtCard] = useState(null); // {brand_name, amount, code, color, icon}
  const [revealed, setRevealed] = useState(false); // flip state of the bought card
  const [copiedId, setCopiedId] = useState(null); // history row copy feedback
  const [copiedReveal, setCopiedReveal] = useState(false);

  // ----- tabs -----
  const [tab, setTab] = useState("subs"); // 'subs' | 'gift'
  const [segWidth, setSegWidth] = useState(0);
  const tabAnim = useSharedValue(0);
  const switchTab = (next) => {
    setTab(next);
    tabAnim.value = withSpring(next === "gift" ? 1 : 0, SPRING_SOFT);
  };
  const indicatorStyle = useAnimatedStyle(
    () => ({ transform: [{ translateX: tabAnim.value * segWidth }] }),
    [segWidth]
  );

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUserId(stored.user_id);

      const [subsRes, cardRes, giftRes] = await Promise.all([
        fetch(`${API_BASE}/get_subscriptions.php?user_id=${stored.user_id}`),
        fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`),
        fetch(`${API_BASE}/get_gift_cards.php?user_id=${stored.user_id}`),
      ]);

      const data = await subsRes.json();
      if (data.status === "success") {
        setPlans(data.plans || []);
      }

      const card = await cardRes.json();
      if (card.status === "success") {
        setBalance(Number(card.card.balance) || 0);
      } else {
        setBalance(Number(stored.balance) || 0);
      }

      const gift = await giftRes.json();
      if (gift.status === "success") {
        setBrands(gift.brands || []);
        if (Array.isArray(gift.denominations) && gift.denominations.length) {
          setDenominations(gift.denominations.map(Number));
        }
        setPurchases(gift.purchases || []);
      }
    } catch (err) {
      console.log("Subscriptions load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Keep the balance in sync for other screens after a charge/refund.
  const syncBalance = async (newBalance) => {
    setBalance(newBalance);
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (stored) {
        await AsyncStorage.setItem("user", JSON.stringify({ ...stored, balance: newBalance }));
      }
    } catch (e) {
      // ignore
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

  // ---------------------------------------------------------------------------
  // Subscriptions tab actions
  // ---------------------------------------------------------------------------

  const runToggle = async (plan) => {
    // Subscribing charges the first month now, so warn (but don't block) if it
    // would go over the monthly "Bills & Subscriptions" budget. Cancelling
    // refunds money, so it never needs a check.
    if (!plan.active) {
      const okBudget = await confirmOverBudget({
        userId,
        category: "Subscriptions",
        amount: Number(plan.price),
      });
      if (!okBudget) return;
    }

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
        if (data.new_balance != null) {
          syncBalance(Number(data.new_balance));
        }
      } else {
        Alert.alert("Couldn't complete", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Please try again.");
    }
    setBusyKey(null);
  };

  const toggle = (plan) => {
    const price = format(plan.price);
    if (plan.active) {
      Alert.alert(
        "Cancel subscription",
        `Cancel ${plan.name}? ${price} will be refunded to your balance.`,
        [
          { text: "Keep", style: "cancel" },
          { text: "Cancel & refund", onPress: () => runToggle(plan) },
        ]
      );
    } else {
      if (Number(balance) < Number(plan.price)) {
        Alert.alert("Insufficient balance", `You need ${price} to subscribe to ${plan.name}.`);
        return;
      }
      Alert.alert(
        "Subscribe",
        `Subscribe to ${plan.name} for ${price}/month? ${price} will be charged from your balance now.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Subscribe", onPress: () => runToggle(plan) },
        ]
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Gift cards tab actions
  // ---------------------------------------------------------------------------

  const openBuy = (brand) => {
    setBuyBrand(brand);
    setBuyAmount(null);
    setBoughtCard(null);
    setRevealed(false);
    setCopiedReveal(false);
  };

  const closeBuy = () => {
    if (buying) return;
    setBuyBrand(null);
    setBoughtCard(null);
    setRevealed(false);
  };

  const runBuy = async (brand, amount) => {
    // A gift card is a purchase — same "Shopping" budget pre-check as the
    // other spending screens (warns, never blocks).
    const okBudget = await confirmOverBudget({ userId, category: "Shopping", amount });
    if (!okBudget) return;

    setBuying(true);
    try {
      const res = await fetch(`${API_BASE}/buy_gift_card.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, brand_key: brand.key, amount }),
      });
      const data = await res.json();
      if (data.status === "success") {
        syncBalance(Number(data.new_balance));
        setPurchases((prev) => [
          {
            id: data.purchase_id,
            brand_key: data.brand_key,
            brand_name: data.brand_name,
            amount: data.amount,
            code: data.code,
            created_at: nowStamp(),
          },
          ...prev,
        ]);
        setBoughtCard({
          brand_name: data.brand_name,
          amount: Number(data.amount),
          code: data.code,
          color: brand.color,
          icon: brand.icon,
        });
        // Give the success card a beat to mount, then flip to the code.
        setTimeout(() => setRevealed(true), 700);
      } else {
        Alert.alert("Couldn't complete", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Please try again.");
    }
    setBuying(false);
  };

  const confirmBuy = () => {
    if (!buyBrand || !buyAmount) return;
    if (Number(balance) < buyAmount) {
      Alert.alert(
        "Insufficient balance",
        `You need ${format(buyAmount)} to buy this gift card.`
      );
      return;
    }
    Alert.alert(
      "Buy gift card",
      `Buy a ${buyBrand.name} gift card worth ${format(buyAmount)}? The amount will be charged from your balance.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Buy", onPress: () => runBuy(buyBrand, buyAmount) },
      ]
    );
  };

  const copyCode = async (code, id) => {
    try {
      await Clipboard.setStringAsync(String(code));
    } catch (e) {
      return;
    }
    if (id === "reveal") {
      setCopiedReveal(true);
      setTimeout(() => setCopiedReveal(false), 1800);
    } else {
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    }
  };

  const brandByKey = (key) => brands.find((b) => b.key === key);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const Header = (
    <View style={styles.header}>
      <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => navigation.openDrawer()}>
        <MaterialCommunityIcons name="menu" size={28} color="#fff" />
      </PressableScale>
      <Text style={styles.headerTitle}>Subscriptions</Text>
      <View style={{ width: 28 }} />
    </View>
  );

  if (loading) {
    // Skeleton mirrors the real layout so content appears in place.
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {Header}
        <View style={{ padding: 20 }}>
          <SkeletonBlock height={92} radius={20} />
          <SkeletonBlock width={190} height={12} radius={6} style={{ marginTop: 16 }} />
          <SkeletonBlock height={44} radius={22} style={{ marginTop: 16 }} />
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} height={128} radius={18} style={{ marginTop: 14 }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {Header}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Summary */}
        <MotionView from="down" delay={0}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{format(monthlyTotal)}</Text>
              <Text style={styles.summaryLabel}>Per month</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{purchases.length}</Text>
              <Text style={styles.summaryLabel}>Gift cards</Text>
            </View>
          </View>

          <Text style={styles.availLine}>Available balance: {format(balance)}</Text>
        </MotionView>

        {/* Segmented tabs */}
        <MotionView from="down" delay={80}>
          <View
            style={styles.segmentWrap}
            onLayout={(e) => setSegWidth((e.nativeEvent.layout.width - 8) / 2)}
          >
            {segWidth > 0 && (
              <Animated.View style={[styles.segmentIndicator, { width: segWidth }, indicatorStyle]} />
            )}
            <Pressable style={styles.segmentBtn} onPress={() => switchTab("subs")}>
              <Text style={[styles.segmentText, tab === "subs" && styles.segmentTextActive]}>
                Subscriptions
              </Text>
            </Pressable>
            <Pressable style={styles.segmentBtn} onPress={() => switchTab("gift")}>
              <Text style={[styles.segmentText, tab === "gift" && styles.segmentTextActive]}>
                Gift Cards
              </Text>
            </Pressable>
          </View>
        </MotionView>

        {tab === "subs" ? (
          <>
            <Text style={styles.sectionTitle}>Manage subscriptions</Text>

            {plans.map((plan, idx) => {
              const busy = busyKey === plan.plan_key;
              return (
                <MotionView key={plan.plan_key} from="down" delay={Math.min(idx * 45, 360)}>
                  <View style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={[styles.iconCircle, { backgroundColor: plan.color }]}>
                        <MaterialCommunityIcons name={plan.icon} size={24} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planPrice}>{format(plan.price)} / month</Text>
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

                    <PressableScale
                      style={[styles.actionBtn, plan.active ? styles.cancelBtn : styles.subscribeBtn]}
                      scaleTo={0.96}
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
                    </PressableScale>
                  </View>
                </MotionView>
              );
            })}

            <Text style={styles.footNote}>
              Subscribing charges the monthly price from your balance now; cancelling refunds it.
              Each change also appears in your Transactions.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Buy a gift card</Text>

            <View style={styles.giftGrid}>
              {brands.map((b, idx) => (
                <MotionView
                  key={b.key}
                  from="down"
                  delay={Math.min(idx * 40, 320)}
                  style={styles.giftTileWrap}
                >
                  <TiltCard style={styles.giftTile} maxTilt={8} onPress={() => openBuy(b)}>
                    <View style={[styles.giftIconCircle, { backgroundColor: b.color }]}>
                      <MaterialCommunityIcons name={b.icon} size={26} color="#fff" />
                    </View>
                    <Text style={styles.giftTileName} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.giftTileFrom}>from {format(denominations[0])}</Text>
                  </TiltCard>
                </MotionView>
              ))}
            </View>

            {purchases.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Your gift cards</Text>
                {purchases.map((p) => {
                  const brand = brandByKey(p.brand_key);
                  const copied = copiedId === p.id;
                  return (
                    <PressableScale
                      key={p.id}
                      style={styles.historyRow}
                      scaleTo={0.98}
                      onPress={() => copyCode(p.code, p.id)}
                    >
                      <View
                        style={[
                          styles.historyIcon,
                          { backgroundColor: brand ? brand.color : colors.primary },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={brand ? brand.icon : "wallet-giftcard"}
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyName}>
                          {p.brand_name} · {format(p.amount)}
                        </Text>
                        <Text style={styles.historyCode}>{p.code}</Text>
                        <Text style={styles.historyDate}>
                          {formatDate(p.created_at)}
                        </Text>
                      </View>
                      <View style={styles.copyHint}>
                        <MaterialCommunityIcons
                          name={copied ? "check-circle" : "content-copy"}
                          size={18}
                          color={copied ? colors.success : colors.accent}
                        />
                        <Text
                          style={[styles.copyHintText, copied && { color: colors.success }]}
                        >
                          {copied ? "Copied" : "Copy"}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </>
            )}

            <Text style={styles.footNote}>
              Gift card codes are generated instantly and saved here so you can copy them again
              any time. The purchase appears in your Transactions.
            </Text>
          </>
        )}
      </ScrollView>

      {/* --------------- gift card purchase modal --------------- */}
      <Modal visible={!!buyBrand} transparent animationType="fade" onRequestClose={closeBuy}>
        <View style={styles.modalBackdrop}>
          {buyBrand && !boughtCard && (
            <MotionView from="zoom" spring style={styles.modalCard}>
              <FloatingView distance={4}>
                <View style={[styles.modalHero, { backgroundColor: buyBrand.color }]}>
                  <MaterialCommunityIcons name={buyBrand.icon} size={38} color="#fff" />
                </View>
              </FloatingView>
              <Text style={styles.modalTitle}>{buyBrand.name} Gift Card</Text>
              <Text style={styles.modalSub}>Choose a value</Text>

              <View style={styles.denomRow}>
                {denominations.map((d) => {
                  const selected = buyAmount === d;
                  const affordable = Number(balance) >= d;
                  return (
                    <PressableScale
                      key={d}
                      style={[
                        styles.denomPill,
                        selected && { borderColor: buyBrand.color, backgroundColor: colors.card },
                        !affordable && { opacity: 0.4 },
                      ]}
                      scaleTo={0.92}
                      onPress={() => setBuyAmount(d)}
                    >
                      <Text
                        style={[
                          styles.denomText,
                          selected && { color: colors.text, fontWeight: "800" },
                        ]}
                      >
                        {format(d)}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              <Text style={styles.modalBalance}>Available balance: {format(balance)}</Text>

              <PressableScale
                style={[
                  styles.buyBtn,
                  { backgroundColor: buyBrand.color },
                  (!buyAmount || buying) && { opacity: 0.55 },
                ]}
                scaleTo={0.95}
                onPress={confirmBuy}
                disabled={!buyAmount || buying}
              >
                {buying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="wallet-giftcard" size={20} color="#fff" />
                    <Text style={styles.buyBtnText}>
                      {"  "}Buy{buyAmount ? ` for ${format(buyAmount)}` : " Gift Card"}
                    </Text>
                  </>
                )}
              </PressableScale>

              <PressableScale style={styles.closeBtn} scaleTo={0.94} onPress={closeBuy}>
                <Text style={styles.closeBtnText}>Not now</Text>
              </PressableScale>
            </MotionView>
          )}

          {buyBrand && boughtCard && (
            <MotionView from="zoom" spring style={styles.modalCard}>
              <Text style={styles.modalTitle}>Gift card purchased! 🎉</Text>
              <Text style={styles.modalSub}>
                {revealed ? "Here is your code — tap the card to flip it." : "Revealing your code..."}
              </Text>

              <Pressable onPress={() => setRevealed((r) => !r)} style={{ alignSelf: "stretch" }}>
                <FlipCard
                  flipped={revealed}
                  style={styles.flipWrap}
                  front={
                    <View style={[styles.giftFace, { backgroundColor: boughtCard.color }]}>
                      <View style={styles.giftFaceCircleA} />
                      <View style={styles.giftFaceCircleB} />
                      <Text style={styles.giftFaceBrand}>DS Banking · Gift Card</Text>
                      <MaterialCommunityIcons name={boughtCard.icon} size={52} color="#fff" />
                      <View style={styles.giftFaceBottom}>
                        <Text style={styles.giftFaceName}>{boughtCard.brand_name}</Text>
                        <Text style={styles.giftFaceAmount}>{format(boughtCard.amount)}</Text>
                      </View>
                    </View>
                  }
                  back={
                    <View style={[styles.giftFace, styles.giftFaceBack]}>
                      <Text style={styles.codeLabel}>GIFT CARD CODE</Text>
                      <Text style={styles.codeText}>{boughtCard.code}</Text>
                      <PressableScale
                        style={[styles.copyBtn, copiedReveal && { backgroundColor: colors.success }]}
                        scaleTo={0.93}
                        onPress={() => copyCode(boughtCard.code, "reveal")}
                      >
                        <MaterialCommunityIcons
                          name={copiedReveal ? "check-bold" : "content-copy"}
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.copyBtnText}>
                          {"  "}
                          {copiedReveal ? "Copied!" : "Copy code"}
                        </Text>
                      </PressableScale>
                    </View>
                  }
                />
              </Pressable>

              <Text style={styles.modalBalance}>
                New balance: {format(balance)} · saved to "Your gift cards"
              </Text>

              <PressableScale
                style={[styles.buyBtn, { backgroundColor: colors.primary }]}
                scaleTo={0.95}
                onPress={closeBuy}
              >
                <Text style={styles.buyBtnText}>Done</Text>
              </PressableScale>
            </MotionView>
          )}
        </View>
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
    summaryValue: { fontSize: 20, fontWeight: "bold", color: c.accent },
    summaryLabel: { fontSize: 11, color: c.textMuted, letterSpacing: 1, marginTop: 4 },
    summaryDivider: { width: 1, height: 44, backgroundColor: c.divider },

    availLine: {
      fontSize: 12,
      color: c.textMuted,
      marginHorizontal: 20,
      marginTop: 10,
    },

    segmentWrap: {
      flexDirection: "row",
      backgroundColor: c.surfaceAlt,
      borderRadius: 22,
      marginHorizontal: 20,
      marginTop: 16,
      padding: 4,
    },
    segmentIndicator: {
      position: "absolute",
      top: 4,
      left: 4,
      bottom: 4,
      borderRadius: 18,
      backgroundColor: c.primary,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentText: { fontSize: 13.5, fontWeight: "700", color: c.textSecondary },
    segmentTextActive: { color: "#fff" },

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

    // ----- gift cards -----
    giftGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginTop: 8,
    },
    giftTileWrap: { width: "48%" },
    giftTile: {
      backgroundColor: c.card,
      borderRadius: 18,
      paddingVertical: 18,
      paddingHorizontal: 12,
      alignItems: "center",
      marginTop: 12,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    giftIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    giftTileName: { fontSize: 14, fontWeight: "700", color: c.text },
    giftTileFrom: { fontSize: 11.5, color: c.textMuted, marginTop: 3 },

    historyRow: {
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
    historyIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    historyName: { fontSize: 14, fontWeight: "700", color: c.text },
    historyCode: {
      fontSize: 13,
      color: c.accent,
      fontWeight: "700",
      letterSpacing: 1,
      marginTop: 3,
    },
    historyDate: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    copyHint: { alignItems: "center", marginLeft: 10 },
    copyHintText: { fontSize: 10, fontWeight: "700", color: c.accent, marginTop: 3 },

    footNote: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      marginHorizontal: 30,
      marginTop: 22,
      lineHeight: 18,
    },

    // ----- purchase modal -----
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 26,
    },
    modalCard: {
      width: "100%",
      backgroundColor: c.card,
      borderRadius: 24,
      paddingVertical: 26,
      paddingHorizontal: 22,
      alignItems: "center",
      elevation: 10,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    modalHero: {
      width: 74,
      height: 74,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
      elevation: 6,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    modalTitle: { fontSize: 19, fontWeight: "800", color: c.text, marginTop: 10 },
    modalSub: { fontSize: 13, color: c.textSecondary, marginTop: 4, marginBottom: 14 },

    denomRow: {
      flexDirection: "row",
      alignSelf: "stretch",
      justifyContent: "space-between",
    },
    denomPill: {
      flex: 1,
      marginHorizontal: 3,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderWidth: 2,
      borderColor: "transparent",
    },
    denomText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },

    modalBalance: { fontSize: 12, color: c.textMuted, marginTop: 14 },

    buyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "stretch",
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 12,
    },
    buyBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
    closeBtn: { paddingVertical: 12, marginTop: 2 },
    closeBtnText: { color: c.textSecondary, fontSize: 14, fontWeight: "600" },

    // ----- flip reveal -----
    flipWrap: { alignSelf: "stretch", marginTop: 6 },
    giftFace: {
      height: 190,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      paddingHorizontal: 18,
    },
    giftFaceBack: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    giftFaceCircleA: {
      position: "absolute",
      top: -34,
      right: -22,
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    giftFaceCircleB: {
      position: "absolute",
      bottom: -46,
      left: -30,
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: "rgba(255,255,255,0.10)",
    },
    giftFaceBrand: {
      position: "absolute",
      top: 14,
      left: 16,
      color: "rgba(255,255,255,0.85)",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
    },
    giftFaceBottom: {
      position: "absolute",
      bottom: 14,
      left: 16,
      right: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    giftFaceName: { color: "#fff", fontSize: 15, fontWeight: "800" },
    giftFaceAmount: { color: "#fff", fontSize: 20, fontWeight: "900" },
    codeLabel: { fontSize: 11, letterSpacing: 2, color: c.textMuted, fontWeight: "700" },
    codeText: {
      fontSize: 19,
      fontWeight: "900",
      letterSpacing: 1.5,
      color: c.text,
      marginTop: 10,
      textAlign: "center",
    },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 18,
      marginTop: 16,
    },
    copyBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  });
