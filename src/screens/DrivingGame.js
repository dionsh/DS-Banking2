import React, {
  useState,
  useRef,
  useEffect,
  useReducer,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

const CAR_W = 46;
const CAR_H = 84;
const OBSTACLE_SIZE = 50;
const DASH_W = 8;
const DASH_H = 42;
const DASH_GAP = 34;
const CAR_X_SPEED = 360; // px/sec when holding a direction button

const OBSTACLE_EMOJIS = ["🚧", "🪨", "🛢️", "🚗", "🚙"];

const TOTAL_LEVELS = 5;

// Per-level tuning: forward speed (px/sec), spawn interval (sec), distance target (m).
function levelConfig(level) {
  return {
    speed: 210 + (level - 1) * 55,
    spawnEvery: Math.max(0.55, 1.15 - (level - 1) * 0.13),
    target: 650 + (level - 1) * 150,
  };
}

export default function DrivingGame() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // gameState: "ready" | "playing" | "levelComplete" | "gameOver" | "won"
  const [gameState, setGameState] = useState("ready");
  // Mirror of gameState for the (once-created) PanResponder to read at run time.
  const gameStateRef = useRef("ready");
  const [level, setLevel] = useState(1);
  const [hud, setHud] = useState({ score: 0, distance: 0, target: levelConfig(1).target });
  const [rewardMsg, setRewardMsg] = useState("");
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const [user, setUser] = useState(null);
  const userRef = useRef(null);

  // Force a re-render every animation frame so the road/car/obstacles re-position.
  const [, tick] = useReducer((x) => x + 1, 0);

  // All fast-changing game data lives in a ref so the rAF loop never reads stale state.
  const game = useRef({
    carX: 0,
    dir: 0, // -1 left, 1 right, 0 none (from hold buttons)
    obstacles: [],
    nextId: 1,
    speed: levelConfig(1).speed,
    spawnEvery: levelConfig(1).spawnEvery,
    target: levelConfig(1).target,
    sinceSpawn: 0,
    roadOffset: 0,
    distance: 0,
    score: 0,
    running: false,
  });
  const dimsRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const awardedRef = useRef(false);

  // Pop animation for the overlay cards.
  const overlayScale = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const stored = JSON.parse(await AsyncStorage.getItem("user"));
          if (stored) {
            setUser(stored);
            userRef.current = stored;
          }
        } catch (err) {
          console.log("DrivingGame user load error:", err);
        }
      };
      loadUser();
      // Stop the loop when the screen loses focus.
      return () => stopLoop();
    }, [])
  );

  const carY = () => Math.max(0, dimsRef.current.h - CAR_H - 18);

  const stopLoop = () => {
    game.current.running = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const startLevel = (lvl, resetScore) => {
    const cfg = levelConfig(lvl);
    const w = dimsRef.current.w || dims.w;
    const g = game.current;
    g.carX = w > 0 ? w / 2 - CAR_W / 2 : 0;
    g.dir = 0;
    g.obstacles = [];
    g.nextId = 1;
    g.speed = cfg.speed;
    g.spawnEvery = cfg.spawnEvery;
    g.target = cfg.target;
    g.sinceSpawn = 0;
    g.roadOffset = 0;
    g.distance = 0;
    if (resetScore) g.score = 0;
    awardedRef.current = false;

    setLevel(lvl);
    setRewardMsg("");
    setHud({ score: g.score, distance: 0, target: cfg.target });
    setGameState("playing");
  };

  // Drive the rAF loop while playing.
  useEffect(() => {
    if (gameState !== "playing") {
      stopLoop();
      return;
    }
    game.current.running = true;
    lastTsRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => stopLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Animate overlay cards when they appear (the "ready" start card included —
  // only "playing" has no overlay).
  useEffect(() => {
    if (gameState === "playing") return;
    overlayScale.setValue(0);
    Animated.spring(overlayScale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [gameState, overlayScale]);

  const loop = (ts) => {
    const g = game.current;
    if (!g.running) return;

    if (!lastTsRef.current) lastTsRef.current = ts;
    let dt = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (e.g. after a stutter)

    const { w, h } = dimsRef.current;
    if (w > 0 && h > 0) {
      update(dt, w, h);
    }

    if (g.running) {
      tick();
      rafRef.current = requestAnimationFrame(loop);
    }
  };

  const update = (dt, w, h) => {
    const g = game.current;

    // Scroll the dashed road markings.
    g.roadOffset = (g.roadOffset + g.speed * dt) % (DASH_H + DASH_GAP);

    // Horizontal movement from the hold buttons.
    if (g.dir !== 0) {
      g.carX += g.dir * CAR_X_SPEED * dt;
    }
    g.carX = Math.max(0, Math.min(w - CAR_W, g.carX));

    // Spawn obstacles at random horizontal positions.
    g.sinceSpawn += dt;
    if (g.sinceSpawn >= g.spawnEvery) {
      g.sinceSpawn = 0;
      const x = Math.random() * (w - OBSTACLE_SIZE);
      const emoji = OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)];
      g.obstacles.push({ id: g.nextId++, x, y: -OBSTACLE_SIZE, emoji });
    }

    // Move obstacles down, score the ones that leave the screen.
    const cy = carY();
    const carBox = { x: g.carX + 6, y: cy + 6, w: CAR_W - 12, h: CAR_H - 12 };
    const remaining = [];
    for (const ob of g.obstacles) {
      ob.y += g.speed * dt;

      // Collision check (axis-aligned rectangle overlap with a small inset).
      const obBox = { x: ob.x + 6, y: ob.y + 6, w: OBSTACLE_SIZE - 12, h: OBSTACLE_SIZE - 12 };
      if (
        carBox.x < obBox.x + obBox.w &&
        carBox.x + carBox.w > obBox.x &&
        carBox.y < obBox.y + obBox.h &&
        carBox.y + carBox.h > obBox.y
      ) {
        g.running = false;
        setHud({ score: g.score, distance: Math.round(g.distance), target: g.target });
        setGameState("gameOver");
        return;
      }

      if (ob.y > h) {
        g.score += 1;
      } else {
        remaining.push(ob);
      }
    }
    g.obstacles = remaining;

    // Distance progress (scaled so a level lasts ~15-25s).
    g.distance += (g.speed * dt) / 6;

    if (g.distance >= g.target && !awardedRef.current) {
      awardedRef.current = true;
      g.running = false;
      const clearedLevel = level;
      setHud({ score: g.score, distance: Math.round(g.distance), target: g.target });
      awardLevel(clearedLevel);
      setGameState(clearedLevel >= TOTAL_LEVELS ? "won" : "levelComplete");
      return;
    }

    // Periodically sync HUD (every frame is fine for these small numbers).
    setHud({ score: g.score, distance: Math.round(g.distance), target: g.target });
  };

  const awardLevel = async (lvl) => {
    const u = userRef.current || user;
    if (!u) return;
    try {
      const res = await fetch(`${API_BASE}/game_reward.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.user_id, level: lvl }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setRewardMsg(t("drive.rewardMsg", { points: data.points_earned, total: data.total_points }));
      } else {
        setRewardMsg(data.message || t("drive.couldNotSave"));
      }
    } catch (err) {
      console.log("Driving reward error:", err);
      setRewardMsg(t("drive.offline"));
    }
  };

  // Hold-to-steer button handlers.
  const setDir = (d) => {
    game.current.dir = d;
  };

  // Drag anywhere on the road to slide the car under your finger.
  // IMPORTANT: only claim the touch on an actual drag *while playing* — never on
  // a plain tap — otherwise the responder would swallow taps meant for the
  // overlay buttons (Start Game, Try Again, etc.) rendered on top of the road.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => gameStateRef.current === "playing",
      onPanResponderMove: (_, gestureState) => {
        if (gameStateRef.current !== "playing") return;
        const w = dimsRef.current.w;
        if (w <= 0) return;
        // gestureState.moveX is the absolute touch X on screen; the road spans the
        // full width so we can use it directly.
        game.current.carX = Math.max(0, Math.min(w - CAR_W, gestureState.moveX - CAR_W / 2));
      },
    })
  ).current;

  const onRoadLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    dimsRef.current = { w: width, h: height };
    setDims({ w: width, h: height });
    // Center the car once we know the road width.
    if (gameState === "ready") {
      game.current.carX = width / 2 - CAR_W / 2;
    }
  };

  // Keep the PanResponder's view of the state current.
  gameStateRef.current = gameState;

  const g = game.current;
  const progress = hud.target > 0 ? Math.min(1, hud.distance / hud.target) : 0;

  // Pre-compute the scrolling dash positions.
  const dashes = [];
  if (dims.h > 0) {
    const span = DASH_H + DASH_GAP;
    const count = Math.ceil(dims.h / span) + 2;
    for (let i = 0; i < count; i++) {
      const y = ((i * span + g.roadOffset) % (dims.h + span)) - span;
      dashes.push({ key: i, y });
    }
  }

  const renderOverlay = ({ icon, iconColor, title, subtitle, lines, primaryLabel, onPrimary }) => (
    <View style={styles.overlay}>
      <Animated.View style={[styles.overlayCard, { transform: [{ scale: overlayScale }] }]}>
        <MaterialCommunityIcons name={icon} size={42} color={iconColor} />
        <Text style={styles.overlayTitle}>{title}</Text>
        {subtitle ? <Text style={styles.overlaySubtitle}>{subtitle}</Text> : null}
        {lines &&
          lines.map((l, i) => (
            <Text key={i} style={styles.overlayLine}>
              {l}
            </Text>
          ))}
        {rewardMsg && (gameState === "levelComplete" || gameState === "won") ? (
          <View style={styles.rewardChip}>
            <MaterialCommunityIcons name="trophy" size={16} color={colors.warning} />
            <Text style={styles.rewardChipText}>{rewardMsg}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.overlayBtn} onPress={onPrimary}>
          <Text style={styles.overlayBtnText}>{primaryLabel}</Text>
        </TouchableOpacity>
        {(gameState === "won" || gameState === "levelComplete") && (
          <TouchableOpacity onPress={() => navigation.navigate("Rewards")}>
            <Text style={styles.overlayLink}>{t("drive.viewRewards")}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("menu.drivingGame")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Rewards")}>
          <MaterialCommunityIcons name="trophy-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>{t("drive.level")}</Text>
          <Text style={styles.hudValue}>{level}/{TOTAL_LEVELS}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>{t("drive.score")}</Text>
          <Text style={styles.hudValue}>{hud.score}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>{t("drive.distance")}</Text>
          <Text style={styles.hudValue}>{hud.distance} m</Text>
        </View>
      </View>

      {/* Level progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Road */}
      <View style={styles.road} onLayout={onRoadLayout} {...panResponder.panHandlers}>
        {/* Lane markings */}
        {dashes.map((d) => (
          <View
            key={d.key}
            style={[styles.dash, { top: d.y, left: dims.w / 2 - DASH_W / 2 }]}
          />
        ))}

        {/* Side edges */}
        <View style={[styles.edge, { left: 0 }]} />
        <View style={[styles.edge, { right: 0 }]} />

        {/* Obstacles */}
        {gameState !== "ready" &&
          g.obstacles.map((ob) => (
            <Text key={ob.id} style={[styles.obstacle, { left: ob.x, top: ob.y }]}>
              {ob.emoji}
            </Text>
          ))}

        {/* Player car */}
        {dims.w > 0 && (
          <View
            style={[
              styles.car,
              { left: g.carX, top: carY(), width: CAR_W, height: CAR_H },
            ]}
          >
            <View style={styles.carHeadlightLeft} />
            <View style={styles.carHeadlightRight} />
            <View style={styles.carWindshield} />
            <View style={styles.carRoof} />
          </View>
        )}

        {/* Overlays (called as a function, not a nested component, so the card
            reconciles in place and its pop animation isn't interrupted) */}
        {gameState === "ready" &&
          renderOverlay({
            icon: "car-sports",
            iconColor: colors.accent,
            title: t("drive.challengeTitle"),
            subtitle: t("drive.challengeSub"),
            lines: [t("drive.line1"), t("drive.line2")],
            primaryLabel: t("drive.startGame"),
            onPrimary: () => startLevel(1, true),
          })}

        {gameState === "levelComplete" &&
          renderOverlay({
            icon: "flag-checkered",
            iconColor: colors.success,
            title: t("drive.levelComplete", { level }),
            subtitle: t("drive.scoreDist", { score: hud.score, distance: hud.distance }),
            primaryLabel: t("drive.startLevel", { level: level + 1 }),
            onPrimary: () => startLevel(level + 1, false),
          })}

        {gameState === "gameOver" &&
          renderOverlay({
            icon: "car-emergency",
            iconColor: colors.danger,
            title: t("drive.gameOver"),
            subtitle: t("drive.crashed", { level }),
            lines: [t("drive.scoreDist", { score: hud.score, distance: hud.distance })],
            primaryLabel: t("drive.tryAgain"),
            onPrimary: () => startLevel(level, false),
          })}

        {gameState === "won" &&
          renderOverlay({
            icon: "trophy",
            iconColor: colors.warning,
            title: t("drive.win"),
            subtitle: t("drive.wonSub"),
            lines: [t("drive.finalScore", { score: hud.score })],
            primaryLabel: t("drive.playAgain"),
            onPrimary: () => startLevel(1, true),
          })}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.ctrlBtn, gameState !== "playing" && styles.ctrlBtnDisabled]}
          disabled={gameState !== "playing"}
          onPressIn={() => setDir(-1)}
          onPressOut={() => setDir(0)}
        >
          <MaterialCommunityIcons name="arrow-left-bold" size={34} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.ctrlBtn, gameState !== "playing" && styles.ctrlBtnDisabled]}
          disabled={gameState !== "playing"}
          onPressIn={() => setDir(1)}
          onPressOut={() => setDir(0)}
        >
          <MaterialCommunityIcons name="arrow-right-bold" size={34} color="#fff" />
        </TouchableOpacity>
      </View>
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

    hud: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: 12,
      backgroundColor: c.card,
    },
    hudItem: { alignItems: "center" },
    hudLabel: { fontSize: 10, color: c.textMuted, letterSpacing: 1 },
    hudValue: { fontSize: 18, fontWeight: "bold", color: c.accent, marginTop: 2 },

    progressTrack: {
      height: 6,
      backgroundColor: c.surfaceAlt,
    },
    progressFill: {
      height: 6,
      backgroundColor: c.success,
    },

    road: {
      flex: 1,
      backgroundColor: "#3A3A42", // asphalt (kept dark in both themes for contrast)
      overflow: "hidden",
    },
    dash: {
      position: "absolute",
      width: DASH_W,
      height: DASH_H,
      borderRadius: 4,
      backgroundColor: "#F4D03F",
    },
    edge: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 5,
      backgroundColor: "#ECF0F1",
    },

    obstacle: {
      position: "absolute",
      width: OBSTACLE_SIZE,
      height: OBSTACLE_SIZE,
      fontSize: 38,
      textAlign: "center",
      lineHeight: OBSTACLE_SIZE,
    },

    car: {
      position: "absolute",
      backgroundColor: "#E53935",
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "#B71C1C",
    },
    carRoof: {
      position: "absolute",
      top: CAR_H * 0.34,
      left: CAR_W * 0.18,
      width: CAR_W * 0.64,
      height: CAR_H * 0.3,
      borderRadius: 6,
      backgroundColor: "#7F0000",
    },
    carWindshield: {
      position: "absolute",
      top: CAR_H * 0.16,
      left: CAR_W * 0.2,
      width: CAR_W * 0.6,
      height: CAR_H * 0.14,
      borderRadius: 4,
      backgroundColor: "#B3E5FC",
    },
    carHeadlightLeft: {
      position: "absolute",
      top: 4,
      left: 5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FFF59D",
    },
    carHeadlightRight: {
      position: "absolute",
      top: 4,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FFF59D",
    },

    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    overlayCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 26,
      width: "100%",
      maxWidth: 340,
      alignItems: "center",
    },
    overlayTitle: { fontSize: 22, fontWeight: "bold", color: c.text, marginTop: 10, textAlign: "center" },
    overlaySubtitle: { fontSize: 14, color: c.textSecondary, marginTop: 8, textAlign: "center" },
    overlayLine: { fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: "center" },
    rewardChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 16,
      gap: 8,
    },
    rewardChipText: { color: c.text, fontWeight: "600", fontSize: 13 },
    overlayBtn: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 30,
      marginTop: 20,
    },
    overlayBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    overlayLink: { color: c.accent, fontWeight: "600", fontSize: 14, marginTop: 14 },

    controls: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 30,
      paddingVertical: 16,
      backgroundColor: c.card,
    },
    ctrlBtn: {
      width: 110,
      height: 64,
      borderRadius: 18,
      backgroundColor: c.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    ctrlBtnDisabled: { opacity: 0.4 },
  });
