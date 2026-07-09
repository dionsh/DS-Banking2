import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../currency/CurrencyContext";
import AnimatedNumber from "./AnimatedNumber";
import { PressableScale } from "./motion";

export default function UserCard({ fullName, cardNumber, balance, userId, navigation }){
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { format } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Hide/show the balance like real banking apps (screen-local, not persisted).
  const [hidden, setHidden] = useState(false);

  // "Account number copied" confirmation pill.
  const [copied, setCopied] = useState(false);
  const copiedAnim = useRef(new Animated.Value(0)).current;
  const copiedTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const copyAccountNumber = async () => {
    try {
      await Clipboard.setStringAsync(String(cardNumber || ""));
    } catch (e) {
      return; // clipboard unavailable — fail silently
    }
    setCopied(true);
    Animated.timing(copiedAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => {
      Animated.timing(copiedAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(
        () => setCopied(false)
      );
    }, 1800);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {t("card.greeting", { name: fullName || "User" })}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardNumber}>
          {formatCardNumber(cardNumber)}
        </Text>

        <View style={styles.balanceContainer}>
          {hidden ? (
            <Text style={styles.balance}>••••••••</Text>
          ) : (
            // Rolls up to the current balance (and replays when unhidden).
            <AnimatedNumber value={balance} format={format} style={styles.balance} duration={800} />
          )}
          <PressableScale
            scaleTo={0.8}
            onPress={() => setHidden((h) => !h)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={colors.accent}
            />
          </PressableScale>
        </View>

        <PressableScale
          style={styles.ibanRow}
          scaleTo={0.97}
          onPress={copyAccountNumber}
          hitSlop={{ top: 6, bottom: 6 }}
        >
          <Text style={styles.ibanText}>
            {formatCardNumber(cardNumber)}
          </Text>
          <MaterialCommunityIcons name="content-copy" size={15} color={colors.accent} />
        </PressableScale>

        {copied && (
          <Animated.View style={[styles.copiedPill, { opacity: copiedAnim }]}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#fff" />
            <Text style={styles.copiedText}>Account number copied</Text>
          </Animated.View>
        )}

        <View style={styles.buttonsRow}>
        <PressableScale
  style={[styles.button, { backgroundColor: colors.primary }]}
  scaleTo={0.94}
  onPress={() => navigation.navigate("TopUp", { user_id: userId })}
>
            <MaterialCommunityIcons name="phone-plus" size={18} color="#FFF" />
            <Text style={[styles.buttonText, { color: '#FFF' }]}>{t("card.topup")}</Text>
          </PressableScale>

          <PressableScale style={[styles.button, { backgroundColor: colors.surfaceAlt }]} scaleTo={0.94}>
            <MaterialCommunityIcons name="hands-pray" size={18} color={colors.accent} />
            <Text style={[styles.buttonText, { color: colors.accent }]}>KUIK</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

/* Pjesa e kodit per formatter */
function formatCardNumber(number) {
  if (!number) return "0000 0000 0000 0000";
  return String(number).replace(/(\d{4})/g, "$1 ").trim();
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { marginTop: 10, paddingHorizontal: 20 },
    greeting: { fontSize: 18, fontWeight: "bold", marginBottom: 15, color: c.accent },

    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 20,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },

    cardNumber: { fontSize: 14, color: c.textSecondary, marginBottom: 5 },

    balanceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },

    balance: { fontSize: 28, fontWeight: "bold", marginRight: 10, color: c.accent },

    ibanRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 20,
      alignSelf: "flex-start",
    },
    ibanText: { fontSize: 14, color: c.accent },

    copiedPill: {
      position: "absolute", // floats over the card so the layout never jumps
      bottom: 74,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.success,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 12,
      elevation: 6,
      zIndex: 10,
    },
    copiedText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    buttonsRow: { flexDirection: "row", gap: 10 },

    button: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8
    },
    buttonText: { fontWeight: "bold", fontSize: 14 },
  });
