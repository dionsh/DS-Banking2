import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import Avatar, {
  SKIN_TONES,
  HAIR_COLORS,
  SHIRT_COLORS,
  PANTS_COLORS,
  SHOE_COLORS,
} from "../components/Avatar";
import CharacterPrompt from "../components/CharacterPrompt";

const STORAGE_KEY = "avatar_config";

const DEFAULT_CFG = {
  gender: "male",
  skin: "#E0AC69",
  hairStyle: "short",
  hairColor: "#2A2A2A",
  shirtStyle: "tshirt",
  shirtColor: "#4F46E5",
  pantsStyle: "jeans",
  pantsColor: "#2C3E50",
  shoeStyle: "sneakers",
  shoeColor: "#FFFFFF",
};

const STYLE_FIELD = {
  hair: "hairStyle",
  shirt: "shirtStyle",
  pants: "pantsStyle",
  shoes: "shoeStyle",
};

// Free styles every character owns even with no backend (offline fallback).
const FREE_STYLES = {
  hair: ["short", "curly", "long"],
  shirt: ["tshirt", "hoodie", "polo"],
  pants: ["jeans", "shorts"],
  shoes: ["sneakers", "boots"],
};

// Each gender starts with its own default hairstyle when you switch.
const GENDER_DEFAULT_HAIR = { male: "short", female: "long" };

// Women-only styles — reset to a safe default if the character switches to man.
const FEMALE_ONLY = { shirt: ["dress"], pants: ["skirt"], shoes: ["heels"] };
const MALE_FALLBACK = { shirt: "tshirt", pants: "jeans", shoes: "sneakers" };

const SLOTS = [
  { key: "skin", colorField: "skin", colors: SKIN_TONES },
  { key: "hair", slot: "hair", styleField: "hairStyle", colorField: "hairColor", colors: HAIR_COLORS },
  { key: "shirt", slot: "shirt", styleField: "shirtStyle", colorField: "shirtColor", colors: SHIRT_COLORS },
  { key: "pants", slot: "pants", styleField: "pantsStyle", colorField: "pantsColor", colors: PANTS_COLORS },
  { key: "shoes", slot: "shoes", styleField: "shoeStyle", colorField: "shoeColor", colors: SHOE_COLORS },
];

const toCfg = (e) => ({
  gender: e.gender || "male",
  skin: e.skin,
  hairStyle: e.hair_style,
  hairColor: e.hair_color,
  shirtStyle: e.shirt_style,
  shirtColor: e.shirt_color,
  pantsStyle: e.pants_style,
  pantsColor: e.pants_color,
  shoeStyle: e.shoe_style,
  shoeColor: e.shoe_color,
});
const toServer = (c) => ({
  gender: c.gender,
  skin: c.skin,
  hair_style: c.hairStyle,
  hair_color: c.hairColor,
  shirt_style: c.shirtStyle,
  shirt_color: c.shirtColor,
  pants_style: c.pantsStyle,
  pants_color: c.pantsColor,
  shoe_style: c.shoeStyle,
  shoe_color: c.shoeColor,
});

const fallbackCatalog = () => {
  const out = [];
  let id = -1;
  Object.keys(FREE_STYLES).forEach((slot) => {
    FREE_STYLES[slot].forEach((style) => {
      out.push({ id: id--, slot, style, price_points: 0, is_free: true, owned: true });
    });
  });
  return out;
};

// Diagonal "/" stripes that fill a measured box — the locked-item indicator.
function StripeOverlay({ w, h, stroke }) {
  if (!w || !h) return null;
  const gap = 9;
  const lines = [];
  for (let c = gap; c < w + h; c += gap) {
    const x1 = c <= w ? c : w;
    const y1 = c <= w ? 0 : c - w;
    const x2 = c <= h ? 0 : c - h;
    const y2 = c <= h ? c : h;
    lines.push(<Line key={c} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={2.5} />);
  }
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      {lines}
    </Svg>
  );
}

