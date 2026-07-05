// Split The Bill — two ways to split:
//
//   1. "With a Friend" (real request system): type your friend's DS Banking
//      email (verified server-side, like Shared Savings invites — no user
//      list is ever shown), enter the total + an optional note and send a
//      request. The friend sees it here (and gets a notification) and can
//      Accept — their half is deducted and credited to you — or Decline (no
//      money moves). All real PHP + MySQL (split_requests table).
//
//   2. "Instant Split": the original calculator that just pays your share of
//      a bill split between N people.

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { confirmOverBudget } from "../utils/budgetGuard";

const eur = (n) => "€" + (Number(n) || 0).toFixed(2);
const GREEN = "#2E7D32";

const STATUS_META = {
  pending: { label: "Pending", icon: "clock-outline" },
  accepted: { label: "Accepted", icon: "check-circle-outline" },
  declined: { label: "Declined", icon: "close-circle-outline" },
};

export default function SplitBill() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [tab, setTab] = useState("friend"); // 'friend' | 'instant'
  const [refreshing, setRefreshing] = useState(false);

  // ----- friend request state -----
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [friendEmail, setFriendEmail] = useState("");
  const [reqTotal, setReqTotal] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [sending, setSending] = useState(false);
  const [busyRequest, setBusyRequest] = useState(null); // request id being answered

  // ----- instant split state (the original calculator) -----
  const [total, setTotal] = useState("");
  const [people, setPeople] = useState(2);
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ----- smart receipt scanner (fills the instant-split total) -----
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { total, id, date }

  const load = async (quiet = false) => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUser(stored);

      const [cardRes, splitRes] = await Promise.all([
        fetch(`${API_BASE}/get_card.php?user_id=${stored.user_id}`),
        fetch(`${API_BASE}/get_split_requests.php?user_id=${stored.user_id}`),
      ]);

      const card = await cardRes.json();
      if (card.status === "success") {
        setBalance(Number(card.card.balance) || 0);
      } else {
        setBalance(Number(stored.balance) || 0);
      }

      const split = await splitRes.json();
      if (split.status === "success") {
        setIncoming(split.incoming || []);
        setSent(split.sent || []);
      }
    } catch (err) {
      if (!quiet) console.log("SplitBill load error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const updateStoredBalance = async (newBalance) => {
    setBalance(newBalance);
    const updatedUser = { ...user, balance: newBalance };
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  /* ---------- send a request to a friend ---------- */

  const reqTotalNum = parseFloat(String(reqTotal).replace(",", ".")) || 0;
  const reqShare = reqTotalNum > 0 ? reqTotalNum / 2 : 0;

  const sendRequest = async () => {
    const email = friendEmail.trim();
    if (!email) {
      Alert.alert("Missing email", "Enter the DS Banking email of the friend you want to split with.");
      return;
    }
    if (reqTotalNum <= 0) {
      Alert.alert(t("common.error"), t("split.invalidAmount"));
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/create_split_request.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          email,
          total: reqTotalNum,
          note: reqNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        Alert.alert(
          "Request sent ✉️",
          `${data.friend_name} was asked to pay ${eur(data.share)} — half of ${eur(reqTotalNum)}. You'll get a notification when they respond.`
        );
        setFriendEmail("");
        setReqTotal("");
        setReqNote("");
        load(true);
      } else {
        Alert.alert(t("common.error"), data.message || t("common.somethingWrong"));
      }
    } catch (err) {
      Alert.alert(t("common.error"), t("notif.couldNotReach"));
    }
    setSending(false);
  };

  /* ---------- answer an incoming request ---------- */

  const respond = async (req, accept) => {
    // Accepting pays your share (a "Split Bills" spend), so warn (but don't
    // block) if it would go over that budget. Declining moves no money.
    if (accept) {
      const okBudget = await confirmOverBudget({
        userId: user.user_id,
        category: "Split Bills",
        amount: Number(req.share_amount),
      });
      if (!okBudget) return;
    }
    setBusyRequest(req.id);
    try {
      const res = await fetch(`${API_BASE}/respond_split_request.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, request_id: req.id, accept }),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (accept) {
          if (data.new_balance !== null && data.new_balance !== undefined) {
            await updateStoredBalance(Number(data.new_balance));
          }
          Alert.alert(
            "Share paid ✓",
            `You paid ${eur(req.share_amount)} to ${req.requester_name}. It's in your transaction history.`
          );
        }
        load(true);
      } else {
        Alert.alert(t("common.error"), data.message || t("common.somethingWrong"));
      }
    } catch (err) {
      Alert.alert(t("common.error"), t("notif.couldNotReach"));
    }
    setBusyRequest(null);
  };

  const confirmRespond = (req, accept) => {
    if (accept) {
      Alert.alert(
        "Pay your share?",
        `${eur(req.share_amount)} will be sent to ${req.requester_name}${req.note ? ` for "${req.note}"` : ""}.`,
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: "Pay " + eur(req.share_amount), onPress: () => respond(req, true) },
        ]
      );
    } else {
      Alert.alert(
        "Decline request?",
        `${req.requester_name} will be told you declined. No money will move.`,
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: "Decline", style: "destructive", onPress: () => respond(req, false) },
        ]
      );
    }
  };

  /* ---------- instant split (unchanged behaviour) ---------- */

  const totalNum = parseFloat(total) || 0;
  const share = people >= 2 && totalNum > 0 ? totalNum / people : 0;

  const changePeople = (delta) => {
    setPeople((p) => Math.max(2, p + delta));
  };

  const handleConfirm = async () => {
    if (totalNum <= 0) {
      Alert.alert(t("common.error"), t("split.invalidAmount"));
      return;
    }
    if (people < 2) {
      Alert.alert(t("common.error"), t("split.min2"));
      return;
    }
    if (share > balance) {
      Alert.alert(t("topup.insufficient"), t("split.shareTooBig"));
      return;
    }

    // Paying your share is a "Split Bills" spend — warn (but don't block) if it
    // would go over that budget.
    const okBudget = await confirmOverBudget({
      userId: user.user_id,
      category: "Split Bills",
      amount: share,
    });
    if (!okBudget) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/split_bill.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          total: totalNum,
          people,
          label: label.trim(),
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        await updateStoredBalance(data.new_balance);
        Alert.alert(
          t("split.doneTitle"),
          t("split.doneMsg", { desc: data.description, share: Number(data.share).toFixed(2) }),
          [{ text: t("common.ok") }]
        );
        setTotal("");
        setLabel("");
        setPeople(2);
      } else {
        Alert.alert(t("common.error"), data.message || t("common.somethingWrong"));
      }
    } catch (err) {
      console.log("SplitBill confirm error:", err);
      Alert.alert(t("common.error"), t("notif.couldNotReach"));
    }
    setSubmitting(false);
  };

  /* ---------- smart receipt scanner (real OCR via AI vision) ---------- */

  // Only asks for camera permission when the user actually wants to scan.
  const openScanner = async () => {
    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res || !res.granted) {
        Alert.alert(
          "Camera needed",
          "Allow camera access to scan a receipt. You can still type the amount manually."
        );
        return;
      }
    }
    setScanning(false);
    setScannerOpen(true);
  };

  // Capture the receipt and let the backend AI read the total, date and receipt
  // ID off the REAL image (scan_receipt.php -> Groq/Gemini vision model).
  const captureAndScan = async () => {
    if (scanning || !cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      if (!photo || !photo.base64) throw new Error("no-image");

      const res = await fetch(`${API_BASE}/scan_receipt.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: photo.base64 }),
      });
      const data = await res.json();

      if (data.status === "success" && data.is_receipt && Number(data.total) > 0) {
        const result = {
          total: Number(data.total),
          id: data.receipt_id ? String(data.receipt_id) : "",
          date: data.date ? String(data.date) : "",
        };
        setScanResult(result);
        setTotal(result.total.toFixed(2));
        if (!label.trim()) setLabel(result.id ? "Receipt " + result.id : "Scanned receipt");
        setScannerOpen(false);
      } else if (data.status === "success" && !data.is_receipt) {
        Alert.alert(
          "No receipt detected",
          "That doesn't look like a receipt. Make sure the total, date and receipt number are clearly visible, then try again."
        );
      } else if (data.status === "success") {
        Alert.alert(
          "Couldn't read the total",
          "I couldn't find a total on that receipt. Try again with better lighting, or type the amount manually."
        );
      } else {
        Alert.alert(
          "Scan failed",
          data.message || "Couldn't read the receipt. Please try again or enter the amount manually."
        );
      }
    } catch (e) {
      console.log("Receipt scan error:", e);
      Alert.alert(
        "Scan failed",
        "Couldn't read the receipt. Check your connection and try again, or enter the amount manually."
      );
    } finally {
      setScanning(false);
    }
  };

  /* ---------- render helpers ---------- */

  const initials = (fullName) =>
    String(fullName || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");

  const renderIncoming = (req) => (
    <View key={req.id} style={styles.requestCard}>
      <View style={styles.reqHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(req.requester_name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reqName} numberOfLines={1}>{req.requester_name}</Text>
          <Text style={styles.reqSub} numberOfLines={1}>
            {req.note ? `"${req.note}" · ` : ""}total {eur(req.total_amount)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.reqShare}>{eur(req.share_amount)}</Text>
          <Text style={styles.reqShareLabel}>your share</Text>
        </View>
      </View>
      {busyRequest === req.id ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 12 }} />
      ) : (
        <View style={styles.reqBtns}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => confirmRespond(req, true)}>
            <MaterialCommunityIcons name="check" size={17} color="#fff" />
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => confirmRespond(req, false)}>
            <MaterialCommunityIcons name="close" size={17} color={colors.dangerText} />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderSent = (req) => {
    const meta = STATUS_META[req.status] || STATUS_META.pending;
    const statusColor =
      req.status === "accepted" ? GREEN : req.status === "declined" ? colors.dangerText : colors.warning;
    return (
      <View key={req.id} style={styles.sentRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(req.friend_name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reqName} numberOfLines={1}>{req.friend_name}</Text>
          <Text style={styles.reqSub} numberOfLines={1}>
            {req.note ? `"${req.note}" · ` : ""}
            {eur(req.total_amount)} · asked for {eur(req.share_amount)} ·{" "}
            {new Date(req.created_at.replace(" ", "T")).toLocaleDateString("de-DE")}
          </Text>
        </View>
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          <MaterialCommunityIcons name={meta.icon} size={13} color={statusColor} />
          <Text style={[styles.statusPillText, { color: statusColor }]}>{meta.label}</Text>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("menu.splitBill")}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* mode switch */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "friend" && styles.tabBtnActive]}
          onPress={() => setTab("friend")}
        >
          <MaterialCommunityIcons
            name="account-multiple-outline"
            size={17}
            color={tab === "friend" ? "#fff" : colors.accent}
          />
          <Text style={[styles.tabText, tab === "friend" && styles.tabTextActive]}>With a Friend</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "instant" && styles.tabBtnActive]}
          onPress={() => setTab("instant")}
        >
          <MaterialCommunityIcons
            name="flash-outline"
            size={17}
            color={tab === "instant" ? "#fff" : colors.accent}
          />
          <Text style={[styles.tabText, tab === "instant" && styles.tabTextActive]}>Instant Split</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>{t("split.availableBalance")}</Text>
          <Text style={styles.balanceValue}>{Number(balance).toFixed(2)} EUR</Text>
        </View>

        {tab === "friend" ? (
          <>
            {/* ----- requests waiting for my answer ----- */}
            {incoming.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Requests for you ({incoming.length})</Text>
                {incoming.map(renderIncoming)}
              </>
            )}

            {/* ----- new request form ----- */}
            <Text style={styles.sectionTitle}>Split a bill with a friend</Text>
            <View style={styles.card}>
              <Text style={styles.label}>FRIEND'S DS BANKING EMAIL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="friend@email.com"
                placeholderTextColor={colors.placeholder}
                value={friendEmail}
                onChangeText={setFriendEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.emailHint}>
                We'll check the account exists before the request is sent.
              </Text>

              <Text style={styles.label}>{t("split.totalBill")}</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0.00 EUR"
                placeholderTextColor={colors.placeholder}
                value={reqTotal}
                onChangeText={setReqTotal}
              />

              <Text style={styles.label}>NOTE (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("split.egDinner")}
                placeholderTextColor={colors.placeholder}
                value={reqNote}
                onChangeText={setReqNote}
                maxLength={80}
              />

              {reqTotalNum > 0 && (
                <View style={styles.halfRow}>
                  <View style={styles.halfBox}>
                    <Text style={styles.halfLabel}>You pay</Text>
                    <Text style={styles.halfValue}>{eur(reqShare)}</Text>
                  </View>
                  <MaterialCommunityIcons name="call-split" size={22} color={colors.textMuted} />
                  <View style={styles.halfBox}>
                    <Text style={styles.halfLabel} numberOfLines={1}>Your friend pays</Text>
                    <Text style={styles.halfValue}>{eur(reqShare)}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmBtn, sending && { opacity: 0.7 }]}
                onPress={sendRequest}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={18} color="#fff" />
                    <Text style={styles.confirmText}>  Send Request</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.formHint}>
                Nothing is charged now — your friend pays their half only if they accept.
              </Text>
            </View>

            {/* ----- requests I sent ----- */}
            {sent.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Your requests</Text>
                <View style={styles.sentCard}>{sent.map(renderSent)}</View>
              </>
            )}
          </>
        ) : (
          <>
            {/* ----- Smart Receipt Scanner ----- */}
            <TouchableOpacity style={styles.scanCta} onPress={openScanner} activeOpacity={0.85}>
              <View style={styles.scanCtaIcon}>
                <MaterialCommunityIcons name="line-scan" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.scanCtaTitle}>Scan a receipt</Text>
                <Text style={styles.scanCtaSub}>
                  Auto-fill the total — then just pick how many people
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
            </TouchableOpacity>

            {scanResult && (
              <View style={styles.detectedCard}>
                <MaterialCommunityIcons name="receipt" size={18} color={colors.success} />
                <Text style={styles.detectedText}>
                  Detected {eur(scanResult.total)} · {scanResult.date} · {scanResult.id}
                </Text>
              </View>
            )}

            {/* ----- the original instant split calculator ----- */}
            <View style={styles.card}>
              <Text style={styles.label}>{t("split.totalBill")}</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0.00 EUR"
                placeholderTextColor={colors.placeholder}
                value={total}
                onChangeText={setTotal}
              />

              <Text style={styles.label}>{t("split.whatFor")}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("split.egDinner")}
                placeholderTextColor={colors.placeholder}
                value={label}
                onChangeText={setLabel}
              />

              <Text style={styles.label}>{t("split.numberOfPeople")}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[styles.stepBtn, people <= 2 && styles.stepBtnDisabled]}
                  onPress={() => changePeople(-1)}
                  disabled={people <= 2}
                >
                  <MaterialCommunityIcons name="minus" size={24} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.peopleCount}>{people}</Text>

                <TouchableOpacity style={styles.stepBtn} onPress={() => changePeople(1)}>
                  <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t("split.eachOwes")}</Text>
              <Text style={styles.summaryAmount}>{share.toFixed(2)} EUR</Text>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLineLabel}>{t("split.sTotal")}</Text>
                <Text style={styles.summaryLineValue}>{totalNum.toFixed(2)} EUR</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLineLabel}>{t("split.sSplitBetween")}</Text>
                <Text style={styles.summaryLineValue}>{t("split.peopleCount", { count: people })}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={[styles.summaryLineLabel, { fontWeight: "700", color: colors.accent }]}>
                  {t("split.yourShare")}
                </Text>
                <Text style={[styles.summaryLineValue, { fontWeight: "700", color: colors.accent }]}>
                  {share.toFixed(2)} EUR
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{t("split.payShare")}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ----- Smart Receipt Scanner camera modal ----- */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => !scanning && setScannerOpen(false)}
      >
        <View style={styles.scanContainer}>
          <View style={styles.scanHeader}>
            <TouchableOpacity onPress={() => setScannerOpen(false)} disabled={scanning}>
              <MaterialCommunityIcons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scanHeaderTitle}>Scan Receipt</Text>
            <View style={{ width: 26 }} />
          </View>

          <Text style={styles.scanInstruction}>
            Position the receipt inside the frame, then tap Scan.
          </Text>

          <View style={styles.cameraWrap}>
            {scannerOpen && permission?.granted ? (
              <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            ) : (
              <View style={[styles.camera, styles.cameraFallback]}>
                <MaterialCommunityIcons name="camera-off-outline" size={54} color="#fff" />
              </View>
            )}

            {/* receipt framing corners */}
            <View style={styles.receiptFrame} pointerEvents="none">
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>

            {scanning && (
              <View style={styles.scanOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scanningTitle}>Reading receipt…</Text>
                <Text style={styles.scanningSub}>Detecting total, date & receipt ID</Text>
              </View>
            )}
          </View>

          <SafeAreaView edges={["bottom"]} style={styles.scanFooter}>
            <TouchableOpacity
              style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
              onPress={captureAndScan}
              disabled={scanning}
            >
              <MaterialCommunityIcons name="line-scan" size={20} color="#fff" />
              <Text style={styles.scanBtnText}>{scanning ? "Reading…" : "Scan Receipt"}</Text>
            </TouchableOpacity>
            <Text style={styles.scanHint}>
              Reads the total, date and receipt ID, then fills the amount for you.
            </Text>
          </SafeAreaView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 18,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },

    tabs: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 5,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    tabBtnActive: { backgroundColor: c.primary },
    tabText: { color: c.accent, fontWeight: "700", fontSize: 13.5 },
    tabTextActive: { color: "#fff" },

    body: { padding: 20, paddingBottom: 50 },

    balanceRow: { alignItems: "center", marginBottom: 6 },
    balanceLabel: { fontSize: 12, color: c.textSecondary, letterSpacing: 1 },
    balanceValue: { fontSize: 22, fontWeight: "bold", color: c.accent, marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: "700", color: c.text, marginTop: 18, marginBottom: 10 },

    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 22,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },

    label: { fontSize: 11, color: c.textMuted, letterSpacing: 1, marginTop: 18, marginBottom: 8 },

    amountInput: {
      backgroundColor: c.inputBg,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 16,
      fontSize: 22,
      fontWeight: "600",
      textAlign: "center",
      borderWidth: 1,
      borderColor: c.inputBorder,
      color: c.text,
    },

    textInput: {
      backgroundColor: c.inputBg,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: c.inputBorder,
      color: c.text,
    },

    emailHint: { fontSize: 11.5, color: c.textMuted, marginTop: 7 },

    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    avatarText: { fontSize: 14, fontWeight: "800", color: c.accent },

    halfRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 20,
    },
    halfBox: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    halfLabel: { fontSize: 12, color: c.textSecondary },
    halfValue: { fontSize: 18, fontWeight: "800", color: c.accent, marginTop: 3 },

    formHint: { fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 12, lineHeight: 17 },

    // incoming request cards
    requestCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: c.accent,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    reqHead: { flexDirection: "row", alignItems: "center" },
    reqName: { fontSize: 15, fontWeight: "700", color: c.text },
    reqSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    reqShare: { fontSize: 17, fontWeight: "800", color: c.accent },
    reqShareLabel: { fontSize: 10.5, color: c.textMuted, marginTop: 1 },
    reqBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
    acceptBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: GREEN,
      borderRadius: 12,
      paddingVertical: 12,
    },
    acceptText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    declineBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: c.danger,
      borderRadius: 12,
      paddingVertical: 12,
    },
    declineText: { color: c.dangerText, fontWeight: "700", fontSize: 14 },

    // sent request rows
    sentCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 6,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    sentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1.2,
      borderRadius: 20,
      paddingVertical: 4,
      paddingHorizontal: 9,
      marginLeft: 8,
    },
    statusPillText: { fontSize: 11.5, fontWeight: "700" },

    // instant split
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 5,
    },
    stepBtn: {
      backgroundColor: c.primary,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
    },
    stepBtnDisabled: { backgroundColor: c.textMuted },
    peopleCount: {
      fontSize: 30,
      fontWeight: "bold",
      color: c.accent,
      marginHorizontal: 40,
      minWidth: 50,
      textAlign: "center",
    },

    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 22,
      marginTop: 20,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    summaryTitle: { fontSize: 14, color: c.textSecondary, textAlign: "center" },
    summaryAmount: {
      fontSize: 38,
      fontWeight: "bold",
      color: c.accent,
      textAlign: "center",
      marginTop: 6,
    },
    summaryDivider: { height: 1, backgroundColor: c.divider, marginVertical: 18 },
    summaryLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    summaryLineLabel: { fontSize: 14, color: c.textSecondary },
    summaryLineValue: { fontSize: 14, color: c.text, fontWeight: "500" },

    confirmBtn: {
      flexDirection: "row",
      backgroundColor: c.primary,
      paddingVertical: 18,
      borderRadius: 16,
      marginTop: 25,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmText: { color: "#fff", fontWeight: "600", fontSize: 16, letterSpacing: 0.5 },

    // ----- smart receipt scanner -----
    scanCta: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.primary,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    scanCtaIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    scanCtaTitle: { color: "#fff", fontSize: 15.5, fontWeight: "800" },
    scanCtaSub: { color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 2 },

    detectedCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    detectedText: { color: c.text, fontSize: 13, fontWeight: "600", flex: 1 },

    // scanner modal
    scanContainer: { flex: 1, backgroundColor: "#000" },
    scanHeader: {
      paddingTop: 55,
      paddingBottom: 16,
      paddingHorizontal: 20,
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    scanHeaderTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
    scanInstruction: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    cameraWrap: {
      flex: 1,
      marginHorizontal: 16,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: "#111",
      justifyContent: "center",
      alignItems: "center",
    },
    camera: { ...StyleSheet.absoluteFillObject },
    cameraFallback: { justifyContent: "center", alignItems: "center", backgroundColor: "#222" },
    receiptFrame: { width: "68%", height: "80%", borderRadius: 16 },
    corner: { position: "absolute", width: 34, height: 34, borderColor: "#fff" },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
    scanOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.58)",
      justifyContent: "center",
      alignItems: "center",
    },
    scanningTitle: { color: "#fff", marginTop: 12, fontSize: 16, fontWeight: "700" },
    scanningSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 6 },
    scanFooter: { backgroundColor: "#000", paddingHorizontal: 20, paddingTop: 16 },
    scanBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primary,
      paddingVertical: 16,
      borderRadius: 14,
    },
    scanBtnDisabled: { opacity: 0.6 },
    scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    scanHint: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 12,
      textAlign: "center",
      marginTop: 12,
      marginBottom: 6,
      lineHeight: 17,
    },
  });
