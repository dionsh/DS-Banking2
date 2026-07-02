// Static destination data for the Travel screen.
//
// The banking details (partner counts, fees, limits) are realistic but
// fictional — DS Banking is a demo bank. Fees are intentionally low and the
// same worldwide so the screen stays believable and consistent:
//   card payments abroad 1.25% · ATM withdrawals abroad 1.75%

export const TRAVEL_FEES = {
  cardPaymentPct: 1.25,
  atmWithdrawalPct: 1.75,
  atmFreeMonthly: 200, // EUR withdrawn fee-free per month with partner ATMs
};

export const TRAVEL_DESTINATIONS = [
  {
    code: "CH",
    name: "Switzerland",
    flag: "🇨🇭",
    currency: { code: "CHF", name: "Swiss Franc", rate: "1 EUR ≈ 0.94 CHF" },
    atmPartners: 2,
    atmPartnerNames: ["SwissCash 24", "AlpenATM"],
    tips: [
      "Always choose to pay in CHF, not EUR — dynamic currency conversion at the terminal costs more.",
      "Cards are accepted almost everywhere, but small mountain huts may be cash-only.",
      "Swiss ATMs often ask for a receipt choice first — that's normal, your card isn't blocked.",
    ],
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    currency: { code: "EUR", name: "Euro", rate: "Same currency — no conversion" },
    atmPartners: 4,
    atmPartnerNames: ["CashGroup", "EuroNet DE"],
    tips: [
      "Germany still loves cash — many bakeries and kiosks don't take cards, keep €20-30 with you.",
      "You pay in EUR, so there is no currency conversion at all.",
      "Deutsche Bahn ticket machines accept contactless — just tap your DS Banking card.",
    ],
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    currency: { code: "EUR", name: "Euro", rate: "Same currency — no conversion" },
    atmPartners: 3,
    atmPartnerNames: ["BanquePoint", "EuroNet FR"],
    tips: [
      "Contactless is accepted virtually everywhere, including the Paris Métro.",
      "You pay in EUR, so there is no currency conversion at all.",
      "Some autoroute toll lanes are card-only — look for the blue 'CB' sign.",
    ],
  },
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
    currency: { code: "EUR", name: "Euro", rate: "Same currency — no conversion" },
    atmPartners: 3,
    atmPartnerNames: ["BancomatNet", "EuroNet IT"],
    tips: [
      "'Bancomat' is what locals call ATMs — our partner machines skip the extra operator fee.",
      "You pay in EUR, so there is no currency conversion at all.",
      "Small trattorias sometimes have a €10 card minimum — a little cash helps.",
    ],
  },
  {
    code: "ES",
    name: "Spain",
    flag: "🇪🇸",
    currency: { code: "EUR", name: "Euro", rate: "Same currency — no conversion" },
    atmPartners: 3,
    atmPartnerNames: ["CajaExpress", "EuroNet ES"],
    tips: [
      "Decline the ATM's own conversion offer — it's always worse than your card rate.",
      "You pay in EUR, so there is no currency conversion at all.",
      "Beach kiosks and chiringuitos increasingly take contactless, but carry a few euros in cash.",
    ],
  },
  {
    code: "AT",
    name: "Austria",
    flag: "🇦🇹",
    currency: { code: "EUR", name: "Euro", rate: "Same currency — no conversion" },
    atmPartners: 2,
    atmPartnerNames: ["AlpenATM", "BankomatPlus"],
    tips: [
      "Ski resorts are nearly cash-free — your card covers lifts, rentals and huts.",
      "You pay in EUR, so there is no currency conversion at all.",
      "Vienna's public transport machines accept contactless payments directly.",
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: { code: "GBP", name: "British Pound", rate: "1 EUR ≈ 0.86 GBP" },
    atmPartners: 3,
    atmPartnerNames: ["LINK Network", "CityCash UK"],
    tips: [
      "Tap in and out of the London Underground with your DS Banking card — no ticket needed.",
      "Always choose to pay in GBP when the terminal offers a currency choice.",
      "The UK is largely cashless — many cafés no longer accept cash at all.",
    ],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    currency: { code: "USD", name: "US Dollar", rate: "1 EUR ≈ 1.17 USD" },
    atmPartners: 2,
    atmPartnerNames: ["Allpoint", "MoneyPass"],
    tips: [
      "US ATMs may add their own operator fee on top — our partner networks don't.",
      "Card terminals sometimes ask for a ZIP code — for foreign cards, 00000 usually works.",
      "Tipping 15-20% is expected in restaurants and can be added on the card receipt.",
    ],
  },
  {
    code: "TR",
    name: "Turkey",
    flag: "🇹🇷",
    currency: { code: "TRY", name: "Turkish Lira", rate: "1 EUR ≈ 47 TRY" },
    atmPartners: 2,
    atmPartnerNames: ["TurkCash", "EuroNet TR"],
    tips: [
      "Always pay in TRY — hotel terminals love to offer EUR at a poor rate.",
      "Bazaars are mostly cash — withdraw lira from a partner ATM before you go haggling.",
      "Keep small notes for taxis and dolmuş minibuses.",
    ],
  },
  {
    code: "GR",
    name: "Greece",
    flag: "🇬🇷",
    currency: { code: "EUR", name: "Euro", rate: "Same currency — no conversion" },
    atmPartners: 2,
    atmPartnerNames: ["HellasATM", "EuroNet GR"],
    tips: [
      "You pay in EUR, so there is no currency conversion at all.",
      "On smaller islands, tavernas may prefer cash — ferries and hotels all take cards.",
      "Withdraw before island-hopping: remote islands can have a single ATM in high demand.",
    ],
  },
  {
    code: "HR",
    name: "Croatia",
    flag: "🇭🇷",
    currency: { code: "EUR", name: "Euro", rate: "Same currency — no conversion" },
    atmPartners: 2,
    atmPartnerNames: ["JadranCash", "EuroNet HR"],
    tips: [
      "Croatia uses the euro since 2023 — no conversion needed.",
      "Beach bars along the coast take contactless, but small konobas may be cash-only.",
      "Skip the souvenir-shop ATMs with high fees — use our partner machines in bank branches.",
    ],
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    currency: { code: "EUR", name: "Euro", rate: "Same currency — no conversion" },
    atmPartners: 3,
    atmPartnerNames: ["Geldmaat", "EuroNet NL"],
    tips: [
      "Watch out: many Dutch supermarkets accept debit cards only — your DS Banking card qualifies.",
      "You pay in EUR, so there is no currency conversion at all.",
      "OV-chipkaart machines and trams accept contactless payments directly.",
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    currency: { code: "AED", name: "UAE Dirham", rate: "1 EUR ≈ 4.30 AED" },
    atmPartners: 2,
    atmPartnerNames: ["EmiratesCash", "GulfATM"],
    tips: [
      "Always choose AED at the terminal — hotels often suggest EUR at a marked-up rate.",
      "Cards are accepted everywhere from malls to taxis; cash is rarely needed.",
      "Friday-Saturday is the weekend — bank branches close, but ATMs run 24/7.",
    ],
  },
  {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    currency: { code: "JPY", name: "Japanese Yen", rate: "1 EUR ≈ 170 JPY" },
    atmPartners: 2,
    atmPartnerNames: ["7-Bank", "JapanPost ATM"],
    tips: [
      "Japan is more cash-based than you'd expect — 7-Eleven ATMs accept foreign cards 24/7.",
      "IC transport cards (Suica/Pasmo) can be topped up with cash from a partner ATM.",
      "Smaller ramen shops and shrines are often cash-only; department stores all take cards.",
    ],
  },
];
