import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { PressableScale, PopWhenActive } from '../components/motion';

// Transparent DS shield — the only image used on the branded slides (it renders
// cleanly over a gradient, unlike the illustration assets that bake in a white
// background + label text).
const SHIELD = require('../../assets/images/dsbanklogotr.png');

// ---------------------------------------------------------------------------
// One branded onboarding slide (gradient background + glass hero + copy).
// Content parallaxes / fades as the user swipes, driven by the shared scrollX.
// ---------------------------------------------------------------------------
const MarketingSlide = ({ slide, index, width, height, scrollX, topInset }) => {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const heroTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [width * 0.32, 0, -width * 0.32],
    extrapolate: 'clamp',
  });
  const heroScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.72, 1, 0.72],
    extrapolate: 'clamp',
  });
  const textTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [width * 0.18, 0, -width * 0.18],
    extrapolate: 'clamp',
  });
  const contentOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  const gid = `dsGrad${index}`;
  const heroSize = Math.min(width * 0.46, 208);

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      {/* Brand gradient background (SVG — same approach as PersonalizeCard) */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={gid} x1="0" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={slide.grad[0]} />
            <Stop offset="1" stopColor={slide.grad[1]} />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${gid})`} />
      </Svg>

      {/* Soft decorative shapes for depth */}
      <View
        pointerEvents="none"
        style={[
          ob.blob,
          {
            width: width * 0.95,
            height: width * 0.95,
            borderRadius: width * 0.5,
            top: -width * 0.32,
            right: -width * 0.34,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          ob.blobFaint,
          {
            width: width * 0.62,
            height: width * 0.62,
            borderRadius: width * 0.31,
            bottom: height * 0.1,
            left: -width * 0.26,
          },
        ]}
      />

      <View
        style={[
          ob.slideBody,
          { paddingTop: topInset + 32 },
        ]}
      >
        {/* Glass hero badge */}
        <Animated.View
          style={{
            marginBottom: 46,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: contentOpacity,
            transform: [{ translateX: heroTranslate }, { scale: heroScale }],
          }}
        >
          <View
            style={[
              ob.heroGlow,
              { width: heroSize * 1.42, height: heroSize * 1.42, borderRadius: heroSize },
            ]}
          />
          <View
            style={[
              ob.heroBadge,
              { width: heroSize, height: heroSize, borderRadius: heroSize / 2 },
            ]}
          >
            {slide.image ? (
              <Image
                source={slide.image}
                style={{ width: heroSize * 0.6, height: heroSize * 0.6 }}
                resizeMode="contain"
              />
            ) : slide.icon.lib === 'mci' ? (
              <MaterialCommunityIcons name={slide.icon.name} size={heroSize * 0.5} color="#fff" />
            ) : (
              <Ionicons name={slide.icon.name} size={heroSize * 0.46} color="#fff" />
            )}
          </View>
        </Animated.View>

        {/* Title + description */}
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: contentOpacity,
            transform: [{ translateX: textTranslate }],
          }}
        >
          <Text style={ob.title}>{slide.title}</Text>
          <Text style={ob.desc}>{slide.desc}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const SignUp = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { width: winW, height: winH } = useWindowDimensions();
  // Measure the real container so every page fills it exactly (no gaps),
  // seeded from the window size and corrected on first layout / rotation.
  const [size, setSize] = useState({ w: winW, h: winH });
  const width = size.w;
  const height = size.h;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // --- existing auth state (unchanged) ---
  const [pin, setPin] = useState('');

  // --- onboarding state ---
  const [page, setPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  const topInset =
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 47;

  const slides = useMemo(
    () => [
      {
        key: 'welcome',
        grad: ['#2D2DA6', '#0C0C2C'],
        image: SHIELD,
        title: t('onboarding.slide1.title'),
        desc: t('onboarding.slide1.desc'),
      },
      {
        key: 'secure',
        grad: ['#212194', '#0A0A26'],
        icon: { lib: 'mci', name: 'shield-check' },
        title: t('onboarding.slide2.title'),
        desc: t('onboarding.slide2.desc'),
      },
      {
        key: 'transfers',
        grad: ['#3636B2', '#101038'],
        icon: { lib: 'mci', name: 'bank-transfer' },
        title: t('onboarding.slide3.title'),
        desc: t('onboarding.slide3.desc'),
      },
      {
        key: 'rewards',
        grad: ['#2A2A9E', '#0D0D30'],
        icon: { lib: 'ion', name: 'gift' },
        title: t('onboarding.slide4.title'),
        desc: t('onboarding.slide4.desc'),
      },
    ],
    [t]
  );

  const marketingCount = slides.length; // branded slides
  const authIndex = marketingCount; // last page = existing sign-up screen

  const goTo = useCallback(
    (i) => {
      scrollRef.current?.scrollTo({ x: i * width, animated: true });
    },
    [width]
  );

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: false,
      }),
    [scrollX]
  );

  const onMomentumEnd = useCallback(
    (e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width)),
    [width]
  );

  // Skip + dots + Next fade out as the auth slide comes into view.
  const controlsOpacity = scrollX.interpolate({
    inputRange: [(marketingCount - 1) * width, marketingCount * width],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const controlsHidden = page >= authIndex;

  const nextLabel =
    page >= marketingCount - 1 ? t('onboarding.getStarted') : t('onboarding.next');

  return (
    <View
      style={ob.root}
      onLayout={(e) => {
        const { width: lw, height: lh } = e.nativeEvent.layout;
        setSize((s) => (s.w === lw && s.h === lh ? s : { w: lw, h: lh }));
      }}
    >
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}
      >
        {slides.map((slide, i) => (
          <MarketingSlide
            key={slide.key}
            slide={slide}
            index={i}
            width={width}
            height={height}
            scrollX={scrollX}
            topInset={topInset}
          />
        ))}

        {/* -------- FINAL SLIDE: the existing Sign Up screen (unchanged) -------- */}
        <View style={{ width, height }}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
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
                  <Text style={styles.activeToggleText}>{t('signup.personalAccount')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toggleBtn}>
                  <Text style={styles.toggleText}>{t('signup.businessAccount')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>{t('signup.enterPin')}</Text>
              <Text style={styles.subtitle}>{t('signup.changeMethod')}</Text>

              <View style={styles.pinContainer}>
                {[1, 2, 3, 4].map((dot, index) => (
                  <PopWhenActive key={index} active={pin.length > index}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            pin.length > index ? colors.accent : colors.surfaceAlt,
                        },
                      ]}
                    />
                  </PopWhenActive>
                ))}
              </View>

              <TextInput
                style={styles.hiddenInput}
                keyboardType="number-pad"
                maxLength={4}
                value={pin}
                onChangeText={setPin}
              />

              <PressableScale
                style={styles.primaryBtn}
                scaleTo={0.95}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.primaryBtnText}>{t('signup.enter')}</Text>
              </PressableScale>

              <PressableScale
                style={styles.secondaryBtn}
                scaleTo={0.95}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.secondaryBtnText}>{t('signup.register')}</Text>
              </PressableScale>

              <TouchableOpacity style={styles.linkBtn}>
                <Text style={styles.linkText}>{t('signup.openIndividual')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Animated.ScrollView>

      {/* Skip (top-right) */}
      <Animated.View
        pointerEvents={controlsHidden ? 'none' : 'auto'}
        style={[ob.skipWrap, { top: topInset + 4, opacity: controlsOpacity }]}
      >
        <TouchableOpacity
          onPress={() => goTo(authIndex)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={ob.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer: animated dots + Next / Get Started */}
      <Animated.View
        pointerEvents={controlsHidden ? 'none' : 'auto'}
        style={[ob.footer, { opacity: controlsOpacity }]}
      >
        <View style={ob.dotsRow}>
          {slides.map((_, i) => {
            const dotRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange: dotRange,
              outputRange: [8, 22, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange: dotRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[ob.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={ob.nextBtn}
          activeOpacity={0.85}
          onPress={() => goTo(Math.min(page + 1, authIndex))}
        >
          <Text style={ob.nextText}>{nextLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Branded-onboarding chrome. Theme-independent on purpose: these sit on the
// midnight-blue gradient slides, so they are always white-on-dark.
const ob = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0C0C2C',
  },
  slideBody: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  blobFaint: {
    position: 'absolute',
    backgroundColor: 'rgba(142,149,242,0.10)',
  },
  heroGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  desc: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 330,
  },
  skipWrap: {
    position: 'absolute',
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 28,
    right: 24,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginRight: 7,
    backgroundColor: '#FFFFFF',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 30,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

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
    },
  });

export default SignUp;
