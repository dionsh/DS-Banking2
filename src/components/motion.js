// motion.js — DS Banking's shared animation toolkit.
//
// Built entirely on react-native-reanimated 4 (already compiled into the APK,
// so everything here is OTA-safe). Every screen uses these primitives instead
// of ad-hoc animations so the whole app shares one motion language:
//
//   PressableScale  - drop-in TouchableOpacity replacement with a spring
//                     scale-down on press (Revolut-style tactile feedback).
//   MotionView      - fade + slide/zoom entrance for cards and sections;
//                     stagger sections with the `delay` prop.
//   AnimatedListItem- entrance for FlatList rows: the first screenful gets a
//                     stagger, rows mounted later while scrolling appear
//                     instantly (no laggy pop-in during fast scrolls).
//   SkeletonBlock   - pulsing placeholder for loading states.
//   Pulse           - gentle infinite scale pulse (notification badges).
//   PopWhenActive   - scale "pop" whenever `active` flips to true (PIN dots).
//   ShakeView       - horizontal error shake, retriggered via a counter prop.
//   SuccessOverlay  - full-screen animated success confirmation (backdrop
//                     fade, card spring, checkmark pop + expanding ring).
//
// Motion tokens (durations/springs) are exported so one change retunes the
// whole app.

import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Motion tokens — one shared rhythm for the whole app.
// ---------------------------------------------------------------------------

export const DURATION = {
  fast: 180,
  base: 320,
  slow: 460,
};

export const EASE_OUT = Easing.out(Easing.cubic);

// Gentle spring for entrances (no wobble, settles quickly).
export const SPRING_SOFT = { damping: 18, stiffness: 160, mass: 0.6 };
// Snappy spring for press feedback (must react within ~100ms).
export const SPRING_PRESS = { damping: 24, stiffness: 420, mass: 0.7 };
// Bouncy spring for celebratory pops (success check, PIN dots).
export const SPRING_POP = { damping: 12, stiffness: 260, mass: 0.6 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------------------------------------------------------------------------
// PressableScale — tactile press feedback.
// ---------------------------------------------------------------------------
//
// Drop-in replacement for TouchableOpacity: same style/onPress/hitSlop props.
// Scales to `scaleTo` (default 0.96) with a snappy spring and dips opacity a
// touch. Transform-only => runs on the UI thread at 60fps.

export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  opacityTo = 0.85,
  disabled,
  onPress,
  onLongPress,
  hitSlop,
  ...rest
}) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, opacityTo]),
  }));

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={hitSlop}
      onPressIn={() => {
        pressed.value = withSpring(1, SPRING_PRESS);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, SPRING_PRESS);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------
// MotionView — entrance animation for sections/cards.
// ---------------------------------------------------------------------------
//
//   <MotionView delay={120} from="down">...</MotionView>
//
// from: 'down' (slides up into place), 'up', 'left', 'right', 'zoom', 'fade'.
// Runs once on mount; stagger siblings by passing increasing delays.

export function MotionView({
  children,
  style,
  delay = 0,
  from = "down",
  distance = 16,
  spring = false,
  ...rest
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      spring
        ? withSpring(1, SPRING_SOFT)
        : withTiming(1, { duration: DURATION.slow, easing: EASE_OUT })
    );
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const transform = [];
    if (from === "down") transform.push({ translateY: interpolate(p, [0, 1], [distance, 0]) });
    else if (from === "up") transform.push({ translateY: interpolate(p, [0, 1], [-distance, 0]) });
    else if (from === "left") transform.push({ translateX: interpolate(p, [0, 1], [-distance, 0]) });
    else if (from === "right") transform.push({ translateX: interpolate(p, [0, 1], [distance, 0]) });
    else if (from === "zoom") transform.push({ scale: interpolate(p, [0, 1], [0.9, 1]) });
    return { opacity: p, transform };
  });

  return (
    <Animated.View style={[style, animatedStyle]} {...rest}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// AnimatedListItem — staggered entrance for list rows.
// ---------------------------------------------------------------------------
//
// Rows in the first screenful (index < staggerCount) fade + rise in sequence.
// Rows mounted later (while scrolling) skip the animation entirely so fast
// scrolling never looks laggy.

export function AnimatedListItem({ index = 0, staggerCount = 10, children, style }) {
  const animate = index < staggerCount;
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) {
      progress.value = withDelay(
        60 + index * 45,
        withTiming(1, { duration: DURATION.base, easing: EASE_OUT })
      );
    }
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [14, 0]) }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// SkeletonBlock — pulsing loading placeholder.
// ---------------------------------------------------------------------------

