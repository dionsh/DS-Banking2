import { useRef, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import CreditComponent from "../components/CreditComponent";
import InfoAccordion from "../components/InfoAccordion";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";


export default function Credit() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { width } = Dimensions.get("window");

  const flatRef = useRef();

  const [index, setIndex] = useState(0);
  const [amount, setAmount] = useState(10000);
  const [months, setMonths] = useState(24);

  const cards = [
    {
      title: t("credit.card1Title"),
      text: t("credit.card1Text")
    },
    {
      title: t("credit.card2Title"),
      text: t("credit.card2Text")
    },
    {
      title: t("credit.card3Title"),
      text: t("credit.card3Text")
    }
  ];

  // AUTO SLIDE
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (index + 1) % cards.length;
      flatRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true
      });
      setIndex(nextIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, [index]);

  // Kalkulimi i kreditit
  const interest = 0.06;
  const monthlyRate = interest / 12;

  const monthlyPayment =
    (amount * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -months));

  // ---- Credit application flow: confirm -> enter PIN -> verify -> hold ----
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Step 1: ask the user to confirm they want to take the credit.
  const handleApply = () => {
    Alert.alert(
      "Take Credit",
      `Are you sure you want to take a credit of €${Math.round(amount)} over ${months} months?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => { setPin(""); setPinModalVisible(true); } },
      ]
    );
  };

  // Step 2: verify the entered PIN against the backend, then put the application
  // "on hold".
  const confirmPin = async () => {
    if (verifying) return;
    if (pin.length !== 4) {
      Alert.alert("PIN", "Please enter your 4-digit PIN.");
      return;
    }
    setVerifying(true);
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) {
        Alert.alert("Error", "You need to be logged in.");
        return;
      }
      const res = await fetch(`${API_BASE}/verify_pin.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: stored.user_id, pin }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setPinModalVisible(false);
        setPin("");
        Alert.alert(
          "Credit on hold",
          "Your credit application has been received and is now on hold. You will get a confirmation within a few days."
        );
      } else {
        Alert.alert("Incorrect PIN", data.message || "The PIN you entered is wrong.");
      }
    } catch (err) {
      console.log("verify_pin error:", err);
      Alert.alert("Connection error", "Could not reach the server. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={26} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerText}>{t("credit.title")}</Text>
      </View>

      <View style={styles.logoRow}>
        <Image
          source={require("../../assets/images/dsbanklogotr.png")}
          style={styles.logo}
        />
        <Text style={styles.logoText}>DS Banking</Text>
      </View>

      <FlatList
        ref={flatRef}
        data={cards}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={{ width: width, paddingHorizontal: 16 }}>
            <CreditComponent title={item.title} text={item.text} />
          </View>
        )}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(
            e.nativeEvent.contentOffset.x / width
          );
          setIndex(newIndex);
        }}
      />

      <View style={styles.dots}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              index === i && styles.activeDot
            ]}
          />
        ))}
      </View>


      <Text style={styles.sectionTitle}>{t("credit.calculate")}</Text>

      <View style={styles.calcCard}>
        <Text style={styles.label}>{t("credit.amountLabel", { amount: Math.round(amount) })}</Text>

        <Slider
          minimumValue={1000}
          maximumValue={50000}
          step={500}
          value={amount}
          onValueChange={setAmount}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
        />

        <Text style={styles.label}>
          {t("credit.repaymentLabel", { months })}
        </Text>

        <Slider
          minimumValue={6}
          maximumValue={72}
          step={6}
          value={months}
          onValueChange={setMonths}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
        />

        <View style={styles.resultBox}>
  <Text style={styles.resultText}>{t("credit.monthlyPayment")}</Text>
  <Text style={styles.resultAmount}>
    €{monthlyPayment.toFixed(2)}
  </Text>
</View>

<TouchableOpacity style={styles.applyButton} onPress={handleApply}>
  <Text style={styles.applyText}>{t("credit.apply")}</Text>
