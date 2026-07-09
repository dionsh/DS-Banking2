import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency, formatIn, currencyByCode } from "../currency/CurrencyContext";
import { MotionView, PressableScale } from "../components/motion";

export default function Settings() {
  const navigation = useNavigation();
  const { theme, colors, setTheme } = useTheme();
  const { t, language, setLanguage, languages } = useLanguage();
  const { code: activeCurrency, currencies, setCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [notifications, setNotifications] = useState(true);

  // Currency converter state. The balance is always stored in EUR in the DB; the
  // converter only changes which currency the balance is DISPLAYED in.
  const [balanceEur, setBalanceEur] = useState(null);
  const [fromCode, setFromCode] = useState(activeCurrency);
  const [toCode, setToCode] = useState(activeCurrency === "EUR" ? "USD" : "EUR");

  // Keep the "convert from" selection in sync with the currency currently in use.
  useEffect(() => {
    setFromCode(activeCurrency);
  }, [activeCurrency]);

  // Load the user's notification preference + current (EUR) balance for the
  // converter preview.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = JSON.parse(await AsyncStorage.getItem("user"));
          if (!stored) return;

          const res = await fetch(`${API_BASE}/get_notifications.php?user_id=${stored.user_id}`);
          const data = await res.json();
          if (data.status === "success") {
            setNotifications(data.enabled !== false);
          }

          const cardRes = await fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`);
          const cardData = await cardRes.json();
          if (cardData.status === "success") {
            setBalanceEur(Number(cardData.card.balance) || 0);
          }
        } catch (err) {
          console.log("Settings load error:", err);
        }
      })();
    }, [])
  );

  // Confirm, then switch the display currency (display-only — transactions and the
  // stored EUR balance are never modified).
  const handleConvert = () => {
    if (fromCode === toCode) {
      Alert.alert("Currency Converter", "Please choose two different currencies.");
      return;
    }
    Alert.alert(
      "Convert Balance",
      "Are you sure you want to convert your balance?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            await setCurrency(toCode);
            const toLabel = currencyByCode(toCode).label;
            const newBalance =
              balanceEur != null ? `\n\nNew balance: ${formatIn(balanceEur, toCode)}` : "";
            Alert.alert("Done", `Your balance is now displayed in ${toLabel}.${newBalance}`);
          },
        },
      ]
    );
  };

  // Persist the on/off choice to the backend (optimistic, reverts on failure).
  const toggleNotifications = async (val) => {
    setNotifications(val);
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      const res = await fetch(`${API_BASE}/set_notification_settings.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: stored.user_id, enabled: val }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        setNotifications(!val);
      }
    } catch (err) {
      console.log("Notification setting save error:", err);
      setNotifications(!val);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color={colors.onPrimary} />
        </PressableScale>

        <Text style={styles.headerTitle}>{t("settings.title")}</Text>

        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <MotionView from="down" delay={0}>
        <Text style={styles.sectionTitle}>{t("settings.chooseVersion")}</Text>

        <PressableScale style={styles.optionRow} scaleTo={0.98} onPress={() => setTheme("light")}>
          <View style={styles.optionLeft}>
            <MaterialCommunityIcons
              name="white-balance-sunny"
              size={20}
              color={colors.accent}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>{t("settings.lightVersion")}</Text>
          </View>

          {theme === "light" && (
            <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />
          )}
        </PressableScale>

        <PressableScale style={styles.optionRow} scaleTo={0.98} onPress={() => setTheme("dark")}>
          <View style={styles.optionLeft}>
            <MaterialCommunityIcons
              name="weather-night"
              size={20}
              color={colors.accent}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>{t("settings.darkVersion")}</Text>
          </View>

          {theme === "dark" && (
            <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />
          )}
        </PressableScale>
        </MotionView>

        {/* Language */}
        <MotionView from="down" delay={80}>
        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>
          {t("settings.language")}
        </Text>

        {languages.map((lng) => (
          <PressableScale
            key={lng.code}
            style={styles.optionRow}
            scaleTo={0.98}
            onPress={() => setLanguage(lng.code)}
          >
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons
                name="translate"
                size={20}
                color={colors.accent}
                style={styles.optionIcon}
              />
              <Text style={styles.optionText}>{lng.label}</Text>
            </View>

            {language === lng.code && (
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />
            )}
          </PressableScale>
        ))}
        </MotionView>

        {/* Currency Converter */}
        <MotionView from="down" delay={160}>
        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Currency Converter</Text>

        <Text style={styles.curHint}>Convert from</Text>
        <View style={styles.curRow}>
          {currencies.map((cur) => {
            const selected = fromCode === cur.code;
            return (
              <PressableScale
                key={`from-${cur.code}`}
                style={[styles.curPill, selected && styles.curPillActive]}
                scaleTo={0.93}
                onPress={() => setFromCode(cur.code)}
              >
                <Text style={[styles.curPillText, selected && styles.curPillTextActive]}>
                  {cur.symbol} {cur.code}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={styles.curHint}>Convert to</Text>
        <View style={styles.curRow}>
          {currencies.map((cur) => {
            const selected = toCode === cur.code;
            return (
              <PressableScale
                key={`to-${cur.code}`}
                style={[styles.curPill, selected && styles.curPillActive]}
                scaleTo={0.93}
                onPress={() => setToCode(cur.code)}
              >
                <Text style={[styles.curPillText, selected && styles.curPillTextActive]}>
                  {cur.symbol} {cur.code}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {balanceEur != null && (
          <View style={styles.curPreview}>
            <Text style={styles.curPreviewLabel}>Balance preview</Text>
            <View style={styles.curPreviewRow}>
              <Text style={styles.curPreviewFrom}>{formatIn(balanceEur, fromCode)}</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.textMuted} />
              <Text style={styles.curPreviewTo}>{formatIn(balanceEur, toCode)}</Text>
            </View>
          </View>
        )}

        <PressableScale style={styles.convertBtn} scaleTo={0.95} onPress={handleConvert}>
          <MaterialCommunityIcons name="swap-horizontal" size={20} color="#fff" />
          <Text style={styles.convertBtnText}>Convert Balance</Text>
        </PressableScale>
        </MotionView>

        {/* Notifications */}
        <MotionView from="down" delay={240}>
        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>
          {t("settings.notifications")}
        </Text>

        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={20}
              color={colors.accent}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>{t("settings.allowNotifications")}</Text>
          </View>

          <Switch
            value={notifications}
            onValueChange={toggleNotifications}
            trackColor={{ false: "#ccc", true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        </MotionView>
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
      paddingTop: 55,
      paddingHorizontal: 20,
      paddingBottom: 15,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: c.onPrimary,
    },

    contentScroll: {
      flex: 1,
    },
    content: {
      padding: 20,
      paddingBottom: 50,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.accent,
      marginBottom: 15,
    },

    optionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },

    optionLeft: {
      flexDirection: "row",
      alignItems: "center",
    },

    optionIcon: {
      marginRight: 12,
    },

    optionText: {
      fontSize: 15,
      color: c.text,
    },

    curHint: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 12,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    curRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    curPill: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderWidth: 2,
      borderColor: "transparent",
    },
    curPillActive: {
      borderColor: c.accent,
      backgroundColor: c.card,
    },
    curPillText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    curPillTextActive: {
      color: c.accent,
    },
    curPreview: {
      marginTop: 18,
      padding: 16,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    curPreviewLabel: {
      fontSize: 11,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: c.textMuted,
      marginBottom: 8,
    },
    curPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    curPreviewFrom: {
      fontSize: 18,
      fontWeight: "600",
      color: c.textSecondary,
    },
    curPreviewTo: {
      fontSize: 22,
      fontWeight: "800",
      color: c.accent,
    },
    convertBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primary,
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 18,
    },
    convertBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
  });
