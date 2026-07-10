// avatarThemes.js — the curated set of profile avatar "themes".
//
// Each theme is a clean two-stop gradient in a professional, banking-style
// palette. The avatar itself (ProfileAvatar) draws the gradient and overlays
// the user's initial, so the "theme" is simply which colourway is used.
// Persisted per user in AsyncStorage ("profile_avatar_theme").

export const AVATAR_THEMES = [
  { id: "midnight", name: "Midnight", colors: ["#1E2A78", "#3B4FC4"] },
  { id: "ocean", name: "Ocean", colors: ["#0EA5E9", "#2563EB"] },
  { id: "teal", name: "Teal", colors: ["#0D9488", "#22C7B8"] },
  { id: "emerald", name: "Emerald", colors: ["#047857", "#34D399"] },
  { id: "violet", name: "Violet", colors: ["#6D28D9", "#A855F7"] },
  { id: "sunset", name: "Sunset", colors: ["#F97316", "#FB7185"] },
  { id: "gold", name: "Gold", colors: ["#B45309", "#F5B301"] },
  { id: "crimson", name: "Crimson", colors: ["#BE123C", "#FB5D74"] },
  { id: "slate", name: "Slate", colors: ["#334155", "#64748B"] },
  { id: "rose", name: "Rose", colors: ["#DB2777", "#F472B6"] },
];

export const DEFAULT_AVATAR_THEME = "midnight";

export const AVATAR_THEME_KEY = "profile_avatar_theme";

export const getAvatarTheme = (id) =>
  AVATAR_THEMES.find((t) => t.id === id) || AVATAR_THEMES[0];

// First letter of a name, upper-cased, for the avatar monogram.
export const initialOf = (name) => {
  const s = String(name || "").trim();
  return s ? s[0].toUpperCase() : "U";
};
