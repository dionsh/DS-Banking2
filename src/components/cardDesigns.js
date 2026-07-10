// cardDesigns.js — the single source of truth for DS Banking card designs.
//
// Both the "Personalize Card" gallery (where designs are bought) and the Card
// screen (where the purchased/primary design is shown on the real card) render
// from here, so a design looks IDENTICAL in both places.
//
// Exports:
//   DESIGNS            - the ordered catalog (id, name, price, look).
//   getDesignById(id)  - lookup with a safe fallback to DS Classic.
//   priceEur/priceLabel- price helpers (EUR number / display-currency string).
//   CardArtwork        - the BACKGROUND-ONLY visual for a design (scene /
//                        gradient / image + legibility scrim). Card chrome is
//                        drawn by the caller ON TOP, so the same artwork can sit
//                        behind either a mock preview or the real card data.
//   CARD_W/CARD_H/V_CARD_W/V_CARD_H - the standard card dimensions.

import React from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, Polygon, Line, Ellipse } from "react-native-svg";

const SCREEN_W = Dimensions.get("window").width;
export const CARD_W = SCREEN_W - 40;
export const CARD_H = Math.round(CARD_W / 1.586); // standard bank-card aspect ratio
export const V_CARD_W = Math.round((SCREEN_W - 40) * 0.62); // portrait cards
export const V_CARD_H = Math.round(V_CARD_W * 1.586);

// Local artwork.
const IMG_HYJNESHA = require("../../assets/images/hyjnesha_c.jpg");
const IMG_WORLDCUP = require("../../assets/images/worldcup.webp");
const IMG_FSK = require("../../assets/images/fsk.webp");
const IMG_WHALE = require("../../assets/images/whale2.png");
const IMG_DESERT = require("../../assets/images/desert_c.jpg");
const IMG_SPACE = require("../../assets/images/space_c.jpg");

// layout: "cover" = full-bleed photo + scrim · "right" = contained emblem on the
// right half · "top" = contained logo in the upper area (for vertical cards).
// A gradient design may instead set scene:"forest" to use a hand-drawn SVG scene.
export const DESIGNS = [
  // DS Classic leads, then the marquee image cards in the requested order.
  { id: "classic", name: "DS Classic", price: "Free", type: "gradient", orientation: "h", fg: "#FFFFFF",
    stops: [["0", "#191970"], ["1", "#2A2A9C"]] },
  {
    id: "worldcup", name: "FIFA World Cup 26", price: "€9.99",
    type: "image", orientation: "v", layout: "top", image: IMG_WORLDCUP,
    bgStops: [["0", "#202020"], ["1", "#000000"]], fg: "#E8C66B", scrim: false,
  },
  {
    id: "fsk", name: "FSK", price: "€7.99",
    type: "image", orientation: "h", layout: "right", image: IMG_FSK,
    bgStops: [["0", "#5C6B2E"], ["1", "#262E14"]], fg: "#E7CF7A", scrim: false,
  },
  {
    id: "whale", name: "Blue Whale", price: "€4.99",
    type: "image", orientation: "h", layout: "right", image: IMG_WHALE,
    bgStops: [["0", "#A6F0FB"], ["1", "#57C6E8"]], fg: "#0B3A5B", scrim: false,
  },
  // ---------- The others ----------
  {
    id: "penguin", name: "Arctic Penguin", price: "€4.99",
    type: "gradient", orientation: "h", scene: "penguin", minimalChrome: true,
    fg: "#0B3A5B", bg: "#CFEFFB",
  },
  {
    id: "desert", name: "Golden Dunes", price: "€7.99",
    type: "image", orientation: "h", layout: "cover", image: IMG_DESERT,
    bg: "#8A5A24", fg: "#FFFFFF", scrim: true,
  },
  // ---------- Hand-drawn pine scenes (same composition, different moods) ----------
  {
    id: "nature", name: "Evergreen", price: "€4.99",
    type: "gradient", orientation: "h", scene: "forest", palette: "evergreen", fg: "#FFFFFF", bg: "#16352B",
  },
  {
    id: "crimson", name: "Crimson Pines", price: "€4.99",
    type: "gradient", orientation: "h", scene: "forest", palette: "crimson", fg: "#FFF0E6", bg: "#2E1012",
  },
  {
    id: "midnight", name: "Midnight Pines", price: "€4.99",
    type: "gradient", orientation: "h", scene: "forest", palette: "midnight", fg: "#EAEEFF", bg: "#0A0F26",
  },
  {
    id: "frost", name: "Frostpine", price: "€4.99",
    type: "gradient", orientation: "h", scene: "forest", palette: "frost", fg: "#EAFBFF", bg: "#0B333D",
  },
  {
    id: "hoop", name: "Slam Dunk", price: "€7.99",
    type: "gradient", orientation: "h", scene: "basketball", fg: "#FFFFFF", bg: "#15173A",
  },
  {
    id: "space", name: "Space", price: "€7.99",
    type: "image", orientation: "h", layout: "cover", image: IMG_SPACE,
    bg: "#0B0F2A", fg: "#FFFFFF", scrim: true,
  },
  // ---------- Gradient designs ----------
  { id: "luxury", name: "Luxury Black & Gold", price: "€9.99", type: "gradient", orientation: "h", fg: "#F4D58D",
    stops: [["0", "#1C1C1C"], ["0.5", "#0D0D0D"], ["1", "#000000"]] },
  { id: "minimal", name: "Minimalist", price: "€2.99", type: "gradient", orientation: "h", fg: "#1A1A1A",
    stripes: true, stops: [["0", "#F5F6F8"], ["1", "#DCE0E6"]] },
  { id: "gradient", name: "Modern Gradient", price: "€2.99", type: "gradient", orientation: "h", fg: "#FFFFFF",
    stops: [["0", "#7F5AF0"], ["0.5", "#C13584"], ["1", "#F77737"]] },
  {
    id: "hyjnesha", name: "Hyjnesha në Fron", price: "€9.99",
    type: "image", orientation: "v", layout: "cover", image: IMG_HYJNESHA,
    bg: "#6E2A1E", fg: "#FFF1E0", scrim: true,
  },
];

