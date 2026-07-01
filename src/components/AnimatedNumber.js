// AnimatedNumber — a counter that rolls from its previous value to the new one
// (used across Analytics, AI Coach and the Invest Simulator for the animated
// stat counters). Pure RN Animated, no extra libraries.
//
// Props:
//   value    - the target number
//   format   - optional (n) => string, defaults to 2-decimal euro formatting
//   style    - Text style(s)
//   duration - ms, default 900

import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text } from "react-native";

export default function AnimatedNumber({ value, format, style, duration = 900 }) {
  const anim = useRef(new Animated.Value(0)).current;
  const lastValue = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    anim.setValue(lastValue.current);

    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // we need the JS value to render text
    }).start(() => {
      lastValue.current = target;
      setDisplay(target);
    });

    return () => anim.removeListener(id);
  }, [value]);

  const fmt = format || ((n) => "€" + n.toFixed(2));
  return <Text style={style}>{fmt(display)}</Text>;
}
