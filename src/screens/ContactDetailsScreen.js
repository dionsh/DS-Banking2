// ContactDetailsScreen — view & edit the user's contact information
// (phone, home address, city, postal code, country). The account email is
// shown read-only because it is the login identifier.
//
// Data lives in its own backend table (user_contact_details) via
// get_contact_details.php / save_contact_details.php. All real PHP + MySQL.

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { MotionView, PressableScale, SkeletonBlock, SuccessOverlay } from "../components/motion";

// Validate only when a value is present — every field is optional.
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
const POSTAL_RE = /^[A-Za-z0-9\-\s]{2,12}$/;

export default function ContactDetailsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  // Refs so we can focus the first invalid field on a failed save.
  const refs = {
    phone: useRef(null),
    address: useRef(null),
    city: useRef(null),
    postal_code: useRef(null),
    country: useRef(null),
  };

  const load = async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) return;
      setUserId(stored.user_id);

      const res = await fetch(`${API_BASE}/get_contact_details.php?user_id=${stored.user_id}`);
      const data = await res.json();
      if (data.status === "success" && data.contact) {
        setEmail(data.contact.email || stored.email || "");
        setForm({
          phone: data.contact.phone || "",
          address: data.contact.address || "",
          city: data.contact.city || "",
          postal_code: data.contact.postal_code || "",
          country: data.contact.country || "",
        });
      } else {
        // Fall back to the locally stored email so the screen still renders.
        setEmail(stored.email || "");
      }
    } catch (err) {
      console.log("ContactDetails load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear a field's error as soon as the user edits it.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const validate = () => {
    const next = {};
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) {
      next.phone = t("contact.errPhone");
    }
    if (form.postal_code.trim() && !POSTAL_RE.test(form.postal_code.trim())) {
      next.postal_code = t("contact.errPostal");
    }
    if (form.address.length > 255) next.address = t("contact.errAddress");
    if (form.city.length > 120) next.city = t("contact.errCity");
    if (form.country.length > 120) next.country = t("contact.errCountry");
    setErrors(next);
    return next;
  };

  const handleSave = async () => {
    if (saving || !userId) return;
    const found = validate();
    const firstInvalid = ["phone", "address", "city", "postal_code", "country"].find(
      (k) => found[k]
    );
    if (firstInvalid) {
      refs[firstInvalid]?.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/save_contact_details.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postal_code: form.postal_code.trim(),
          country: form.country.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (data.contact) {
          setForm({
            phone: data.contact.phone || "",
            address: data.contact.address || "",
            city: data.contact.city || "",
            postal_code: data.contact.postal_code || "",
            country: data.contact.country || "",
          });
        }
        setSuccessOpen(true);
      } else {
        setErrors((e) => ({ ...e, _server: data.message || t("common.somethingWrong") }));
      }
    } catch (err) {
      console.log("ContactDetails save error:", err);
      setErrors((e) => ({ ...e, _server: t("notif.couldNotReach") }));
    } finally {
      setSaving(false);
    }
  };

  /* ---------- one labelled input row ----------
     Rendered by calling this function inline (NOT as <Field/>). A component
     defined in render would get a new identity each render and remount its
     TextInput, dropping focus on every keystroke. */
  const renderField = ({
    fieldKey,
    label,
    placeholder,
    icon,
    keyboardType = "default",
    autoCapitalize = "sentences",
    multiline = false,
  }) => (
    <View style={styles.fieldWrap} key={fieldKey}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, errors[fieldKey] && styles.inputRowError]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={errors[fieldKey] ? colors.danger : colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          ref={refs[fieldKey]}
          style={[styles.input, multiline && { height: 66, textAlignVertical: "top" }]}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={form[fieldKey]}
          onChangeText={(v) => setField(fieldKey, v)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          returnKeyType="done"
        />
      </View>
      {errors[fieldKey] ? <Text style={styles.errorText}>{errors[fieldKey]}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.primary }}>
        <View style={styles.header}>
          <PressableScale
            scaleTo={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() =>
              navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Profile")
            }
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
          </PressableScale>
          <Text style={styles.headerTitle}>{t("contact.title")}</Text>
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ padding: 20 }}>
          <SkeletonBlock height={70} radius={16} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ marginTop: 18 }}>
              <SkeletonBlock width={120} height={11} radius={5} />
              <SkeletonBlock height={52} radius={14} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <MotionView from="down">
              <Text style={styles.intro}>{t("contact.intro")}</Text>
            </MotionView>

            {/* Read-only account email */}
            <MotionView from="down" delay={60} style={styles.emailCard}>
              <View style={styles.emailIconWrap}>
                <MaterialCommunityIcons name="email-check-outline" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emailLabel}>{t("contact.accountEmail")}</Text>
                <Text style={styles.emailValue} numberOfLines={1}>{email || "—"}</Text>
              </View>
              <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textMuted} />
            </MotionView>
            <Text style={styles.emailHint}>{t("contact.emailHint")}</Text>

            {/* Editable contact fields */}
            <MotionView from="down" delay={120} style={styles.card}>
              {renderField({
                fieldKey: "phone",
                label: t("contact.phone"),
                placeholder: t("contact.phonePh"),
                icon: "phone-outline",
                keyboardType: "phone-pad",
              })}
              {renderField({
                fieldKey: "address",
                label: t("contact.address"),
                placeholder: t("contact.addressPh"),
                icon: "home-outline",
                multiline: true,
              })}
              {renderField({
                fieldKey: "city",
                label: t("contact.city"),
                placeholder: t("contact.cityPh"),
                icon: "city-variant-outline",
                autoCapitalize: "words",
              })}
              {renderField({
                fieldKey: "postal_code",
                label: t("contact.postal"),
                placeholder: t("contact.postalPh"),
                icon: "mailbox-outline",
                autoCapitalize: "characters",
              })}
              {renderField({
                fieldKey: "country",
                label: t("contact.country"),
                placeholder: t("contact.countryPh"),
                icon: "earth",
                autoCapitalize: "words",
              })}
            </MotionView>

            {errors._server ? (
              <View style={styles.serverError}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.dangerText} />
                <Text style={styles.serverErrorText}>{errors._server}</Text>
              </View>
            ) : null}

            <MotionView from="down" delay={180}>
              <PressableScale
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                scaleTo={0.96}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
                    <Text style={styles.saveText}>{t("contact.save")}</Text>
                  </>
                )}
              </PressableScale>
            </MotionView>

            <Text style={styles.footNote}>{t("contact.footNote")}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <SuccessOverlay
        visible={successOpen}
        title={t("contact.savedTitle")}
        subtitle={t("contact.savedSub")}
        color={colors.success}
        cardColor={colors.card}
        textColor={colors.text}
        subTextColor={colors.textSecondary}
        onDone={() => setSuccessOpen(false)}
      />
    </View>
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
      paddingTop: 10,
      paddingBottom: 18,
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },

    body: { padding: 20, paddingBottom: 50 },

    intro: { fontSize: 13.5, color: c.textSecondary, lineHeight: 19, marginBottom: 16 },

    // read-only email
    emailCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    emailIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    emailLabel: { fontSize: 11, letterSpacing: 1, color: c.textMuted, textTransform: "uppercase" },
    emailValue: { fontSize: 15.5, color: c.text, fontWeight: "600", marginTop: 3 },
    emailHint: { fontSize: 11.5, color: c.textMuted, marginTop: 8, marginLeft: 4 },

    // editable card
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 20,
      marginTop: 18,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },

    fieldWrap: { marginBottom: 16 },
    label: {
      fontSize: 11,
      color: c.textMuted,
      letterSpacing: 1,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.inputBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      paddingHorizontal: 14,
    },
    inputRowError: { borderColor: c.danger },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15.5,
      color: c.text,
    },
    errorText: { color: c.dangerText, fontSize: 12, marginTop: 6, marginLeft: 4 },

    serverError: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      padding: 12,
      marginTop: 16,
    },
    serverErrorText: { color: c.dangerText, fontSize: 13, flex: 1 },

    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primary,
      paddingVertical: 17,
      borderRadius: 16,
      marginTop: 24,
      shadowColor: c.primary,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    saveText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.5 },

    footNote: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 20,
      lineHeight: 17,
      paddingHorizontal: 10,
    },
  });
