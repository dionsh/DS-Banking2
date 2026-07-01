import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function LogOut({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    const logout = async () => {
      try {
        // hek session e ruajtur t userit
        await AsyncStorage.removeItem("user");

        // e ndryshon navigation qe useri mos me mujt me shku apet ku u kan
        navigation.reset({
          index: 0,
          routes: [{ name: "SignUp" }],
        });

      } catch (err) {
        console.log("Logout error:", err);
      }
    };

    logout();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={{ marginTop: 10, color: colors.textSecondary }}>{t("logout.loggingOut")}</Text>
    </View>
  );
}
