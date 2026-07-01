// "Invite Friends" — shows the user's personal QR code so friends can scan it to
// join DS Banking. Entirely front-end: the QR encodes a dummy invite link with a
// mock referral code. No backend involved.

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../theme/ThemeContext";

// Build a short, stable-looking referral code from whatever we know about the user.
function buildReferralCode(user) {
  const seed = `${user?.name || "DS"}${user?.user_id || ""}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const tail = (seed + "DSBANK").slice(0, 6);
  return `DS-${tail}`;
}

export default function InviteFriends() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [referral, setReferral] = useState("DS-DSBANK");

  useEffect(() => {
    (async () => {
      try {
        const stored = JSON.parse(await AsyncStorage.getItem("user"));
        setReferral(buildReferralCode(stored));
      } catch (e) {
        // keep the default
      }
    })();
  }, []);

  const inviteUrl = `https://dsbanking.app/invite?ref=${referral}`;

  const onShare = async () => {
    try {
      await Share.share({
        message: `Join me on DS Banking! Use my invite link: ${inviteUrl}`,
      });
    } catch (e) {
      // user dismissed the share sheet — nothing to do
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.primary }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <Text style={styles.title}>Your QR Code</Text>

        <View style={styles.qrCard}>
          <QRCode
            value={inviteUrl}
            size={220}
            color="#191970"
            backgroundColor="#ffffff"
          />
          <View style={styles.codePill}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={16} color="#191970" />
            <Text style={styles.codeText}>{referral}</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Invite your friends by letting them scan your QR code.
        </Text>

        <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
          <MaterialCommunityIcons
            name={Platform.OS === "ios" ? "export-variant" : "share-variant"}
            size={20}
            color="#fff"
          />
          <Text style={styles.shareBtnText}>Share Invite Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },

    header: {
      paddingTop: 10,
      paddingBottom: 18,
      paddingHorizontal: 20,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      position: "absolute",
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "600",
      color: "#fff",
    },

    body: { flex: 1, alignItems: "center", paddingHorizontal: 28, paddingTop: 30 },

    title: {
      fontSize: 24,
      fontWeight: "800",
      color: c.accent,
      marginBottom: 26,
    },

    qrCard: {
      backgroundColor: "#fff",
      borderRadius: 24,
      padding: 26,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    codePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 20,
      backgroundColor: "#EEF0FA",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    codeText: {
      color: "#191970",
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 1,
    },

    description: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 28,
      lineHeight: 22,
      paddingHorizontal: 10,
    },

    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: c.primary,
      paddingVertical: 16,
      paddingHorizontal: 30,
      borderRadius: 16,
      marginTop: 34,
      alignSelf: "stretch",
    },
    shareBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
