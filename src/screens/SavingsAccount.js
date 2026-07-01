import React, { useMemo } from 'react';
import { DrawerActions } from "@react-navigation/native";
import { Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Savings from '../components/Savings';
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

const SavingsAccount = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>

      <TouchableOpacity
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        style={styles.drawerButton}
      >
        <MaterialCommunityIcons name="menu" size={30} color={colors.accent} />
      </TouchableOpacity>

      <Text style={styles.title}>{t("savings.products")}</Text>

      <Savings
        name={t("menu.savingsAccount")}
        description={t("savings.acc1Desc")}
        image={require('../../assets/images/img1.webp')}
      />

      <Savings
        name={t("savings.acc2Name")}
        description={t("savings.acc2Desc")}
        image={require('../../assets/images/img2.png')}
      />

      <Savings
        name={t("savings.acc3Name")}
        description={t("savings.acc3Desc")}
        image={require('../../assets/images/img3.avif')}
      />

    </ScrollView>
  );
};

const makeStyles = (c) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },

    container: {
      padding: 20,
      alignItems: 'center',
    },

    drawerButton: {
      alignSelf: 'flex-start',
      marginTop: 40,
      marginBottom: 20,
    },

    title: {
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      width: '100%',
      marginBottom: 20,
      color: c.text,
    },
  });

export default SavingsAccount;
