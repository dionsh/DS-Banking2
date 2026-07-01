import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../currency/CurrencyContext";

export default function UserCard({ fullName, cardNumber, balance, userId, navigation }){
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { format } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {t("card.greeting", { name: fullName || "User" })}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardNumber}>
          {formatCardNumber(cardNumber)}
        </Text>

        <View style={styles.balanceContainer}>
          <Text style={styles.balance}>
            {format(balance)}
          </Text>
          <MaterialCommunityIcons name="eye-off-outline" size={20} color={colors.accent} />
        </View>

        <Text style={styles.ibanText}>
          {formatCardNumber(cardNumber)}
        </Text>

        <View style={styles.buttonsRow}>
        <TouchableOpacity
  style={[styles.button, { backgroundColor: colors.primary }]}
  onPress={() => navigation.navigate("TopUp", { user_id: userId })}
>
            <MaterialCommunityIcons name="phone-plus" size={18} color="#FFF" />
            <Text style={[styles.buttonText, { color: '#FFF' }]}>{t("card.topup")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.surfaceAlt }]}>
            <MaterialCommunityIcons name="hands-pray" size={18} color={colors.accent} />
            <Text style={[styles.buttonText, { color: colors.accent }]}>KUIK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* Pjesa e kodit per formatter */
function formatCardNumber(number) {
  if (!number) return "0000 0000 0000 0000";
  return String(number).replace(/(\d{4})/g, "$1 ").trim();
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { marginTop: 10, paddingHorizontal: 20 },
    greeting: { fontSize: 18, fontWeight: "bold", marginBottom: 15, color: c.accent },

    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 20,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },

    cardNumber: { fontSize: 14, color: c.textSecondary, marginBottom: 5 },

    balanceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },

    balance: { fontSize: 28, fontWeight: "bold", marginRight: 10, color: c.accent },
    ibanText: { fontSize: 14, color: c.accent, marginBottom: 20 },
    buttonsRow: { flexDirection: "row", gap: 10 },

    button: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8
    },
    buttonText: { fontWeight: "bold", fontSize: 14 },
  });
