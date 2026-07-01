import React, { useState, useCallback, useMemo, useEffect } from "react";
import { DrawerActions, useFocusEffect } from "@react-navigation/native";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import UserCard from "../components/UserCard";
import ApplePayPrompt from "../components/ApplePayPrompt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function Home({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [showApplePay, setShowApplePay] = useState(false);

  // Show the full-screen Apple Wallet prompt once after login if the user's card
  // is not in Apple Wallet yet. Runs once per Home mount (i.e. per login).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = JSON.parse(await AsyncStorage.getItem("user"));
        if (!stored) return;
        const res = await fetch(`${API_BASE}/get_applepay.php?user_id=${stored.user_id}`);
        const data = await res.json();
        if (active && data.status === "success" && !data.in_wallet) {
          setShowApplePay(true);
        }
      } catch (e) {
        // ignore — no prompt if we can't reach the server
      }
    })();
    return () => {
      active = false;
    };
  }, []);

useFocusEffect(
  useCallback(() => {
    const loadFreshBalance = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (!stored) return;
        const parsed = JSON.parse(stored);

        // Kodi per me i ba fetch tdhanat ma t reja prej get_card.php varesisht prej id t'userit
        const res = await fetch(`${API_BASE}/get_card.php?user_id=${parsed.user_id}`);
        const data = await res.json();

        if (data.status === "success") {
          setUser({
            id: parsed.user_id,
            name: parsed.name,
            surname: parsed.surname,
            email: parsed.email,
            account_number: data.card.card_number,
            balance: Number(data.card.balance) || 0,
          });
        }

        // Numri i njoftimeve te palexuara per badge-in e inbox-it
        try {
          const nres = await fetch(`${API_BASE}/get_notifications.php?user_id=${parsed.user_id}`);
          const ndata = await nres.json();
          if (ndata.status === "success") {
            setUnread(Number(ndata.unread) || 0);
          }
        } catch (e) {
          // ignore notification badge errors
        }
      } catch (err) {
        console.log("Failed to refresh balance:", err);
      }
    };

    loadFreshBalance();
  }, [])
);

  const ServiceBtn = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.serviceBtn} onPress={onPress}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={icon} size={26} color={colors.accent} />
      </View>
      <Text style={styles.serviceLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>{t("home.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <MaterialCommunityIcons name="menu" size={28} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("home.title")}</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <View>
              <MaterialCommunityIcons name="email-outline" size={24} color="#FFF" />
              {unread > 0 && <View style={styles.badge} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <MaterialCommunityIcons name="account-circle-outline" size={24} color="#FFF" style={{marginLeft: 15}} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
       <UserCard
  fullName={`${user.name} ${user.surname}`}
  cardNumber={user.account_number}
  balance={user.balance}
  userId={user.id}
  navigation={navigation}
/>

        <View style={styles.gridContainer}>
          <ServiceBtn icon="swap-horizontal" label={t("home.transactions")} onPress={() => navigation.navigate('Transactions')} />
          <ServiceBtn icon="file-document-outline" label={t("home.publicServices")} onPress={() => navigation.navigate('PublicServices')} />
          <ServiceBtn icon="refresh" label={t("home.automaticOrder")} onPress={() => navigation.navigate('AutomaticOrder')} />
          <ServiceBtn icon="credit-card-outline" label={t("home.card")} onPress={() => navigation.navigate("Card", { user_id: user.id })} />
        </View>

     <View style={styles.promoContainer}>

  <TouchableOpacity
    style={styles.promoBox}
    onPress={() => navigation.navigate("SavingsAccount")}
  >
     <Image
       source={require('../../assets/images/svgacc.png')}
         style={{ width: 180, height: 180 }}
        resizeMode="contain"
     />

  </TouchableOpacity>

  <TouchableOpacity
    style={styles.promoBox}
    onPress={() => navigation.navigate("Credit")}
  >
     <Image
       source={require('../../assets/images/credittt.jpg')}
         style={{ width: 180, height: 180 }}
        resizeMode="contain"
     />

  </TouchableOpacity>

</View>
      </ScrollView>

      <ApplePayPrompt
        visible={showApplePay}
        onAdd={() => {
          setShowApplePay(false);
          navigation.navigate("ApplePay");
        }}
        onClose={() => setShowApplePay(false)}
      />
    </View>
  );
}


const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.pageAlt },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      backgroundColor: c.primary,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
    headerIcons: { flexDirection: 'row' },
    badge: {
      position: 'absolute',
      top: -3,
      right: -3,
      width: 11,
      height: 11,
      borderRadius: 5.5,
      backgroundColor: c.danger,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 15,
      marginTop: 10,
      justifyContent: 'space-between'
    },
    serviceBtn: { width: '23%', alignItems: 'center', marginBottom: 20 },
    iconBox: {
      width: 60,
      height: 60,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      backgroundColor: c.surfaceAlt,
    },
    serviceLabel: { fontSize: 10, textAlign: 'center', fontWeight: '600', color: c.accent },
    promoContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
    promoBox: { width: '47%', backgroundColor: c.card, borderRadius: 20, elevation: 3, padding: 15, alignItems: 'center' },
    promoImgPlaceholder: { width: '100%', height: 80, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    promoText: { fontWeight: 'bold', fontSize: 13, textAlign: 'center', color: c.text },
    promoImage: {
      width: 60,
      height: 60,
      marginBottom: 10,
    },
  });
