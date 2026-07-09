import React, { useState, useCallback, useMemo, useEffect } from "react";
import { DrawerActions, useFocusEffect } from "@react-navigation/native";
import { View, StyleSheet, ScrollView, Text, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect, Circle } from "react-native-svg";
import UserCard from "../components/UserCard";
import ApplePayPrompt from "../components/ApplePayPrompt";
import { PressableScale, MotionView, SkeletonBlock, Pulse } from "../components/motion";
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
            // Show the real bank account number (from the accounts table),
            // not the debit card number — this is the value users share to
            // receive transfers.
            account_number: data.card.account_number,
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

  const ServiceBtn = ({ icon, label, onPress, delay = 0 }) => (
    <MotionView from="down" delay={delay} style={styles.serviceBtn}>
      <PressableScale onPress={onPress} scaleTo={0.92} style={styles.serviceBtnInner}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name={icon} size={26} color={colors.accent} />
        </View>
        <Text style={styles.serviceLabel}>{label}</Text>
      </PressableScale>
    </MotionView>
  );

  const Header = (
    <View style={styles.header}>
      <PressableScale
        scaleTo={0.85}
        hitSlop={8}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      >
        <MaterialCommunityIcons name="menu" size={28} color="#FFF" />
      </PressableScale>

      <Text style={styles.headerTitle}>{t("home.title")}</Text>

      <View style={styles.headerIcons}>
        <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => navigation.navigate('Notifications')}>
          <View>
            <MaterialCommunityIcons name="email-outline" size={24} color="#FFF" />
            {unread > 0 && <Pulse style={styles.badge} />}
          </View>
        </PressableScale>
        <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => navigation.navigate('Profile')}>
          <MaterialCommunityIcons name="account-circle-outline" size={24} color="#FFF" style={{marginLeft: 15}} />
        </PressableScale>
      </View>
    </View>
  );

  if (!user) {
    // Skeleton dashboard while the balance loads — mirrors the real layout so
    // content appears in place without any jump.
    return (
      <View style={styles.container}>
        {Header}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SkeletonBlock width={170} height={20} radius={6} />
          <SkeletonBlock height={195} radius={20} style={{ marginTop: 16 }} />
          <SkeletonBlock height={84} radius={20} style={{ marginTop: 16 }} />
          <View style={styles.skeletonGrid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: '23%', alignItems: 'center' }}>
                <SkeletonBlock width={60} height={60} radius={15} />
                <SkeletonBlock width={46} height={9} radius={4} style={{ marginTop: 8 }} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Header}

      <ScrollView showsVerticalScrollIndicator={false}>
       <MotionView from="down" delay={0}>
       <UserCard
  fullName={`${user.name} ${user.surname}`}
  cardNumber={user.account_number}
  balance={user.balance}
  userId={user.id}
  navigation={navigation}
/>
       </MotionView>

        {/* DS Banking Wrapped — story-style recap, available any time */}
        <MotionView from="down" delay={90}>
        <PressableScale
          style={styles.wrappedBanner}
          scaleTo={0.97}
          onPress={() => navigation.navigate("DS Wrapped")}
        >
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgGradient id="homeWrapped" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#241B7A" />
                <Stop offset="0.55" stopColor="#3B2BC4" />
                <Stop offset="1" stopColor="#6A4BFF" />
              </SvgGradient>
            </Defs>
            <Rect width="100%" height="100%" rx="20" fill="url(#homeWrapped)" />
            <Circle cx="86%" cy="18%" r="54" fill="rgba(255,255,255,0.08)" />
            <Circle cx="73%" cy="132%" r="72" fill="rgba(255,255,255,0.06)" />
            <Circle cx="12%" cy="86%" r="26" fill="rgba(255,255,255,0.07)" />
          </Svg>

          <View style={styles.wrappedIconWrap}>
            <MaterialCommunityIcons name="star-shooting" size={24} color="#FFD200" />
          </View>

          <View style={styles.wrappedTextWrap}>
            <Text style={styles.wrappedTitle} numberOfLines={1}>
              {t("wrapped.bannerTitle")}
            </Text>
            <Text style={styles.wrappedSub} numberOfLines={2}>
              {t("wrapped.bannerSub")}
            </Text>
          </View>

          <View style={styles.wrappedPlay}>
            <MaterialCommunityIcons name="play" size={22} color="#241B7A" />
          </View>
        </PressableScale>
        </MotionView>

        <View style={styles.gridContainer}>
          <ServiceBtn delay={160} icon="swap-horizontal" label={t("home.transactions")} onPress={() => navigation.navigate('Transactions')} />
          <ServiceBtn delay={220} icon="file-document-outline" label={t("home.publicServices")} onPress={() => navigation.navigate('PublicServices')} />
          <ServiceBtn delay={280} icon="refresh" label={t("home.automaticOrder")} onPress={() => navigation.navigate('AutomaticOrder')} />
          <ServiceBtn delay={340} icon="credit-card-outline" label={t("home.card")} onPress={() => navigation.navigate("Card", { user_id: user.id })} />
        </View>

     <View style={styles.promoContainer}>

  <MotionView from="down" delay={420} style={styles.promoWrap}>
  <PressableScale
    style={styles.promoBox}
    scaleTo={0.96}
    onPress={() => navigation.navigate("SavingsAccount")}
  >
     <Image
       source={require('../../assets/images/svgacc.png')}
         style={{ width: 180, height: 180 }}
        resizeMode="contain"
     />

  </PressableScale>
  </MotionView>

  <MotionView from="down" delay={480} style={styles.promoWrap}>
  <PressableScale
    style={styles.promoBox}
    scaleTo={0.96}
    onPress={() => navigation.navigate("Credit")}
  >
     <Image
       source={require('../../assets/images/credittt.jpg')}
         style={{ width: 180, height: 180 }}
        resizeMode="contain"
     />

  </PressableScale>
  </MotionView>

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
    wrappedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 15,
      marginTop: 16,
      paddingLeft: 16,
      paddingRight: 14,
      paddingVertical: 16,
      minHeight: 84,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: '#241B7A', // fallback behind the SVG gradient
      elevation: 5,
      shadowColor: '#191970',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    wrappedIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.16)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    wrappedTextWrap: { flex: 1, paddingRight: 10 },
    wrappedTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
    wrappedSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 3, lineHeight: 17 },
    wrappedPlay: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 15,
      marginTop: 10,
      justifyContent: 'space-between'
    },
    serviceBtn: { width: '23%', marginBottom: 20 },
    serviceBtnInner: { width: '100%', alignItems: 'center' },
    skeletonGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 26,
    },
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
    promoWrap: { width: '47%' },
    promoBox: { width: '100%', backgroundColor: c.card, borderRadius: 20, elevation: 3, padding: 15, alignItems: 'center' },
    promoImgPlaceholder: { width: '100%', height: 80, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    promoText: { fontWeight: 'bold', fontSize: 13, textAlign: 'center', color: c.text },
    promoImage: {
      width: 60,
      height: 60,
      marginBottom: 10,
    },
  });
