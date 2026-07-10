// Builds an "Account Statement" HTML document for ALL of a user's transactions.
// It is shown in-app inside a WebView (primary use) and can also be exported to
// a PDF via expo-print. Styled like a real bank statement: "Account Statement"
// heading top-left, a DS Banking wordmark top-right, an account-info block, a
// small summary, and a Date / Description / Sum table.
//
// Text is intentionally in English (the rest of the app is translated; new
// content does not need translating).

import { DS_LOGO } from "./dsLogo";
import { formatDate } from "./datetime";

const ACCOUNT_CATEGORY = "KE-7 — LA"; // made-up account class shown on the statement

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => round2(n).toFixed(2) + " EUR";
const signed = (n) => (n >= 0 ? "+ " : "- ") + money(Math.abs(n));

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// A small DS Banking wordmark (a navy monogram badge + the brand name) so the
// statement carries the logo without bundling an image into the WebView.
const LOGO = `
  <div class="logo">
    <img class="logo-img" src="${DS_LOGO}" alt="DS Banking" />
    <div class="logo-name">DS&nbsp;Banking</div>
  </div>`;

export function buildStatementHtml({ user, transactions, currentBalance }) {
  const isUserSender = (tx) => tx.sender_name === user.name && tx.sender_surname === user.surname;
  const amountOf = (tx) => (isUserSender(tx) ? -1 : 1) * (parseFloat(tx.amount) || 0);

  const all = (transactions || [])
    .filter((tx) => !isNaN(new Date(tx.created_at).getTime()))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  let totalIn = 0;
  let totalOut = 0;
  const rows = all.map((tx) => {
    const amt = amountOf(tx);
    if (amt >= 0) totalIn += amt;
    else totalOut += -amt;
    const counterparty = isUserSender(tx)
      ? `${tx.receiver_name || ""} ${tx.receiver_surname || ""}`.trim()
      : `${tx.sender_name || ""} ${tx.sender_surname || ""}`.trim();
    return { date: formatDate(tx.created_at), name: counterparty || "—", desc: tx.description || "", amt };
  });

  const holder = `${user.name || ""} ${user.surname || ""}`.trim() || "—";
  const account = user.account_number || "—";
  const balance = parseFloat(currentBalance) || 0;
  const todayStr = formatDate(new Date());

  const rowsHtml = rows.length
    ? rows
        .map(
          (r) => `
        <tr>
          <td class="c-date">${esc(r.date)}</td>
          <td class="c-desc"><span class="nm">${esc(r.name)}</span>${
            r.desc ? `<span class="ds">${esc(r.desc)}</span>` : ""
          }</td>
          <td class="c-sum ${r.amt >= 0 ? "pos" : "neg"}">${signed(r.amt)}</td>
        </tr>`
        )
        .join("")
    : `<tr><td class="empty" colspan="3">No transactions to show.</td></tr>`;

  const info = (label, value) =>
    `<div class="info-item"><div class="lab">${esc(label)}</div><div class="val">${esc(value)}</div></div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: #eef1f5; color: #1f2937; font-family: Helvetica, Arial, sans-serif; font-size: 13px; }
  .sheet { max-width: 760px; margin: 0 auto; background: #fff; padding: 22px 20px 26px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .title h1 { margin: 0; font-size: 21px; color: #191970; letter-spacing: 0.2px; }
  .title .gen { font-size: 11px; color: #98a0ad; margin-top: 4px; }
  .logo { display: flex; align-items: center; gap: 8px; }
  .logo-img { width: 40px; height: 40px; object-fit: contain; }
  .logo-name { font-size: 16px; font-weight: 800; color: #191970; }
  .rule { height: 2px; background: #191970; margin: 14px 0 16px; border-radius: 2px; }
  .info { display: flex; flex-wrap: wrap; gap: 14px 28px; }
  .info-item { min-width: 130px; }
  .info .lab { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #98a0ad; }
  .info .val { font-size: 14px; font-weight: 700; color: #1f2937; margin-top: 2px; }
  .summary { display: flex; gap: 10px; margin: 18px 0 6px; }
  .card { flex: 1; border: 1px solid #e6e9ef; border-radius: 11px; padding: 11px 12px; }
  .card .lab { font-size: 9px; letter-spacing: 0.6px; text-transform: uppercase; color: #98a0ad; }
  .card .amt { font-size: 15px; font-weight: 800; margin-top: 4px; color: #191970; }
  .card.in .amt { color: #1f8a4c; }
  .card.out .amt { color: #c0392b; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  thead th { background: #191970; color: #fff; font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; padding: 10px 10px; text-align: left; }
  thead th.r { text-align: right; }
  tbody td { padding: 11px 10px; border-bottom: 1px solid #eef0f3; vertical-align: top; }
  tbody tr:nth-child(even) { background: #f8f9fb; }
  .c-date { color: #6b7280; white-space: nowrap; width: 74px; }
  .c-desc .nm { display: block; font-weight: 700; color: #1f2937; }
  .c-desc .ds { display: block; color: #8a93a0; font-size: 11px; margin-top: 2px; }
  .c-sum { text-align: right; white-space: nowrap; font-weight: 700; }
  .c-sum.pos { color: #1f8a4c; }
  .c-sum.neg { color: #c0392b; }
  td.empty { text-align: center; color: #98a0ad; font-style: italic; padding: 28px; }
  .footer { margin-top: 22px; border-top: 1px solid #e6e9ef; padding-top: 12px; font-size: 10px; color: #aab1bd; line-height: 1.5; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="title">
        <h1>Account Statement</h1>
        <div class="gen">Generated on ${esc(todayStr)}</div>
      </div>
      ${LOGO}
    </div>
    <div class="rule"></div>

    <div class="info">
      ${info("Account Holder", holder)}
      ${info("Account Number", account)}
      ${info("Currency", "EUR")}
      ${info("Category", ACCOUNT_CATEGORY)}
    </div>

    <div class="summary">
      <div class="card in"><div class="lab">Money In</div><div class="amt">+ ${money(totalIn)}</div></div>
      <div class="card out"><div class="lab">Money Out</div><div class="amt">- ${money(totalOut)}</div></div>
      <div class="card"><div class="lab">Balance</div><div class="amt">${money(balance)}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th class="r">Sum</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="footer">
      This statement is generated by DS Banking for informational purposes and lists all recorded
      transactions for this account. Amounts are shown in EUR.
    </div>
  </div>
</body>
</html>`;
}
