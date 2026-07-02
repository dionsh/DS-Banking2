import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

const GREEN = "#6AAA64";
const YELLOW = "#C9B458";
const GRAY = "#787C7E";

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

// Self-contained pool of common five-letter words used as answers.
const WORDS = [
  "APPLE", "BRAVE", "CRANE", "DRINK", "EAGLE", "FLAME", "GRAPE", "HOUSE", "IGLOO", "JUICE",
  "KNIFE", "LEMON", "MONEY", "NIGHT", "OCEAN", "PIANO", "QUEEN", "RIVER", "SUGAR", "TIGER",
  "ULTRA", "VOICE", "WATER", "YACHT", "ZEBRA", "BREAD", "CHAIR", "DANCE", "EARTH", "FRUIT",
  "GHOST", "HONEY", "IVORY", "JELLY", "KOALA", "LIGHT", "MAGIC", "NORTH", "OLIVE", "PEARL",
  "QUILT", "ROBOT", "STORM", "TRAIN", "UNITY", "VAULT", "WHEAT", "ANGEL", "BERRY", "CLOUD",
  "DREAM", "EMBER", "FAITH", "GLORY", "HEART", "INDEX", "JOKER", "KARMA", "LUNAR", "MAPLE",
  "NOBLE", "ORBIT", "PLANT", "QUOTA", "RADAR", "SMILE", "TOWER", "URBAN", "VIVID", "WORLD",
  "BANKS", "COINS", "DEBIT", "FUNDS", "SAVED", "SPEND", "VALUE", "WAGES", "CHECK", "TRUST",
];

function evaluateGuess(guess, answer) {
  const result = Array(WORD_LENGTH).fill("absent");
  const answerArr = answer.split("");
  const counts = {};
  for (const c of answerArr) counts[c] = (counts[c] || 0) + 1;

  // First pass: exact matches (green).
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answerArr[i]) {
      result[i] = "correct";
      counts[guess[i]]--;
    }
  }
  // Second pass: present-but-misplaced (yellow), respecting remaining counts.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const c = guess[i];
    if (counts[c] > 0) {
      result[i] = "present";
      counts[c]--;
    }
  }
  return result;
}

const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENT", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
];

const { width } = Dimensions.get("window");
const TILE_SIZE = Math.min(58, Math.floor((width - 40 - 4 * 6) / WORD_LENGTH));

