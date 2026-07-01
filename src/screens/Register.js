import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { API_BASE } from '../config';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

const Register = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    pin: ''
  });

  const handleInputChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  // Instead of creating the account here, the user must first pass the mock
  // Identity Verification (KYC) step. The account is created there, only after
  // both sides of the ID are scanned successfully.
  const signup = () => {

    if (!formData.name || !formData.surname || !formData.email || !formData.password || !formData.pin) {
      alert(t("register.fillFields"));
      return;
    }

    if (formData.pin.length !== 4) {
      alert(t("register.fillFields"));
      return;
    }

    navigation.navigate("IdentityVerification", { formData });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <View style={styles.header}>
          <Image
            source={require('../../assets/images/dsbanklogotr.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{t("signup.register")}</Text>
          <Text style={styles.subtitle}>{t("register.subtitle")}</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t("common.name")}
              placeholderTextColor={colors.textMuted}
              value={formData.name}
              onChangeText={(val) => handleInputChange('name', val)}
            />
            <TextInput
              style={styles.input}
              placeholder={t("common.surname")}
              placeholderTextColor={colors.textMuted}
              value={formData.surname}
              onChangeText={(val) => handleInputChange('surname', val)}
            />
            <TextInput
              style={styles.input}
              placeholder={t("register.emailAddress")}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(val) => handleInputChange('email', val)}
            />
            <TextInput
              style={styles.input}
              placeholder={t("register.password")}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={true}
              value={formData.password}
              onChangeText={(val) => handleInputChange('password', val)}
            />
            <TextInput
              style={styles.input}
              placeholder={t("register.setPin")}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              value={formData.pin}
              onChangeText={(val) => handleInputChange('pin', val)}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={signup}
          >
            <Text style={styles.primaryBtnText}>{t("register.createAccount")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.secondaryBtnText}>{t("login.goBack")}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (c) =>
  StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      backgroundColor: c.pageAlt,
      paddingBottom: 40,
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
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 5,
      color: c.accent,
    },
    subtitle: {
      color: c.textSecondary,
      marginBottom: 25,
      textAlign: 'center',
    },
    form: {
      width: '100%',
      marginBottom: 20,
    },
    input: {
      width: '100%',
      height: 50,
      borderWidth: 2,
      borderRadius: 12,
      paddingHorizontal: 15,
      fontSize: 16,
      backgroundColor: c.inputBg,
      borderColor: c.inputBorder,
      color: c.text,
      marginBottom: 15,
    },
    primaryBtn: {
      width: '100%',
      padding: 18,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
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
      backgroundColor: c.surfaceAlt,
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: c.accent,
    },
  });

export default Register;
