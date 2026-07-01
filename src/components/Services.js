import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function Services({ title, color, letter, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={onPress}>

      <View style={[styles.square, { backgroundColor: color }]}>
        <Text style={styles.letter}>{letter}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>

    </TouchableOpacity>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
      backgroundColor: c.card,
    },

    square: {
      width: 42,
      height: 42,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },

    letter: {
      fontSize: 18,
      fontWeight: "700",
      color: "#1a1a1a",
    },

    title: {
      fontSize: 16,
      color: c.text,
    },
  });
