import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DetailRow from "../components/DetailRow";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function PersonalDetails({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);

  const lightBlue = "#4A90E2";

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    };

    loadUser();
  }, []);

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.textSecondary }}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <TouchableOpacity
               onPress={() =>
                 navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Profile")
               }
               hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
             >
               <MaterialCommunityIcons name="arrow-left" size={28} color={lightBlue} />
             </TouchableOpacity>

        <Text style={styles.title}>{t("menu.personalDetails")}</Text>

        <View style={{ width: 26 }} />
      </View>

      <Text style={styles.sectionTitle}>{t("personal.basicInfo")}</Text>

      <DetailRow label={t("common.name")} value={user.name} />
      <DetailRow label={t("common.surname")} value={user.surname} />
      <DetailRow label={t("common.email")} value={user.email} />

    </ScrollView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingHorizontal: 20,
      paddingTop: 60,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 35,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: c.text,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: c.textMuted,
      marginBottom: 15,
    },
  });
