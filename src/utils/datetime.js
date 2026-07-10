// datetime.js — render backend timestamps in Kosovo local time (Europe/Pristina)
// on ANY device.
//
// Why not just `new Date(str).toLocaleTimeString(...)`?
//   - `new Date("YYYY-MM-DD HH:MM:SS")` (space-separated, no timezone) is parsed
//     as *device-local* time on Hermes, so the displayed clock depends on the
//     phone's timezone.
//   - `Intl`/`toLocaleString({ timeZone })` is unreliable on Hermes/Android.
//
// The PHP backend runs its DB session in Europe/Pristina (see config.php), so
// timestamps come back as "YYYY-MM-DD HH:MM:SS" ALREADY in Kosovo time. We read
// the parts directly instead of parsing through Date, so the render is identical
// on every device. A few optimistic/client values are ISO strings with a "Z"
// (real UTC instants); those we convert to Kosovo using the EU daylight-saving
// rule (CET in winter, CEST in summer).

const PAD = (n) => (n < 10 ? "0" + n : "" + n);

// Last Sunday of a month (month is 0-based), returned as a UTC Date at 00:00.
function lastSundayUTC(year, month) {
  const d = new Date(Date.UTC(year, month + 1, 0)); // last day of the month
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());      // step back to Sunday
  return d;
}

// Kosovo's UTC offset in minutes for a given UTC instant: 120 in summer (CEST),
// 60 in winter (CET). EU DST switches at 01:00 UTC on the last Sunday of March
// and the last Sunday of October.
function kosovoOffsetMinutes(utcDate) {
  const y = utcDate.getUTCFullYear();
  const start = lastSundayUTC(y, 2);
  start.setUTCHours(1, 0, 0, 0); // last Sunday of March, 01:00 UTC
  const end = lastSundayUTC(y, 9);
  end.setUTCHours(1, 0, 0, 0); // last Sunday of October, 01:00 UTC
  return utcDate >= start && utcDate < end ? 120 : 60;
}

// Normalise any supported input into Kosovo-local calendar parts, or null.
function kosovoParts(input) {
  if (input == null) return null;

  // A real Date instance -> a true instant -> convert to Kosovo.
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return fromInstant(input.getTime());
  }

  const s = String(input).trim();
  if (!s) return null;

  // ISO string carrying an explicit timezone (Z or ±hh:mm) -> real instant.
  if (/(z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const t = Date.parse(s);
    return isNaN(t) ? null : fromInstant(t);
  }

  // "YYYY-MM-DD HH:MM(:SS)" or "...THH:MM" with NO timezone -> already Kosovo.
  const dt = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (dt) return { y: +dt[1], mo: +dt[2], d: +dt[3], h: +dt[4], mi: +dt[5] };

  // Date only.
  const dOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dOnly) return { y: +dOnly[1], mo: +dOnly[2], d: +dOnly[3], h: 0, mi: 0 };

  return null;
}

// Convert a UTC epoch (ms) to Kosovo calendar parts.
function fromInstant(ms) {
  const utc = new Date(ms);
  const shifted = new Date(ms + kosovoOffsetMinutes(utc) * 60000);
  return {
    y: shifted.getUTCFullYear(),
    mo: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    h: shifted.getUTCHours(),
    mi: shifted.getUTCMinutes(),
  };
}

// "10.07.2026"
export function formatDate(input) {
  const p = kosovoParts(input);
  if (!p) return input == null ? "" : String(input);
  return `${PAD(p.d)}.${PAD(p.mo)}.${p.y}`;
}

// "23:38"
export function formatTime(input) {
  const p = kosovoParts(input);
  if (!p) return "";
  return `${PAD(p.h)}:${PAD(p.mi)}`;
}

// "10.07.2026 23:38"
export function formatDateTime(input) {
  const p = kosovoParts(input);
  if (!p) return input == null ? "" : String(input);
  return `${PAD(p.d)}.${PAD(p.mo)}.${p.y} ${PAD(p.h)}:${PAD(p.mi)}`;
}

// Time if the timestamp is on today's (Kosovo) date, otherwise "DD.MM HH:MM".
export function formatRelative(input) {
  const p = kosovoParts(input);
  if (!p) return input == null ? "" : String(input);
  const today = kosovoParts(new Date());
  const sameDay = today && p.y === today.y && p.mo === today.mo && p.d === today.d;
  return sameDay
    ? `${PAD(p.h)}:${PAD(p.mi)}`
    : `${PAD(p.d)}.${PAD(p.mo)} ${PAD(p.h)}:${PAD(p.mi)}`;
}

// A Kosovo-local "YYYY-MM-DD HH:MM:SS" stamp for optimistic rows (so a just-made
// item's date matches what the server will return on the next refresh).
export function nowStamp() {
  const p = fromInstant(Date.now());
  const s = "00";
  return `${p.y}-${PAD(p.mo)}-${PAD(p.d)} ${PAD(p.h)}:${PAD(p.mi)}:${s}`;
}
