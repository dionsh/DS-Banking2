// App-wide language provider (i18n).
//
// Mirrors ThemeContext: holds the current language, persists the choice to
// AsyncStorage so it survives restarts, and exposes a `t(key, params)`
// translator plus `language` / `setLanguage`.
//
// Dependency-free on purpose (no i18n library) to respect the project's
// "no new dependencies" rule.
//
// Usage in a screen:
//   const { t, language, setLanguage } = useLanguage();
//   <Text>{t("settings.title")}</Text>
//   <Text>{t("card.greeting", { name })}</Text>

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, LANGUAGES } from "./translations";

const STORAGE_KEY = "app_language";
const DEFAULT_LANG = "en";

const SUPPORTED = LANGUAGES.map((l) => l.code);

function translate(language, key, params) {
  const dict = translations[language] || translations[DEFAULT_LANG];
  let str = dict[key];
  if (str === undefined) {
    // fall back to English, then to the raw key so nothing renders blank
    str = translations[DEFAULT_LANG][key];
    if (str === undefined) return key;
  }
  if (params) {
    for (const p in params) {
      str = str.split(`{${p}}`).join(String(params[p]));
    }
  }
  return str;
}

const LanguageContext = createContext({
  language: DEFAULT_LANG,
  languages: LANGUAGES,
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANG);

  // Load the saved language once on startup.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && SUPPORTED.includes(saved)) {
          setLanguageState(saved);
        }
      } catch (err) {
        console.log("Language load error:", err);
      }
    })();
  }, []);

  const setLanguage = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch((err) =>
      console.log("Language save error:", err)
    );
  }, []);

  // `t` changes identity when the language changes so consumers re-render.
  const t = useCallback(
    (key, params) => translate(language, key, params),
    [language]
  );

  const value = useMemo(
    () => ({ language, languages: LANGUAGES, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
