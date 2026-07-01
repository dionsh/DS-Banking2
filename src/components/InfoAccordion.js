import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export default function InfoAccordion({ title, text }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{title}</Text>

        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          <Text style={styles.text}>{text}</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
      paddingVertical: 14,
    },

    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    title: {
      fontSize: 15,
      color: c.text,
    },

    body: {
      paddingTop: 10,
      paddingRight: 20,
    },

    text: {
      color: c.textSecondary,
      lineHeight: 20,
      fontSize: 14,
    },
  });
