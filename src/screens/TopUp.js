
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { API_BASE } from "../config";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CountryPicker from "react-native-country-picker-modal";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../currency/CurrencyContext";
import { confirmOverBudget } from "../utils/budgetGuard";
import { MotionView, PressableScale, SuccessOverlay } from "../components/motion";

export default function TopUp() {
  const navigation = useNavigation();
  const route = useRoute();
  const user_id = route.params?.user_id ?? null;

  const { colors } = useTheme();
  const { t } = useLanguage();
  const { format, formatRaw, toEur, code } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [cardData, setCardData] = useState(null);
  const [loadingCard, setLoadingCard] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [countryCode, setCountryCode] = useState("XK");
  const [callingCode, setCallingCode] = useState("+383");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Animated success confirmation (shown instead of a plain alert).
  const [successOpen, setSuccessOpen] = useState(false);
  const [successSummary, setSuccessSummary] = useState("");

  const [amount, setAmount] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverSurname, setReceiverSurname] = useState("");

  const [sending, setSending] = useState(false);

  // fetch t dhanat e karteles
  const fetchCardData = async () => {
    if (!user_id) {
      console.log("No user_id passed to TopUp screen");
      setLoadingCard(false);
      return;
    }

    setLoadingCard(true);
    try {
      const res = await fetch(`${API_BASE}/get_card.php?user_id=${user_id}`);
      const data = await res.json();

      console.log("Card API:", data);

      if (data.status === "success") {
        setCardData(data.card);
      } else {
        Alert.alert(t("common.error"), data.message);
      }
    } catch (err) {
      console.log("Fetch error:", err);
      Alert.alert(t("common.error"), t("topup.failedCard"));
    }
    setLoadingCard(false);
  };

  // fetch kompanite e mbushjeve
  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE}/getCompanies.php`);
      const data = await res.json();

      if (data.status === "success") {
        setCompanies(data.companies);
      } else {
        console.log("Company error:", data);
        setCompanies([]);
      }
    } catch (err) {
      console.log("Company fetch error:", err);
      setCompanies([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCardData();
      fetchCompanies();
    }, [])
  );

  const handleSelectCompany = (companyId) => {
    setSelectedCompany(companyId);
  };

  const handleAmountButton = (value) => {
    setAmount(value.toString());
  };

  const handleConfirm = async () => {
    if (!selectedCompany) return Alert.alert(t("common.error"), t("topup.selectCompany"));
    if (!phoneNumber) return Alert.alert(t("common.error"), t("topup.enterPhone"));
    if (!amount) return Alert.alert(t("common.error"), t("topup.selectAmount"));
    if (!receiverName || !receiverSurname) return Alert.alert(t("common.error"), t("topup.enterReceiver"));

    // Typed in the display currency; balance/budget/backend work in EUR.
    const totalAmount = parseFloat(amount);
    const eurAmount = Math.round(toEur(totalAmount) * 100) / 100;
    if (cardData.balance < eurAmount) return Alert.alert(t("common.error"), t("topup.insufficient"));

    // Warn (but don't block) if this top-up would go over the user's monthly
    // "Phone Top-Ups" budget.
    const okBudget = await confirmOverBudget({ userId: user_id, category: "Top Up", amount: eurAmount });
    if (!okBudget) return;

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/topup.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          company_id: selectedCompany,
          phone_number: `${callingCode} ${phoneNumber}`,
          amount: eurAmount,
          receiver_name: receiverName,
          receiver_surname: receiverSurname,
        }),
      });

      const data = await response.json();
      if (data.status === "success") {
        // Animated confirmation instead of a plain alert.
        setSuccessSummary(`${formatRaw(totalAmount)} → ${callingCode} ${phoneNumber}`);
        setSuccessOpen(true);
        setCardData({ ...cardData, balance: (cardData.balance - eurAmount).toFixed(2) });
        setSelectedCompany(null);
        setPhoneNumber("");
        setAmount("");
        setReceiverName("");
        setReceiverSurname("");
      } else {
        Alert.alert(t("common.error"), data.message);
      }
    } catch (err) {
      console.log(err);
      Alert.alert(t("common.error"), t("topup.failedSend"));
    }
    setSending(false);
  };

  return (
    <View style={styles.container}>

      <SafeAreaView edges={['top']} style={styles.safeAreaTop}>
        <View style={styles.header}>
          <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color="white" />
          </PressableScale>
          <Text style={styles.headerTitle}>{t("menu.topUp")}</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      <View style={styles.contentBody}>
        {loadingCard ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer}>

            {!cardData ? (
              <Text style={{ textAlign: "center", color: colors.textSecondary }}>{t("topup.noCard")}</Text>
            ) : (
              <MotionView from="down" style={styles.cardInfo}>
                <Text style={styles.label}>{t("topup.from")}</Text>
                <Text style={styles.cardNumber}>{cardData.card_number}</Text>
                <Text style={styles.label}>{t("common.balance")}:</Text>
                <Text style={styles.balance}>{format(cardData.balance)}</Text>
              </MotionView>
            )}

            <Text style={[styles.sectionTitle, { textAlign: "left" }]}>{t("topup.chooseCompany")}</Text>
            <View style={styles.companyContainer}>
              {Array.isArray(companies) && companies.map((c) => (
                <PressableScale
                  key={c.id}
                  scaleTo={0.93}
                  onPress={() => handleSelectCompany(c.id)}
                  style={[
                    styles.companyButton,
                    selectedCompany === c.id && { borderColor: colors.accent, borderWidth: 2 },
                  ]}
                >
<Image
  source={{ uri: `${API_BASE}/${c.image_url}` }}
  style={styles.companyImage}
/>
                  <Text style={styles.companyText}>{c.name}</Text>
                </PressableScale>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t("topup.phoneNumber")}</Text>
            <View style={styles.phoneRow}>
              <CountryPicker
                countryCode={countryCode}
                withCallingCode
                withFlag
                withFilter
                onSelect={(country) => {
                  setCountryCode(country.cca2);
                  setCallingCode(`+${country.callingCode[0]}`);
                }}
                containerButtonStyle={styles.countryPicker}
              />
              <TextInput
                placeholder={t("topup.enterPhone")}
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            <Text style={styles.sectionTitle}>{t("topup.sum")}</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder={`0.00 ${code}`}
              placeholderTextColor={colors.placeholder}
              value={amount}
              onChangeText={setAmount}
            />
            <View style={styles.amountButtons}>
              {[1, 3, 5, 10].map((val) => (
                <PressableScale
                  key={val}
                  style={styles.amountButton}
                  scaleTo={0.9}
                  onPress={() => handleAmountButton(val)}
                >
                  <Text style={styles.amountButtonText}>{val} {code}</Text>
                </PressableScale>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t("transfer.receiverName")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("common.name")}
              placeholderTextColor={colors.placeholder}
              value={receiverName}
              onChangeText={setReceiverName}
            />
            <Text style={styles.sectionTitle}>{t("transfer.receiverSurname")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("common.surname")}
              placeholderTextColor={colors.placeholder}
              value={receiverSurname}
              onChangeText={setReceiverSurname}
            />

            <PressableScale style={styles.confirmButton} scaleTo={0.95} onPress={handleConfirm} disabled={sending}>
              <Text style={styles.confirmText}>{sending ? t("topup.sending") : t("common.confirm")}</Text>
            </PressableScale>
          </ScrollView>
        )}
      </View>

      {/* Animated top-up confirmation */}
      <SuccessOverlay
        visible={successOpen}
        title={t("common.success")}
        subtitle={successSummary}
        color={colors.success}
        cardColor={colors.card}
        textColor={colors.text}
        subTextColor={colors.textSecondary}
        onDone={() => setSuccessOpen(false)}
      />
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeAreaTop: { backgroundColor: c.primary },
    contentBody: { flex: 1, backgroundColor: c.background },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    headerTitle: { color: "white", fontSize: 18, fontWeight: "600" },

    scrollContainer: { padding: 20 },

    cardInfo: { marginBottom: 20, alignItems: "center" },
    label: { fontSize: 14, color: c.textSecondary, marginTop: 10 },
    cardNumber: { fontSize: 18, fontWeight: "600", color: c.text, marginTop: 5 },
    balance: { fontSize: 20, fontWeight: "700", color: c.accent },

    sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 10, textAlign: "center", color: c.text },

    companyContainer: {
      flexDirection: "row",
      justifyContent: "flex-start",
      flexWrap: "wrap"
    },

    companyButton: {
      alignItems: "center",
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.card,
      marginRight: 15,
      marginBottom: 10
    },
    companyImage: { width: 80, height: 50, resizeMode: "contain" },
    companyText: { marginTop: 5, fontSize: 14, color: c.text },

    phoneRow: { flexDirection: "row", alignItems: "center" },
    countryPicker: { marginRight: 10 },

    phoneInput: {
      flex: 1,
      backgroundColor: c.inputBg,
      borderRadius: 12,
      padding: 15,
      fontSize: 16,
      textAlign: "center",
      color: c.text,
    },

    amountInput: {
      backgroundColor: c.inputBg,
      borderRadius: 12,
      padding: 15,
      fontSize: 18,
      textAlign: "center",
      color: c.text,
    },
    amountButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    amountButton: {
      flex: 1,
      marginHorizontal: 5,
      backgroundColor: c.card,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    amountButtonText: { fontWeight: "600", color: c.accent },

    input: {
      backgroundColor: c.inputBg,
      borderRadius: 12,
      padding: 15,
      fontSize: 16,
      textAlign: "center",
      color: c.text,
    },

    confirmButton: {
      backgroundColor: c.primary,
      paddingVertical: 18,
      borderRadius: 16,
      marginTop: 30,
      marginBottom: 50,
      alignItems: "center",
    },
    confirmText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  });
