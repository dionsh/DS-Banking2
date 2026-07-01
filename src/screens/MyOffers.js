import React, { useMemo } from 'react';
import { Dimensions, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { DrawerActions } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import OffersComponent from '../components/OffersComponent';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';


const screenWidth = Dimensions.get("window").width;


const MyOffers = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const offerData = [
    { name: t("offers.vibeName"), population: 27, color: "#4F46E5", legendFontColor: colors.text, legendFontSize: 13 },
    { name: t("offers.studentsName"), population: 32, color: "#06B6D4", legendFontColor: colors.text, legendFontSize: 13 },
    { name: t("offers.inviteName"), population: 25, color: "#10B981", legendFontColor: colors.text, legendFontSize: 13 },
    { name: t("offers.premiumName"), population: 8, color: "#F59E0B", legendFontColor: colors.text, legendFontSize: 13 },
    { name: t("offers.visaName"), population: 8, color: "#EF4444", legendFontColor: colors.text, legendFontSize: 13 },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>

      <TouchableOpacity
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        style={styles.drawerButton}
      >
        <MaterialCommunityIcons name="menu" size={30} color={colors.accent} />
      </TouchableOpacity>

      <Text style={styles.title}>{t("tab.offers")}</Text>

      <PieChart
        data={offerData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: colors.background,
          backgroundGradientFrom: colors.background,
          backgroundGradientTo: colors.background,
          color: (opacity = 1) =>
            isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor={"population"}
        backgroundColor={"transparent"}
        paddingLeft={"10"}
        absolute
      />

      <OffersComponent
        name={t("offers.vibeName")}
        description={t("offers.vibeDesc")}
        image={require('../../assets/images/pakovibe.jpg')}
      />

      <OffersComponent
        name={t("offers.studentsName")}
        description={t("offers.studentsDesc")}
        image={require('../../assets/images/student.jpg')}
      />

      <OffersComponent
        name={t("offers.inviteName")}
        description={t("offers.inviteDesc")}
        image={require('../../assets/images/shoket.jpg')}
      />

      <OffersComponent
        name={t("offers.premiumName")}
        description={t("offers.premiumDesc")}
        image={require('../../assets/images/premium.avif')}
      />

      <OffersComponent
        name={t("offers.visaName")}
        description={t("offers.visaDesc")}
        image={require('../../assets/images/plat2.jpg')}
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

export default MyOffers;
