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
import {
  useCurrency,
  formatRawIn,
  currencyByCode,
  EXCHANGE_FEE_PCT,
} from "../currency/CurrencyContext";
import { MotionView, PressableScale, SuccessOverlay } from "../components/motion";

export default function Settings() {
  const navigation = useNavigation();
  const { theme, colors, setTheme } = useTheme();
  const { t, language, setLanguage, languages } = useLanguage();
  const { code: activeCurrency, currencies, setCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [notifications, setNotifications] = useState(true);

  // Currency converter state. The balance is always stored in EUR in the DB;
  // converting switches the DISPLAY currency and charges a real 0.5% exchange
  // fee via the backend (convert_currency.php), which records the conversion.
  const [userId, setUserId] = useState(null);
  const [balanceEur, setBalanceEur] = useState(null);
  const [fromCode, setFromCode] = useState(activeCurrency);
  const [toCode, setToCode] = useState(activeCurrency === "EUR" ? "USD" : "EUR");
  const [converting, setConverting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null); // {received, fee} after a conversion
  const [history, setHistory] = useState([]);

  // Keep the "convert from" selection in sync with the currency currently in use.
  useEffect(() => {
    setFromCode(activeCurrency);
  }, [activeCurrency]);

  // Load the user's notification preference, the current (EUR) balance for the
  // live quote, and the recent conversion history.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = JSON.parse(await AsyncStorage.getItem("user"));
          if (!stored) return;
          setUserId(stored.user_id);

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

          const convRes = await fetch(`${API_BASE}/get_conversions.php?user_id=${stored.user_id}`);
          const convData = await convRes.json();
          if (convData.status === "success") {
            setHistory(convData.conversions || []);
          }
        } catch (err) {
          console.log("Settings load error:", err);
        }
      })();
    }, [])
  );

  // Live quote for the current from -> to pair. Mirrors the backend math
  // (convert_currency.php is the source of truth when executing).
  const round2 = (n) => Math.round(n * 100) / 100;
  const quote = useMemo(() => {
    if (balanceEur == null || fromCode === toCode) return null;
    const from = currencyByCode(fromCode);
    const to = currencyByCode(toCode);
    const rate = to.rate / from.rate;
    const feeEur = round2(balanceEur * (EXCHANGE_FEE_PCT / 100));
    const received = round2((balanceEur - feeEur) * to.rate);
    return {
      rate,
      amountFrom: round2(balanceEur * from.rate),
      feeFrom: round2(feeEur * from.rate),
      received,
    };
  }, [balanceEur, fromCode, toCode]);

  // Confirm, then execute the conversion on the backend: it charges the 0.5%
  // exchange fee to the real (EUR) balance, records the conversion and returns
  // the exact amount received — then the app switches its display currency.
  const handleConvert = () => {
    if (fromCode === toCode) {
      Alert.alert("Currency Converter", "Please choose two different currencies.");
      return;
    }
    if (!userId || balanceEur == null) {
      Alert.alert("Currency Converter", "Your balance is still loading — try again in a moment.");
      return;
    }
    if (!quote || balanceEur <= 0) {
      Alert.alert("Currency Converter", "You have no balance to convert.");
      return;
    }
    Alert.alert(
      "Convert Balance",
      `Convert ${formatRawIn(quote.amountFrom, fromCode)} to ${currencyByCode(toCode).label}?\n\n` +
        `Rate: 1 ${fromCode} = ${quote.rate.toFixed(4)} ${toCode}\n` +
        `Fee (${EXCHANGE_FEE_PCT}%): ${formatRawIn(quote.feeFrom, fromCode)}\n` +
        `You will receive: ${formatRawIn(quote.received, toCode)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Convert",
          onPress: async () => {
            setConverting(true);
            try {
              const res = await fetch(`${API_BASE}/convert_currency.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, from_code: fromCode, to_code: toCode }),
              });
              const data = await res.json();
              if (data.status !== "success") {
                Alert.alert("Couldn't convert", data.message || "Please try again.");
                return;
              }
              await setCurrency(data.to_code);
              setBalanceEur(Number(data.new_balance) || 0);
              setHistory((prev) => [
                {
                  from_code: data.from_code,
                  to_code: data.to_code,
                  rate: data.rate,
                  fee_percent: data.fee_percent,
                  amount_from: data.amount_from,
                  fee_from: data.fee_from,
                  amount_received: data.amount_received,
                  created_at: new Date().toISOString(),
                },
                ...prev,
              ]);
              // Keep the cached user in sync so other screens show the fresh balance.
              try {
                const stored = JSON.parse(await AsyncStorage.getItem("user"));
                if (stored) {
                  await AsyncStorage.setItem(
                    "user",
                    JSON.stringify({ ...stored, balance: Number(data.new_balance) || 0 })
                  );
                }
              } catch (e) {
                // ignore
              }
              setSuccessInfo({
                received: formatRawIn(data.amount_received, data.to_code),
                fee: formatRawIn(data.fee_from, data.from_code),
                toLabel: currencyByCode(data.to_code).label,
              });
            } catch (e) {
              Alert.alert("Connection error", "Please try again.");
            } finally {
              setConverting(false);
            }
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

        {balanceEur != null && fromCode !== toCode && quote && (
          <View style={styles.curPreview}>
            <Text style={styles.curPreviewLabel}>Conversion quote</Text>

            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>You convert</Text>
              <Text style={styles.quoteValue}>{formatRawIn(quote.amountFrom, fromCode)}</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Exchange rate</Text>
              <Text style={styles.quoteValue}>
                1 {fromCode} = {quote.rate.toFixed(4)} {toCode}
              </Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Exchange fee ({EXCHANGE_FEE_PCT}%)</Text>
              <Text style={[styles.quoteValue, { color: colors.danger }]}>
                −{formatRawIn(quote.feeFrom, fromCode)}
              </Text>
            </View>

            <View style={styles.quoteDivider} />

            <View style={styles.quoteRow}>
              <Text style={styles.quoteReceiveLabel}>You receive</Text>
              <Text style={styles.curPreviewTo}>{formatRawIn(quote.received, toCode)}</Text>
            </View>
          </View>
        )}

        {fromCode === toCode && (
          <Text style={styles.sameCurrencyHint}>
            Choose two different currencies to see a conversion quote.
          </Text>
        )}

        <PressableScale
          style={[styles.convertBtn, (converting || fromCode === toCode) && { opacity: 0.6 }]}
          scaleTo={0.95}
          onPress={handleConvert}
          disabled={converting || fromCode === toCode}
        >
          <MaterialCommunityIcons name="swap-horizontal" size={20} color="#fff" />
          <Text style={styles.convertBtnText}>
            {converting ? "Converting..." : "Convert Balance"}
          </Text>
        </PressableScale>

        {history.length > 0 && (
          <View style={styles.convHistory}>
            <Text style={styles.curHint}>Recent conversions</Text>
            {history.slice(0, 3).map((h, i) => (
              <View key={i} style={styles.convRow}>
                <View style={styles.convIconWrap}>
                  <MaterialCommunityIcons
                    name="swap-horizontal-circle"
                    size={22}
                    color={colors.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.convTitle}>
                    {h.from_code} → {h.to_code}
                  </Text>
                  <Text style={styles.convSub}>
                    Rate {Number(h.rate).toFixed(4)} · fee {formatRawIn(h.fee_from, h.from_code)}
                  </Text>
                </View>
                <Text style={styles.convAmount}>{formatRawIn(h.amount_received, h.to_code)}</Text>
              </View>
            ))}
          </View>
        )}
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

      <SuccessOverlay
        visible={!!successInfo}
        title="Conversion complete"
        subtitle={
          successInfo
            ? `You received ${successInfo.received}. Exchange fee: ${successInfo.fee}. Your balance is now shown in ${successInfo.toLabel}.`
            : ""
        }
        cardColor={colors.card}
        textColor={colors.text}
        subTextColor={colors.textSecondary}
        onDone={() => setSuccessInfo(null)}
      />
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
    curPreviewTo: {
      fontSize: 22,
      fontWeight: "800",
      color: c.accent,
    },
    quoteRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
    },
    quoteLabel: {
      fontSize: 13,
      color: c.textSecondary,
    },
    quoteValue: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    quoteDivider: {
      height: 1,
      backgroundColor: c.divider,
      marginTop: 12,
      marginBottom: 4,
    },
    quoteReceiveLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    sameCurrencyHint: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 14,
      textAlign: "center",
    },
    convHistory: {
      marginTop: 22,
    },
    convRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    convIconWrap: {
      marginRight: 10,
    },
    convTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    convSub: {
      fontSize: 11.5,
      color: c.textMuted,
      marginTop: 2,
    },
    convAmount: {
      fontSize: 14,
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
