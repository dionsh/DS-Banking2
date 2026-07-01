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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function Transfer() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [sender, setSender] = useState({});
  const [amount, setAmount] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverSurname, setReceiverSurname] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [message, setMessage] = useState("");

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

  const handleTransfer = async () => {
    if (!amount || (!receiverEmail && !receiverName && !receiverSurname)) {
      Alert.alert(t("common.error"), t("transfer.fillInfo"));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/transfer.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: sender.user_id,
          amount: parseFloat(amount),
          receiver_email: receiverEmail,
          receiver_name: receiverName,
          receiver_surname: receiverSurname,
          message,
        }),
      });

      const data = await response.json();

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

        <Text style={styles.label}>{t("transfer.receiverEmail")}</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor={colors.placeholder}
          keyboardType="email-address"
          value={receiverEmail}
          onChangeText={setReceiverEmail}
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
  });
