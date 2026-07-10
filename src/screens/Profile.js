import React, { useMemo, useState, useCallback } from "react";
import { DrawerActions, useFocusEffect } from "@react-navigation/native";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProfileCard from "../components/ProfileCard";
import ProfileAvatar from "../components/ProfileAvatar";
import AvatarPicker from "../components/AvatarPicker";
import { MotionView, PressableScale } from "../components/motion";
import {
  AVATAR_THEME_KEY,
  DEFAULT_AVATAR_THEME,
  getAvatarTheme,
  initialOf,
} from "../components/avatarThemes";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";


export default function Profile({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const lightBlue = "#4A90E2";
  const dangerRed = "#E53935";

  const [name, setName] = useState("");
  const [themeId, setThemeId] = useState(DEFAULT_AVATAR_THEME);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Load the user's name (for the monogram) + their saved avatar theme.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = JSON.parse(await AsyncStorage.getItem("user"));
          if (stored) setName(stored.name || "");
          const savedTheme = await AsyncStorage.getItem(AVATAR_THEME_KEY);
          if (savedTheme) setThemeId(savedTheme);
        } catch (e) {
          // ignore — falls back to the default theme + "U" monogram
        }
      })();
    }, [])
  );

  const initial = initialOf(name);

  // Persist the chosen theme so it survives an app restart.
  const selectTheme = async (id) => {
    setThemeId(id);
    try {
      await AsyncStorage.setItem(AVATAR_THEME_KEY, id);
    } catch (e) {
      // ignore persistence errors — selection still applies for this session
    }
  };

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

      {/* Themed avatar — tap it (or the label below) to change the theme */}
      <MotionView from="zoom" spring style={styles.avatarWrap}>
        <PressableScale scaleTo={0.94} onPress={() => setPickerOpen(true)}>
          <View style={styles.avatarShadow}>
            <ProfileAvatar themeId={themeId} initial={initial} size={104} />
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
            </View>
          </View>
        </PressableScale>
      </MotionView>

      <TouchableOpacity onPress={() => setPickerOpen(true)}>
        <Text style={styles.changeAvatar}>{t("profile.changeAvatar")}</Text>
      </TouchableOpacity>

      <MotionView from="down" delay={80}>
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
          onPress={() => navigation.navigate("ContactDetails")}
        />
      </MotionView>

      <MotionView from="down" delay={160}>
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
      </MotionView>

      <AvatarPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initial={initial}
        selectedId={themeId}
        onSelect={selectTheme}
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
    avatarWrap: {
      alignSelf: "center",
      marginBottom: 10,
    },
    avatarShadow: {
      borderRadius: 52,
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    editBadge: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: c.background,
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
    },
  });
