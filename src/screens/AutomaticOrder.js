import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function AutomaticOrder() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>

      {/* Pjesa e kodit per header*/}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons
            name="menu"
            size={28}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("menu.automaticOrder")}</Text>
      </View>

      {/* Seach bar  */}
      <View style={styles.searchWrapper}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder={t("common.search")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchBar}
        />
      </View>

      {/* Karta  */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("menu.automaticOrder")}</Text>
      </View>

      <TouchableOpacity style={styles.newOrderBtn}>
        <MaterialCommunityIcons name="plus" size={22} color="#fff" />
        <Text style={styles.newOrderText}>{t("auto.newOrder")}</Text>
      </TouchableOpacity>

    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.pageAlt,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.primary,
      paddingHorizontal: 18,
      paddingTop: 60,
      paddingBottom: 18,
      marginBottom: 18,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "600",
      marginLeft: 14,
      color: "#fff",
    },

    searchWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      marginHorizontal: 18,
      marginBottom: 18,
      paddingHorizontal: 12,
    },
    searchIcon: {
      marginRight: 6,
    },
    searchBar: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text,
    },

    card: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 18,
      height: 420,
      padding: 18,
      marginHorizontal: 18,
      marginBottom: 22,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: c.accent,
    },

    newOrderBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
      paddingVertical: 15,
      borderRadius: 14,
      marginHorizontal: 18,
    },
    newOrderText: {
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
      color: "#E8ECFF",
    },
  });
