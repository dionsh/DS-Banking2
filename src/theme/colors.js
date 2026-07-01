// Central color palettes for the light and dark themes.
//
// The light palette is mapped 1:1 to the colors that were previously hardcoded
// across the screens (midnightBlue #191970, mistGray #ECEFF1, the various grays,
// etc.) so that light mode looks exactly the same as before the theme refactor.
//
// Naming convention used throughout the app:
//   primary      -> brand color used as a FILLED background (headers, primary
//                   buttons) where the text/icon on top is white (onPrimary).
//   accent       -> brand color used as TEXT / ICON / BORDER on top of cards and
//                   surfaces. In light mode it equals primary; in dark mode it is
//                   lightened so it stays readable on dark cards.
//   background   -> the screen background.
//   card         -> raised white cards.
//   surfaceAlt   -> secondary surfaces: inputs/icon boxes/chips/secondary buttons.
//   text / textSecondary / textMuted -> text hierarchy.
//   border / inputBg / inputBorder   -> outlines and input fields.

export const lightColors = {
  mode: "light",

  primary: "#191970", // Midnight Blue
  onPrimary: "#FFFFFF",
  accent: "#191970",

  background: "#ECEFF1", // Mist Gray
  pageAlt: "#FFFFFF",    // page bg for screens that put surfaceAlt boxes/buttons
                         // directly on the page (e.g. Home icon grid) so they
                         // stay visible — in light mode this is white, while
                         // surfaceAlt stays mist gray.
  card: "#FFFFFF",
  surfaceAlt: "#ECEFF1",

  text: "#111111",
  textSecondary: "#555555",
  textMuted: "#888888",

  border: "#E4E7EC",
  divider: "#DDDDDD",

  inputBg: "#FAFBFD",
  inputBorder: "#E4E7EC",
  placeholder: "#A0AEC0",

  success: "#2E7D32",
  successSoft: "#6AAA64",
  danger: "#FF3B30",
  dangerText: "#B00020",
  warning: "#C9B458",

  // Navigation specifics
  drawerActiveBg: "#DDE3E8",
  drawerInactive: "#7A7A7A",
  tabInactive: "#7A7A7A",

  shadow: "#000000",
  statusBar: "light", // header is always midnight blue -> light content
};

export const darkColors = {
  mode: "dark",

  primary: "#191970", // keep the brand color on headers/buttons (white text reads on it)
  onPrimary: "#FFFFFF",
  accent: "#8E95F2", // lightened indigo so brand text/icons read on dark cards

  background: "#0F1020",
  pageAlt: "#0F1020", // same as background in dark mode (cards/boxes already
                      // sit a step lighter, so they stay visible)
  card: "#1B1D31",
  surfaceAlt: "#262A45",

  text: "#F2F3F7",
  textSecondary: "#AEB2CC",
  textMuted: "#7E83A0",

  border: "#2E3250",
  divider: "#2E3250",

  inputBg: "#20233B",
  inputBorder: "#343A5C",
  placeholder: "#6B7090",

  success: "#4CAF50",
  successSoft: "#6FBF73",
  danger: "#FF6B6B",
  dangerText: "#FF6B6B",
  warning: "#D4BE6A",

  // Navigation specifics
  drawerActiveBg: "#262A45",
  drawerInactive: "#9AA0B5",
  tabInactive: "#9AA0B5",

  shadow: "#000000",
  statusBar: "light",
};

export const palettes = { light: lightColors, dark: darkColors };