export const getDesignById = (id) => DESIGNS.find((d) => d.id === id) || DESIGNS[0];

// Design prices are cosmetic EUR strings ("€4.99"). priceEur() is the raw EUR
// number the backend charges; priceLabel() renders it in the display currency
// like every other price in the app ("Free" stays as-is).
export const priceEur = (price) =>
  price === "Free" ? 0 : parseFloat(String(price).replace("€", "")) || 0;
export const priceLabel = (price, format) =>
  price === "Free" ? "Free" : format(priceEur(price));

// Colour moods for the hand-drawn pine scene + each palette's signature extras.
export const FOREST_PALETTES = {
  evergreen: { sky: ["#356152", "#214E3E", "#0C2E22"], moon: "#EAF3E8", hill: "#23513F", back: "#2A5743", front: "#0F3025", ground: "#0C2A1F" },
  crimson:   { sky: ["#8A3A2A", "#5E2320", "#280C10"], moon: "#FFC489", hill: "#4E1E1C", back: "#5C2420", front: "#260C0E", ground: "#1E090B", sun: true, birds: true },
  midnight:  { sky: ["#243266", "#162042", "#080E22"], moon: "#E8ECFF", hill: "#1A2548", back: "#1E2A50", front: "#0C1330", ground: "#070B1C", stars: true, aurora: true, shooting: true },
  frost:     { sky: ["#2E8A9C", "#1C6273", "#0C3A46"], moon: "#F0FBFF", hill: "#247280", back: "#2E8492", front: "#11515E", ground: "#0B333D", snow: true, snowcaps: true },
};

// Deterministic particle-field positions (fractions of w/h).
const STAR_POS = [
  [0.12, 0.18], [0.22, 0.30], [0.34, 0.13], [0.45, 0.24], [0.5, 0.09],
  [0.58, 0.17], [0.68, 0.31], [0.16, 0.41], [0.88, 0.21], [0.93, 0.37],
];
const SNOW_POS = [
  [0.08, 0.16], [0.18, 0.34], [0.27, 0.10], [0.36, 0.46], [0.44, 0.22],
  [0.52, 0.38], [0.6, 0.14], [0.68, 0.5], [0.74, 0.28], [0.82, 0.42],
  [0.9, 0.18], [0.14, 0.56], [0.33, 0.62], [0.5, 0.58], [0.7, 0.66], [0.86, 0.6],
];

