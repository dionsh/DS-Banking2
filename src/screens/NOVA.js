import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

// type -> translation key for the quick-question chips and their replies.
const QUICK_ACTIONS = [
  { type: "balance", labelKey: "nova.qBalance" },
  { type: "expiry", labelKey: "nova.qExpiry" },
  { type: "account", labelKey: "nova.qAccount" },
  { type: "cvv", labelKey: "nova.qCvv" },
  { type: "card", labelKey: "nova.qCard" },
];

export default function NOVA() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [loadingReply, setLoadingReply] = useState(false);
  const [input, setInput] = useState("");

  const listRef = useRef(null);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) return;

      const parsed = JSON.parse(stored);
      setUser(parsed);

      setMessages([
        {
          id: 1,
          sender: "bot",
          text: t("nova.greeting", { name: parsed.name }),
        },
      ]);
    };

    loadUser();
  }, []);

  // fetch kartelen edhe acc t userit
  const fetchCardData = async () => {
    if (cardData || !user?.user_id) return cardData;

    try {
      const res = await fetch(`${API_BASE}/get_card.php?user_id=${user.user_id}`);
      const data = await res.json();

      if (data.status === "success") {
        setCardData(data.card);
        return data.card;
      }
    } catch (err) {
      console.log("NOVA FETCH ERROR:", err);
    }
    return null;
  };

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), sender, text }]);
  };

  // Quick buttons: deterministic account answers, resolved on the client from
  // get_card.php (sensitive data never goes through the AI).
  const handleAction = async (type, label) => {
    if (loadingReply) return;
    addMessage("user", label);
    setLoadingReply(true);

    let data = cardData || (await fetchCardData());

    setTimeout(() => {
      let reply = t("nova.genericError");

      if (!data) {
        reply = t("nova.noData");
      } else {
        switch (type) {
          case "balance":
            reply = t("nova.balanceReply", { balance: data.balance });
            break;
          case "expiry":
            reply = t("nova.expiryReply", { expiry: data.expiry_date });
            break;
          case "account":
            reply = t("nova.accountReply", { account: data.account_number });
            break;
          case "cvv":
            reply = t("nova.cvvReply", { cvv: data.cvv });
            break;
          case "card":
            reply = t("nova.cardReply", { card: data.card_number });
            break;
        }
      }

      addMessage("bot", reply);
      setLoadingReply(false);
    }, 800);
  };

  // Free-text questions: routed to nova_chat.php, which answers account-data
  // questions from the DB and everything else via the (banking-only) AI.
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loadingReply) return;

    // Snapshot the recent conversation BEFORE appending the new message.
    const history = messages.slice(-8).map((m) => ({ sender: m.sender, text: m.text }));

    addMessage("user", text);
    setInput("");
    setLoadingReply(true);

    try {
      const res = await fetch(`${API_BASE}/nova_chat.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.user_id,
          message: text,
          history,
        }),
      });
      const data = await res.json();
      const reply = data?.reply || t("nova.processError");
      addMessage("bot", reply);
    } catch (err) {
      console.log("NOVA chat error:", err);
      addMessage("bot", t("nova.connError"));
    } finally {
      setLoadingReply(false);
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === "user" ? styles.userBubble : styles.botBubble,
      ]}
    >
      <Text style={item.sender === "user" ? styles.userText : styles.botText}>
        {item.text}
      </Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.primary }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <MaterialCommunityIcons name="menu" size={28} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>NOVA</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 15 }}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        {loadingReply && (
          <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.typingText}>{t("nova.typing")}</Text>
          </View>
        )}

        <View style={styles.bottomArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_ACTIONS.map((q) => (
              <TouchableOpacity
                key={q.type}
                style={styles.quickBtn}
                onPress={() => handleAction(q.type, t(q.labelKey))}
                disabled={loadingReply}
              >
                <Text style={styles.quickText}>{t(q.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t("nova.placeholder")}
              placeholderTextColor={colors.placeholder}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              editable={!loadingReply}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!input.trim() || loadingReply) && styles.sendBtnDisabled,
              ]}
              onPress={sendMessage}
              disabled={!input.trim() || loadingReply}
            >
              <MaterialCommunityIcons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
      paddingTop: 12,
      paddingBottom: 22,
      paddingHorizontal: 20,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
    },

    headerTitle: {
      position: "absolute",
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "700",
      color: "white",
      letterSpacing: 1,
    },

    messageBubble: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 18,
      marginVertical: 6,
      maxWidth: "80%",
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },

    botBubble: {
      backgroundColor: c.card,
      alignSelf: "flex-start",
      borderTopLeftRadius: 5,
    },

    userBubble: {
      backgroundColor: c.primary,
      alignSelf: "flex-end",
      borderTopRightRadius: 5,
    },

    botText: {
      color: c.text,
      fontSize: 15,
      lineHeight: 20,
    },

    userText: {
      color: "white",
      fontSize: 15,
      lineHeight: 20,
    },

    typingBubble: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 15,
      paddingVertical: 10,
    },
    typingText: {
      color: c.textSecondary,
      fontSize: 14,
      marginLeft: 8,
      fontStyle: "italic",
    },

    bottomArea: {
      paddingHorizontal: 15,
      paddingTop: 12,
      paddingBottom: 18,
      backgroundColor: c.card,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 10,
    },

    quickRow: {
      paddingBottom: 12,
      gap: 8,
    },

    quickBtn: {
      backgroundColor: c.surfaceAlt,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
    },

    quickText: {
      fontWeight: "600",
      fontSize: 13,
      color: c.accent,
    },

    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
    },

    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 120,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingTop: Platform.OS === "ios" ? 13 : 8,
      paddingBottom: Platform.OS === "ios" ? 13 : 8,
      fontSize: 15,
      color: c.text,
    },

    sendBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    sendBtnDisabled: {
      opacity: 0.45,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.background,
    },
  });
