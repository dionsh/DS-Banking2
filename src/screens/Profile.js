import React, { useMemo } from "react";
import { DrawerActions } from "@react-navigation/native";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ProfileCard from "../components/ProfileCard";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";


export default function Profile({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const lightBlue = "#4A90E2";
  const dangerRed = "#E53935";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <TouchableOpacity
               onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
               style={styles.drawerButton}
             >
               <MaterialCommunityIcons name="menu" size={28} color={lightBlue} />
             </TouchableOpacity>
        <Text style={styles.title}>{t("menu.profile")}</Text>

        <TouchableOpacity onPress={() => navigation.navigate("LogOut")}>
          <Ionicons name="log-out-outline" size={26} color={dangerRed} />
        </TouchableOpacity>
      </View>

      <Image
        source={require('../../assets/images/dsbanklogotr.png')}
        style={styles.logo}
      />

      <TouchableOpacity>
        <Text style={styles.changeAvatar}>{t("profile.changeAvatar")}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t("profile.sectionPersonal")}</Text>

      <ProfileCard
        title={t("menu.personalDetails")}
        description={t("profile.personalDetailsDesc")}
        icon="person-outline"
        onPress={() => navigation.navigate("PersonalDetails")}
      />

      <ProfileCard
        title={t("profile.contactTitle")}
        description={t("profile.contactDesc")}
        icon="call-outline"
      />

      <Text style={styles.sectionTitle}>{t("profile.sectionOther")}</Text>

      <ProfileCard
        title={t("menu.settings")}
        description={t("profile.settingsDesc")}
        icon="settings-outline"
        onPress={() => navigation.navigate("Settings")}
      />

      <ProfileCard
        title={t("common.notifications")}
        description={t("profile.notificationsDesc")}
        icon="notifications-outline"
        onPress={() => navigation.navigate("Notifications")}
      />

      <ProfileCard
        title={t("profile.helpTitle")}
        description={t("profile.helpDesc")}
        icon="help-circle-outline"
        onPress={() => navigation.navigate("Help")}
      />

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
      marginBottom: 30,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: c.text,
    },
    logo: {
      width: 120,
      height: 120,
      alignSelf: "center",
      marginBottom: 10,
    },
    changeAvatar: {
      textAlign: "center",
      color: "#4A90E2",
      marginBottom: 35,
      fontWeight: "500",
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: c.textMuted,
      marginBottom: 15,
      marginTop: 10,
    }
  });
