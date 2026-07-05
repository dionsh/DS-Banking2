import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { confirmOverBudget, partnerBudgetCategory } from "../utils/budgetGuard";

export default function PartnerCashback() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [partners, setPartners] = useState([]);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [purchases, setPurchases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUser(stored);

      // Main account balance (to know what the user can afford).
      try {
        const cardRes = await fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`);
        const cardData = await cardRes.json();
        if (cardData.status === "success") {
          setBalance(Number(cardData.card.balance) || 0);
        } else {
          setBalance(Number(stored.balance) || 0);
        }
      } catch {
        setBalance(Number(stored.balance) || 0);
      }

      // Partners + cashback wallet + purchase history.
      const res = await fetch(`${API_BASE}/get_partners.php?user_id=${stored.user_id}`);
      const data = await res.json();
      if (data.status === "success") {
        setPartners(data.partners || []);
        setCashbackBalance(Number(data.cashback_balance) || 0);
        setTotalEarned(Number(data.total_earned) || 0);
        setPurchases(data.purchases || []);
      }
    } catch (err) {
      console.log("Cashback load error:", err);
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

  const handleBuy = async (partner) => {
    const price = Number(partner.price);
    const cashback = (price * Number(partner.cashback_percent)) / 100;

    if (price > balance) {
      Alert.alert(t("topup.insufficient"), t("roundup.insufficientMsg"));
      return;
    }

    // Warn (but don't block) if this purchase would go over the monthly budget
    // for the partner's category (Food, Shopping, Electronics, …).
    const okBudget = await confirmOverBudget({
      userId: user.user_id,
      category: partnerBudgetCategory(partner.category),
      amount: price,
    });
    if (!okBudget) return;

    Alert.alert(
      partner.name,
      t("cb.buyConfirm", { price: price.toFixed(2), cashback: cashback.toFixed(2) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("cb.buy"),
          onPress: async () => {
            setBuyingId(partner.id);
            try {
              const res = await fetch(`${API_BASE}/buy_partner.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.user_id, partner_id: partner.id }),
              });
              const data = await res.json();
              if (data.status === "success") {
                setBalance(data.new_balance);
                setCashbackBalance(Number(data.cashback_balance) || 0);
                setTotalEarned(Number(data.total_earned) || 0);
                // keep AsyncStorage balance in sync for other screens
                const updatedUser = { ...user, balance: data.new_balance };
                await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
                setUser(updatedUser);
                Alert.alert(
                  t("cb.purchaseComplete"),
                  `${data.message}\n\n🎟️  Ticket ID: ${data.ticket_code}\nKeep this ID — it's your proof of purchase and appears in your transactions.`
                );
                load();
              } else {
                Alert.alert(t("common.error"), data.message || t("cb.couldNotBuy"));
              }
            } catch (err) {
              console.log("Buy error:", err);
              Alert.alert(t("common.error"), t("notif.couldNotReach"));
            }
            setBuyingId(null);
          },
        },
      ]
    );
  };

  const handleRedeem = () => {
    if (cashbackBalance <= 0) {
      Alert.alert(t("cb.noCashbackTitle"), t("cb.noCashbackMsg"));
      return;
    }
    Alert.alert(
      t("cb.redeemTitle"),
      t("cb.redeemConfirm", { amount: cashbackBalance.toFixed(2) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("rewards.redeem"),
          onPress: async () => {
            setRedeeming(true);
            try {
              const res = await fetch(`${API_BASE}/redeem_cashback.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.user_id, amount: cashbackBalance }),
              });
              const data = await res.json();
              if (data.status === "success") {
                setBalance(data.new_balance);
                setCashbackBalance(Number(data.cashback_balance) || 0);
                const updatedUser = { ...user, balance: data.new_balance };
                await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
                setUser(updatedUser);
                Alert.alert(t("rewards.redeemedTitle"), data.message);
                load();
              } else {
                Alert.alert(t("common.error"), data.message || t("rewards.couldNotRedeem"));
              }
            } catch (err) {
              console.log("Redeem cashback error:", err);
              Alert.alert(t("common.error"), t("notif.couldNotReach"));
            }
            setRedeeming(false);
          },
        },
      ]
    );
  };

  const renderPartner = (partner) => {
    const price = Number(partner.price);
    const pct = Number(partner.cashback_percent);
    const cashback = (price * pct) / 100;
    const effective = price - cashback;
    const brand = partner.brand_color || colors.primary;
    const isBuying = buyingId === partner.id;

    return (
      <View key={partner.id} style={styles.offerCard}>
        {/* Brand hero / logo */}
        <View style={[styles.hero, { backgroundColor: brand }]}>
          {partner.image_url ? (
            <Image source={{ uri: partner.image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name={partner.icon || "storefront"} size={46} color="#fff" />
            </View>
          )}

          <View style={styles.cashbackBadge}>
            <Text style={[styles.cashbackBadgeText, { color: brand }]}>{t("cb.percentBack", { pct })}</Text>
          </View>

          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{partner.category}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.offerBody}>
          <Text style={styles.offerName}>{partner.name}</Text>
          <Text style={styles.offerDesc} numberOfLines={2}>
            {partner.description}
          </Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>{t("cb.price")}</Text>
              <Text style={styles.priceValue}>{price.toFixed(2)} EUR</Text>
            </View>
            <View style={styles.cashbackPill}>
              <MaterialCommunityIcons name="cash-refund" size={16} color={colors.success} />
              <Text style={styles.cashbackPillText}>{t("cb.youGet", { amount: cashback.toFixed(2) })}</Text>
            </View>
          </View>

          <Text style={styles.effectiveText}>
            {t("cb.effective", { amount: effective.toFixed(2) })}
          </Text>

          <TouchableOpacity
            style={[styles.buyBtn, { backgroundColor: brand }, isBuying && { opacity: 0.7 }]}
            onPress={() => handleBuy(partner)}
            disabled={isBuying}
          >
            {isBuying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buyBtnText}>{t("cb.buyEarn")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("menu.cashback")}</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Cashback wallet */}
          <View style={styles.walletCard}>
            <View style={styles.walletTop}>
              <MaterialCommunityIcons name="wallet-giftcard" size={30} color="#fff" />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.walletLabel}>{t("cb.wallet")}</Text>
                <Text style={styles.walletValue}>{cashbackBalance.toFixed(2)} EUR</Text>
              </View>
            </View>

            <View style={styles.walletStatsRow}>
              <Text style={styles.walletStat}>{t("cb.totalEarned", { amount: totalEarned.toFixed(2) })}</Text>
              <Text style={styles.walletStat}>{t("cb.balanceStat", { amount: Number(balance).toFixed(2) })}</Text>
            </View>

            <TouchableOpacity
              style={[styles.redeemBtn, (redeeming || cashbackBalance <= 0) && { opacity: 0.6 }]}
              onPress={handleRedeem}
              disabled={redeeming || cashbackBalance <= 0}
            >
              {redeeming ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.redeemBtnText}>
                  {cashbackBalance > 0 ? t("rewards.redeemToBalance") : t("cb.noCashbackYet")}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{t("cb.partnerOffers")}</Text>
          {partners.map(renderPartner)}

          {/* Purchase history */}
          <Text style={styles.sectionTitle}>{t("cb.purchaseHistory")}</Text>
          {purchases.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="receipt" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {t("cb.empty")}
              </Text>
            </View>
          ) : (
            <View style={styles.historyCard}>
              {purchases.map((p, i) => (
                <View
                  key={p.id}
                  style={[styles.historyRow, i < purchases.length - 1 && styles.historyDivider]}
                >
                  <View style={styles.historyIcon}>
                    <MaterialCommunityIcons name="storefront-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName}>{p.partner_name}</Text>
                    <Text style={styles.historySub}>
                      {Number(p.price).toFixed(2)} EUR ·{" "}
                      {new Date(p.created_at).toLocaleDateString("de-DE")}
                    </Text>
                    {p.ticket_code ? (
                      <View style={styles.ticketPill}>
                        <MaterialCommunityIcons
                          name="ticket-confirmation-outline"
                          size={13}
                          color={colors.accent}
                        />
                        <Text style={styles.ticketText}>{p.ticket_code}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.historyCashback}>+{Number(p.cashback_amount).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
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

    walletCard: {
      backgroundColor: c.primary,
      borderRadius: 20,
      margin: 20,
      padding: 22,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    walletTop: { flexDirection: "row", alignItems: "center" },
    walletLabel: { color: "#C9CEE8", fontSize: 12, letterSpacing: 1 },
    walletValue: { color: "#fff", fontSize: 30, fontWeight: "bold", marginTop: 2 },
    walletStatsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 14,
      flexWrap: "wrap",
    },
    walletStat: { color: "#C9CEE8", fontSize: 12.5 },
    redeemBtn: {
      backgroundColor: "#fff",
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 18,
    },
    redeemBtnText: { color: c.primary, fontWeight: "700", fontSize: 15 },

    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      marginHorizontal: 20,
      marginTop: 6,
      marginBottom: 12,
    },

    offerCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      marginHorizontal: 20,
      marginBottom: 16,
      overflow: "hidden",
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    hero: {
      height: 120,
      justifyContent: "center",
      alignItems: "center",
    },
    heroImage: { width: "100%", height: "100%", position: "absolute" },
    heroIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(255,255,255,0.18)",
      justifyContent: "center",
      alignItems: "center",
    },
    cashbackBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      backgroundColor: "#fff",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    cashbackBadgeText: { fontWeight: "800", fontSize: 13 },
    categoryChip: {
      position: "absolute",
      bottom: 12,
      left: 12,
      backgroundColor: "rgba(0,0,0,0.28)",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    categoryChipText: { color: "#fff", fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },

    offerBody: { padding: 18 },
    offerName: { fontSize: 18, fontWeight: "700", color: c.text },
    offerDesc: { fontSize: 13, color: c.textSecondary, marginTop: 5, lineHeight: 18 },

    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
    },
    priceLabel: { fontSize: 11, color: c.textMuted, letterSpacing: 1 },
    priceValue: { fontSize: 20, fontWeight: "bold", color: c.text, marginTop: 2 },
    cashbackPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    cashbackPillText: { color: c.success, fontWeight: "700", fontSize: 13 },

    effectiveText: { fontSize: 12, color: c.textMuted, marginTop: 10 },

    buyBtn: {
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 16,
    },
    buyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    historyCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      marginHorizontal: 20,
      paddingHorizontal: 18,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
    historyDivider: { borderBottomWidth: 1, borderBottomColor: c.divider },
    historyIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    historyName: { fontSize: 15, fontWeight: "600", color: c.text },
    historySub: { fontSize: 12, color: c.textMuted, marginTop: 3 },
    ticketPill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 5,
      marginTop: 6,
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    ticketText: { fontSize: 11.5, fontWeight: "700", color: c.accent, letterSpacing: 0.5 },
    historyCashback: { fontSize: 15, fontWeight: "bold", color: c.success, marginLeft: 8 },

    empty: { alignItems: "center", marginTop: 10, marginHorizontal: 40 },
    emptyText: { color: c.textMuted, textAlign: "center", marginTop: 12, lineHeight: 20 },
  });
