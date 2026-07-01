import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const CreditComponent = ({ title, text }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
};

export default CreditComponent;

const makeStyles = (c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      elevation: 4,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      marginVertical: 10,

      minHeight: 160,
      justifyContent: "center",
    },

    inner: {
      paddingHorizontal: 22,
      paddingVertical: 26,
    },

    title: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 10,
      color: c.text,
    },

    text: {
      fontSize: 15,
      color: c.textSecondary,
      lineHeight: 22,
    },
  });