// One selectable clothing option. Locked premium items get the striped overlay
// + a lock and their points price; owned items behave like a normal chip.
function StyleChip({ label, price, active, locked, isBuying, onPress, c, styles }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.styleChip, active && styles.styleChipActive, locked && styles.styleChipLocked]}
      disabled={isBuying}
      onPress={onPress}
      onLayout={(e) =>
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }
    >
      {locked && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.stripeWrap]}>
          <StripeOverlay w={size.w} h={size.h} stroke={c.accent} />
        </View>
      )}
      {isBuying ? (
        <ActivityIndicator size="small" color={c.accent} />
      ) : (
        <>
          <Text
            style={[
              styles.styleChipText,
              active && styles.styleChipTextActive,
              locked && styles.styleChipTextLocked,
            ]}
          >
            {label}
          </Text>
          {locked && (
            <View style={styles.priceTag}>
              <MaterialCommunityIcons name="lock" size={12} color={c.accent} />
              <Text style={styles.priceText}>{price}</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

export default function MyCharacter() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [catalog, setCatalog] = useState([]);
  const [points, setPoints] = useState(0);
  const [online, setOnline] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [buyingId, setBuyingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const cfgRef = useRef(cfg);
  React.useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  const catalogBySlot = useMemo(() => {
    const map = { hair: [], shirt: [], pants: [], shoes: [] };
    catalog.forEach((it) => {
      if (map[it.slot]) map[it.slot].push(it);
    });
    return map;
  }, [catalog]);

  const load = useCallback(async () => {
    try {
      const stored = JSON.parse(await AsyncStorage.getItem("user"));
      if (!stored) {
        setLoaded(true);
        return;
      }
      setUser(stored);

      // Instant render from the cached look while the server responds.
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) setCfg({ ...DEFAULT_CFG, ...JSON.parse(cached) });
      } catch (e) {}

      const res = await fetch(`${API_BASE}/get_avatar.php?user_id=${stored.user_id}`);
      const data = await res.json();
      if (data.status === "success") {
        setOnline(true);
        setPoints(Number(data.points) || 0);
        setCatalog(data.catalog || []);
        if (data.equipped) setCfg({ ...DEFAULT_CFG, ...toCfg(data.equipped) });
      } else {
        setOnline(false);
        setCatalog(fallbackCatalog());
      }
    } catch (err) {
      console.log("Avatar load error:", err);
      setOnline(false);
      setCatalog(fallbackCatalog());
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Cache the look locally on every change for instant re-render. The server is
  // updated explicitly by the Save button (and right after a purchase).
  React.useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)).catch(() => {});
  }, [cfg, loaded]);

  const set = (field, value) => setCfg((prev) => ({ ...prev, [field]: value }));

  // Switching gender applies that gender's default hair and drops any
  // women-only items a man can't wear.
  const selectGender = (g) =>
    setCfg((prev) => {
      const next = { ...prev, gender: g, hairStyle: GENDER_DEFAULT_HAIR[g] };
      if (g === "male") {
        if (FEMALE_ONLY.shirt.includes(next.shirtStyle)) next.shirtStyle = MALE_FALLBACK.shirt;
        if (FEMALE_ONLY.pants.includes(next.pantsStyle)) next.pantsStyle = MALE_FALLBACK.pants;
        if (FEMALE_ONLY.shoes.includes(next.shoeStyle)) next.shoeStyle = MALE_FALLBACK.shoes;
      }
      return next;
    });

  const postEquip = async (config) => {
    const res = await fetch(`${API_BASE}/equip_avatar.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.user_id, config: toServer(config) }),
    });
    return res.json();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfgRef.current));
      if (online && user) {
        const data = await postEquip(cfgRef.current);
        if (data.status === "success") {
          Alert.alert(t("avatar.savedTitle"), t("avatar.savedMsg"));
        } else {
          Alert.alert(t("common.error"), data.message || t("avatar.couldNotSave"));
        }
      } else {
        Alert.alert(t("avatar.savedTitle"), t("avatar.savedLocal"));
      }
    } catch (err) {
      console.log("Save error:", err);
      Alert.alert(t("common.error"), t("avatar.couldNotSave"));
    }
    setSaving(false);
  };

  const confirmBuy = (item, styleField) => {
    if (points < item.price_points) {
      Alert.alert(t("avatar.notEnoughTitle"), t("avatar.notEnough", { price: item.price_points }), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("avatar.earnPoints"), onPress: () => navigation.navigate("Rewards") },
      ]);
      return;
    }
    Alert.alert(
      t("avatar.buyTitle"),
      t("avatar.buyConfirm", { item: t("avatar." + item.style), price: item.price_points }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("avatar.buy"), onPress: () => doBuy(item, styleField) },
      ]
    );
  };

  const doBuy = async (item, styleField) => {
    setBuyingId(item.id);
    try {
      const res = await fetch(`${API_BASE}/buy_item.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, item_id: item.id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setPoints(Number(data.total_points) || 0);
        setCatalog((prev) => prev.map((c) => (c.id === item.id ? { ...c, owned: true } : c)));
        // Wear what you just unlocked and persist it.
        const newCfg = { ...cfgRef.current, [styleField]: item.style };
        setCfg(newCfg);
        postEquip(newCfg).catch(() => {});
        Alert.alert(t("avatar.unlockedTitle"), t("avatar.unlockedMsg", { item: t("avatar." + item.style) }));
      } else {
        Alert.alert(t("common.error"), data.message || t("avatar.couldNotBuy"));
      }
    } catch (err) {
      console.log("Buy error:", err);
      Alert.alert(t("common.error"), t("notif.couldNotReach"));
    }
    setBuyingId(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("menu.myCharacter")}</Text>
        <TouchableOpacity style={styles.pointsPill} onPress={() => navigation.navigate("Rewards")}>
          <MaterialCommunityIcons name="star-four-points" size={15} color="#fff" />
          <Text style={styles.pointsPillText}>{points}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View style={styles.stage}>
          <Avatar
            size={180}
            gender={cfg.gender}
            skin={cfg.skin}
            hairStyle={cfg.hairStyle}
            hairColor={cfg.hairColor}
            shirtStyle={cfg.shirtStyle}
            shirtColor={cfg.shirtColor}
            pantsStyle={cfg.pantsStyle}
            pantsColor={cfg.pantsColor}
            shoeStyle={cfg.shoeStyle}
            shoeColor={cfg.shoeColor}
          />
        </View>

        {!loaded ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* Shop intro / earn-points hint */}
            <View style={styles.shopBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopTitle}>{t("avatar.shopTitle")}</Text>
                <Text style={styles.shopSub}>
                  {online ? t("avatar.shopSub") : t("avatar.offline")}
                </Text>
              </View>
              <TouchableOpacity style={styles.earnBtn} onPress={() => navigation.navigate("Rewards")}>
                <MaterialCommunityIcons name="gamepad-variant-outline" size={16} color="#fff" />
                <Text style={styles.earnBtnText}>{t("avatar.earn")}</Text>
              </TouchableOpacity>
            </View>

            {/* Customizer */}
            <View style={styles.panel}>
              {/* Gender — man / woman */}
              <View style={styles.slot}>
                <Text style={styles.slotLabel}>{t("avatar.gender")}</Text>
                <View style={styles.styleRow}>
                  {["male", "female"].map((g) => {
                    const active = cfg.gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[styles.styleChip, active && styles.styleChipActive]}
                        onPress={() => selectGender(g)}
                      >
                        <MaterialCommunityIcons
                          name={g === "female" ? "human-female" : "human-male"}
                          size={15}
                          color={active ? "#fff" : colors.accent}
                        />
                        <Text style={[styles.styleChipText, active && styles.styleChipTextActive]}>
                          {t("avatar." + g)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {SLOTS.map((slot) => {
                const options = slot.slot
                  ? (catalogBySlot[slot.slot] || []).filter(
                      (it) => !it.gender || it.gender === "any" || it.gender === cfg.gender
                    )
                  : [];
                return (
                  <View key={slot.key} style={styles.slot}>
                    <Text style={styles.slotLabel}>{t("avatar." + slot.key)}</Text>

                    {options.length > 0 && (
                      <View style={styles.styleRow}>
                        {options.map((item) => {
                          const active = cfg[slot.styleField] === item.style;
                          const locked = !item.owned;
                          return (
                            <StyleChip
                              key={item.style}
                              label={t("avatar." + item.style)}
                              price={item.price_points}
                              active={active}
                              locked={locked}
                              isBuying={buyingId === item.id}
                              onPress={() =>
                                locked
                                  ? confirmBuy(item, slot.styleField)
                                  : set(slot.styleField, item.style)
                              }
                              c={colors}
                              styles={styles}
                            />
                          );
                        })}
                      </View>
                    )}

                    <View style={styles.swatchRow}>
                      {slot.colors.map((color) => {
                        const active = cfg[slot.colorField] === color;
                        return (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.swatch,
                              { backgroundColor: color },
                              active && styles.swatchActive,
                            ]}
                            onPress={() => set(slot.colorField, color)}
                          />
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Save button — persists the character */}
      {loaded && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{t("avatar.save")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <CharacterPrompt visible={showWelcome} onContinue={() => setShowWelcome(false)} />
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
    pointsPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
    },
    pointsPillText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    stage: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 18,
      backgroundColor: c.surfaceAlt,
    },

    shopBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginHorizontal: 20,
      marginTop: 14,
      marginBottom: 4,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    shopTitle: { fontSize: 15, fontWeight: "700", color: c.text },
    shopSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    earnBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.primary,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
    },
    earnBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },

    panel: { paddingHorizontal: 20, paddingTop: 6 },
    slot: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    slotLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
      letterSpacing: 0.5,
      marginBottom: 12,
    },

    styleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    styleChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 36,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    styleChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    styleChipLocked: { borderStyle: "dashed", borderColor: c.accent, backgroundColor: c.card },
    styleChipText: { fontSize: 13, fontWeight: "600", color: c.accent },
    styleChipTextActive: { color: "#fff" },
    styleChipTextLocked: { color: c.text },
    stripeWrap: { opacity: 0.28, borderRadius: 18 },

    priceTag: { flexDirection: "row", alignItems: "center", gap: 2 },
    priceText: { fontSize: 12, fontWeight: "700", color: c.accent },

    swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    swatch: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
      borderColor: "transparent",
    },
    swatchActive: { borderColor: c.accent, transform: [{ scale: 1.08 }] },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      backgroundColor: c.background,
    },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primary,
      paddingVertical: 16,
      borderRadius: 14,
    },
    saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
