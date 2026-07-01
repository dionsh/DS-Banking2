// Mock DS Banking ATM locations shown on the ATM Locations screen.
//
// These are demo coordinates only — they are placed around real city centres
// and notable streets so the map feels believable, but no real ATM exists at
// any of these points. All ATMs share the same "Available 24/7" availability.
//
// Shape of an ATM entry:
//   { id, name, city, country, address, lat, lng }

export const ATM_LOCATIONS = [
  // ── Kosovo · Ferizaj (3) ───────────────────────────────────────────────
  {
    id: "fer-1",
    name: "DS Banking ATM - Ferizaj Center",
    city: "Ferizaj",
    country: "Kosovo",
    address: "Rr. Dëshmorët e Kombit, Ferizaj",
    lat: 42.3704,
    lng: 21.1553,
  },
  {
    id: "fer-2",
    name: "DS Banking ATM - Ferizaj North",
    city: "Ferizaj",
    country: "Kosovo",
    address: "Rr. Rexhep Bislimi, Ferizaj",
    lat: 42.3768,
    lng: 21.1492,
  },
  {
    id: "fer-3",
    name: "DS Banking ATM - Ferizaj Station",
    city: "Ferizaj",
    country: "Kosovo",
    address: "Te Stacioni i Trenit, Ferizaj",
    lat: 42.3651,
    lng: 21.1619,
  },

  // ── Kosovo · Prishtina (2) ─────────────────────────────────────────────
  {
    id: "pri-1",
    name: "DS Banking ATM - Prishtina Center",
    city: "Prishtina",
    country: "Kosovo",
    address: "Sheshi Skënderbeu, Prishtinë",
    lat: 42.6629,
    lng: 21.1655,
  },
  {
    id: "pri-2",
    name: "DS Banking ATM - Mother Teresa Blvd",
    city: "Prishtina",
    country: "Kosovo",
    address: "Bulevardi Nënë Tereza, Prishtinë",
    lat: 42.6585,
    lng: 21.1608,
  },

  // ── Kosovo · Prizren (1) ───────────────────────────────────────────────
  {
    id: "prz-1",
    name: "DS Banking ATM - Prizren Center",
    city: "Prizren",
    country: "Kosovo",
    address: "Te Shadërvani, Prizren",
    lat: 42.2139,
    lng: 20.7397,
  },

  // ── Kosovo · Gjilan (1) ────────────────────────────────────────────────
  {
    id: "gji-1",
    name: "DS Banking ATM - Gjilan Center",
    city: "Gjilan",
    country: "Kosovo",
    address: "Rr. Idriz Seferi, Gjilan",
    lat: 42.4637,
    lng: 21.4694,
  },

  // ── Germany (2) ────────────────────────────────────────────────────────
  {
    id: "de-1",
    name: "DS Banking ATM - Berlin Alexanderplatz",
    city: "Berlin",
    country: "Germany",
    address: "Alexanderplatz, 10178 Berlin",
    lat: 52.5219,
    lng: 13.4132,
  },
  {
    id: "de-2",
    name: "DS Banking ATM - München Marienplatz",
    city: "Munich",
    country: "Germany",
    address: "Marienplatz, 80331 München",
    lat: 48.1374,
    lng: 11.5755,
  },

  // ── Switzerland (2) ────────────────────────────────────────────────────
  {
    id: "ch-1",
    name: "DS Banking ATM - Zürich Bahnhofstrasse",
    city: "Zürich",
    country: "Switzerland",
    address: "Bahnhofstrasse, 8001 Zürich",
    lat: 47.3705,
    lng: 8.5404,
  },
  {
    id: "ch-2",
    name: "DS Banking ATM - Genève Rue du Rhône",
    city: "Geneva",
    country: "Switzerland",
    address: "Rue du Rhône, 1204 Genève",
    lat: 46.2011,
    lng: 6.1459,
  },

  // ── France (1) ─────────────────────────────────────────────────────────
  {
    id: "fr-1",
    name: "DS Banking ATM - Paris Champs-Élysées",
    city: "Paris",
    country: "France",
    address: "Av. des Champs-Élysées, 75008 Paris",
    lat: 48.8698,
    lng: 2.3078,
  },

  // ── United States (2) ──────────────────────────────────────────────────
  {
    id: "us-1",
    name: "DS Banking ATM - Washington Downtown",
    city: "Washington",
    country: "United States",
    address: "Pennsylvania Ave NW, Washington, DC 20004",
    lat: 38.8951,
    lng: -77.0290,
  },
  {
    id: "us-2",
    name: "DS Banking ATM - Houston Downtown",
    city: "Houston",
    country: "United States",
    address: "Main St, Houston, TX 77002",
    lat: 29.7589,
    lng: -95.3677,
  },
];

// Quick-jump regions for the chips above the map. Because the ATMs span three
// countries, these let the user hop between areas without long panning.
// `center`/`zoom` are tuned so every ATM in the region fits comfortably.
export const ATM_REGIONS = [
  { id: "kosovo", label: "Kosovo", center: { lat: 42.46, lng: 21.1 }, zoom: 9 },
  { id: "germany", label: "Germany", center: { lat: 50.35, lng: 12.5 }, zoom: 6 },
  { id: "switzerland", label: "Switzerland", center: { lat: 46.82, lng: 7.45 }, zoom: 8 },
  { id: "france", label: "France", center: { lat: 48.8698, lng: 2.3078 }, zoom: 12 },
  { id: "usa", label: "USA", center: { lat: 34.3, lng: -86.2 }, zoom: 4 },
];

// The view the map opens on — centred on Kosovo, where most ATMs are.
export const ATM_INITIAL_VIEW = {
  center: { lat: 42.5, lng: 21.12 },
  zoom: 9,
};

export const ATM_COUNT = ATM_LOCATIONS.length;
