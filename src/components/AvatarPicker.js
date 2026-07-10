// AvatarPicker — a modern bottom sheet for choosing a profile avatar theme.
//
// Shows the curated gradient avatars (each rendered with the user's initial).
// Tapping one selects it immediately with a spring "pop" + ring, saves it (the
// parent persists to AsyncStorage), shows a brief confirmation pill, then the
// sheet slides away. Reanimated only — smooth on both platforms, OTA-safe.

import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { BottomSheet, PressableScale, PopWhenActive, MotionView } from "./motion";
import ProfileAvatar from "./ProfileAvatar";
import { AVATAR_THEMES } from "./avatarThemes";

const AVATAR_SIZE = 58;

export default function AvatarPicker({ visible, onClose, initial = "U", selectedId, onSelect }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [savedTick, setSavedTick] = useState(0);

  const choose = (id) => {
    onSelect && onSelect(id); // parent updates state + persists
    setSavedTick((n) => n + 1); // retrigger the confirmation pill
    // Let the pop + confirmation play, then close.
    setTimeout(() => onClose && onClose(), 780);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} sheetStyle={{ backgroundColor: colors.card }}>
      <View style={styles.body}>
        <Text style={styles.title}>Choose your avatar</Text>
        <Text style={styles.subtitle}>Tap a theme to update your profile avatar.</Text>

        {/* Confirmation pill (pops in each time a theme is chosen) */}
        {savedTick > 0 && (
          <PopWhenActive active={savedTick} style={styles.savedPillWrap}>
            <View style={styles.savedPill}>
              <MaterialCommunityIcons name="check-circle" size={15} color="#fff" />
              <Text style={styles.savedText}>Avatar updated</Text>
            </View>
          </PopWhenActive>
        )}

        <View style={styles.grid}>
          {AVATAR_THEMES.map((th, i) => {
            const active = th.id === selectedId;
            return (
              <MotionView key={th.id} from="down" delay={Math.min(i * 30, 270)} style={styles.cell}>
                <PressableScale scaleTo={0.9} onPress={() => choose(th.id)} style={styles.cellInner}>
                  <PopWhenActive active={active ? savedTick || 1 : 0}>
                    <View style={styles.avatarBox}>
                      <ProfileAvatar
                        themeId={th.id}
                        initial={initial}
                        size={AVATAR_SIZE}
                        ring={active}
                        ringColor={colors.accent}
                      />
                      {active && (
                        <View style={styles.checkBadge}>
                          <MaterialCommunityIcons name="check-bold" size={12} color="#fff" />
                        </View>
                      )}
                    </View>
                  </PopWhenActive>
                  <Text
                    style={[styles.themeName, active && { color: colors.accent, fontWeight: "700" }]}
                    numberOfLines={1}
                  >
                    {th.name}
                  </Text>
                </PressableScale>
              </MotionView>
            );
          })}
        </View>

        <PressableScale style={styles.doneBtn} scaleTo={0.96} onPress={onClose}>
          <Text style={styles.doneText}>Done</Text>
        </PressableScale>
      </View>
    </BottomSheet>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    body: { paddingHorizontal: 20, paddingTop: 4 },
    title: { fontSize: 19, fontWeight: "800", color: c.text, textAlign: "center" },
    subtitle: { fontSize: 13, color: c.textSecondary, textAlign: "center", marginTop: 4 },

    savedPillWrap: { alignItems: "center", marginTop: 12, height: 30 },
    savedPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.success,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    savedText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 14,
    },
    cell: { width: "20%", marginBottom: 16 },
    cellInner: { alignItems: "center" },
    avatarBox: { width: AVATAR_SIZE, height: AVATAR_SIZE },
    checkBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.card,
    },
    themeName: { fontSize: 10.5, color: c.textSecondary, marginTop: 6 },

    doneBtn: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 6,
    },
    doneText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