</TouchableOpacity>

      </View>


<Text style={styles.sectionTitle}>
  {t("credit.beforeApplying")}
</Text>

<View style={styles.infoCard}>
  <InfoAccordion
    title={t("credit.req1Title")}
    text={t("credit.req1Text")}
  />

  <InfoAccordion
    title={t("credit.req2Title")}
    text={t("credit.req2Text")}
  />

  <InfoAccordion
    title={t("credit.req3Title")}
    text={t("credit.req3Text")}
  />

  <InfoAccordion
    title={t("credit.req4Title")}
    text={t("credit.req4Text")}
  />


   <InfoAccordion
    title={t("credit.req5Title")}
    text={t("credit.req5Text")}
  />

  <InfoAccordion
    title={t("credit.req6Title")}
    text={t("credit.req6Text")}
  />
</View>


      <View style={{ height: 60 }} />

      {/* PIN confirmation modal for taking credit */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pinCard}>
            <MaterialCommunityIcons name="lock-outline" size={34} color={colors.accent} />
            <Text style={styles.pinTitle}>Enter your PIN</Text>
            <Text style={styles.pinSub}>
              Confirm your 4-digit PIN to apply for this credit.
            </Text>

            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/[^0-9]/g, ""))}
              secureTextEntry
              autoFocus
              placeholder="••••"
              placeholderTextColor={colors.placeholder}
              textAlign="center"
            />

            <View style={styles.pinButtons}>
              <TouchableOpacity
                style={[styles.pinBtn, styles.pinCancel]}
                onPress={() => { setPinModalVisible(false); setPin(""); }}
                disabled={verifying}
              >
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pinBtn, styles.pinConfirm]}
                onPress={confirmPin}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.pinConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
      backgroundColor: c.primary,
      paddingTop: 55,
      paddingBottom: 18,
      paddingHorizontal: 16,
    },

    headerText: {
      color: "white",
      fontSize: 18,
      fontWeight: "600",
      marginLeft: 16,
    },

    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },

    logo: {
      width: 40,
      height: 40,
      resizeMode: "contain",
      marginRight: 10,
    },

    logoText: {
      fontSize: 18,
      fontWeight: "bold",
      color: c.accent,
    },

   dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 12,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.border,
    marginHorizontal: 4,
  },

  activeDot: {
    backgroundColor: c.accent,
    width: 18,
  },

    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginLeft: 16,
      marginRight: 16,
      marginBottom: 16,
      marginTop: 32,
      color: c.accent,
    },

    calcCard: {
      backgroundColor: c.card,
      marginHorizontal: 16,
      padding: 18,
      borderRadius: 14,
      elevation: 3,
    },

    label: {
      marginTop: 10,
      marginBottom: 6,
      fontWeight: "600",
      color: c.text,
    },

    resultBox: {
      marginTop: 18,
      backgroundColor: c.surfaceAlt,
      padding: 14,
      borderRadius: 10,
      alignItems: "center",
    },

    resultText: {
      color: c.textSecondary,
    },

    resultAmount: {
      fontSize: 22,
      fontWeight: "bold",
      color: c.accent,
      marginTop: 4,
    },

    applyButton: {
    backgroundColor: c.primary,
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderRadius: 10,
    marginTop: 14,
  },

  applyText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },

  infoCard: {
    backgroundColor: c.card,
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
    elevation: 2,
    marginBottom: 30,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  pinCard: {
    width: "100%",
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  pinTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: c.text,
    marginTop: 10,
  },
  pinSub: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 19,
  },
  pinInput: {
    width: 160,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: c.inputBorder,
    backgroundColor: c.inputBg,
    color: c.text,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 10,
    marginBottom: 22,
  },
  pinButtons: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
  },
  pinBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pinCancel: {
    backgroundColor: c.surfaceAlt,
  },
  pinCancelText: {
    color: c.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  pinConfirm: {
    backgroundColor: c.primary,
  },
  pinConfirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  });
