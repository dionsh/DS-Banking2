// "Personalize Card" — browse, buy and preview card designs.
//
// The design catalog and all the artwork (hand-drawn scenes, gradients, image
// cards) live in ../components/cardDesigns so this gallery and the Card screen
// render the exact same visuals. Buying a paid design charges the balance
// (buy_card_design.php); the purchased/primary design is then shown on the real
// card in Card.js. DS Classic is free and is the standard card.

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useCurrency } from "../currency/CurrencyContext";
import { SuccessOverlay } from "../components/motion";
import { confirmOverBudget } from "../utils/budgetGuard";
import {
  DESIGNS,
  CardArtwork,
  priceLabel,
  priceEur,
  CARD_W,
  CARD_H,
  V_CARD_W,
  V_CARD_H,
} from "../components/cardDesigns";

function DesignPreview({ design, selected, onPress, owned }) {
  const { format } = useCurrency();
  const vertical = design.orientation === "v";
  const w = vertical ? V_CARD_W : CARD_W;
  const h = vertical ? V_CARD_H : CARD_H;
  const fg = design.fg;
  const isImage = design.type === "image";

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.cardOuter}>
      <View
        style={[
          styles.cardShadow,
          { width: w, height: h, backgroundColor: design.bg || "#191970" },
          selected && styles.cardSelected,
        ]}
      >
        {/* Shared background artwork (identical to the Card screen) */}
        <CardArtwork design={design} w={w} h={h} idKey="pc" />

        {/* Card chrome */}
        {isImage || design.minimalChrome ? (
          <View style={styles.chromeImg} pointerEvents="none">
            <Text style={[styles.brand, design.scrim && styles.imgShadow, { color: fg }]}>DS Banking</Text>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardNumberSm, design.scrim && styles.imgShadow, { color: fg }]}>••••  4827</Text>
              <Text style={[styles.visa, design.scrim && styles.imgShadow, { color: fg }]}>VISA</Text>
            </View>
          </View>
        ) : (
          <View style={styles.chromeFull} pointerEvents="none">
            <Text style={[styles.brand, { color: fg }]}>DS Banking</Text>
            <View style={[styles.chip, { borderColor: fg }]} />
            <Text style={[styles.cardNumber, { color: fg }]}>••••  ••••  ••••  4827</Text>
            <View style={styles.rowBetween}>
              <Text style={[styles.holder, { color: fg }]}>CARD HOLDER</Text>
              <Text style={[styles.visa, { color: fg }]}>VISA</Text>
            </View>
          </View>
        )}

        {selected && (
          <View style={styles.checkBadge}>
            <MaterialCommunityIcons name="check-bold" size={16} color="#fff" />
          </View>
        )}
      </View>

      <View style={[styles.metaRow, { width: w }]}>
        <Text style={styles.designName} numberOfLines={1}>{design.name}</Text>
        <View
          style={[
            styles.pricePill,
            design.price === "Free" && styles.priceFree,
            owned && styles.priceOwned,
          ]}
        >
          <Text style={styles.priceText}>
            {owned ? "Owned" : priceLabel(design.price, format)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PersonalizeCard() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { format } = useCurrency();
  const dynamicStyles = useMemo(() => makeStyles(colors), [colors]);

  const [selectedId, setSelectedId] = useState("classic");
  const [userId, setUserId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [owned, setOwned] = useState([]); // design ids the user already paid for
  const [buying, setBuying] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null); // {name, price} after a purchase

  const selected = DESIGNS.find((d) => d.id === selectedId);
  const isOwned = (id) => owned.includes(id);
  const selectedEur = selected ? priceEur(selected.price) : 0;
  const selectedOwned = selected ? isOwned(selected.id) : false;

  // Load the user's balance + which designs they already own.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = JSON.parse(await AsyncStorage.getItem("user"));
          if (!stored) return;
          setUserId(stored.user_id);

          const cardRes = await fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`);
          const card = await cardRes.json();
          if (card.status === "success") {
            setBalance(Number(card.card.balance) || 0);
          } else {
            setBalance(Number(stored.balance) || 0);
          }

          const dRes = await fetch(`${API_BASE}/get_card_designs.php?user_id=${stored.user_id}`);
          const d = await dRes.json();
          if (d.status === "success") setOwned(d.owned || []);
        } catch (e) {
          console.log("PersonalizeCard load error:", e);
        }
      })();
    }, [])
  );

  // Charge for the selected design (paid + not already owned).
  const runBuy = async () => {
    // A cosmetic card order is a "Shopping" purchase — warn (but don't block)
    // if it would go over that budget, like the other spending screens.
    const okBudget = await confirmOverBudget({ userId, category: "Shopping", amount: selectedEur });
    if (!okBudget) return;

    setBuying(true);
    try {
      // Only the design id is sent — the backend applies its own price, so the
      // charge can never be tampered with from the client.
      const res = await fetch(`${API_BASE}/buy_card_design.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, design_id: selected.id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setBalance(Number(data.new_balance));
        setOwned((prev) => [...prev, selected.id]);
        // Keep the cached balance in sync for other screens.
        try {
          const stored = JSON.parse(await AsyncStorage.getItem("user"));
          if (stored) {
            await AsyncStorage.setItem(
              "user",
              JSON.stringify({ ...stored, balance: Number(data.new_balance) })
            );
          }
        } catch (e) {
          // ignore
        }
        setSuccessInfo({ name: data.design_name, price: format(data.price) });
      } else {
        Alert.alert("Couldn't complete", data.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection error", "Please try again.");
    }
    setBuying(false);
  };

  const onContinue = () => {
    if (!selected || buying) return;

    // Free standard card — nothing to charge.
    if (selectedEur <= 0) {
      Alert.alert(
        "Card applied",
        `${selected.name} is the standard DS Banking card — no charge.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      return;
    }

    // Already paid for — apply it again without charging.
    if (selectedOwned) {
      Alert.alert(
        "Already yours",
        `You already own the ${selected.name} card design. Set it as your card from the Card screen anytime — nothing to pay.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (Number(balance) < selectedEur) {
      Alert.alert(
        "Insufficient balance",
        `You need ${format(selectedEur)} to order the ${selected.name} card.`
      );
      return;
    }

    Alert.alert(
      "Order this card design",
      `Order the ${selected.name} card for ${format(selectedEur)}? The amount will be charged from your balance now.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: `Pay ${format(selectedEur)}`, onPress: runBuy },
      ]
    );
  };

  const continueLabel =
    selectedEur <= 0 ? "Use This Card" : selectedOwned ? "Owned" : `Pay ${format(selectedEur)}`;

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Personalize Card</Text>
        <View style={{ width: 26 }} />
      </View>

      <SafeAreaView edges={["bottom"]} style={dynamicStyles.body}>
        <ScrollView
          contentContainerStyle={dynamicStyles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={dynamicStyles.intro}>
            Choose a design for your card. Tap a style to preview it, then order it — the price is
            charged from your balance and your card arrives within 3 business days. Owned designs can
            be set as your card from the Card screen.
          </Text>

          {DESIGNS.map((design) => (
            <DesignPreview
              key={design.id}
              design={design}
              selected={selectedId === design.id}
              owned={isOwned(design.id)}
              onPress={() => setSelectedId(design.id)}
            />
          ))}
        </ScrollView>

        <View style={dynamicStyles.footer}>
          <View style={dynamicStyles.footerInfo}>
            <Text style={dynamicStyles.footerLabel}>Balance: {format(balance)}</Text>
            <Text style={dynamicStyles.footerValue} numberOfLines={1}>
              {selected?.name} ·{" "}
              {selectedOwned ? "Owned" : selected ? priceLabel(selected.price, format) : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[dynamicStyles.continueBtn, buying && { opacity: 0.7 }]}
            onPress={onContinue}
            disabled={buying}
          >
            {buying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={dynamicStyles.continueText}>{continueLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SuccessOverlay
        visible={!!successInfo}
        title="Card ordered!"
        subtitle={
          successInfo
            ? `Your ${successInfo.name} card (${successInfo.price}) has been ordered and will arrive within 3 business days.`
            : ""
        }
        color={colors.success}
        cardColor={colors.card}
        textColor={colors.text}
        subTextColor={colors.textSecondary}
        onDone={() => {
          setSuccessInfo(null);
          navigation.goBack();
        }}
      />
    </View>
  );
}

// Card-visual styles (independent of the app theme).
const styles = StyleSheet.create({
  cardOuter: { marginBottom: 26, alignItems: "center", alignSelf: "stretch" },
  cardShadow: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardSelected: { borderWidth: 3, borderColor: "#fff" },

  // Chrome (full = gradient cards, img = image cards)
  chromeFull: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: "space-between" },
  chromeImg: { ...StyleSheet.absoluteFillObject, padding: 18, justifyContent: "space-between" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },

  brand: { fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  chip: { width: 42, height: 30, borderRadius: 6, borderWidth: 1.5, opacity: 0.85 },
  cardNumber: { fontSize: 18, fontWeight: "600", letterSpacing: 1.5 },
  cardNumberSm: { fontSize: 15, fontWeight: "700", letterSpacing: 1.5 },
  holder: { fontSize: 11, fontWeight: "600", letterSpacing: 1, opacity: 0.9 },
  visa: { fontSize: 22, fontWeight: "800", fontStyle: "italic" },
  imgShadow: {
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  checkBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  designName: { fontSize: 16, fontWeight: "700", color: "#888", flexShrink: 1, paddingRight: 10 },
  pricePill: { backgroundColor: "#191970", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  priceFree: { backgroundColor: "#2E7D32" },
  priceOwned: { backgroundColor: "#0E7A5F" },
  priceText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingTop: 55,
      paddingBottom: 16,
      paddingHorizontal: 20,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

    body: { flex: 1 },
    scroll: { padding: 20, paddingBottom: 10 },
    intro: { fontSize: 14, color: c.textSecondary, marginBottom: 20, lineHeight: 20 },

    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.card,
    },
    footerInfo: { flex: 1 },
    footerLabel: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: c.textMuted },
    footerValue: { fontSize: 15, fontWeight: "700", color: c.text, marginTop: 2 },
    continueBtn: { backgroundColor: c.primary, paddingVertical: 15, paddingHorizontal: 32, borderRadius: 14 },
    continueText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
