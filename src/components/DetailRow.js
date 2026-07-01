import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function DetailRow({ label, value }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    row: {
      backgroundColor: c.card,
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
      borderWidth: 1,
      borderColor: c.border,
    },
    label: {
      fontSize: 15,
      fontWeight: "600",
      color: c.textSecondary,
    },
    value: {
      fontSize: 15,
      color: c.accent,
      fontWeight: "500",
    },
  });
