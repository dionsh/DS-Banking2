// Avatar — a flat, customizable adult character built entirely from
// react-native-svg primitives (already a project dependency — no new packages).
//
// Customizable slots are all props so the customizer/shop can just pass the
// user's chosen options:
//   <Avatar size={220}
//     gender="female"
//     skin="#E0AC69"
//     hairStyle="curly"  hairColor="#2A2A2A"
//     shirtStyle="hoodie" shirtColor="#4F46E5"
//     pantsStyle="jeans"  pantsColor="#2C3E50"
//     shoeStyle="sneakers" shoeColor="#FFFFFF" />
//
// gender:     "male" | "female"  (female adds hips, a bust hint, eyelashes, lips)
// hairStyle:  "short" | "curly" | "long" | "buzz" | "spiky" | "bun" | "ponytail"
// shirtStyle: "tshirt" | "hoodie" | "polo" | "tank" | "suit" | "dress"
// pantsStyle: "jeans" | "shorts" | "cargo" | "joggers" | "skirt"
// shoeStyle:  "sneakers" | "boots" | "sandals" | "hightops" | "heels"
//
// The free styles (short/curly/long, tshirt/hoodie/polo, jeans/shorts,
// sneakers/boots) ship unlocked; the rest are premium shop items bought with
// reward points. ponytail/dress/skirt/heels are women-only (the catalog gates
// them by gender). Style ids MUST match the backend avatar_items catalog.

import React from "react";
import Svg, { Ellipse, Rect, Circle, Path, G, Line } from "react-native-svg";

export const SKIN_TONES = ["#F8D5AC", "#E8B98C", "#E0AC69", "#C68642", "#8D5524"];
export const HAIR_COLORS = ["#2A2A2A", "#5A3A22", "#8B5A2B", "#C9A227", "#B0B0B0", "#D14B8F"];
export const SHIRT_COLORS = ["#4F46E5", "#E53935", "#10B981", "#0EA5E9", "#111827", "#F59E0B"];
export const PANTS_COLORS = ["#2C3E50", "#1F3A5F", "#6B4F2A", "#374151", "#9CA3AF"];
export const SHOE_COLORS = ["#FFFFFF", "#E53935", "#111827", "#2563EB", "#16A34A"];

export const HAIR_STYLES = ["short", "curly", "long", "buzz", "spiky", "bun", "ponytail"];
export const SHIRT_STYLES = ["tshirt", "hoodie", "polo", "tank", "suit", "dress"];
export const PANTS_STYLES = ["jeans", "shorts", "cargo", "joggers", "skirt"];
export const SHOE_STYLES = ["sneakers", "boots", "sandals", "hightops", "heels"];

const SOLE = "rgba(255,255,255,0.65)";
const SHADE = "rgba(0,0,0,0.10)";
const SHADE2 = "rgba(0,0,0,0.18)";
const SHIRT_LIGHT = "#F5F5F5";
const LIP = "#C0607A";