// A hand-drawn pine scene. The shared composition (sky gradient + misty hill + two
// depth layers of pines) is recoloured by `palette`, and each palette adds its own
// signature: crimson -> a low setting sun + a flock of birds; midnight -> aurora
// ribbons + a shooting star over a starfield; frost -> snow-capped trees + snowfall.
export function ForestScene({ w, h, palette, id }) {
  const p = palette || FOREST_PALETTES.evergreen;
  const pine = (t) => `${t.x - t.tw / 2},${t.base} ${t.x},${t.base - t.th} ${t.x + t.tw / 2},${t.base}`;
  const cap = (t) =>
    `${t.x - t.tw * 0.16},${t.base - t.th * 0.74} ${t.x},${t.base - t.th} ${t.x + t.tw * 0.16},${t.base - t.th * 0.74}`;
  const bird = (x, y, s) => `M ${x} ${y} Q ${x + s} ${y - s} ${x + 2 * s} ${y} Q ${x + 3 * s} ${y - s} ${x + 4 * s} ${y}`;

  const backT = [];
  const N = 7;
  for (let i = 0; i <= N; i++) backT.push({ x: (w * i) / N, base: h * 0.82, tw: w * 0.12, th: h * 0.22 });
  const frontT = [];
  const M = 6;
  for (let i = 0; i <= M; i++) frontT.push({ x: (w * i) / M + w * 0.04, base: h * 0.985, tw: w * 0.17, th: h * 0.34 });

  const min = Math.min(w, h);
  const gid = `forest-sky-${id}`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.sky[0]} />
          <Stop offset="0.5" stopColor={p.sky[1]} />
          <Stop offset="1" stopColor={p.sky[2]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={w} height={h} fill={`url(#${gid})`} />

      {/* Aurora ribbons (midnight) */}
      {p.aurora && (
        <>
          <Path d={`M 0 ${h * 0.17} Q ${w * 0.28} ${h * 0.07} ${w * 0.55} ${h * 0.17} T ${w} ${h * 0.14}`}
            stroke="#5FE6B4" strokeWidth={16} strokeOpacity={0.18} fill="none" strokeLinecap="round" />
          <Path d={`M 0 ${h * 0.27} Q ${w * 0.3} ${h * 0.17} ${w * 0.6} ${h * 0.26} T ${w} ${h * 0.23}`}
            stroke="#86A8FF" strokeWidth={12} strokeOpacity={0.15} fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Starfield (midnight) */}
      {p.stars &&
        STAR_POS.map(([fx, fy], i) => (
          <Circle key={`s${i}`} cx={w * fx} cy={h * fy} r={i % 3 === 0 ? 1.7 : 1.1} fill={p.moon} opacity={0.85} />
        ))}

      {/* Shooting star (midnight) */}
      {p.shooting && (
        <>
          <Line x1={w * 0.15} y1={h * 0.12} x2={w * 0.29} y2={h * 0.2} stroke="#FFFFFF" strokeWidth={1.6} strokeOpacity={0.8} strokeLinecap="round" />
          <Circle cx={w * 0.29} cy={h * 0.2} r={2} fill="#FFFFFF" opacity={0.95} />
        </>
      )}

      {/* Setting sun + glow (crimson) or a moon (others) */}
      {p.sun ? (
        <>
          <Circle cx={w * 0.3} cy={h * 0.44} r={min * 0.27} fill={p.moon} opacity={0.16} />
          <Circle cx={w * 0.3} cy={h * 0.44} r={min * 0.15} fill={p.moon} opacity={0.95} />
        </>
      ) : (
        <Circle cx={w * 0.78} cy={h * 0.26} r={min * 0.11} fill={p.moon} opacity={0.88} />
      )}

      {/* Flock of birds (crimson) */}
      {p.birds &&
        [[0.56, 0.2, 5], [0.63, 0.27, 6], [0.71, 0.18, 4], [0.67, 0.34, 5], [0.79, 0.29, 6]].map(([fx, fy, s], i) => (
          <Path key={`bird${i}`} d={bird(w * fx, h * fy, s)} stroke="#3A0E0E" strokeWidth={1.6} fill="none" strokeLinecap="round" />
        ))}

      {/* misty hill */}
      <Path
        d={`M0 ${h * 0.72} Q ${w * 0.3} ${h * 0.62} ${w * 0.56} ${h * 0.72} T ${w} ${h * 0.7} L ${w} ${h} L 0 ${h} Z`}
        fill={p.hill}
        opacity={0.9}
      />
      {backT.map((t, i) => (
        <Polygon key={`b${i}`} points={pine(t)} fill={p.back} />
      ))}
      <Rect x="0" y={h * 0.92} width={w} height={h * 0.08} fill={p.ground} />
      {frontT.map((t, i) => (
        <Polygon key={`f${i}`} points={pine(t)} fill={p.front} />
      ))}

      {/* Snow caps on the trees (frost) */}
      {p.snowcaps && (
        <>
          {backT.map((t, i) => (
            <Polygon key={`bc${i}`} points={cap(t)} fill="#FFFFFF" opacity={0.55} />
          ))}
          {frontT.map((t, i) => (
            <Polygon key={`fc${i}`} points={cap(t)} fill="#FFFFFF" opacity={0.92} />
          ))}
        </>
      )}

      {/* Falling snow (frost) */}
      {p.snow &&
        SNOW_POS.map(([fx, fy], i) => (
          <Circle key={`sn${i}`} cx={w * fx} cy={h * fy} r={i % 4 === 0 ? 2.4 : 1.5} fill="#FFFFFF" opacity={0.9} />
        ))}
    </Svg>
  );
}