export default function WordleRewards() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [answer, setAnswer] = useState("");
  const [guesses, setGuesses] = useState([]); // submitted guesses (strings)
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [rewardMsg, setRewardMsg] = useState("");
  const [infoVisible, setInfoVisible] = useState(false);
  const rewardingRef = useRef(false);

  const newGame = useCallback(() => {
    const pick = WORDS[Math.floor(Math.random() * WORDS.length)];
    setAnswer(pick);
    setGuesses([]);
    setCurrent("");
    setStatus("playing");
    setRewardMsg("");
    rewardingRef.current = false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        const stored = JSON.parse(await AsyncStorage.getItem("user"));
        if (stored) setUser(stored);
      };
      loadUser();
      if (!answer) newGame();
    }, [answer, newGame])
  );

  // Build evaluations for all submitted guesses.
  const evaluations = guesses.map((g) => evaluateGuess(g, answer));

  // Best state per keyboard letter (correct > present > absent).
  const letterStates = {};
  const rank = { absent: 0, present: 1, correct: 2 };
  guesses.forEach((g, gi) => {
    for (let i = 0; i < WORD_LENGTH; i++) {
      const c = g[i];
      const st = evaluations[gi][i];
      if (!(c in letterStates) || rank[st] > rank[letterStates[c]]) {
        letterStates[c] = st;
      }
    }
  });

  const awardReward = async (attemptsUsed) => {
    if (rewardingRef.current) return;
    rewardingRef.current = true;
    try {
      const res = await fetch(`${API_BASE}/wordle_reward.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, attempts: attemptsUsed }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setRewardMsg(t("wordle.rewardMsg", { points: data.points_earned, total: data.total_points }));
      } else {
        setRewardMsg(data.message || t("wordle.couldNotSave"));
      }
    } catch (err) {
      console.log("Wordle reward error:", err);
      setRewardMsg(t("wordle.offline"));
    }
  };

  const onKey = (key) => {
    if (status !== "playing") return;

    if (key === "DEL") {
      setCurrent((c) => c.slice(0, -1));
      return;
    }

    if (key === "ENT") {
      if (current.length !== WORD_LENGTH) {
        Alert.alert(t("wordle.notEnough"), t("wordle.enter5"));
        return;
      }
      const guess = current.toUpperCase();
      const newGuesses = [...guesses, guess];
      setGuesses(newGuesses);
      setCurrent("");

      if (guess === answer) {
        setStatus("won");
        if (user) awardReward(newGuesses.length);
      } else if (newGuesses.length >= MAX_ATTEMPTS) {
        setStatus("lost");
      }
      return;
    }

    // letter key
    if (current.length < WORD_LENGTH) {
      setCurrent((c) => c + key);
    }
  };

  const tileColor = (state) => {
    if (state === "correct") return GREEN;
    if (state === "present") return YELLOW;
    if (state === "absent") return GRAY;
    return colors.card;
  };

  const keyColor = (key) => {
    if (key === "ENT" || key === "DEL") return "#9AA0B5";
    const st = letterStates[key];
    if (st === "correct") return GREEN;
    if (st === "present") return YELLOW;
    if (st === "absent") return GRAY;
    // Unused keys: a light gray in light mode (distinct from the page) and the
    // raised surface in dark mode.
    return colors.mode === "dark" ? colors.surfaceAlt : "#D3D6DA";
  };

  const renderRow = (rowIndex) => {
    const submitted = evaluations[rowIndex];
    const isCurrentRow = rowIndex === guesses.length && status === "playing";
    const letters = submitted
      ? guesses[rowIndex].split("")
      : isCurrentRow
      ? current.padEnd(WORD_LENGTH, " ").split("")
      : Array(WORD_LENGTH).fill(" ");

    return (
      <View style={styles.boardRow} key={rowIndex}>
        {letters.map((ch, i) => {
          const state = submitted ? submitted[i] : null;
          const filled = ch !== " ";
          return (
            <View
              key={i}
              style={[
                styles.tile,
                {
                  backgroundColor: tileColor(state),
                  borderColor: submitted
                    ? tileColor(state)
                    : filled
                    ? colors.textMuted
                    : colors.border,
                },
              ]}
            >
              <Text style={[styles.tileText, { color: submitted ? "#fff" : colors.text }]}>
                {ch !== " " ? ch : ""}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("menu.wordleRewards")}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setInfoVisible(true)}>
            <MaterialCommunityIcons name="information-outline" size={25} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Rewards")}>
            <MaterialCommunityIcons name="trophy-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.subtitle}>
          {t("wordle.subtitle", { n: MAX_ATTEMPTS })}
        </Text>

        <View style={styles.board}>
          {Array.from({ length: MAX_ATTEMPTS }).map((_, r) => renderRow(r))}
        </View>

        {status !== "playing" && (
          <View style={styles.resultCard}>
            {status === "won" ? (
              <>
                <MaterialCommunityIcons name="party-popper" size={30} color={GREEN} />
                <Text style={styles.resultTitle}>{t("wordle.won")}</Text>
                <Text style={styles.resultReward}>{rewardMsg || t("wordle.saving")}</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="emoticon-sad-outline" size={30} color={colors.dangerText} />
                <Text style={styles.resultTitle}>{t("wordle.lost")}</Text>
                <Text style={styles.resultReward}>{t("wordle.theWord", { answer })}</Text>
              </>
            )}
            <View style={styles.resultBtns}>
              <TouchableOpacity style={styles.newGameBtn} onPress={newGame}>
                <Text style={styles.newGameText}>{t("wordle.newGame")}</Text>
              </TouchableOpacity>
              {status === "won" && (
                <TouchableOpacity
                  style={styles.rewardsBtn}
                  onPress={() => navigation.navigate("Rewards")}
                >
                  <Text style={styles.rewardsBtnText}>{t("wordle.myRewards")}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {status === "playing" && (
          <View style={styles.keyboard}>
            {KEY_ROWS.map((row, ri) => (
              <View style={styles.keyRow} key={ri}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.key,
                      (key === "ENT" || key === "DEL") && styles.keyWide,
                      { backgroundColor: keyColor(key) },
                    ]}
                    onPress={() => onKey(key)}
                  >
                    {key === "DEL" ? (
                      <MaterialCommunityIcons name="backspace-outline" size={20} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.keyText,
                          { color: letterStates[key] || key === "ENT" ? "#fff" : colors.text },
                        ]}
                      >
                        {key === "ENT" ? t("wordle.enterKey") : key}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ----- how-to-play modal ----- */}
      <Modal
        visible={infoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoVisible(false)}
      >
        <View style={styles.infoBackdrop}>
          <View style={styles.infoCard}>
            <View style={styles.infoHead}>
              <Text style={styles.infoTitle}>How to Play</Text>
              <TouchableOpacity
                onPress={() => setInfoVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.infoText}>
                Guess the hidden 5-letter word in {MAX_ATTEMPTS} tries. After each guess, the
                tiles change color to show how close you are:
              </Text>

              {/* Green example */}
              <View style={styles.exampleRow}>
                {"MONEY".split("").map((ch, i) => (
                  <View
                    key={i}
                    style={[
                      styles.exampleTile,
                      i === 0
                        ? { backgroundColor: GREEN, borderColor: GREEN }
                        : { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.exampleTileText, { color: i === 0 ? "#fff" : colors.text }]}>
                      {ch}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.infoText}>
                🟩 <Text style={styles.infoBold}>Green</Text> — the letter M is in the word and in
                the correct position.
              </Text>

              {/* Yellow example */}
              <View style={styles.exampleRow}>
                {"SAVED".split("").map((ch, i) => (
                  <View
                    key={i}
                    style={[
                      styles.exampleTile,
                      i === 1
                        ? { backgroundColor: YELLOW, borderColor: YELLOW }
                        : { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.exampleTileText, { color: i === 1 ? "#fff" : colors.text }]}>
                      {ch}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.infoText}>
                🟨 <Text style={styles.infoBold}>Yellow</Text> — the letter A is in the word but in
                the wrong position.
              </Text>

              {/* Grey example */}
              <View style={styles.exampleRow}>
                {"TRUST".split("").map((ch, i) => (
                  <View
                    key={i}
                    style={[
                      styles.exampleTile,
                      i === 2
                        ? { backgroundColor: GRAY, borderColor: GRAY }
                        : { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.exampleTileText, { color: i === 2 ? "#fff" : colors.text }]}>
                      {ch}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.infoText}>
                ⬜ <Text style={styles.infoBold}>Grey</Text> — the letter U does not exist in the
                word at all.
              </Text>

              <View style={styles.infoDivider} />

              <Text style={styles.infoText}>
                🏆 Win to earn reward points — the fewer attempts you need, the more points you
                get. 100 points = €1, redeemable to your balance on the Rewards screen.
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.infoGotIt} onPress={() => setInfoVisible(false)}>
              <Text style={styles.infoGotItText}>Got it!</Text>
            </TouchableOpacity>
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
    headerRight: { flexDirection: "row", alignItems: "center", gap: 14 },

    body: { flex: 1, alignItems: "center", paddingTop: 10 },
    subtitle: { fontSize: 13, color: c.textSecondary, marginBottom: 14, textAlign: "center", paddingHorizontal: 20 },

    board: { alignItems: "center" },
    boardRow: { flexDirection: "row", marginBottom: 6 },
    tile: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      borderWidth: 2,
      marginHorizontal: 3,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 6,
    },
    tileText: { fontSize: 26, fontWeight: "bold" },

    keyboard: { position: "absolute", bottom: 16, width: "100%", paddingHorizontal: 4 },
    keyRow: { flexDirection: "row", justifyContent: "center", marginBottom: 8 },
    key: {
      minWidth: 30,
      paddingHorizontal: 8,
      height: 50,
      marginHorizontal: 3,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
    },
    keyWide: { flex: 1.6 },
    keyText: { fontSize: 13, fontWeight: "bold" },

    resultCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 24,
      marginTop: 20,
      marginHorizontal: 20,
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    resultTitle: { fontSize: 22, fontWeight: "bold", color: c.accent, marginTop: 8 },
    resultReward: { fontSize: 15, color: c.textSecondary, marginTop: 6, fontWeight: "600" },
    resultBtns: { flexDirection: "row", marginTop: 20, gap: 12 },
    newGameBtn: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
    },
    newGameText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    rewardsBtn: {
      backgroundColor: c.surfaceAlt,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
    },
    rewardsBtnText: { color: c.accent, fontWeight: "600", fontSize: 15 },

    // How-to-play modal
    infoBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    infoCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 22,
      maxHeight: "82%",
    },
    infoHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    infoTitle: { fontSize: 20, fontWeight: "800", color: c.text },
    infoText: { fontSize: 14, color: c.textSecondary, lineHeight: 21, marginBottom: 10 },
    infoBold: { fontWeight: "800", color: c.text },
    exampleRow: { flexDirection: "row", marginTop: 6, marginBottom: 8 },
    exampleTile: {
      width: 40,
      height: 40,
      borderWidth: 2,
      marginRight: 5,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 6,
    },
    exampleTileText: { fontSize: 19, fontWeight: "bold" },
    infoDivider: { height: 1, backgroundColor: c.divider, marginVertical: 10 },
    infoGotIt: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 12,
    },
    infoGotItText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
