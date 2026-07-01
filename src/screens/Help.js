import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import InfoAccordion from "../components/InfoAccordion";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

// Frequently asked questions, grouped into sections. The answers describe how
// DS Banking actually works so the Help screen stays accurate to the app.
const buildFaq = (t) => [
  {
    title: t("help.sec1"),
    items: [
      { q: t("help.q1"), a: t("help.a1") },
      { q: t("help.q2"), a: t("help.a2") },
      { q: t("help.q3"), a: t("help.a3") },
    ],
  },
  {
    title: t("help.sec2"),
    items: [
      { q: t("help.q4"), a: t("help.a4") },
      { q: t("help.q5"), a: t("help.a5") },
      { q: t("help.q6"), a: t("help.a6") },
    ],
  },
  {
    title: t("help.sec3"),
    items: [
      { q: t("help.q7"), a: t("help.a7") },
      { q: t("help.q8"), a: t("help.a8") },
      { q: t("help.q9"), a: t("help.a9") },
    ],
  },
  {
    title: t("help.sec4"),
    items: [
      { q: t("help.q10"), a: t("help.a10") },
      { q: t("help.q11"), a: t("help.a11") },
    ],
  },
  {
    title: t("help.sec5"),
    items: [
      { q: t("help.q12"), a: t("help.a12") },
      { q: t("help.q13"), a: t("help.a13") },
      { q: t("help.q14"), a: t("help.a14") },
    ],
  },
];

export default function Help() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const FAQ_SECTIONS = buildFaq(t);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("help.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          {t("help.intro")}
        </Text>

        {FAQ_SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item) => (
                <InfoAccordion key={item.q} title={item.q} text={item.a} />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.contactCard}>
          <MaterialCommunityIcons name="lifebuoy" size={28} color={colors.accent} />
          <Text style={styles.contactTitle}>{t("help.stillNeed")}</Text>
          <Text style={styles.contactText}>
            {t("help.supportHours")}
          </Text>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="email-outline" size={18} color={colors.accent} />
            <Text style={styles.contactValue}>support@dsbanking.com</Text>
          </View>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="phone-outline" size={18} color={colors.accent} />
            <Text style={styles.contactValue}>+383 38 000 000</Text>
          </View>
        </View>
      </ScrollView>
    </View>
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

    intro: { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 22 },

    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.accent,
      marginBottom: 10,
      marginTop: 6,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 4,
      marginBottom: 22,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },

    contactCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 22,
      alignItems: "center",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    contactTitle: { fontSize: 17, fontWeight: "700", color: c.text, marginTop: 10 },
    contactText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 6,
      marginBottom: 14,
      lineHeight: 19,
    },
    contactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    contactValue: { fontSize: 14, color: c.text, fontWeight: "600" },
  });
