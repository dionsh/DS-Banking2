// AtmMap — an interactive map of DS Banking ATM locations.
//
// Rendered with a real Leaflet map running inside a react-native-webview. This
// gives native-feeling momentum pan + pinch zoom and proper OpenStreetMap/CARTO
// tiles with NO API key and NO custom native build, so it works in Expo Go via
// `npx expo start`. The map tiles follow the app's light/dark theme.
//
// Interaction is split cleanly between the two worlds:
//   • Leaflet (in the WebView) owns the map: tiles, gestures, the pins.
//   • React Native owns the chrome: themed region chips, zoom/recenter controls
//     and the animated info card shown when a marker is tapped.
//   • WebView -> RN messages (postMessage) drive marker selection.
//   • RN -> WebView calls (injectJavaScript) drive fly-to / zoom / recenter.

import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { ATM_LOCATIONS, ATM_REGIONS, ATM_INITIAL_VIEW } from "../data/atmLocations";

// Builds the self-contained HTML document that runs Leaflet. All dynamic values
// (ATM list, initial view, theme colors, tile style) are interpolated in; the
// embedded script itself uses plain string concatenation so it never collides
// with this outer template literal.
function buildHtml({ tileUrl, bg, primary, accent }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${bg}; }
  .ds-pin { position: relative; width: 34px; height: 46px; }
  .ds-pin .head {
    position: absolute; top: 0; left: 0; width: 34px; height: 34px; border-radius: 50%;
    background: ${primary}; border: 2px solid #fff;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-family: Arial, Helvetica, sans-serif; font-weight: 700; font-size: 13px;
    letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.35);
  }
  .ds-pin .point {
    position: absolute; top: 30px; left: 10px; width: 0; height: 0;
    border-left: 7px solid transparent; border-right: 7px solid transparent;
    border-top: 11px solid ${primary};
  }
  .ds-pin.selected .head { background: ${accent}; transform: scale(1.14); }
  .ds-pin.selected .point { border-top-color: ${accent}; }
  .leaflet-control-attribution { font-size: 9px; background: rgba(255,255,255,0.7); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  function post(obj) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
  }
  try {
    var ATMS = ${JSON.stringify(ATM_LOCATIONS)};
    var INIT = ${JSON.stringify(ATM_INITIAL_VIEW)};
    var map = L.map('map', { zoomControl: false, attributionControl: true })
      .setView([INIT.center.lat, INIT.center.lng], INIT.zoom);
    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    var markers = {};
    function clearSel() {
      Object.keys(markers).forEach(function (k) {
        var el = markers[k].getElement();
        if (el) { var p = el.querySelector('.ds-pin'); if (p) p.classList.remove('selected'); }
      });
    }
    function selectId(id) {
      clearSel();
      var m = markers[id];
      if (m) { var el = m.getElement(); if (el) { var p = el.querySelector('.ds-pin'); if (p) p.classList.add('selected'); } }
    }

    ATMS.forEach(function (a) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="ds-pin"><div class="head">DS</div><div class="point"></div></div>',
        iconSize: [34, 46],
        iconAnchor: [17, 46]
      });
      var m = L.marker([a.lat, a.lng], { icon: icon }).addTo(map);
      m.on('click', function (e) {
        if (e.originalEvent && e.originalEvent.stopPropagation) e.originalEvent.stopPropagation();
        selectId(a.id);
        post({ type: 'select', id: a.id });
      });
      markers[a.id] = m;
    });

    map.on('click', function () { clearSel(); post({ type: 'deselect' }); });

    window.dsFlyTo = function (lat, lng, z) { clearSel(); post({ type: 'deselect' }); map.flyTo([lat, lng], z, { duration: 0.8 }); };
    window.dsZoom = function (d) { if (d > 0) map.zoomIn(); else map.zoomOut(); };
    window.dsSelect = function (id) { selectId(id); };
    window.dsClearSelect = function () { clearSel(); };

    setTimeout(function () { map.invalidateSize(); post({ type: 'ready' }); }, 60);
  } catch (err) {
    post({ type: 'error', message: String(err) });
  }
})();
</script>
</body>
</html>`;
}

export default function AtmMap() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const webRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const cardAnim = useRef(new Animated.Value(0)).current;

  // Build the HTML once per theme. Keyed remount (below) swaps tiles cleanly
  // when the user toggles light/dark.
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
  const html = useMemo(
    () =>
      buildHtml({
        tileUrl,
        bg: isDark ? "#0F1020" : "#ECEFF1",
        primary: colors.primary,
        accent: colors.accent,
      }),
    [tileUrl, isDark, colors.primary, colors.accent]
  );

  // Safety net: if Leaflet/tiles never load (e.g. offline) don't spin forever.
  useEffect(() => {
    if (ready) return undefined;
    const t = setTimeout(() => {
      if (!ready) setLoadError(true);
    }, 9000);
    return () => clearTimeout(t);
  }, [ready]);

  const inject = useCallback((code) => {
    if (webRef.current) webRef.current.injectJavaScript(code + " true;");
  }, []);

  const openCard = useCallback(
    (atm) => {
      setSelected(atm);
      inject(`window.dsSelect(${JSON.stringify(atm.id)});`);
      cardAnim.setValue(0);
      Animated.spring(cardAnim, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }).start();
    },
    [cardAnim, inject]
  );

  const closeCard = useCallback(() => {
    inject("window.dsClearSelect();");
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setSelected(null));
  }, [cardAnim, inject]);

  const goToRegion = useCallback(
    (region) => {
      inject(`window.dsFlyTo(${region.center.lat}, ${region.center.lng}, ${region.zoom});`);
    },
    [inject]
  );

  const onMessage = useCallback(
    (event) => {
      let msg;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch (e) {
        return;
      }
      if (msg.type === "ready") {
        setReady(true);
        setLoadError(false);
      } else if (msg.type === "error") {
        setLoadError(true);
      } else if (msg.type === "select") {
        const atm = ATM_LOCATIONS.find((a) => a.id === msg.id);
        if (atm) openCard(atm);
      } else if (msg.type === "deselect") {
        if (selected) closeCard();
      }
    },
    [openCard, closeCard, selected]
  );

  return (
    <View style={styles.container}>
      <WebView
        key={isDark ? "dark" : "light"} // remount to swap tiles on theme change
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        scrollEnabled={false}
        overScrollMode="never"
        onMessage={onMessage}
        androidLayerType="hardware"
      />

      {/* Region quick-jump chips */}
      <View style={styles.chipsRow} pointerEvents="box-none">
        {ATM_REGIONS.map((r) => (
          <TouchableOpacity
            key={r.id}
            activeOpacity={0.8}
            style={styles.chip}
            onPress={() => goToRegion(r)}
          >
            <MaterialCommunityIcons name="map-marker-radius" size={14} color={colors.accent} />
            <Text style={styles.chipText}>{t("atm." + r.id)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Zoom controls */}
      <View style={styles.controls} pointerEvents="box-none">
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.8} onPress={() => inject("window.dsZoom(1);")}>
          <MaterialCommunityIcons name="plus" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.ctrlDivider} />
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.8} onPress={() => inject("window.dsZoom(-1);")}>
          <MaterialCommunityIcons name="minus" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Recenter to the home region (Kosovo) */}
      <TouchableOpacity
        style={styles.recenterBtn}
        activeOpacity={0.85}
        onPress={() => goToRegion(ATM_REGIONS[0])}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Loading / error overlay */}
      {!ready && (
        <View style={styles.overlay} pointerEvents="none">
          {loadError ? (
            <View style={styles.overlayBox}>
              <MaterialCommunityIcons name="map-marker-off-outline" size={30} color={colors.textMuted} />
              <Text style={styles.overlayText}>{t("atm.errorMap")}</Text>
            </View>
          ) : (
            <View style={styles.overlayBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.overlayText}>{t("atm.loadingMap")}</Text>
            </View>
          )}
        </View>
      )}

      {/* Info card shown when a marker is tapped */}
      {selected && (
        <Animated.View
          style={[
            styles.infoCard,
            {
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [120, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="bank" size={22} color="#fff" />
            </View>
            <View style={styles.infoHeaderText}>
              <Text style={styles.infoTitle}>DS Banking ATM</Text>
              <Text style={styles.infoCity}>
                {selected.city}, {selected.country}
              </Text>
            </View>
            <TouchableOpacity onPress={closeCard} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.accent} />
            <Text style={styles.infoRowText}>{selected.address}</Text>
          </View>

          <View style={styles.availabilityChip}>
            <MaterialCommunityIcons name="clock-check-outline" size={15} color={colors.success} />
            <Text style={styles.availabilityText}>{t("atm.available247")}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surfaceAlt, overflow: "hidden" },
    web: { flex: 1, backgroundColor: c.surfaceAlt },

    // Region chips
    chipsRow: {
      position: "absolute",
      top: 12,
      left: 12,
      right: 12,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.card,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 2,
      elevation: 2,
    },
    chipText: { color: c.text, fontSize: 13, fontWeight: "600" },

    // Zoom controls
    controls: {
      position: "absolute",
      right: 14,
      top: "38%",
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    ctrlBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    ctrlDivider: { height: 1, backgroundColor: c.border },

    recenterBtn: {
      position: "absolute",
      right: 14,
      bottom: 120,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },

    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceAlt,
    },
    overlayBox: { alignItems: "center" },
    overlayText: {
      marginTop: 12,
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
    },

    // Info card
    infoCard: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 16,
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 8,
    },
    infoHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    infoIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    infoHeaderText: { flex: 1 },
    infoTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    infoCity: { fontSize: 13, color: c.textSecondary, marginTop: 1 },

    infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
    infoRowText: { flex: 1, fontSize: 14, color: c.textSecondary },

    availabilityChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      marginTop: 14,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    availabilityText: { fontSize: 13, fontWeight: "600", color: c.success },
  });
