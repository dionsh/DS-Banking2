import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../currency/CurrencyContext";
import { buildStatementHtml } from "../utils/statementHtml";
import { buildReceiptHtml } from "../utils/receiptHtml";
import AnimatedNumber from "../components/AnimatedNumber";
import { AnimatedListItem, MotionView, PressableScale, SkeletonBlock } from "../components/motion";

export default function Transactions() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { format } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [statementHtml, setStatementHtml] = useState("");
  const [sharing, setSharing] = useState(false);

  // Single-transaction receipt (temporary — discarded when the viewer closes).
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState("");
  const [receiptSharing, setReceiptSharing] = useState(false);

  // Open a temporary receipt for one transaction.
  const openReceipt = (tx) => {
    if (!user) return;
    setReceiptHtml(buildReceiptHtml({ user, tx }));
    setReceiptOpen(true);
  };

  // Closing discards the generated receipt so it is no longer accessible.
  const closeReceipt = () => {
    setReceiptOpen(false);
    setReceiptHtml("");
  };

  // Export the currently open receipt as a PDF (generated on demand, not stored).
  const shareReceipt = async () => {
    if (receiptSharing || !receiptHtml) return;
    setReceiptSharing(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: receiptHtml });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Transaction Receipt",
        });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err) {
      console.log("Receipt share error:", err);
      Alert.alert(t("common.error"), "Could not export the receipt.");
    } finally {
      setReceiptSharing(false);
    }
  };

  // Build the statement for ALL of the user's transactions and show it in-app
  // (in a WebView). Viewing is the primary action.
  const openStatement = () => {
    if (!user || transactions.length === 0) {
      Alert.alert("Account Statement", "You don't have any transactions yet.");
      return;
    }
    setStatementHtml(buildStatementHtml({ user, transactions, currentBalance: user.balance }));
    setViewerOpen(true);
  };

  // Optional: export the same statement as a PDF via the OS share/save sheet.
  const shareStatement = async () => {
    if (sharing || !statementHtml) return;
    setSharing(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: statementHtml });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Account Statement",
        });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err) {
      console.log("Statement share error:", err);
      Alert.alert(t("common.error"), "Could not export the PDF.");
    } finally {
      setSharing(false);
    }
  };

 useFocusEffect(
  useCallback(() => {
    setLoading(true);
    fetchUserAndTransactions();
  }, [])
);

  const fetchUserAndTransactions = async () => {
  try {
    const storedUser = JSON.parse(await AsyncStorage.getItem("user"));
    if (!storedUser) return;

    // 1. Fetch balancen edhe kartelen prej backend tdsbanking
    const cardRes = await fetch(`${API_BASE}/get_card.php?user_id=${storedUser.user_id}`);
    const cardData = await cardRes.json();

    if (cardData.status === "success") {
      // e ndryshon user state me balance t'tanishme
      const updatedUser = {
        ...storedUser,
        balance: cardData.card.balance
      };
      setUser(updatedUser);

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    } else {
      setUser(storedUser);
    }

    // 2. fetch listen e transaksioneve
    const transRes = await fetch(
      `${API_BASE}/get_transactions.php?user_id=${storedUser.user_id}`
    );
    const transData = await transRes.json();

    if (transData.status === "success") {
      setTransactions(transData.transactions);
    }
  } catch (error) {
    console.log("Fetch error:", error);
  } finally {
    setLoading(false);
  }
};

