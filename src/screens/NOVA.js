import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
// Voice: expo-audio records the question, nova_transcribe.php (Whisper) turns
// it into text; expo-speech reads NOVA's replies aloud when the toggle is on.
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { MotionView, PressableScale, Pulse } from "../components/motion";

// type -> translation key for the quick-question chips and their replies.
const QUICK_ACTIONS = [
  { type: "balance", labelKey: "nova.qBalance" },
  { type: "expiry", labelKey: "nova.qExpiry" },
  { type: "account", labelKey: "nova.qAccount" },
  { type: "cvv", labelKey: "nova.qCvv" },
  { type: "card", labelKey: "nova.qCard" },
];

// Chips for NOVA's real banking actions: tapping one simply sends the phrase
// through the normal chat flow, where the backend detects the action.
const ACTION_CHIPS = [
  { label: "❄️ Freeze card", text: "Freeze my card" },
  { label: "🧾 Transactions", text: "Show my recent transactions" },
  { label: "🎯 Budget status", text: "How are my budgets?" },
  { label: "📈 My portfolio", text: "Show my portfolio" },
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
  const [recording, setRecording] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const speakEnabledRef = useRef(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const listRef = useRef(null);

  // Stop any ongoing speech when leaving the screen.
  useEffect(() => {
    return () => Speech.stop();
  }, []);

  const toggleSpeak = () => {
    setSpeakEnabled((prev) => {
      const next = !prev;
      speakEnabledRef.current = next;
      if (!next) Speech.stop();
      return next;
    });
  };

  const speakReply = (text) => {
    if (!speakEnabledRef.current || !text) return;
    Speech.stop();
    Speech.speak(text, { rate: 1.0, pitch: 1.0 });
  };

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

  // extra can carry an `action` (confirmable NOVA action) for bot messages.
  const addMessage = (sender, text, extra = {}) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), sender, text, ...extra }]);
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
      speakReply(reply);
      setLoadingReply(false);
    }, 800);
  };

  // Free-text questions: routed to nova_chat.php, which answers account-data
  // questions from the DB and everything else via the (banking-only) AI.
  // Accepts an optional text argument so voice input can send directly.
  const sendMessage = async (textArg) => {
    const text = (typeof textArg === "string" ? textArg : input).trim();
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

      if (data?.action?.type === "navigate" && data.action.target) {
        // NOVA opens the screen for the user.
        addMessage("bot", reply);
        speakReply(reply);
        setTimeout(() => {
          try {
            navigation.navigate(data.action.target);
          } catch (e) {
            console.log("NOVA navigate error:", e);
          }
        }, 700);
      } else if (data?.action?.confirm) {
        // State-changing action: show Yes / No buttons under the question.
        addMessage("bot", reply, { action: data.action });
        speakReply(reply);
      } else {
        addMessage("bot", reply);
        speakReply(reply);
      }
    } catch (err) {
      console.log("NOVA chat error:", err);
      addMessage("bot", t("nova.connError"));
    } finally {
      setLoadingReply(false);
    }
  };

  // Yes / No pressed on a confirmable action bubble.
  const handleConfirm = async (msg, yes) => {
    // Lock the buttons on that message first.
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, resolved: yes ? "yes" : "no" } : m))
    );

    if (!yes) {
      const reply = "Okay, no changes made. Anything else I can help with? 😊";
      addMessage("bot", reply);
      speakReply(reply);
      return;
    }

    setLoadingReply(true);
    try {
      const res = await fetch(`${API_BASE}/nova_action.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.user_id,
          action: msg.action.type,
          params: msg.action.params || {},
        }),
      });
      const data = await res.json();
      const reply =
        data?.status === "success"
          ? data.reply
          : data?.message || "Sorry, that didn't work. Please try again.";
      addMessage("bot", reply);
      speakReply(reply);
    } catch (err) {
      console.log("NOVA action error:", err);
      addMessage("bot", t("nova.connError"));
    } finally {
      setLoadingReply(false);
    }
  };

  // ---- voice input: record -> upload -> Whisper transcription -> send ----

  const startRecording = async () => {
    if (loadingReply || recording) return;
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Microphone needed",
          "Allow microphone access in your settings to talk to NOVA."
        );
        return;
      }
      Speech.stop();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (err) {
      console.log("NOVA record error:", err);
      Alert.alert("Recording error", "Couldn't start the microphone. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(false);
    setLoadingReply(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      const uri = recorder.uri;
      if (!uri) throw new Error("No recording produced");

      const form = new FormData();
      form.append("audio", { uri, name: "voice.m4a", type: "audio/m4a" });
      form.append("user_id", String(user?.user_id ?? ""));

      const res = await fetch(`${API_BASE}/nova_transcribe.php`, {
        method: "POST",
        body: form, // fetch sets the multipart boundary itself
      });
      const data = await res.json();

      setLoadingReply(false);
      if (data?.status === "success" && data.text) {
        sendMessage(data.text);
      } else {
        addMessage("bot", data?.message || "I couldn't hear that clearly — please try again.");
      }
    } catch (err) {
      console.log("NOVA transcribe error:", err);
      setLoadingReply(false);
      addMessage("bot", "I couldn't process your voice message. Please try again.");
    }
  };

  const renderItem = ({ item }) => (
    // Each new message springs up into the thread as it arrives.
    <MotionView
      from="down"
      distance={12}
      spring
      style={[
        styles.messageBubble,
        item.sender === "user" ? styles.userBubble : styles.botBubble,
      ]}
    >
      <Text style={item.sender === "user" ? styles.userText : styles.botText}>
        {item.text}
      </Text>

      {/* Yes / No confirmation buttons for NOVA actions */}
      {item.action?.confirm &&
        (item.resolved ? (
          <Text style={styles.confirmResolved}>
            {item.resolved === "yes" ? "✓ Confirmed" : "✕ Cancelled"}
          </Text>
        ) : (
          <View style={styles.confirmRow}>
            <PressableScale
              style={styles.yesBtn}
              scaleTo={0.93}
              onPress={() => handleConfirm(item, true)}
              disabled={loadingReply}
            >
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
              <Text style={styles.yesText}>Yes</Text>
            </PressableScale>
            <PressableScale
              style={styles.noBtn}
              scaleTo={0.93}
              onPress={() => handleConfirm(item, false)}
              disabled={loadingReply}
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.dangerText} />
              <Text style={styles.noText}>No</Text>
            </PressableScale>
          </View>
        ))}
    </MotionView>
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
          <PressableScale
            scaleTo={0.85}
            hitSlop={8}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <MaterialCommunityIcons name="menu" size={28} color="white" />
          </PressableScale>

          <Text style={styles.headerTitle}>NOVA</Text>
          <PressableScale scaleTo={0.85} hitSlop={8} onPress={toggleSpeak}>
            <MaterialCommunityIcons
              name={speakEnabled ? "volume-high" : "volume-off"}
              size={26}
              color={speakEnabled ? "#8E95F2" : "white"}
            />
          </PressableScale>
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
          <MotionView from="down" distance={8} style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.typingText}>{t("nova.typing")}</Text>
          </MotionView>
        )}

        <View style={styles.bottomArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_ACTIONS.map((q) => (
              <PressableScale
                key={q.type}
                style={styles.quickBtn}
                scaleTo={0.92}
                onPress={() => handleAction(q.type, t(q.labelKey))}
                disabled={loadingReply}
              >
                <Text style={styles.quickText}>{t(q.labelKey)}</Text>
              </PressableScale>
            ))}
            {ACTION_CHIPS.map((q) => (
              <PressableScale
                key={q.label}
                style={styles.quickBtn}
                scaleTo={0.92}
                onPress={() => sendMessage(q.text)}
                disabled={loadingReply}
              >
                <Text style={styles.quickText}>{q.label}</Text>
              </PressableScale>
            ))}
          </ScrollView>

          <View style={styles.inputBar}>
            {/* Pulses while NOVA is listening */}
            <Pulse enabled={recording} maxScale={1.12}>
              <PressableScale
                style={[styles.micBtn, recording && styles.micBtnActive]}
                scaleTo={0.88}
                onPress={recording ? stopRecording : startRecording}
                disabled={loadingReply && !recording}
              >
                <MaterialCommunityIcons
                  name={recording ? "stop" : "microphone"}
                  size={22}
                  color={recording ? "white" : colors.accent}
                />
              </PressableScale>
            </Pulse>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={recording ? "Listening... tap ■ when done" : t("nova.placeholder")}
              placeholderTextColor={recording ? colors.dangerText : colors.placeholder}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
              editable={!loadingReply && !recording}
              multiline
            />
            <PressableScale
              style={[
                styles.sendBtn,
                (!input.trim() || loadingReply) && styles.sendBtnDisabled,
              ]}
              scaleTo={0.88}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loadingReply}
            >
              <MaterialCommunityIcons name="send" size={20} color="white" />
            </PressableScale>
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

    confirmRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    yesBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 22,
    },
    yesText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    noBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: c.danger,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 22,
    },
    noText: { color: c.dangerText, fontWeight: "700", fontSize: 14 },
    confirmResolved: {
      marginTop: 10,
      fontSize: 12.5,
      fontWeight: "700",
      color: c.textMuted,
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

    micBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },

    micBtnActive: {
      backgroundColor: c.danger,
      borderColor: c.danger,
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
