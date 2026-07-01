import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export default function ProfileCard({ title, description, icon, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>

      <View style={styles.left}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={22} color={colors.accent} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color={colors.accent} />

    </TouchableOpacity>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      paddingVertical: 18,
      paddingHorizontal: 18,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
      borderWidth: 1,
      borderColor: c.border,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },
    textContainer: {
      marginLeft: 15,
    },
    title: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 3,
      color: c.text,
    },
    description: {
      fontSize: 12,
      color: c.textMuted,
    },
  });