// A hand-drawn basketball hoop at dusk: backboard + orange rim + hanging net on a
// pole (upper right) and a basketball in mid-air (lower left). Pure react-native-svg.
export function BasketballScene({ w, h, id }) {
  const gid = `court-sky-${id}`;
  const min = Math.min(w, h);

  // Backboard + rim geometry (upper right)
  const bbX = w * 0.6;
  const bbY = h * 0.13;
  const bbW = w * 0.26;
  const bbH = h * 0.27;
  const rimCx = bbX + bbW * 0.5;
  const rimCy = bbY + bbH + h * 0.02;
  const rimRx = w * 0.085;
  const rimRy = h * 0.028;

  // Net mesh: from the rim, converging to a narrower bottom.
  const netTopY = rimCy + rimRy * 0.4;
  const netBotY = rimCy + h * 0.17;
  const cols = 6;
  const halfTop = rimRx;
  const halfBot = rimRx * 0.45;
  const netV = [];
  for (let i = 0; i <= cols; i++) {
    const tx = rimCx - halfTop + (2 * halfTop * i) / cols;
    const bx = rimCx - halfBot + (2 * halfBot * i) / cols;
    netV.push([tx, netTopY, bx, netBotY]);
  }
  const netH = [0.4, 0.75].map((f) => {
    const y = netTopY + (netBotY - netTopY) * f;
    const half = halfTop + (halfBot - halfTop) * f;
    return [rimCx - half, y, rimCx + half, y];
  });

  // Basketball (lower left)
  const ballCx = w * 0.28;
  const ballCy = h * 0.58;
  const ballR = min * 0.12;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3C4F86" />
          <Stop offset="0.55" stopColor="#27305E" />
          <Stop offset="1" stopColor="#141838" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={w} height={h} fill={`url(#${gid})`} />

      {/* faint court line */}
      <Path d={`M 0 ${h * 0.9} Q ${w * 0.5} ${h * 0.84} ${w} ${h * 0.9}`} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={2} fill="none" />

      {/* pole (behind the backboard) */}
      <Rect x={bbX + bbW * 0.82} y={bbY + bbH * 0.4} width={w * 0.02} height={h * 0.55} rx={2} fill="#9AA0AE" />

      {/* backboard + shooting square */}
      <Rect x={bbX} y={bbY} width={bbW} height={bbH} rx={6} fill="#F4F6FA" stroke="#C7CDDA" strokeWidth={2} />
      <Rect x={bbX + bbW * 0.3} y={bbY + bbH * 0.42} width={bbW * 0.4} height={bbH * 0.4} rx={3} fill="none" stroke="#E8743B" strokeWidth={2.5} />

      {/* rim */}
      <Ellipse cx={rimCx} cy={rimCy} rx={rimRx} ry={rimRy} fill="none" stroke="#F2752B" strokeWidth={4} />

      {/* net */}
      {netV.map(([x1, y1, x2, y2], i) => (
        <Line key={`nv${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1.2} />
      ))}
      {netH.map(([x1, y1, x2, y2], i) => (
        <Line key={`nh${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.1} />
      ))}

      {/* basketball + seams */}
      <Circle cx={ballCx} cy={ballCy} r={ballR} fill="#E97E22" />
      <Line x1={ballCx - ballR} y1={ballCy} x2={ballCx + ballR} y2={ballCy} stroke="#3A1A06" strokeWidth={1.6} />
      <Line x1={ballCx} y1={ballCy - ballR} x2={ballCx} y2={ballCy + ballR} stroke="#3A1A06" strokeWidth={1.6} />
      <Path d={`M ${ballCx} ${ballCy - ballR} Q ${ballCx - ballR * 0.85} ${ballCy} ${ballCx} ${ballCy + ballR}`} stroke="#3A1A06" strokeWidth={1.4} fill="none" />
      <Path d={`M ${ballCx} ${ballCy - ballR} Q ${ballCx + ballR * 0.85} ${ballCy} ${ballCx} ${ballCy + ballR}`} stroke="#3A1A06" strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

// A hand-drawn cartoon penguin on an icy background (snow ground + a few flakes).
// Built from ellipses/paths so it always renders (no image pipeline involved).
export function PenguinScene({ w, h, id }) {
  const gid = `ice-sky-${id}`;
  const cx = w * 0.5;
  const Y = (f) => h * f; // vertical helper (fraction of height)
  const U = h; // size unit

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D8F1FB" />
          <Stop offset="0.55" stopColor="#9DD8EF" />
          <Stop offset="1" stopColor="#63B8DE" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={w} height={h} fill={`url(#${gid})`} />

      {/* snow ground */}
      <Path d={`M 0 ${Y(0.78)} Q ${w * 0.5} ${Y(0.70)} ${w} ${Y(0.78)} L ${w} ${h} L 0 ${h} Z`} fill="#FFFFFF" opacity={0.92} />

      {/* snowflakes */}
      {[[0.13, 0.20], [0.22, 0.42], [0.79, 0.24], [0.88, 0.46], [0.32, 0.14], [0.70, 0.56]].map(([fx, fy], i) => (
        <Circle key={`sf${i}`} cx={w * fx} cy={h * fy} r={i % 2 ? 2 : 1.4} fill="#FFFFFF" opacity={0.85} />
      ))}

      {/* feet (drawn first so the body overlaps their tops) */}
      <Polygon points={`${cx - 0.02 * U},${Y(0.72)} ${cx - 0.13 * U},${Y(0.77)} ${cx - 0.02 * U},${Y(0.79)}`} fill="#F2922A" />
      <Polygon points={`${cx + 0.02 * U},${Y(0.72)} ${cx + 0.13 * U},${Y(0.77)} ${cx + 0.02 * U},${Y(0.79)}`} fill="#F2922A" />

      {/* body */}
      <Ellipse cx={cx} cy={Y(0.46)} rx={0.21 * U} ry={0.30 * U} fill="#1B1B22" />

      {/* wings */}
      <Path d={`M ${cx - 0.18 * U} ${Y(0.34)} Q ${cx - 0.30 * U} ${Y(0.46)} ${cx - 0.16 * U} ${Y(0.60)} Q ${cx - 0.13 * U} ${Y(0.47)} ${cx - 0.16 * U} ${Y(0.35)} Z`} fill="#13131A" />
      <Path d={`M ${cx + 0.18 * U} ${Y(0.34)} Q ${cx + 0.30 * U} ${Y(0.46)} ${cx + 0.16 * U} ${Y(0.60)} Q ${cx + 0.13 * U} ${Y(0.47)} ${cx + 0.16 * U} ${Y(0.35)} Z`} fill="#13131A" />

      {/* belly */}
      <Ellipse cx={cx} cy={Y(0.55)} rx={0.145 * U} ry={0.185 * U} fill="#FCFCFC" />

      {/* eyes */}
      <Circle cx={cx - 0.07 * U} cy={Y(0.30)} r={0.05 * U} fill="#FFFFFF" />
      <Circle cx={cx + 0.07 * U} cy={Y(0.30)} r={0.05 * U} fill="#FFFFFF" />
      <Circle cx={cx - 0.068 * U} cy={Y(0.305)} r={0.024 * U} fill="#1B1B22" />
      <Circle cx={cx + 0.068 * U} cy={Y(0.305)} r={0.024 * U} fill="#1B1B22" />
      <Circle cx={cx - 0.076 * U} cy={Y(0.296)} r={0.009 * U} fill="#FFFFFF" />
      <Circle cx={cx + 0.06 * U} cy={Y(0.296)} r={0.009 * U} fill="#FFFFFF" />

      {/* beak */}
      <Polygon points={`${cx - 0.045 * U},${Y(0.35)} ${cx + 0.045 * U},${Y(0.35)} ${cx},${Y(0.42)}`} fill="#F6A21E" />
      <Line x1={cx - 0.045 * U} y1={Y(0.35)} x2={cx + 0.045 * U} y2={Y(0.35)} stroke="#D97E12" strokeWidth={1} />
    </Svg>
  );
}

// Subtle tone-on-tone diagonal stripes, used to lift the minimalist card.
export function DiagonalStripes({ w, h, color = "#191970", opacity = 0.07, gap = 30, width = 14 }) {
  const xs = [];
  for (let x = -h; x < w + h; x += gap) xs.push(x);
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      {xs.map((x, i) => (
        <Line key={i} x1={x} y1={0} x2={x + h} y2={h} stroke={color} strokeOpacity={opacity} strokeWidth={width} />
      ))}
    </Svg>
  );
}

