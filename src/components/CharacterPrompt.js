import React, { useMemo } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import Avatar from "./Avatar";

/*
 * Full-screen welcome shown when the user first opens My Character (mirrors the
 * Apple Pay prompt's look). A man + woman avatar hint the new gender choice; a
 * single "Continue" button dismisses it. Uses manual safe padding because a RN
 * Modal renders in its own hierarchy where safe-area insets aren't reliable.
 */
export default function CharacterPrompt({ visible, onContinue }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onContinue}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.avatarRow}>
            <Avatar size={120} gender="male" hairStyle="short" shirtStyle="hoodie" shirtColor="#4F46E5" />
            <Avatar size={120} gender="female" hairStyle="long" hairColor="#5A3A22" shirtStyle="tshirt" shirtColor="#E53935" />
          </View>

          <Text style={styles.title}>{t("character.promptTitle")}</Text>
          <Text style={styles.subtitle}>{t("character.promptSub")}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
            <Text style={styles.continueText}>{t("character.continue")}</Text>
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
    hero: { flex: 1, alignItems: "center", justifyContent: "center" },
    avatarRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 34 },
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
    actions: { paddingBottom: 36 },
    continueBtn: {
      backgroundColor: c.primary,
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: "center",
    },
    continueText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
