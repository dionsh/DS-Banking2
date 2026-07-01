import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

/*
 * Full-screen prompt shown after login when the user's card is not yet in
 * Apple Wallet. "Add Card" routes to the Apple Pay screen; "Not now" dismisses
 * it for this session (it shows again on the next login until the card is added).
 *
 * Uses manual safe padding rather than SafeAreaView because a RN Modal renders
 * in its own hierarchy where safe-area insets are not reliably available.
 */
export default function ApplePayPrompt({ visible, onAdd, onClose }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      {/* The prompt background is light in light mode, so use dark status-bar
          content (and vice-versa) while it's on screen. */}
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.container}>
        {/* Centered hero */}
        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <FontAwesome5 name="apple" size={60} color={colors.text} />
            <Text style={styles.payText}>Pay</Text>
          </View>

          <Text style={styles.title}>{t("applepay.promptTitle")}</Text>
          <Text style={styles.subtitle}>
            {t("applepay.promptSub")}
          </Text>
        </View>

        {/* Bottom actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>{t("applepay.addCard")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.notNow} onPress={onClose}>
            <Text style={styles.notNowText}>{t("applepay.notNow")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.pageAlt,
      paddingHorizontal: 28,
      paddingTop: 54,
    },
    hero: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 40,
    },
    payText: {
      fontSize: 58,
      fontWeight: "500",
      color: c.text,
      marginLeft: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: c.text,
      textAlign: "center",
      lineHeight: 31,
    },
    subtitle: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 14,
      lineHeight: 21,
    },
    actions: {
      paddingBottom: 36,
    },
    addBtn: {
      backgroundColor: c.primary,
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: "center",
    },
    addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    notNow: {
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 4,
    },
    notNowText: { color: c.accent, fontSize: 15, fontWeight: "600" },
  });
