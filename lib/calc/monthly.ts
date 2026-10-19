import type { TripRecord } from '../../types/trip';

export type MonthSummary = {
  trips: TripRecord[]; // newest first
  total: number;
  km: number;
  count: number;
  deltaPct: number | null; // vs the previous month, null when that month is 0
  projection: number | null; // end-of-month estimate, rounded to 10; current month from day 7 only
};

// Old records may lack `timestamp`; their id was Date.now().
export const tripTime = (t: TripRecord): number => t.timestamp || Number(t.id);

// year * 12 + month (0-based), so the previous month is always key - 1, even across years.
export const monthKey = (ts: number): number => {
  const d = new Date(ts);
  return d.getFullYear() * 12 + d.getMonth();
};

const sumCost = (trips: TripRecord[]) => trips.reduce((s, t) => s + t.totalCost, 0);
const inMonth = (trips: TripRecord[], key: number) => trips.filter((t) => monthKey(tripTime(t)) === key);

export function monthSummary(trips: TripRecord[], key: number, now: number): MonthSummary {
  const cur = inMonth(trips, key).sort((a, b) => tripTime(b) - tripTime(a));
  const total = sumCost(cur);
  const prev = sumCost(inMonth(trips, key - 1));
  const n = new Date(now);
  const day = n.getDate();
  const daysInMonth = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  const isCurrent = key === monthKey(now);
  return {
    trips: cur,
    total,
    km: cur.reduce((s, t) => s + t.distance, 0),
    count: cur.length,
    deltaPct: prev > 0 ? ((total - prev) / prev) * 100 : null,
    projection: isCurrent && day >= 7 ? Math.round(((total / day) * daysInMonth) / 10) * 10 : null,
  };
}

// Oldest first, ending at the month of `now`.
export function lastMonths(trips: TripRecord[], now: number, n = 6): { key: number; total: number }[] {
  const end = monthKey(now);
  return Array.from({ length: n }, (_, i) => {
    const key = end - (n - 1 - i);
    return { key, total: sumCost(inMonth(trips, key)) };
  });
}

const pad = (x: number) => String(x).padStart(2, '0');

// "היום · 10:01" / "אתמול · 08:40" / "12.10 · 18:22"
export function dayLabel(ts: number, now: number): string {
  const d = new Date(ts);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date(now)) - startOf(d)) / 86_400_000);
  if (days === 0) return `היום · ${time}`;
  if (days === 1) return `אתמול · ${time}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} · ${time}`;
}
