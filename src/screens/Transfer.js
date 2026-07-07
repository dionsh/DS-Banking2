import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { confirmOverBudget } from "../utils/budgetGuard";

export default function Transfer() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [sender, setSender] = useState({});
  const [amount, setAmount] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverSurname, setReceiverSurname] = useState("");
  const [receiverAccount, setReceiverAccount] = useState("");
  const [message, setMessage] = useState("");

  // Shown grouped in 4s ("1234 5678 9012 3456") but stored digits-only.
  const formatAccountNumber = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };
  const accountDigits = receiverAccount.replace(/\s/g, "");

  // PIN confirmation
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const fetchSender = async () => {
      const user = JSON.parse(await AsyncStorage.getItem("user"));
      if (!user) return;
      setSender({
  user_id: user.user_id,
  name: user.name,
  surname: user.surname,
  email: user.email,
  account_number: user.account_number,
  balance: user.balance,
});

    };
    fetchSender();
  }, []);

  // Step 1: validate the form, then ask for the PIN.
  const handleTransfer = async () => {
    if (!amount || !accountDigits || !receiverName.trim() || !receiverSurname.trim()) {
      Alert.alert(t("common.error"), t("transfer.fillInfo"));
      return;
    }
    if (accountDigits.length !== 16) {
      Alert.alert(t("common.error"), t("transfer.invalidAccount"));
      return;
    }
    if (sender.account_number && accountDigits === String(sender.account_number)) {
      Alert.alert(t("common.error"), t("transfer.ownAccount"));
      return;
    }
    // Warn (but don't block) if this transfer would go over the user's monthly
    // "Transfers" budget — asked before the PIN step so they can back out early.
    const okBudget = await confirmOverBudget({
      userId: sender.user_id,
      category: "Transfers",
      amount: parseFloat(amount),
    });
    if (!okBudget) return;
    setPin("");
    setPinModalVisible(true);
  };

  // Step 2: verify the PIN against the backend, then send the transfer.
  const confirmPin = async () => {
    if (pin.length !== 4) {
      Alert.alert(t("common.error"), t("login.fillFields"));
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/verify_pin.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: sender.user_id, pin }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        setPin("");
        Alert.alert(t("common.error"), data.message || "Wrong PIN");
        setVerifying(false);
        return;
      }
      // PIN correct -> proceed with the actual transfer.
      await sendTransfer();
    } catch (err) {
      console.log(err);
      Alert.alert(t("common.error"), t("common.somethingWrong"));
    }
    setVerifying(false);
  };

  // Step 3: the actual money transfer (runs only after the PIN is verified).
  const sendTransfer = async () => {
    try {
      const response = await fetch(`${API_BASE}/transfer.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: sender.user_id,
          amount: parseFloat(amount),
          receiver_account_number: accountDigits,
          receiver_name: receiverName.trim(),
          receiver_surname: receiverSurname.trim(),
          message,
        }),
      });

      const data = await response.json();

      // Close the PIN modal before showing the result.
      setPinModalVisible(false);

      if (data.status === "success") {
        // E bane update balancen e njerit qe dergon pare lokalisht
        const updatedUser = {
          ...sender,
          balance: parseFloat(sender.balance) - parseFloat(amount),

        };

        // E run updated user n AsyncStorage
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

        // e ban update local state
        setSender(updatedUser);

        // i tregon userit a u ba transfer me sukses a qysh
        Alert.alert(t("common.success"), data.message, [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert(t("common.error"), data.message);
      }
    } catch (error) {
      console.log(error);
      setPinModalVisible(false);
      Alert.alert(t("common.error"), t("common.somethingWrong"));
    }
  };

  return (
  <SafeAreaView style={styles.container}>

    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.openDrawer()}>
        <MaterialCommunityIcons name="menu" size={28} color={colors.accent} />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>{t("transfer.title")}</Text>

      <View style={{ width: 28 }} />
    </View>

    <ScrollView
      contentContainerStyle={styles.formContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>

      <Text style={styles.label}>{t("transfer.amount")}</Text>
<TextInput
  style={[styles.input, {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center"
  }]}
  keyboardType="numeric"
  placeholder="0.00 EUR"
  placeholderTextColor={colors.placeholder}
  value={amount}
  onChangeText={setAmount}
/>

        <Text style={styles.label}>{t("transfer.receiverName")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("common.name")}
          placeholderTextColor={colors.placeholder}
          value={receiverName}
          onChangeText={setReceiverName}
        />

        <Text style={styles.label}>{t("transfer.receiverSurname")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("common.surname")}
          placeholderTextColor={colors.placeholder}
          value={receiverSurname}
          onChangeText={setReceiverSurname}
        />

        <Text style={styles.label}>{t("transfer.receiverAccount")}</Text>
        <TextInput
          style={[styles.input, { letterSpacing: 1.5 }]}
          placeholder="1234 5678 9012 3456"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={19}
          value={receiverAccount}
          onChangeText={(v) => setReceiverAccount(formatAccountNumber(v))}
        />

        <Text style={styles.label}>{t("transfer.messageOptional")}</Text>
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder={t("transfer.addNote")}
          placeholderTextColor={colors.placeholder}
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <TouchableOpacity style={styles.button} onPress={handleTransfer}>
          <Text style={styles.buttonText}>{t("transfer.sendTransfer")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

    {/* PIN confirmation before sending money */}
    <Modal
      visible={pinModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => !verifying && setPinModalVisible(false)}
    >
      <View style={styles.pinBackdrop}>
        <View style={styles.pinCard}>
          <View style={styles.pinIconWrap}>
            <MaterialCommunityIcons name="lock-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.pinTitle}>{t("login.enterPin")}</Text>
          <Text style={styles.pinSubtitle}>
            Confirm your transfer of {amount || "0"} EUR
          </Text>

          <TextInput
            style={styles.pinInput}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <View style={styles.pinBtnRow}>
            <TouchableOpacity
              style={styles.pinCancel}
              onPress={() => setPinModalVisible(false)}
              disabled={verifying}
            >
              <Text style={styles.pinCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pinConfirm}
              onPress={confirmPin}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.pinConfirmText}>Confirm & Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
);
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingTop: 25,
      paddingBottom: 20,
    },

    headerTitle: {
      fontSize: 22,
      fontWeight: "600",
      color: c.text,
      letterSpacing: 0.5,
    },

    formContainer: {
      paddingHorizontal: 24,
      paddingBottom: 50,
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 28,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },

    label: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 20,
      marginBottom: 8,
      letterSpacing: 1,
    },

    input: {
      backgroundColor: c.inputBg,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 16,
      fontSize: 15,
      borderWidth: 1,
      borderColor: c.inputBorder,
      color: c.text,
    },

    button: {
      backgroundColor: c.primary,
      paddingVertical: 18,
      borderRadius: 16,
      marginTop: 35,
      shadowColor: c.primary,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },

    buttonText: {
      color: "#FFFFFF",
      textAlign: "center",
      fontWeight: "600",
      fontSize: 16,
      letterSpacing: 1,
    },

    // PIN modal
    pinBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      paddingHorizontal: 30,
    },
    pinCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 26,
      alignItems: "center",
    },
    pinIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    pinTitle: { fontSize: 19, fontWeight: "800", color: c.text },
    pinSubtitle: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 6,
      marginBottom: 20,
      textAlign: "center",
    },
    pinInput: {
      width: "70%",
      textAlign: "center",
      fontSize: 26,
      letterSpacing: 12,
      paddingVertical: 10,
      color: c.text,
      borderBottomWidth: 2,
      borderBottomColor: c.inputBorder,
      marginBottom: 24,
    },
    pinBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
    pinCancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
    },
    pinCancelText: { color: c.text, fontWeight: "700", fontSize: 15 },
    pinConfirm: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: c.primary,
    },
    pinConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
