import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

const SignUp = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [pin, setPin] = useState('');

  return (

      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <View style={styles.header}>
          <Image
            source={require('../../assets/images/dsbanklogotr.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>

          <View style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleBtn, styles.activeToggle]}>
              <Text style={styles.activeToggleText}>{t("signup.personalAccount")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleBtn}>
              <Text style={styles.toggleText}>{t("signup.businessAccount")}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{t("signup.enterPin")}</Text>
          <Text style={styles.subtitle}>{t("signup.changeMethod")}</Text>

          <View style={styles.pinContainer}>
            {[1, 2, 3, 4].map((dot, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: pin.length > index ? colors.accent : colors.surfaceAlt }
                ]}
              />
            ))}
          </View>

          <TextInput
            style={styles.hiddenInput}
            keyboardType="number-pad"
            maxLength={4}
            value={pin}
            onChangeText={setPin}

          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryBtnText}>{t("signup.enter")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryBtnText}>{t("signup.register")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>{t("signup.openIndividual")}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

  );
};

const makeStyles = (c) =>
  StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      backgroundColor: c.pageAlt,
    },
    header: {
      height: 190,
      backgroundColor: c.primary,
      borderBottomLeftRadius: 60,
      borderBottomRightRadius: 60,
      borderBottomStartRadius: 100,
      borderBottomEndRadius: 120,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 25,
      marginBottom: 30,
    },
    logo: {
      width: 240,
      height: 80,
    },
    content: {
      paddingHorizontal: 30,
      alignItems: 'center',
    },
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      padding: 4,
      marginBottom: 40,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    activeToggle: {
      backgroundColor: c.primary,
    },
    activeToggleText: {
      color: '#fff',
      fontWeight: '600',
    },
    toggleText: {
      color: c.accent,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
      color: c.accent,
    },
    subtitle: {
      color: c.textSecondary,
      marginBottom: 30,
    },
    pinContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 40,
    },
    dot: {
      width: 15,
      height: 15,
      borderRadius: 7.5,
      marginHorizontal: 15,
      borderWidth: 1,
      borderColor: c.border,
    },
    hiddenInput: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0,
    },
    primaryBtn: {
      width: '100%',
      padding: 18,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 15,
      backgroundColor: c.primary,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    secondaryBtn: {
      width: '100%',
      padding: 18,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 15,
      backgroundColor: c.surfaceAlt,
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: c.accent,
    },
    linkBtn: {
      marginTop: 10,
      padding: 10,
    },
    linkText: {
      fontWeight: '600',
      textDecorationLine: 'underline',
      color: c.accent,
    }
  });

export default SignUp;
