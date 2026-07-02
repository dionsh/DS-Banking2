// Travel — everything a customer needs to know before going abroad:
// whether the card works there (it works worldwide), partner ATM coverage,
// the (fictional but realistic) fees, currency info and local payment tips.
// Purely informational — static data in src/data/travelDestinations.js,
// no backend.

import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { TRAVEL_DESTINATIONS, TRAVEL_FEES } from "../data/travelDestinations";

const GREEN = "#2E7D32";

export default function Travel() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [country, setCountry] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null); // the country whose info is shown
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const getInfo = () => {
    if (!country) return;
    setLoading(true);
    setInfo(null);
    fadeAnim.setValue(0);
    // A short pause makes it feel like the info is being fetched for you.
    setTimeout(() => {
      setInfo(country);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, 650);
  };

  const FeeRow = ({ icon, label, value, note }) => (
    <View style={styles.feeRow}>
      <View style={styles.feeIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.feeLabel}>{label}</Text>
        {note ? <Text style={styles.feeNote}>{note}</Text> : null}
      </View>
      <Text style={styles.feeValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel</Text>
        <MaterialCommunityIcons name="airplane" size={24} color="#fff" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* hero */}
        <View style={styles.hero}>
          <MaterialCommunityIcons name="earth" size={30} color="#fff" />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={styles.heroTitle}>Travelling soon?</Text>
            <Text style={styles.heroSub}>
              Your DS Banking card works in 190+ countries — check what to expect before you fly.
            </Text>
          </View>
        </View>

        {/* destination picker */}
        <Text style={styles.label}>CHOOSE A DESTINATION</Text>
        <TouchableOpacity style={styles.countryPicker} onPress={() => setPickerVisible(true)}>
          {country ? (
            <View style={styles.countryChosen}>
              <Text style={styles.countryFlag}>{country.flag}</Text>
              <View>
                <Text style={styles.countryName}>{country.name}</Text>
                <Text style={styles.countryCurrency}>
                  {country.currency.name} ({country.currency.code})
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.countryPlaceholder}>Select a country...</Text>
          )}
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.getBtn, (!country || loading) && { opacity: 0.6 }]}
          onPress={getInfo}
          disabled={!country || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="magnify" size={19} color="#fff" />
              <Text style={styles.getBtnText}>  Get Travel Information</Text>
            </>
          )}
        </TouchableOpacity>

        {/* results */}
        {info && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* card works banner */}
            <View style={styles.worksBanner}>
              <MaterialCommunityIcons name="check-decagram" size={26} color="#fff" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.worksTitle}>Your card works in {info.name}</Text>
                <Text style={styles.worksSub}>
                  Pay in shops, online and at ATMs — anywhere Visa is accepted.
                </Text>
              </View>
            </View>

            {/* fees */}
            <Text style={styles.sectionTitle}>Fees in {info.name}</Text>
            <View style={styles.cardBox}>
              <FeeRow
                icon="credit-card-outline"
                label="Card payments abroad"
                value={TRAVEL_FEES.cardPaymentPct.toFixed(2) + "%"}
                note="Applied to the converted amount"
              />
              <View style={styles.divider} />
              <FeeRow
                icon="cash-multiple"
                label="ATM withdrawals abroad"
                value={TRAVEL_FEES.atmWithdrawalPct.toFixed(2) + "%"}
                note={`First €${TRAVEL_FEES.atmFreeMonthly}/month free at partner ATMs`}
              />
              <View style={styles.divider} />
              <FeeRow
                icon="swap-horizontal"
                label="Exchange rate"
                value={info.currency.code === "EUR" ? "None" : "Mid-market"}
                note={
                  info.currency.code === "EUR"
                    ? "You pay in EUR — no conversion at all"
                    : "Real rate, no hidden markup"
                }
              />
            </View>

            {/* ATMs */}
            <Text style={styles.sectionTitle}>ATMs</Text>
            <View style={styles.cardBox}>
              <View style={styles.atmHead}>
                <View style={styles.atmIconBox}>
                  <MaterialCommunityIcons name="bank-outline" size={22} color={colors.accent} />
                </View>
                <Text style={styles.atmText}>
                  We currently partner with{" "}
                  <Text style={styles.atmBold}>
                    {info.atmPartners} ATM provider{info.atmPartners !== 1 ? "s" : ""}
                  </Text>{" "}
                  in {info.name}.
                </Text>
              </View>
              <View style={styles.partnerRow}>
                {info.atmPartnerNames.map((p) => (
                  <View key={p} style={styles.partnerChip}>
                    <MaterialCommunityIcons name="atm" size={14} color={colors.accent} />
                    <Text style={styles.partnerChipText}>{p}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.atmHint}>
                Partner ATMs never add their own operator fee on top.
              </Text>
            </View>

            {/* currency */}
            <Text style={styles.sectionTitle}>Currency</Text>
            <View style={styles.cardBox}>
              <View style={styles.currencyRow}>
                <Text style={styles.currencyFlag}>{info.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currencyName}>
                    {info.currency.name} ({info.currency.code})
                  </Text>
                  <Text style={styles.currencyRate}>{info.currency.rate}</Text>
                </View>
              </View>
            </View>

            {/* tips */}
            <Text style={styles.sectionTitle}>Travel tips</Text>
            <View style={styles.cardBox}>
              {info.tips.map((tip, i) => (
                <View key={i} style={[styles.tipRow, i > 0 && { marginTop: 14 }]}>
                  <MaterialCommunityIcons
                    name="lightbulb-on-outline"
                    size={18}
                    color={colors.warning}
                    style={{ marginTop: 1 }}
                  />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.footNote}>
              Fees and coverage shown are indicative. Have a great trip! ✈️
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* ----- country picker modal ----- */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHandleRow}>
              <View style={styles.pickerHandle} />
            </View>
            <View style={styles.pickerHeadRow}>
              <Text style={styles.pickerTitle}>Where are you going?</Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TRAVEL_DESTINATIONS.map((d) => (
                <TouchableOpacity
                  key={d.code}
                  style={styles.pickerRow}
                  onPress={() => {
                    setCountry(d);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerFlag}>{d.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.countryName}>{d.name}</Text>
                    <Text style={styles.countryCurrency}>
                      {d.currency.name} ({d.currency.code})
                    </Text>
                  </View>
                  {country?.code === d.code && (
                    <MaterialCommunityIcons name="check-circle" size={22} color={GREEN} />
                  )}
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
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

    body: { padding: 20, paddingBottom: 50 },

    hero: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.primary,
      borderRadius: 18,
      padding: 18,
      marginBottom: 20,
    },
    heroTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
    heroSub: { color: "#C9CEE8", fontSize: 12.5, marginTop: 3, lineHeight: 18 },

    label: { fontSize: 11, color: c.textMuted, letterSpacing: 1, marginBottom: 8 },

    countryPicker: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.inputBorder,
      paddingVertical: 12,
      paddingHorizontal: 16,
      minHeight: 62,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    countryChosen: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    countryFlag: { fontSize: 30 },
    countryName: { fontSize: 16, fontWeight: "700", color: c.text },
    countryCurrency: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    countryPlaceholder: { flex: 1, fontSize: 16, color: c.placeholder },

    getBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 17,
      marginTop: 16,
      marginBottom: 8,
    },
    getBtnText: { color: "#fff", fontWeight: "700", fontSize: 15.5, letterSpacing: 0.3 },

    worksBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: GREEN,
      borderRadius: 18,
      padding: 16,
      marginTop: 14,
    },
    worksTitle: { color: "#fff", fontSize: 15.5, fontWeight: "800" },
    worksSub: { color: "#DFF2E4", fontSize: 12.5, marginTop: 2, lineHeight: 17 },

    sectionTitle: { fontSize: 16, fontWeight: "700", color: c.text, marginTop: 20, marginBottom: 10 },

    cardBox: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 16,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },

    feeRow: { flexDirection: "row", alignItems: "center" },
    feeIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    feeLabel: { fontSize: 14, fontWeight: "600", color: c.text },
    feeNote: { fontSize: 11.5, color: c.textMuted, marginTop: 1 },
    feeValue: { fontSize: 15.5, fontWeight: "800", color: c.accent, marginLeft: 8 },
    divider: { height: 1, backgroundColor: c.divider, marginVertical: 13 },

    atmHead: { flexDirection: "row", alignItems: "center" },
    atmIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    atmText: { flex: 1, fontSize: 13.5, color: c.textSecondary, lineHeight: 19 },
    atmBold: { fontWeight: "800", color: c.text },
    partnerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 },
    partnerChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    partnerChipText: { fontSize: 12.5, fontWeight: "700", color: c.accent },
    atmHint: { fontSize: 11.5, color: c.textMuted, marginTop: 12 },

    currencyRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    currencyFlag: { fontSize: 34 },
    currencyName: { fontSize: 15, fontWeight: "700", color: c.text },
    currencyRate: { fontSize: 13, color: c.textSecondary, marginTop: 2 },

    tipRow: { flexDirection: "row", gap: 10 },
    tipText: { flex: 1, fontSize: 13.5, color: c.textSecondary, lineHeight: 19 },

    footNote: { fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 20 },

    // country picker modal (bottom sheet style)
    pickerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    pickerCard: {
      backgroundColor: c.card,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 20,
      paddingBottom: 18,
      maxHeight: "75%",
    },
    pickerHandleRow: { alignItems: "center", paddingVertical: 10 },
    pickerHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border },
    pickerHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    pickerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
    pickerRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 11 },
    pickerFlag: { fontSize: 28 },
  });
