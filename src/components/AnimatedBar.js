// AnimatedBar — a progress bar whose fill glides smoothly to its target
// percentage (used by the Budget Planner and Shared Savings screens).
// Pure RN Animated, no extra libraries.
//
// Props:
//   pct      - fill percentage 0..100 (values above 100 are clamped visually)
//   color    - fill color
//   trackColor - background color of the track
//   height   - bar height, default 10
//   duration - ms, default 700

import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

export default function AnimatedBar({ pct, color, trackColor, height = 10, duration = 700 }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(100, Number(pct) || 0)),
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width can't use the native driver
    }).start();
  }, [pct]);

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          width: anim.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
    </View>
  );
}
