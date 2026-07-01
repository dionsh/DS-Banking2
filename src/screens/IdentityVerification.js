// Mock KYC / Identity Verification step shown AFTER the registration form but
// BEFORE the account is actually created.
//
// This is intentionally fake and front-end only: it opens the real device camera
// and asks the user to "scan" the front then the back of an ID. They can point the
// camera at anything — every scan succeeds. Only once BOTH sides are marked ✓ does
// the screen call signup.php (with verified:true) to create the account.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";

export default function IdentityVerification({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const formData = route.params?.formData || {};

  const [permission, requestPermission] = useCameraPermissions();
  const [started, setStarted] = useState(false);
  const [frontDone, setFrontDone] = useState(false);
  const [backDone, setBackDone] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState(false);

  // Which side are we capturing right now?
  const step = !frontDone ? "front" : !backDone ? "back" : "done";

  // The camera stays closed until the user taps "Start Scan". We only ask for
  // camera permission at that moment (not on mount).
  const handleStart = async () => {
    if (!permission || !permission.granted) {
      await requestPermission();
    }
    setStarted(true);
  };

  // Simulate a scan: brief "analysing" delay, then always succeed.
  const handleScan = () => {
    if (scanning || step === "done") return;
    setScanning(true);
    setTimeout(() => {
      if (step === "front") setFrontDone(true);
      else if (step === "back") setBackDone(true);
      setScanning(false);
    }, 1300);
  };

  // Actually create the account once both sides are verified.
  const createAccount = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/signup.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          surname: formData.surname,
          email: formData.email,
          password: formData.password,
          pin: formData.pin,
          verified: true, // server requires this — proof KYC was completed
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        Alert.alert("Verified", "Your identity has been verified and your account is ready.", [
          { text: "Continue", onPress: () => navigation.replace("Login") },
        ]);
      } else {
        Alert.alert("Could not create account", data.message || "Please try again.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      console.log("Identity verification signup error:", err);
      Alert.alert("Connection error", "Could not reach the server. Please try again.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setCreating(false);
    }
  }, [formData, navigation]);

  // When both sides are done, kick off account creation automatically.
  useEffect(() => {
    if (frontDone && backDone && !creating) {
      createAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontDone, backDone]);

  const StepRow = ({ label, done, active }) => (
    <View style={styles.stepRow}>
      <MaterialCommunityIcons
        name={done ? "check-circle" : active ? "progress-clock" : "circle-outline"}
        size={22}
        color={done ? colors.success : active ? colors.accent : colors.textMuted}
      />
      <Text style={[styles.stepText, done && { color: colors.success }]}>{label}</Text>
      {done && <Text style={styles.stepTick}>✓</Text>}
    </View>
  );

  // ---- Intro: nothing opens until the user taps "Start Scan" -------------
  if (!started) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.introBody}>
          <View style={styles.introIconWrap}>
            <MaterialCommunityIcons name="card-account-details-outline" size={60} color={colors.accent} />
          </View>
          <Text style={styles.introTitle}>Verify your identity</Text>
          <Text style={styles.introText}>
            To finish creating your account we need to verify your ID. You'll scan the
            front and the back of your document with your camera. It only takes a few seconds.
          </Text>

          <View style={styles.introSteps}>
            <View style={styles.introStep}>
              <MaterialCommunityIcons name="numeric-1-circle" size={22} color={colors.accent} />
              <Text style={styles.introStepText}>Scan the front of your ID</Text>
            </View>
            <View style={styles.introStep}>
              <MaterialCommunityIcons name="numeric-2-circle" size={22} color={colors.accent} />
              <Text style={styles.introStepText}>Scan the back of your ID</Text>
            </View>
            <View style={styles.introStep}>
              <MaterialCommunityIcons name="numeric-3-circle" size={22} color={colors.accent} />
              <Text style={styles.introStepText}>Your account is created</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleStart}>
            <MaterialCommunityIcons name="line-scan" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Start Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- Permission states -------------------------------------------------
  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={[styles.center, { flex: 1, padding: 30 }]}>
          <MaterialCommunityIcons name="camera-off-outline" size={64} color={colors.textMuted} />
          <Text style={styles.permTitle}>Camera access needed</Text>
          <Text style={styles.permText}>
            To verify your identity we need to scan your ID document. Please allow camera access.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- Main verification UI ---------------------------------------------
  const instruction =
    step === "front"
      ? "Position the FRONT of your ID inside the frame, then tap Scan."
      : step === "back"
      ? "Now position the BACK of your ID inside the frame, then tap Scan."
      : "Both sides verified.";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={creating}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <View style={{ width: 26 }} />
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.body}>
        <Text style={styles.instruction}>{instruction}</Text>

        <View style={styles.cameraWrap}>
          <CameraView style={styles.camera} facing="back" />
          {/* ID-card framing overlay */}
          <View style={styles.frame} pointerEvents="none">
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          {scanning && (
            <View style={styles.scanOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.scanText}>Analysing document…</Text>
            </View>
          )}

          <View style={styles.sideBadge}>
            <Text style={styles.sideBadgeText}>
              {step === "front" ? "FRONT SIDE" : step === "back" ? "BACK SIDE" : "COMPLETE"}
            </Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <StepRow label="Front Side" done={frontDone} active={step === "front"} />
          <StepRow label="Back Side" done={backDone} active={step === "back"} />
        </View>

        {creating ? (
          <View style={styles.creatingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.creatingText}>Creating your account…</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, (scanning || step === "done") && styles.primaryBtnDisabled]}
            onPress={handleScan}
            disabled={scanning || step === "done"}
          >
            <MaterialCommunityIcons name="line-scan" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>
              {scanning
                ? "Scanning…"
                : step === "front"
                ? "Scan Front Side"
                : step === "back"
                ? "Scan Back Side"
                : "Verified"}
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { justifyContent: "center", alignItems: "center" },

    header: {
      paddingTop: 55,
      paddingBottom: 16,
      paddingHorizontal: 20,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

    body: { flex: 1, padding: 20 },

    instruction: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: "center",
      marginBottom: 16,
      lineHeight: 21,
    },

    cameraWrap: {
      flex: 1,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
    },
    camera: { ...StyleSheet.absoluteFillObject },

    frame: {
      width: "82%",
      height: "62%",
      borderRadius: 16,
    },
    corner: {
      position: "absolute",
      width: 34,
      height: 34,
      borderColor: "#fff",
    },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },

    scanOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
    },
    scanText: { color: "#fff", marginTop: 12, fontSize: 15, fontWeight: "600" },

    sideBadge: {
      position: "absolute",
      top: 14,
      alignSelf: "center",
      backgroundColor: "rgba(25,25,112,0.85)",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
    },
    sideBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 1 },

    progressCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 18,
      borderWidth: 1,
      borderColor: c.border,
    },
    stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
    stepText: { fontSize: 15, color: c.text, marginLeft: 12, flex: 1, fontWeight: "600" },
    stepTick: { fontSize: 16, color: c.success, fontWeight: "800" },

    creatingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginTop: 20,
      paddingVertical: 16,
    },
    creatingText: { color: c.textSecondary, fontSize: 15, fontWeight: "600" },

    introBody: { flex: 1, paddingHorizontal: 26, paddingTop: 36, alignItems: "center" },
    introIconWrap: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 22,
    },
    introTitle: { fontSize: 22, fontWeight: "800", color: c.text, marginBottom: 12 },
    introText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 26,
    },
    introSteps: { alignSelf: "stretch", gap: 14, marginBottom: 34 },
    introStep: { flexDirection: "row", alignItems: "center", gap: 12 },
    introStepText: { fontSize: 15, color: c.text, fontWeight: "600" },

    permTitle: { fontSize: 18, fontWeight: "700", color: c.text, marginTop: 16 },
    permText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 22,
      lineHeight: 20,
    },

    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 14,
      marginTop: 18,
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
