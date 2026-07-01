# DS Banking 🏦

A polished **mobile banking app** built with **React Native (Expo)**, backed by a
**PHP + MySQL** API. DS Banking simulates a modern digital bank — accounts,
cards, transfers, savings, rewards, cashback, subscriptions and more — with a
clean, animated UI, light/dark themes and multi-language support.

> The production backend is hosted separately. This repo includes the full
> mobile app plus a **partial, reference-only** copy of the API under
> [`backend/`](backend/) (secrets and core logic omitted — see
> [`backend/README.md`](backend/README.md)).

---

## ✨ Features

- **Accounts & cards** — balance, card details, and a **Freeze / Unfreeze card**
  control (frozen cards reject payments).
- **Transfers, Top-Up & Transactions** — send money and view a full ledger.
- **Savings** — round-up savings **and** custom **Savings Goals** (progress
  bars, add from balance, goal completion, transfer back to balance).
- **Cashback Marketplace** — buy partner offers, earn cashback, and get a
  **ticket ID** for each purchase.
- **Subscriptions** — manage Netflix / Spotify / Gym / etc. (subscribe, cancel).
- **Rewards & mini-games** — Wordle rewards and a driving game that award points.
- **NOVA** — an in-app AI assistant scoped to banking questions.
- **ATM Locations** — an interactive Leaflet map of ATMs across several countries.
- **Extras** — Apple Wallet simulation, avatar / "My Character", Invite Friends
  QR, card personalization, mock identity verification (KYC), monthly statement
  PDF, and an in-app notification inbox.
- **Personalization** — light/dark theme, multi-language (EN / SQ / DE / FR),
  and a display-currency switcher.

## 🛠 Tech stack

- **App:** React Native `0.81`, Expo SDK `54`, React Navigation, react-native-svg,
  react-native-webview, expo-camera, expo-print.
- **Backend:** PHP (REST-style endpoints) + MySQL. (Hosted separately.)

---

## 🚀 Getting started

### Prerequisites

- **Node.js** 18+ and **npm**
- The **Expo Go** app on your phone (Android/iOS), or an Android emulator /
  iOS simulator
- Git

### Install & run

```bash
# 1. Clone the repo
git clone https://github.com/dionsh/DS-Banking2.git
cd DS-Banking2

# 2. Install dependencies
npm install

# 3. Start the Expo dev server
npx expo start
```

Then:

- **On a phone:** open **Expo Go** and scan the QR code shown in the terminal.
- **On an emulator:** press `a` (Android) or `i` (iOS) in the Expo CLI.

The app talks to the hosted API defined in
[`src/config.js`](src/config.js) (`API_BASE`), so it works out of the box
without running any backend locally.

> **Test login:** Dion Sherifi · PIN `2026`.

---

## 📁 Project structure

```
DS-Banking2/
├── App.js                 # App entry (providers: theme, language, currency)
├── src/
│   ├── screens/           # All app screens
│   ├── components/        # Reusable UI components
│   ├── navigation/        # Drawer / Tab / Stack navigators
│   ├── theme/             # Light/dark color system + ThemeContext
│   ├── i18n/              # Translations (EN/SQ/DE/FR) + LanguageContext
│   ├── currency/          # Display-currency context
│   ├── data/              # Static data (e.g. ATM locations)
│   ├── utils/             # Helpers (PDF/receipt HTML, logo)
│   └── config.js          # API_BASE
├── assets/                # Images, icons, fonts
└── backend/               # Partial reference copy of the PHP API (not runnable)
```

---

## 📦 Building an APK

This project runs in Expo Go during development. To produce an installable
Android build, use **EAS Build**:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # outputs an installable .apk
```

> If you build a standalone binary, add the **expo-camera** config plugin to
> `app.json` so the Identity Verification camera works outside Expo Go:
>
> ```json
> "plugins": [
>   ["expo-camera", { "cameraPermission": "Allow DS Banking to scan your ID." }]
> ]
> ```

---

## 📝 Notes

- **Do not commit secrets.** `.env`, certificates (`*.pem`), and the backend's
  `config.php` / database files are gitignored.
- The `backend/` folder is a **reference copy only** — the live API and its core
  logic are hosted privately.

---

_DS Banking is a student / portfolio project and is not a real financial service._
