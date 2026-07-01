import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

const Login = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const pinInputRef = useRef(null);

  //Funksioni per login
  const login = async () => {

    const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
    if (!name || !surname || !email || !emailOk || pin.length !== 4) {
      alert(t("login.fillFields"));
      return;
    }

    try {
      // Qon vetem numrat si PIN
      const res = await fetch(`${API_BASE}/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          surname: surname.trim(),
          email: email.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        //Ruan sessionin e userit
        await AsyncStorage.setItem("user", JSON.stringify(data));
        // Navigimi n'Home
        navigation.replace("MainApp");
      } else {
        alert(data.message);
      }

    } catch (err) {
      console.log(err);
      alert(t("login.serverError"));
    }
  };

  const handlePinChange = (val) => {
    const clean = val.replace(/[^0-9]/g, '');
    setPin(clean.slice(0, 4));
  };

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
        <Text style={styles.title}>{t("login.welcome")}</Text>
        <Text style={styles.subtitle}>{t("login.subtitle")}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.usernameInput}
            placeholder={t("login.name")}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.usernameInput}
            placeholder={t("login.surname")}
            placeholderTextColor={colors.textMuted}
            value={surname}
            onChangeText={setSurname}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.usernameInput}
            placeholder={t("common.email")}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.pinLabel}>{t("login.enterPin")}</Text>

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => pinInputRef.current?.focus()}
        >
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
        </TouchableOpacity>

        <TextInput
          ref={pinInputRef}
          style={styles.hiddenInput}
          keyboardType="number-pad"
          maxLength={4}
          value={pin}
          onChangeText={handlePinChange}
          caretHidden={true}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={login}
        >
          <Text style={styles.primaryBtnText}>{t("login.logIn")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryBtnText}>{t("login.goBack")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};


const makeStyles = (c) =>
  StyleSheet.create({
    scrollContainer: { flexGrow: 1, backgroundColor: c.pageAlt },
    header: { height: 190, backgroundColor: c.primary, borderBottomLeftRadius: 60, borderBottomRightRadius: 60, borderBottomStartRadius: 100, borderBottomEndRadius: 120, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 25, marginBottom: 30 },
    logo: { width: 240, height: 80 },
    content: { paddingHorizontal: 30, alignItems: 'center' },
    title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, color: c.accent },
    subtitle: { color: c.textSecondary, marginBottom: 30 },
    inputContainer: { width: '100%', marginBottom: 25 },
    usernameInput: { width: '100%', height: 55, borderWidth: 2, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text },
    pinLabel: { fontSize: 16, fontWeight: '600', marginBottom: 15, color: c.accent },
    pinContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
    dot: { width: 15, height: 15, borderRadius: 7.5, marginHorizontal: 15, borderWidth: 1, borderColor: c.border },
    hiddenInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },
    primaryBtn: { width: '100%', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 15, marginTop: 10, backgroundColor: c.primary },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    secondaryBtn: { width: '100%', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 15, backgroundColor: c.surfaceAlt },
    secondaryBtnText: { fontSize: 16, fontWeight: 'bold', color: c.accent },
  });

export default Login;
