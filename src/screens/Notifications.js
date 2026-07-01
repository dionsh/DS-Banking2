import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

// Map a notification type to an icon + accent color.
function typeVisual(type, colors) {
  switch (type) {
    case "received":
      return { icon: "arrow-down-bold-circle", color: colors.success };
    case "sent":
      return { icon: "arrow-up-bold-circle", color: colors.accent };
    case "login":
      return { icon: "shield-check", color: colors.accent };
    default:
      return { icon: "bell-outline", color: colors.accent };
  }
}

function formatWhen(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function Notifications() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUser(stored);

      const res = await fetch(`${API_BASE}/get_notifications.php?user_id=${stored.user_id}`);
      const data = await res.json();
      if (data.status === "success") {
        setItems(data.notifications || []);
        setEnabled(data.enabled !== false);

        // Mark everything as read so the Home badge clears (fire and forget).
        if ((data.unread || 0) > 0) {
          fetch(`${API_BASE}/mark_notifications_read.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: stored.user_id }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.log("Notifications load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const handleClear = () => {
    if (items.length === 0) return;
    Alert.alert(t("notif.clearTitle"), t("notif.clearMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("notif.clear"),
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE}/clear_notifications.php`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: user.user_id }),
            });
            const data = await res.json();
            if (data.status === "success") {
              setItems([]);
            } else {
              Alert.alert(t("common.error"), data.message || t("notif.couldNotClear"));
            }
          } catch (err) {
            console.log("Clear notifications error:", err);
            Alert.alert(t("common.error"), t("notif.couldNotReach"));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const v = typeVisual(item.type, colors);
    const unread = Number(item.is_read) === 0;
    return (
      <View style={[styles.row, unread && styles.rowUnread]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
          <MaterialCommunityIcons name={v.icon} size={22} color={v.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{formatWhen(item.created_at)}</Text>
        </View>
        {unread && <View style={styles.unreadDot} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("common.notifications")}</Text>
        {items.length > 0 ? (
          <TouchableOpacity onPress={handleClear}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {!enabled && (
        <View style={styles.offBanner}>
          <MaterialCommunityIcons name="bell-off-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.offBannerText}>
            {t("notif.offBanner")}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="bell-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t("notif.empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingVertical: 6 }}
        />
      )}
    </SafeAreaView>
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

    offBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    offBannerText: { color: c.textSecondary, fontSize: 13, flex: 1 },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    rowUnread: { backgroundColor: c.card },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    title: { fontSize: 15, fontWeight: "700", color: c.text },
    message: { fontSize: 14, color: c.textSecondary, marginTop: 3, lineHeight: 19 },
    time: { fontSize: 12, color: c.textMuted, marginTop: 5 },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.danger,
      marginLeft: 10,
    },

    separator: { height: 1, backgroundColor: c.divider, marginLeft: 78 },

    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
    emptyText: { color: c.textMuted, textAlign: "center", marginTop: 14, lineHeight: 20, fontSize: 14 },
  });