export default function Avatar({
  size = 220,
  gender = "male",
  skin = "#E0AC69",
  hairStyle = "short",
  hairColor = "#2A2A2A",
  shirtStyle = "tshirt",
  shirtColor = "#4F46E5",
  pantsStyle = "jeans",
  pantsColor = "#2C3E50",
  shoeStyle = "sneakers",
  shoeColor = "#FFFFFF",
}) {
  const height = size * (380 / 240);
  const longSleeves = shirtStyle === "hoodie" || shirtStyle === "suit";
  const wearingDress = shirtStyle === "dress";
  const noSleeves = shirtStyle === "tank" || wearingDress;
  const female = gender === "female";

  return (
    <Svg width={size} height={height} viewBox="0 0 240 380">
      <Ellipse cx={120} cy={368} rx={54} ry={7} fill="#000" opacity={0.1} />

      {/* ── LEGS ───────────────────────────────────────── */}
      {wearingDress ? (
        <G>
          {/* bare legs; the dress skirt (drawn later) covers the thighs */}
          <Rect x={98} y={206} width={18} height={126} rx={9} fill={skin} />
          <Rect x={124} y={206} width={18} height={126} rx={9} fill={skin} />
        </G>
      ) : pantsStyle === "skirt" ? (
        <G>
          {/* bare lower legs + a flared mini-skirt */}
          <Rect x={98} y={250} width={18} height={82} rx={8} fill={skin} />
          <Rect x={124} y={250} width={18} height={82} rx={8} fill={skin} />
          <Path d="M90 206 L150 206 L162 256 Q120 268 78 256 Z" fill={pantsColor} />
        </G>
      ) : pantsStyle === "shorts" ? (
        <G>
          {/* lower legs (skin) then shorts on top */}
          <Rect x={98} y={262} width={18} height={70} rx={8} fill={skin} />
          <Rect x={124} y={262} width={18} height={70} rx={8} fill={skin} />
          <Rect x={96} y={210} width={22} height={62} rx={9} fill={pantsColor} />
          <Rect x={122} y={210} width={22} height={62} rx={9} fill={pantsColor} />
        </G>
      ) : (
        <G>
          {/* full-length trousers (jeans / cargo / joggers) */}
          <Rect x={96} y={210} width={22} height={120} rx={9} fill={pantsColor} />
          <Rect x={122} y={210} width={22} height={120} rx={9} fill={pantsColor} />

          {pantsStyle === "cargo" && (
            <G>
              {/* side cargo pockets on the outer thighs */}
              <Rect x={96} y={250} width={14} height={28} rx={3} fill={SHADE2} />
              <Rect x={130} y={250} width={14} height={28} rx={3} fill={SHADE2} />
              <Rect x={97} y={252} width={12} height={3} rx={1.5} fill={SHADE} />
              <Rect x={131} y={252} width={12} height={3} rx={1.5} fill={SHADE} />
            </G>
          )}

          {pantsStyle === "joggers" && (
            <G>
              {/* ribbed ankle cuffs */}
              <Rect x={96} y={314} width={22} height={16} rx={7} fill={SHADE2} />
              <Rect x={122} y={314} width={22} height={16} rx={7} fill={SHADE2} />
              {/* waist drawstrings */}
              <Line x1={116} y1={214} x2={113} y2={228} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
              <Line x1={124} y1={214} x2={127} y2={228} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
            </G>
          )}
        </G>
      )}

      {/* ── HIPS (female silhouette; mostly tucked under the shirt) ── */}
      {female && (
        <Path d="M96 206 Q84 218 92 238 L148 238 Q156 218 144 206 Z" fill={pantsColor} />
      )}

      {/* ── SHOES ──────────────────────────────────────── */}
      {shoeStyle === "boots" && (
        <G>
          <Rect x={92} y={300} width={28} height={48} rx={8} fill={shoeColor} stroke={SHADE} strokeWidth={1} />
          <Rect x={120} y={300} width={28} height={48} rx={8} fill={shoeColor} stroke={SHADE} strokeWidth={1} />
          <Rect x={92} y={332} width={28} height={6} rx={3} fill={SHADE} />
          <Rect x={120} y={332} width={28} height={6} rx={3} fill={SHADE} />
        </G>
      )}
      {shoeStyle === "sneakers" && (
        <G>
          <Rect x={82} y={324} width={42} height={22} rx={10} fill={shoeColor} stroke={SHADE} strokeWidth={1} />
          <Rect x={116} y={324} width={42} height={22} rx={10} fill={shoeColor} stroke={SHADE} strokeWidth={1} />
          <Rect x={82} y={340} width={42} height={6} rx={3} fill={SOLE} />
          <Rect x={116} y={340} width={42} height={6} rx={3} fill={SOLE} />
        </G>
      )}
      {shoeStyle === "sandals" && (
        <G>
          {/* bare feet (skin) with a sole + crossing straps */}
          <Rect x={84} y={330} width={38} height={14} rx={6} fill={skin} />
          <Rect x={118} y={330} width={38} height={14} rx={6} fill={skin} />
          <Rect x={84} y={342} width={38} height={5} rx={2.5} fill={shoeColor} />
          <Rect x={118} y={342} width={38} height={5} rx={2.5} fill={shoeColor} />
          <Rect x={90} y={331} width={24} height={4} rx={2} fill={shoeColor} />
          <Rect x={124} y={331} width={24} height={4} rx={2} fill={shoeColor} />
          <Rect x={99} y={331} width={4} height={13} rx={2} fill={shoeColor} />
          <Rect x={133} y={331} width={4} height={13} rx={2} fill={shoeColor} />
        </G>
      )}
      {shoeStyle === "hightops" && (
        <G>
          {/* ankle-high trainers with a light sole + laces */}
          <Rect x={84} y={300} width={36} height={46} rx={9} fill={shoeColor} stroke={SHADE} strokeWidth={1} />
          <Rect x={120} y={300} width={36} height={46} rx={9} fill={shoeColor} stroke={SHADE} strokeWidth={1} />
          <Rect x={84} y={339} width={36} height={7} rx={3.5} fill={SOLE} />
          <Rect x={120} y={339} width={36} height={7} rx={3.5} fill={SOLE} />
          <Line x1={95} y1={311} x2={109} y2={311} stroke={SOLE} strokeWidth={2} strokeLinecap="round" />
          <Line x1={95} y1={320} x2={109} y2={320} stroke={SOLE} strokeWidth={2} strokeLinecap="round" />
          <Line x1={131} y1={311} x2={145} y2={311} stroke={SOLE} strokeWidth={2} strokeLinecap="round" />
          <Line x1={131} y1={320} x2={145} y2={320} stroke={SOLE} strokeWidth={2} strokeLinecap="round" />
        </G>
      )}
      {shoeStyle === "heels" && (
        <G>
          {/* pumps: a low-cut shoe with a slim stiletto heel at the back */}
          <Path d="M82 324 Q102 321 120 330 L120 339 L84 339 Q79 332 82 324 Z" fill={shoeColor} stroke={SHADE} strokeWidth={1} />
          <Path d="M158 324 Q138 321 120 330 L120 339 L156 339 Q161 332 158 324 Z" fill={shoeColor} stroke={SHADE} strokeWidth={1} />
          <Rect x={88} y={338} width={6} height={14} rx={1} fill={shoeColor} />
          <Rect x={146} y={338} width={6} height={14} rx={1} fill={shoeColor} />
        </G>
      )}

      {/* ── ARMS (skin) ────────────────────────────────── */}
      <Rect x={58} y={100} width={17} height={104} rx={8} fill={skin} />
      <Rect x={165} y={100} width={17} height={104} rx={8} fill={skin} />
      <Circle cx={66} cy={206} r={9.5} fill={skin} />
      <Circle cx={174} cy={206} r={9.5} fill={skin} />

      {/* ── TORSO / SHIRT ──────────────────────────────── */}
      <Rect x={76} y={92} width={88} height={122} rx={22} fill={shirtColor} />

      {/* sleeves: long for hoodie/suit, short for tshirt/polo, none for tank */}
      {!noSleeves &&
        (longSleeves ? (
          <G>
            <Rect x={55} y={98} width={22} height={104} rx={10} fill={shirtColor} />
            <Rect x={163} y={98} width={22} height={104} rx={10} fill={shirtColor} />
            {shirtStyle === "hoodie" && (
              <G>
                <Rect x={55} y={188} width={22} height={14} rx={7} fill={SHADE} />
                <Rect x={163} y={188} width={22} height={14} rx={7} fill={SHADE} />
              </G>
            )}
          </G>
        ) : (
          <G>
            <Rect x={54} y={96} width={28} height={36} rx={14} fill={shirtColor} />
            <Rect x={158} y={96} width={28} height={36} rx={14} fill={shirtColor} />
          </G>
        ))}

      {/* hoodie extras: hood roll behind neck, pocket, drawstrings */}
      {shirtStyle === "hoodie" && (
        <G>
          <Rect x={92} y={150} width={56} height={34} rx={12} fill={SHADE} />
          <Line x1={112} y1={104} x2={110} y2={130} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
          <Line x1={128} y1={104} x2={130} y2={130} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
        </G>
      )}

      {/* polo extras: collar + buttons */}
      {shirtStyle === "polo" && (
        <G>
          <Path d="M108 94 L120 106 L120 94 Z" fill={SHADE} />
          <Path d="M132 94 L120 106 L120 94 Z" fill={SHADE} />
          <Circle cx={120} cy={116} r={2.2} fill={SHADE} />
          <Circle cx={120} cy={128} r={2.2} fill={SHADE} />
        </G>
      )}

      {/* tank extras: carve bare shoulders + scoop neckline so straps show */}
      {shirtStyle === "tank" && (
        <G>
          <Rect x={73} y={92} width={13} height={28} rx={6} fill={skin} />
          <Rect x={154} y={92} width={13} height={28} rx={6} fill={skin} />
          <Path d="M101 92 Q120 120 139 92 Z" fill={skin} />
        </G>
      )}

      {/* suit extras: dress-shirt V, jacket lapels, tie, buttons */}
      {shirtStyle === "suit" && (
        <G>
          <Path d="M108 94 L120 152 L132 94 Z" fill={SHIRT_LIGHT} />
          <Path d="M94 94 L120 152 L108 94 Z" fill={SHADE2} />
          <Path d="M146 94 L120 152 L132 94 Z" fill={SHADE2} />
          <Rect x={116} y={98} width={8} height={9} rx={1} fill="#B00020" />
          <Path d="M120 106 L113 118 L120 152 L127 118 Z" fill="#B00020" />
          <Circle cx={120} cy={172} r={2.4} fill={SHADE2} />
          <Circle cx={120} cy={190} r={2.4} fill={SHADE2} />
        </G>
      )}

      {/* dress: sleeveless bodice (bare shoulders + scoop neck) + a flared skirt
          that covers the bare legs down to the shins */}
      {wearingDress && (
        <G>
          <Rect x={73} y={92} width={13} height={26} rx={6} fill={skin} />
          <Rect x={154} y={92} width={13} height={26} rx={6} fill={skin} />
          <Path d="M101 92 Q120 116 139 92 Z" fill={skin} />
          <Path d="M82 150 L158 150 L170 306 Q120 318 70 306 Z" fill={shirtColor} />
          <Path d="M83 152 Q120 162 157 152" stroke={SHADE} strokeWidth={2} fill="none" strokeLinecap="round" />
        </G>
      )}

      {/* female bust hint (skip for suit, whose lapels already shape the chest) */}
      {female && shirtStyle !== "suit" && (
        <G>
          <Path d="M97 120 Q108 136 119 124" stroke={SHADE} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <Path d="M143 120 Q132 136 121 124" stroke={SHADE} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </G>
      )}

      {/* ── NECK ───────────────────────────────────────── */}
      <Rect x={110} y={74} width={20} height={24} rx={7} fill={skin} />

      {/* ── HAIR (behind head) ─────────────────────────── */}
      {shirtStyle === "hoodie" && <Rect x={90} y={70} width={60} height={26} rx={13} fill={shirtColor} />}
      {hairStyle === "short" && <Circle cx={120} cy={40} r={35} fill={hairColor} />}
      {hairStyle === "buzz" && <Path d="M89 48 A32 32 0 0 1 151 48 Q120 37 89 48 Z" fill={hairColor} />}
      {hairStyle === "spiky" && (
        <Path
          d="M90 46 L98 10 L110 32 L120 6 L130 32 L142 10 L150 46 Q120 34 90 46 Z"
          fill={hairColor}
        />
      )}
      {hairStyle === "bun" && (
        <G>
          <Circle cx={120} cy={42} r={33} fill={hairColor} />
          <Circle cx={120} cy={12} r={12} fill={hairColor} />
          <Circle cx={120} cy={24} r={5} fill={SHADE} />
        </G>
      )}
      {hairStyle === "curly" && (
        <G>
          <Circle cx={120} cy={18} r={16} fill={hairColor} />
          <Circle cx={96} cy={26} r={15} fill={hairColor} />
          <Circle cx={144} cy={26} r={15} fill={hairColor} />
          <Circle cx={80} cy={46} r={14} fill={hairColor} />
          <Circle cx={160} cy={46} r={14} fill={hairColor} />
          <Circle cx={106} cy={14} r={13} fill={hairColor} />
          <Circle cx={134} cy={14} r={13} fill={hairColor} />
        </G>
      )}
      {hairStyle === "long" && (
        <G>
          <Circle cx={120} cy={40} r={35} fill={hairColor} />
          <Rect x={82} y={46} width={15} height={72} rx={7} fill={hairColor} />
          <Rect x={143} y={46} width={15} height={72} rx={7} fill={hairColor} />
        </G>
      )}
      {hairStyle === "ponytail" && (
        <G>
          {/* crown + a side ponytail gathered with a tie */}
          <Circle cx={120} cy={40} r={35} fill={hairColor} />
          <Path d="M150 40 Q180 66 172 126 Q168 152 156 148 Q166 104 146 54 Z" fill={hairColor} />
          <Circle cx={150} cy={46} r={5.5} fill={SHADE2} />
        </G>
      )}

      {/* ── HEAD ───────────────────────────────────────── */}
      {/* slightly oval face reads more grown-up than a plain circle */}
      <Ellipse cx={120} cy={50} rx={31} ry={34} fill={skin} />

      {/* ears: outer lobe + a soft inner curve so they read as ears */}
      <Ellipse cx={89} cy={53} rx={6} ry={9} fill={skin} />
      <Ellipse cx={151} cy={53} rx={6} ry={9} fill={skin} />
      <Path d="M88 48 Q92 53 88 58" stroke={SHADE2} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M152 48 Q148 53 152 58" stroke={SHADE2} strokeWidth={1.6} fill="none" strokeLinecap="round" />

      {/* face */}
      {/* eyebrows */}
      <Path d="M101 41 Q108 37.5 115 41" stroke="#2A2A2A" strokeWidth={female ? 2 : 2.6} fill="none" strokeLinecap="round" />
      <Path d="M125 41 Q132 37.5 139 41" stroke="#2A2A2A" strokeWidth={female ? 2 : 2.6} fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <Ellipse cx={102} cy={61} rx={5} ry={3.6} fill="#EF9A9A" opacity={0.36} />
      <Ellipse cx={138} cy={61} rx={5} ry={3.6} fill="#EF9A9A" opacity={0.36} />
      {/* eyes: upper lid line + iris + catchlight */}
      <Path d="M103.5 47.8 Q108 45.4 112.5 47.8" stroke="#2A2A2A" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Path d="M127.5 47.8 Q132 45.4 136.5 47.8" stroke="#2A2A2A" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Ellipse cx={108} cy={51.5} rx={4} ry={4.8} fill="#2A2A2A" />
      <Ellipse cx={132} cy={51.5} rx={4} ry={4.8} fill="#2A2A2A" />
      <Circle cx={109.6} cy={49.6} r={1.4} fill="#fff" />
      <Circle cx={133.6} cy={49.6} r={1.4} fill="#fff" />
      {/* nose: a soft rounded tip */}
      <Path d="M117.5 58 Q120 61.5 122.5 58" stroke={SHADE2} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {/* eyelashes (female) */}
      {female && (
        <G>
          <Path d="M103.6 47.4 L99.6 44.8" stroke="#2A2A2A" strokeWidth={1.4} strokeLinecap="round" />
          <Path d="M104.6 49.2 L101 47.4" stroke="#2A2A2A" strokeWidth={1.4} strokeLinecap="round" />
          <Path d="M136.4 47.4 L140.4 44.8" stroke="#2A2A2A" strokeWidth={1.4} strokeLinecap="round" />
          <Path d="M135.4 49.2 L139 47.4" stroke="#2A2A2A" strokeWidth={1.4} strokeLinecap="round" />
        </G>
      )}
      {/* mouth: fuller lips for female, a friendly smile for male */}
      {female ? (
        <G>
          <Path d="M112 65 Q116 62.5 120 64 Q124 62.5 128 65 Q124 70 120 70 Q116 70 112 65 Z" fill={LIP} />
          <Path d="M114.5 65.4 Q120 67 125.5 65.4" stroke="#9E4B5E" strokeWidth={1} fill="none" strokeLinecap="round" />
        </G>
      ) : (
        <Path d="M111 65 Q120 71.5 129 65" stroke="#2A2A2A" strokeWidth={3} fill="none" strokeLinecap="round" />
      )}
    </Svg>
  );
}