// CardArtwork — the BACKGROUND of a design (no chrome). Place it inside a parent
// View that has a fixed w/h, rounded corners and overflow:"hidden"; draw the
// card chrome (numbers, VISA, ...) on top using the design's `fg` colour.
//
// `idKey` disambiguates the SVG gradient ids so the SAME design can be rendered
// more than once on one screen (e.g. the big card + a slider thumbnail) without
// two <Svg> defs colliding.
export function CardArtwork({ design, w, h, idKey = "d" }) {
  if (!design) return null;
  const bgStops = design.stops || design.bgStops;
  const isImage = design.type === "image";
  const sid = `${idKey}-${design.id}`;

  return (
    <>
      {/* Background: hand-drawn scene, gradient, or solid */}
      {design.scene === "forest" ? (
        <ForestScene w={w} h={h} palette={FOREST_PALETTES[design.palette]} id={sid} />
      ) : design.scene === "basketball" ? (
        <BasketballScene w={w} h={h} id={sid} />
      ) : design.scene === "penguin" ? (
        <PenguinScene w={w} h={h} id={sid} />
      ) : bgStops ? (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`bg-${sid}`} x1="0" y1="0" x2="1" y2="1">
              {bgStops.map(([offset, color]) => (
                <Stop key={offset} offset={offset} stopColor={color} stopOpacity="1" />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={w} height={h} fill={`url(#bg-${sid})`} />
        </Svg>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: design.bg }]} />
      )}

      {design.stripes && <DiagonalStripes w={w} h={h} />}

      {/* Artwork */}
      {isImage && design.layout === "cover" && (
        <Image source={design.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {isImage && design.layout === "right" && (
        <Image source={design.image} style={artStyles.imgRight} resizeMode="contain" />
      )}
      {isImage && design.layout === "top" && (
        <Image source={design.image} style={artStyles.imgTop} resizeMode="contain" />
      )}

      {/* Legibility scrim for full-bleed photos (darkens top & bottom) */}
      {isImage && design.scrim && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={`sc-${sid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000" stopOpacity={design.scrimTop ?? 0.5} />
              <Stop offset="0.32" stopColor="#000" stopOpacity="0" />
              <Stop offset="0.66" stopColor="#000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000" stopOpacity={design.scrimBottom ?? 0.62} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={w} height={h} fill={`url(#sc-${sid})`} />
        </Svg>
      )}
    </>
  );
}

const artStyles = StyleSheet.create({
  imgRight: { position: "absolute", right: 8, top: 12, bottom: 12, width: "48%" },
  imgTop: { position: "absolute", top: "14%", left: 16, right: 16, height: "56%" },
});
