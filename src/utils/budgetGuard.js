// budgetGuard.js
//
// Shared "are you sure you want to go over budget?" pre-check used by every
// spending screen (Top-Ups, Transfers, Cashback, Subscriptions, Round It Up,
// Split Bill).
//
// Before a purchase is committed, the screen calls confirmOverBudget(). It asks
// the backend (check_budget.php) whether the amount about to be spent would push
// the user OVER the monthly budget they set for that category in the Budget
// Planner. If it would, it shows a Yes/No alert and lets the user decide — the
// point is never to block a payment, only to make going over budget a conscious
// choice (they might genuinely need it).
//
// Returns a Promise<boolean>:
//   true  -> proceed with the transaction
//   false -> the user chose NOT to go over budget (cancel the transaction)
//
// Fails OPEN on purpose: if there is no budget for the category, the amount is
// within budget, or anything goes wrong (network / parse / timeout), it resolves
// true so a genuine purchase is never blocked by this convenience check.

import { Alert } from "react-native";
import { API_BASE } from "../config";
import { formatIn, getActiveCurrencyCode } from "../currency/CurrencyContext";

// Amounts here are EUR (the DB currency) — show them in the user's chosen
// display currency, like every other monetary value in the app.
const eur = (n) => formatIn(Number(n) || 0, getActiveCurrencyCode());

// Maps a cashback partner's raw category to the budget/analytics category.
// Mirrors analyticsPartnerCategoryLabel() in analytics_db.php so the pre-check
// hits the same budget the real purchase will be classified under.
const PARTNER_BUDGET_CATEGORY = {
  Restaurant: "Restaurants",
  Hotel: "Hotels",
  Festival: "Entertainment",
  Electronics: "Electronics",
  Clothing: "Clothing",
  Gym: "Health & Fitness",
};

export function partnerBudgetCategory(rawCategory) {
  return PARTNER_BUDGET_CATEGORY[rawCategory] || "Shopping";
}

export async function confirmOverBudget({ userId, category, amount }) {
  const amt = Number(amount);
  if (!userId || !category || !(amt > 0)) return true;

  let info = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${API_BASE}/check_budget.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, category, amount: amt }),
      signal: controller.signal,
    });
    info = await res.json();
  } catch (e) {
    return true; // never block a real purchase on a check failure
  } finally {
    clearTimeout(timer);
  }

  if (!info || info.status !== "success" || !info.over) return true;

  const remainingLeft = Number(info.remaining) > 0 ? Number(info.remaining) : 0;
  const label = info.label || category;

  return new Promise((resolve) => {
    Alert.alert(
      "Over budget?",
      `You set a ${eur(info.limit)} monthly budget for ${label} and only ${eur(remainingLeft)} is left. ` +
        `This ${eur(amt)} payment goes ${eur(info.overspend)} over it.\n\n` +
        `Do you want to continue anyway?`,
      [
        { text: "No, keep it", style: "cancel", onPress: () => resolve(false) },
        { text: "Yes, go over", style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
