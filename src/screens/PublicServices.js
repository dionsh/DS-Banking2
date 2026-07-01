import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar as RNStatusBar } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import Services from "../components/Services";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function PublicServices() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>

      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("menu.publicServices")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={styles.chooseText}>{t("ps.choosePayment")}</Text>

        <Services title={t("ps.giro")} letter="G" color="#C5E1A5" />
        <Services title={t("ps.municipal")} letter="P" color="#90CAF9" />
        <Services title={t("ps.tax")} letter="P" color="#FFAB91" />
        <Services title={t("ps.contribution")} letter="P" color="#CE93D8" />
        <Services title={t("ps.customs")} letter="P" color="#AED581" />
        <Services title={t("ps.trafficFines")} letter="G" color="#64B5F6" />
        <Services title={t("ps.ministry")} letter="P" color="#FFAB91" />
        <Services title="KRU Prishtina" letter="K" color="#BA68C8" />
      </ScrollView>

    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.primary,
      paddingHorizontal: 16,

      paddingTop: Platform.OS === "ios" ? 60 : RNStatusBar.currentHeight + 10,
      paddingBottom: 14,
    },
    headerTitle: {
      color: "white",
      fontSize: 18,
      fontWeight: "600",
      marginLeft: 14,
    },

   chooseText: {
      textAlign: "center",
      marginVertical: 32,
      fontSize: 16,
      fontWeight: "500",
      color: c.textSecondary,
    },
  });
