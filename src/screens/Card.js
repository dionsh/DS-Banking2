import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../currency/CurrencyContext";

// Standard bank card aspect ratio (85.6mm x 53.98mm).
const SCREEN_W = Dimensions.get("window").width;
const CARD_W = SCREEN_W - 40;
const CARD_H = Math.round(CARD_W / 1.586);

export default function Card() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user_id } = route.params || {};

  const { colors } = useTheme();
  const { t } = useLanguage();
  const { format } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [cardData, setCardData] = useState(null);
  const [holder, setHolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [frozen, setFrozen] = useState(false);
  const [toggling, setToggling] = useState(false);

  /* ---------- interactive 3D rotation ---------- */

  // rotateAnim holds the card's Y rotation in degrees (unbounded — it keeps
  // growing as you spin). baseRotation is the settled value between gestures.
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current; // X tilt while dragging
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const baseRotation = useRef(0);

  const springTo = (anim, toValue) =>
    Animated.spring(anim, {
      toValue,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();

  // Settle on the nearest face (multiples of 180°: front, back, front, ...).
  const snapRotation = (raw) => {
    const target = Math.round(raw / 180) * 180;
    baseRotation.current = target;
    springTo(rotateAnim, target);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
      // Give the gesture back to the ScrollView when it turns vertical.
      onPanResponderTerminationRequest: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
      onShouldBlockNativeResponder: (_, g) => Math.abs(g.dx) >= Math.abs(g.dy),
      onPanResponderGrant: () => {
        springTo(scaleAnim, 1.05);
      },
      onPanResponderMove: (_, g) => {
        rotateAnim.setValue(baseRotation.current + g.dx * 0.35);
        tiltAnim.setValue(Math.max(-10, Math.min(10, -g.dy * 0.08)));
      },
      onPanResponderRelease: (_, g) => {
        springTo(scaleAnim, 1);
        springTo(tiltAnim, 0);
        if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
          // A tap — flip to the other side.
          snapRotation(baseRotation.current + 180);
          return;
        }
        // A drag — carry a bit of fling velocity, then settle on a face.
        snapRotation(baseRotation.current + g.dx * 0.35 + g.vx * 60);
      },
      onPanResponderTerminate: () => {
        springTo(scaleAnim, 1);
        springTo(tiltAnim, 0);
        snapRotation(baseRotation.current);
      },
    })
  ).current;

  const frontRotateY = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });
  const backRotateY = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["180deg", "540deg"],
  });
  const tiltX = tiltAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: ["-10deg", "10deg"],
  });

  // Normalized 0..360 angle, used to fully hide the face that points away
  // (belt and braces on top of backfaceVisibility, which some Android
  // versions handle poorly) and to sweep a light "shine" across the card.
  const angle = Animated.modulo(rotateAnim, 360);
  const frontOpacity = angle.interpolate({
    inputRange: [0, 89.9, 90, 270, 270.1, 360],
    outputRange: [1, 1, 0, 0, 1, 1],
  });
  const backOpacity = angle.interpolate({
    inputRange: [0, 89.9, 90, 270, 270.1, 360],
    outputRange: [0, 0, 1, 1, 0, 0],
  });
  const shineOpacity = angle.interpolate({
    inputRange: [0, 90, 180, 270, 360],
    outputRange: [0, 0.16, 0, 0.16, 0],
  });

  const faceTransform = (rotateY) => [
    { perspective: 1200 },
    { scale: scaleAnim },
    { rotateX: tiltX },
    { rotateY },
  ];

  /* ---------- data ---------- */

  // Emri i mbajtesit vjen prej userit te ruajtur lokalisht (get_card.php s'e kthen).
  useEffect(() => {
    (async () => {
      try {
        const stored = JSON.parse(await AsyncStorage.getItem("user"));
        if (stored) setHolder(`${stored.name || ""} ${stored.surname || ""}`.trim());
      } catch (e) {
        // ignore — the card simply shows no holder name
      }
    })();
  }, []);

  // Funksioni per me ba fetch tdhenat e karteles (+ statusin frozen)
  const fetchCardData = async () => {
    if (!user_id) {
      console.log("No user_id received");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [cardRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/get_card.php?user_id=${user_id}`),
        fetch(`${API_BASE}/get_card_status.php?user_id=${user_id}`),
      ]);
      const data = await cardRes.json();
      console.log("CARD RESPONSE:", data);

      if (data.status === "success") {
        setCardData(data.card);
      } else {
        console.log("CARD ERROR:", data.message);
      }

      try {
        const status = await statusRes.json();
        if (status.status === "success") {
          setFrozen(!!status.frozen);
        }
      } catch (e) {
        // ignore status errors — default stays unfrozen
      }
    } catch (err) {
      console.log("CARD FETCH ERROR:", err);
    }
    setLoading(false);
  };

  //  Kodi per refresh t'screenit ne focus
  useFocusEffect(
    useCallback(() => {
      fetchCardData();
    }, [user_id])
  );

  // Freeze / unfreeze the card (persisted in the backend).
  const applyFreeze = async (nextFrozen) => {
    setToggling(true);
    try {
      const res = await fetch(`${API_BASE}/set_card_freeze.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, frozen: nextFrozen }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setFrozen(!!data.frozen);
      } else {
        Alert.alert("Something went wrong", data.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Connection error", "Could not update your card. Please try again.");
    }
    setToggling(false);
  };

  const toggleFreeze = () => {
    if (frozen) {
      applyFreeze(false);
      return;
    }
    Alert.alert(
      "Freeze card?",
      "Your card will be temporarily blocked and payments will be rejected until you unfreeze it. You can unfreeze it anytime.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Freeze", style: "destructive", onPress: () => applyFreeze(true) },
      ]
    );
  };

  const maskCard = (num) => {
    if (!num) return "---- ---- ---- ----";
    return num.replace(/(\d{4})\d+(\d{4})/, "$1 **** **** $2");
  };

  const FrozenOverlay = () => (
    <View style={styles.frozenOverlay} pointerEvents="none">
      <MaterialCommunityIcons name="snowflake" size={40} color="#EAF6FF" />
      <Text style={styles.frozenText}>FROZEN</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.primary }}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("menu.card")}</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Interactive 3D card: drag to rotate, tap to flip */}
          <View style={styles.cardArea} {...panResponder.panHandlers}>
            {/* FRONT */}
            <Animated.View
              style={[
                styles.cardFace,
                frozen && styles.cardBoxFrozen,
                { opacity: frontOpacity, transform: faceTransform(frontRotateY) },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={styles.chipRow}>
                  <View style={styles.chip}>
                    <View style={styles.chipLine} />
                    <View style={[styles.chipLine, { top: 14 }]} />
                    <View style={styles.chipLineV} />
                  </View>
                  <MaterialCommunityIcons
                    name="contactless-payment"
                    size={22}
                    color="rgba(255,255,255,0.85)"
                    style={{ marginLeft: 10 }}
                  />
                </View>
                <Text style={styles.visa}>VISA</Text>
              </View>

              <Text style={styles.cardNumber}>{maskCard(cardData?.card_number)}</Text>

              <View style={styles.rowBetween}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>{t("card.holder")}</Text>
                  <Text style={styles.value} numberOfLines={1}>
                    {holder ? holder.toUpperCase() : "—"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.label}>{t("card.expiry")}</Text>
                  <Text style={styles.value}>{cardData?.expiry_date || "--/--"}</Text>
                </View>
              </View>

              {/* Light sweep while the card turns */}
              <Animated.View
                pointerEvents="none"
                style={[styles.shine, { opacity: shineOpacity }]}
              />
              {frozen && <FrozenOverlay />}
            </Animated.View>

            {/* BACK */}
            <Animated.View
              style={[
                styles.cardFace,
                styles.cardFaceBack,
                frozen && styles.cardBoxFrozen,
                { opacity: backOpacity, transform: faceTransform(backRotateY) },
              ]}
            >
              <View style={styles.magStripe} />

              <View style={styles.signatureRow}>
                <View style={styles.signatureStrip}>
                  <Text style={styles.signatureText} numberOfLines={1}>
                    {holder || " "}
                  </Text>
                </View>
                <View style={styles.cvvBox}>
                  <Text style={styles.cvvLabel}>CVV</Text>
                  <Text style={styles.cvvValue}>{cardData?.cvv || "---"}</Text>
                </View>
              </View>
              <Text style={styles.signatureHint}>{t("card.authorizedSignature")}</Text>

              <Text style={styles.backNote}>{t("card.backNote")}</Text>
              <Text style={styles.visaBack}>VISA</Text>

              {frozen && <FrozenOverlay />}
            </Animated.View>
          </View>

          <View style={styles.hintRow}>
            <MaterialCommunityIcons name="rotate-3d-variant" size={15} color={colors.textMuted} />
            <Text style={styles.hintText}> {t("card.dragHint")}</Text>
          </View>

          {/* Card status pill */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: frozen ? "#E8F1FB" : "#E7F6EC" },
              ]}
            >
              <MaterialCommunityIcons
                name={frozen ? "snowflake" : "check-circle"}
                size={16}
                color={frozen ? "#2B6CB0" : "#2E7D32"}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: frozen ? "#2B6CB0" : "#2E7D32" },
                ]}
              >
                {frozen ? "Card frozen" : "Card active"}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>{t("card.availableCondition")}</Text>
            <Text style={styles.balance}>{format(cardData?.balance || 0)}</Text>

            <Text style={styles.infoLabel}>{t("card.accountNumber")}</Text>
            <Text style={styles.infoValue}>{cardData?.account_number || "--------"}</Text>
          </View>

          <TouchableOpacity style={styles.walletBtn} onPress={() => navigation.navigate("ApplePay")}>
            <FontAwesome5 name="apple" size={20} color="white" />
            <Text style={styles.walletText}>  {t("card.addToWallet")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.personalizeBtn}
            onPress={() => navigation.navigate("PersonalizeCard")}
          >
            <MaterialCommunityIcons name="palette-outline" size={20} color="#fff" />
            <Text style={styles.personalizeText}>  Personalize Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.freezeBtn, frozen ? styles.freezeBtnActive : styles.freezeBtnIdle]}
            onPress={toggleFreeze}
            disabled={toggling}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={frozen ? "#2B6CB0" : "#fff"} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={frozen ? "lock-open-outline" : "snowflake"}
                  size={20}
                  color={frozen ? "#2B6CB0" : "#fff"}
                />
                <Text style={[styles.freezeText, frozen && styles.freezeTextActive]}>
                  {"  "}
                  {frozen ? "Unfreeze Card" : "Freeze Card"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingTop: 10,
      paddingBottom: 18,
      paddingHorizontal: 20,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      position: "absolute",
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "600",
      color: "white",
    },

    /* --- interactive card faces --- */
    cardArea: {
      width: CARD_W,
      height: CARD_H,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 10,
    },
    cardFace: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.primary,
      borderRadius: 18,
      padding: 22,
      justifyContent: "space-between",
      backfaceVisibility: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
      overflow: "hidden",
    },
    cardFaceBack: {
      padding: 0,
      justifyContent: "flex-start",
    },
    cardBoxFrozen: {
      backgroundColor: "#3A4A63",
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    chipRow: { flexDirection: "row", alignItems: "center" },
    chip: {
      width: 38,
      height: 28,
      borderRadius: 6,
      backgroundColor: "#E6C36A",
      overflow: "hidden",
    },
    chipLine: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 7,
      height: 1.5,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    chipLineV: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 18,
      width: 1.5,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    shine: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
    },
    frozenOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(173, 208, 235, 0.30)",
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    frozenText: {
      color: "#EAF6FF",
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: 3,
      marginTop: 6,
    },
    visa: { color: "white", fontSize: 26, fontWeight: "bold" },
    cardNumber: { color: "white", fontSize: 19, letterSpacing: 2 },
    label: { color: "#bbb", fontSize: 12 },
    value: { color: "white", fontSize: 15, fontWeight: "600", marginTop: 2 },

    /* --- back of the card --- */
    magStripe: {
      height: 40,
      backgroundColor: "#111",
      marginTop: 22,
    },
    signatureRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      marginHorizontal: 18,
    },
    signatureStrip: {
      flex: 1,
      height: 34,
      backgroundColor: "#F3F0E4",
      borderRadius: 3,
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    signatureText: {
      color: "#3B3B3B",
      fontSize: 14,
      fontStyle: "italic",
    },
    cvvBox: {
      marginLeft: 10,
      backgroundColor: "#FFFFFF",
      borderRadius: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignItems: "center",
    },
    cvvLabel: { color: "#888", fontSize: 9, letterSpacing: 1 },
    cvvValue: { color: "#111", fontSize: 15, fontWeight: "700", letterSpacing: 2 },
    signatureHint: {
      color: "rgba(255,255,255,0.55)",
      fontSize: 10,
      marginTop: 6,
      marginHorizontal: 18,
    },
    backNote: {
      color: "rgba(255,255,255,0.65)",
      fontSize: 10,
      marginTop: 14,
      marginHorizontal: 18,
      lineHeight: 14,
    },
    visaBack: {
      position: "absolute",
      right: 16,
      bottom: 12,
      color: "white",
      fontSize: 20,
      fontWeight: "bold",
      opacity: 0.9,
    },
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    hintText: { color: c.textMuted, fontSize: 12 },

    statusRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 0,
      marginBottom: 4,
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    statusText: { fontSize: 13, fontWeight: "700" },
    infoSection: { paddingHorizontal: 20, paddingTop: 10 },
    infoLabel: { color: c.textSecondary, fontSize: 14, marginTop: 22 },
    balance: { fontSize: 26, fontWeight: "700", marginTop: 5, color: c.accent },
    infoValue: { fontSize: 18, marginTop: 6, fontWeight: "500", color: c.text },
    walletBtn: {
      backgroundColor: "black",
      marginHorizontal: 20,
      marginTop: 35,
      padding: 18,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    walletText: { color: "white", fontSize: 16, fontWeight: "600" },
    personalizeBtn: {
      backgroundColor: c.primary,
      marginHorizontal: 20,
      marginTop: 14,
      padding: 18,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    personalizeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    freezeBtn: {
      marginHorizontal: 20,
      marginTop: 14,
      marginBottom: 24,
      padding: 18,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    freezeBtnIdle: { backgroundColor: "#2B6CB0" },
    freezeBtnActive: {
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: "#2B6CB0",
    },
    freezeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    freezeTextActive: { color: "#2B6CB0" },
  });
