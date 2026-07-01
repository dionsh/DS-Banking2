// App-wide display currency, mirroring the Theme/Language context pattern.
//
// IMPORTANT: this is a DISPLAY-ONLY conversion. The real balance in the database
// (and every transaction) is always stored in EUR — this context only changes how
// the balance is shown on screen, using mock/static exchange rates (no API). That
// means switching currency never touches transaction history and never breaks the
// transfer / top-up math, which keep working in EUR.
//
// The chosen currency is persisted in AsyncStorage ("app_currency") so it survives
// app restarts and the on-focus balance refresh that screens perform.

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock, static exchange rates relative to EUR. 1 EUR = rate units of the currency.
export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro", rate: 1 },
  { code: "USD", symbol: "$", label: "US Dollar", rate: 1.17 },
  { code: "GBP", symbol: "£", label: "British Pound", rate: 0.86 },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc", rate: 0.94 },
];

const STORAGE_KEY = "app_currency";

export const currencyByCode = (code) =>
  CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];

// Format an EUR amount in a given currency: "€200.00", "$234.00", "CHF 188.00".
export const formatIn = (eur, code) => {
  const cur = currencyByCode(code);
  const num = ((Number(eur) || 0) * cur.rate).toFixed(2);
  // Word-style symbols (e.g. CHF) read better with a trailing space.
  return cur.symbol.length > 1 ? `${cur.symbol} ${num}` : `${cur.symbol}${num}`;
};

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [code, setCode] = useState("EUR");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && CURRENCIES.some((c) => c.code === saved)) setCode(saved);
      } catch (e) {
        // ignore — fall back to EUR
      }
    })();
  }, []);

  const setCurrency = async (next) => {
    setCode(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // ignore persistence errors
    }
  };

  const value = useMemo(() => {
    const cur = currencyByCode(code);
    return {
      currency: cur, // { code, symbol, label, rate }
      code: cur.code,
      symbol: cur.symbol,
      currencies: CURRENCIES,
      setCurrency,
      // Convert an EUR (DB base) amount to the active display currency.
      convert: (eur) => (Number(eur) || 0) * cur.rate,
      // Format an EUR (DB base) amount in the active display currency.
      format: (eur) => formatIn(eur, cur.code),
    };
  }, [code]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}
