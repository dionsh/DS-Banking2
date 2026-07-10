// ProfileAvatar — a circular, banking-style avatar: a themed gradient with the
// user's initial. Pure react-native-svg (already a dependency), so it renders
// identically on Android and iOS and is fully OTA-safe.

import React, { useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { getAvatarTheme } from "./avatarThemes";

export default function ProfileAvatar({
  themeId,
  initial = "U",
  size = 96,
  ring = false,
  ringColor = "#FFFFFF",
  style,
}) {
  const theme = getAvatarTheme(themeId);
  const r = size / 2;
  // Unique gradient id per instance so the grid of avatars never collides.
  const gid = useRef("av" + Math.random().toString(36).slice(2, 9)).current;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors[0]} />
            <Stop offset="1" stopColor={theme.colors[1]} />
          </LinearGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${gid})`} />
        {/* Subtle top highlight for a little depth */}
        <Circle cx={r} cy={r * 0.72} r={r * 0.78} fill="#FFFFFF" opacity={0.06} />
        {ring && (
          <Circle cx={r} cy={r} r={r - 1.5} fill="none" stroke={ringColor} strokeWidth={3} />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          allowFontScaling={false}
          style={{ color: "#FFFFFF", fontWeight: "800", fontSize: Math.round(size * 0.4) }}
        >
          {initial}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
