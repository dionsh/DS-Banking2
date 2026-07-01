// Shared react-native-chart-kit theming for the DS Banking look, driven by the
// active theme palette so every chart works in light AND dark mode.

export const hexToRgba = (hex, opacity = 1) => {
  let h = (hex || "#191970").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Base config for LineChart / BarChart / PieChart on a card surface.
export const makeChartConfig = (colors) => ({
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  decimalPlaces: 0,
  color: (opacity = 1) => hexToRgba(colors.accent, opacity),
  labelColor: () => colors.textSecondary,
  propsForBackgroundLines: {
    stroke: colors.border,
    strokeDasharray: "4",
  },
  propsForDots: { r: "3" },
});

// Fixed, vivid palette for pie slices / category chips.
export const CATEGORY_COLORS = [
  "#5C6BC0", // indigo
  "#EF5350", // red
  "#66BB6A", // green
  "#FFA726", // orange
  "#26C6DA", // cyan
  "#AB47BC", // purple
  "#EC407A", // pink
  "#8D6E63", // brown
  "#78909C", // blue gray
  "#FFCA28", // amber
];