export function SkeletonBlock({ width = "100%", height = 16, radius = 8, color, style }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.45, 0.9]),
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: color || "rgba(127,127,127,0.22)" },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Pulse — gentle infinite scale pulse (e.g. unread badge).
// ---------------------------------------------------------------------------

export function Pulse({ children, style, enabled = true, maxScale = 1.25 }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (enabled) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })
        ),
        -1
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: DURATION.fast });
    }
    return () => cancelAnimation(pulse);
  }, [enabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, maxScale]) }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// PopWhenActive — springy pop each time `active` becomes true (PIN dots).
// ---------------------------------------------------------------------------

export function PopWhenActive({ active, children, style }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withSequence(
        withTiming(1.35, { duration: 90, easing: EASE_OUT }),
        withSpring(1, SPRING_POP)
      );
    }
    return () => cancelAnimation(scale);
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// ShakeView — error shake. Bump the `trigger` counter to replay.
// ---------------------------------------------------------------------------
//
//   const [shakeTick, setShakeTick] = useState(0);
//   <ShakeView trigger={shakeTick}> ...form... </ShakeView>
//   // on error: setShakeTick(t => t + 1)

export function ShakeView({ trigger = 0, children, style }) {
  const offset = useSharedValue(0);

  useEffect(() => {
    if (trigger > 0) {
      offset.value = withSequence(
        withTiming(-9, { duration: 55 }),
        withTiming(8, { duration: 55 }),
        withTiming(-6, { duration: 55 }),
        withTiming(4, { duration: 55 }),
        withTiming(0, { duration: 55 })
      );
    }
    return () => cancelAnimation(offset);
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// SuccessOverlay — the celebratory confirmation moment.
// ---------------------------------------------------------------------------
//
// Transparent modal: backdrop fades in, the card springs up, the green check
// pops with an expanding ring, then title/subtitle rise in. Auto-dismisses
// after `autoHideMs` (tap anywhere to dismiss sooner); onDone fires exactly
// once per showing.

export function SuccessOverlay({
  visible,
  title,
  subtitle,
  onDone,
  autoHideMs = 2200,
  color = "#2E7D32",
  cardColor = "#FFFFFF",
  textColor = "#111111",
  subTextColor = "#555555",
}) {
  const doneRef = React.useRef(false);

  useEffect(() => {
    if (!visible) return;
    doneRef.current = false;
    const id = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone && onDone();
      }
    }, autoHideMs);
    return () => clearTimeout(id);
  }, [visible]);

  const dismiss = () => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone && onDone();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={overlayStyles.backdrop} onPress={dismiss}>
        <MotionView from="zoom" spring style={[overlayStyles.card, { backgroundColor: cardColor }]}>
          <View style={overlayStyles.checkArea}>
            <SuccessRing color={color} />
            <PopWhenActive active style={[overlayStyles.checkCircle, { backgroundColor: color }]}>
              <MaterialCommunityIcons name="check-bold" size={40} color="#FFFFFF" />
            </PopWhenActive>
          </View>
          <MotionView delay={220} from="down" distance={10}>
            <Text style={[overlayStyles.title, { color: textColor }]}>{title}</Text>
          </MotionView>
          {subtitle ? (
            <MotionView delay={320} from="down" distance={10}>
              <Text style={[overlayStyles.subtitle, { color: subTextColor }]}>{subtitle}</Text>
            </MotionView>
          ) : null}
        </MotionView>
      </Pressable>
    </Modal>
  );
}

// Expanding + fading ring behind the success check.
function SuccessRing({ color }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      120,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) })
    );
    return () => cancelAnimation(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1.9]) }],
  }));

  return <Animated.View style={[overlayStyles.ring, { borderColor: color }, animatedStyle]} />;
}

const overlayStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
  },
  card: {
    width: "100%",
    borderRadius: 26,
    paddingVertical: 34,
    paddingHorizontal: 26,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  checkArea: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