const renderItem = ({ item, index }) => {

  const isSender = item.sender_name === user.name
    && item.sender_surname === user.surname;

  const amount = parseFloat(item.amount).toFixed(2);
  const amountColor = isSender ? colors.text : colors.success;
  const amountText = isSender
    ? `- ${amount} EUR`
    : `+ ${amount} EUR`;

  const title = isSender
    ? `${item.receiver_name} ${item.receiver_surname}`
    : `${item.sender_name} ${item.sender_surname}`;

  return (
    <AnimatedListItem index={index}>
    <PressableScale
      style={styles.transactionRow}
      scaleTo={0.98}
      onPress={() => openReceipt(item)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{title}</Text>

        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString("de-DE")}
        </Text>
      </View>

      <View style={styles.amountWrap}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountText}
        </Text>
        <View style={styles.receiptHint}>
          <MaterialCommunityIcons name="receipt" size={12} color={colors.textMuted} />
          <Text style={styles.receiptHintText}>Receipt</Text>
        </View>
      </View>
    </PressableScale>
    </AnimatedListItem>
  );
};
  if (loading) {
    // Skeleton list while transactions load — mirrors the final layout.
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 28 }} />
          <SkeletonBlock width={140} height={20} radius={6} />
          <View style={{ width: 26 }} />
        </View>
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <SkeletonBlock width={120} height={12} radius={5} />
          <SkeletonBlock width={160} height={26} radius={8} style={{ marginTop: 10 }} />
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 20 }}>
              <View>
                <SkeletonBlock width={150} height={14} radius={5} />
                <SkeletonBlock width={90} height={10} radius={4} style={{ marginTop: 8 }} />
              </View>
              <SkeletonBlock width={80} height={14} radius={5} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color={colors.accent} />
        </PressableScale>

        <Text style={styles.headerText}>{t("menu.transactions")}</Text>

        <PressableScale scaleTo={0.85} hitSlop={8} onPress={openStatement}>
          <MaterialCommunityIcons name="file-document-outline" size={26} color={colors.accent} />
        </PressableScale>
      </View>

      <MotionView from="down" style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>{t("transactions.availableCondition")}</Text>
        {/* Counts up to the available balance on entry */}
        <AnimatedNumber value={user.balance} format={format} style={styles.balanceValue} duration={800} />
      </MotionView>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
      />

      {/* In-app statement viewer (renders the HTML in a WebView) */}
      <Modal
        visible={viewerOpen}
        animationType="slide"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View style={styles.viewerContainer}>
          <View style={styles.viewerBar}>
            <TouchableOpacity
              onPress={() => setViewerOpen(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>Account Statement</Text>
            <TouchableOpacity
              onPress={shareStatement}
              disabled={sharing}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {sharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <MaterialCommunityIcons name="tray-arrow-down" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={["*"]}
            source={{ html: statementHtml }}
            style={styles.viewerWeb}
          />
        </View>
      </Modal>

      {/* Temporary single-transaction receipt viewer */}
      <Modal
        visible={receiptOpen}
        animationType="slide"
        onRequestClose={closeReceipt}
      >
        <View style={styles.viewerContainer}>
          <View style={styles.viewerBar}>
            <TouchableOpacity
              onPress={closeReceipt}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>Transaction Receipt</Text>
            <TouchableOpacity
              onPress={shareReceipt}
              disabled={receiptSharing}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {receiptSharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <MaterialCommunityIcons name="tray-arrow-down" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={["*"]}
            source={{ html: receiptHtml }}
            style={styles.viewerWeb}
          />
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
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },

    headerText: {
      fontSize: 22,
      fontWeight: "bold",
      color: c.accent,
    },

    balanceContainer: {
      alignItems: "center",
      paddingVertical: 20,
    },

    balanceLabel: {
      fontSize: 12,
      letterSpacing: 1,
      color: c.textSecondary,
    },

    balanceValue: {
      fontSize: 28,
      fontWeight: "bold",
      color: c.accent,
      marginTop: 5,
    },

    transactionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 18,
    },

    name: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },

    date: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 3,
    },

   description: {
    fontSize: 15,
    fontWeight: "500",
    color: c.textSecondary,
    marginTop: 6,
  },

    amountWrap: {
      alignItems: "flex-end",
    },

    amount: {
      fontSize: 16,
      fontWeight: "bold",
    },

    receiptHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 4,
    },
    receiptHintText: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: "600",
    },

    separator: {
      height: 1,
      backgroundColor: c.divider,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 34,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginBottom: 16,
    },
    sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    sheetTitle: { fontSize: 18, fontWeight: "700", color: c.text },
    sheetSub: { fontSize: 13, color: c.textSecondary, marginTop: 6, marginBottom: 14 },

    monthList: { gap: 4 },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    monthText: { flex: 1, fontSize: 15, fontWeight: "600", color: c.text },

    generating: { alignItems: "center", paddingVertical: 34 },
    generatingText: { color: c.textSecondary, marginTop: 12, fontSize: 14 },

    viewerContainer: { flex: 1, backgroundColor: "#fff" },
    viewerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.primary,
      paddingHorizontal: 18,
      paddingTop: 50,
      paddingBottom: 14,
    },
    viewerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
    viewerWeb: { flex: 1, backgroundColor: "#fff" },
  });
