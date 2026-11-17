// Pure date logic: grouping, ranges and wall-clock rendering in the company
// zone. No date library and no ambient clock: every function that needs "now"
// takes it as an argument, so the tests are deterministic.
import type { DatedEntry } from "./entries";

export type YMD = string; // YYYY-MM-DD
export type ViewMode = "week" | "month" | "agenda";
export type Locale = "en" | "zh-TW";

export const AGENDA_DAYS = 14;
const DAY_MS = 86_400_000;

const utc = (date: YMD): number => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number): YMD => new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: YMD, days: number): YMD => fromUtc(utc(date) + days * DAY_MS);
/** Monday = 0 … Sunday = 6. */
export const weekdayIndex = (date: YMD): number => (new Date(utc(date)).getUTCDay() + 6) % 7;
export const startOfWeek = (date: YMD): YMD => addDays(date, -weekdayIndex(date));
export const firstOfMonth = (date: YMD): YMD => `${date.slice(0, 7)}-01`;
export const lastOfMonth = (date: YMD): YMD => addDays(fromUtc(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 1)), -1);

/** Move by whole months, keeping the day where the month has it and clamping otherwise. */
export function addMonths(date: YMD, months: number): YMD {
  const index = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + months;
  const first = `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}-01`;
  const day = Math.min(Number(date.slice(8, 10)), Number(lastOfMonth(first).slice(8, 10)));
  return `${first.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

export const eachDay = (from: YMD, count: number): YMD[] => Array.from({ length: count }, (_, i) => addDays(from, i));

/** The Monday-first weeks that cover a month, as rows of seven days. */
export function monthGrid(anchor: YMD): YMD[][] {
  const start = startOfWeek(firstOfMonth(anchor));
  const end = addDays(startOfWeek(lastOfMonth(anchor)), 7);
  const weeks = (utc(end) - utc(start)) / DAY_MS / 7;
  return Array.from({ length: weeks }, (_, w) => eachDay(addDays(start, w * 7), 7));
}

/** The half-open `[from, to)` date range a view needs from the host. */
export function viewRange(view: ViewMode, anchor: YMD): { from: YMD; to: YMD } {
  if (view === "week") { const from = startOfWeek(anchor); return { from, to: addDays(from, 7) }; }
  if (view === "month") { const grid = monthGrid(anchor); return { from: grid[0][0], to: addDays(grid.at(-1)![6], 1) }; }
  return { from: anchor, to: addDays(anchor, AGENDA_DAYS) };
}

export function stepAnchor(view: ViewMode, anchor: YMD, direction: 1 | -1): YMD {
  if (view === "week") return addDays(anchor, 7 * direction);
  if (view === "month") return addMonths(firstOfMonth(anchor), direction);
  return addDays(anchor, AGENDA_DAYS * direction);
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    formatters.set(zone, f);
  }
  return f;
}

/** The wall-clock date and time of an instant in `zone`. */
export function wallClock(instant: string | number | Date, zone: string): { date: YMD; time: string } {
  const p: Record<string, string> = {};
  for (const part of partsFormatter(zone).formatToParts(new Date(instant))) p[part.type] = part.value;
  const hour = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

export const todayIn = (zone: string, now: Date): YMD => wallClock(now, zone).date;
export const entryDay = (e: DatedEntry, zone: string): YMD => e.date ?? wallClock(e.starts_at!, zone).date;
/** `HH:MM` in the company zone, or `null` for an all-day entry. */
export const entryTime = (e: DatedEntry, zone: string): string | null => (e.starts_at ? wallClock(e.starts_at, zone).time : null);

/** Entries by company-zone day: all-day first, then by time, then by title. */
export function groupByDay(entries: readonly DatedEntry[], zone: string): Map<YMD, DatedEntry[]> {
  const keyed = entries.map((entry) => ({ entry, day: entryDay(entry, zone), time: entryTime(entry, zone) }));
  keyed.sort((a, b) => a.day.localeCompare(b.day) || (a.time ?? "").localeCompare(b.time ?? "") || a.entry.title.localeCompare(b.entry.title));
  const days = new Map<YMD, DatedEntry[]>();
  for (const { entry, day } of keyed) (days.get(day) ?? days.set(day, []).get(day)!).push(entry);
  return days;
}

export const intlLocale = (locale: Locale): string => (locale === "zh-TW" ? "zh-HK" : "en-GB");

/** A short zone name such as `HKT`; falls back to a GMT offset when the zone has no abbreviation. */
export function zoneLabel(zone: string, at: Date): string {
  const short = (tag: string) => new Intl.DateTimeFormat(tag, { timeZone: zone, timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? zone;
  for (const tag of ["en-US", "en-HK", "en-GB"]) { const name = short(tag); if (!/^(GMT|UTC)[+-]\d/.test(name)) return name; }
  return short("en-US");
}

const dayFormat = (locale: Locale, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", ...options });
export const formatDay = (date: YMD, locale: Locale): string => dayFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(utc(date));
export const formatWeekday = (date: YMD, locale: Locale): string => dayFormat(locale, { weekday: "short" }).format(utc(date));
export const formatMonthYear = (date: YMD, locale: Locale): string => dayFormat(locale, { month: "long", year: "numeric" }).format(utc(date));
export const formatLongDay = (date: YMD, locale: Locale): string => dayFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(utc(date));
export const dayOfMonth = (date: YMD): number => Number(date.slice(8, 10));

/** A heading for the visible range, e.g. `16 – 22 Nov 2026`. */
export function rangeLabel(view: ViewMode, anchor: YMD, locale: Locale): string {
  if (view === "month") return formatMonthYear(anchor, locale);
  const { from, to } = viewRange(view, anchor);
  const last = addDays(to, -1);
  const f = dayFormat(locale, { day: "numeric", month: "short" });
  const y = dayFormat(locale, { year: "numeric" }).format(utc(last));
  return `${f.format(utc(from))} – ${f.format(utc(last))} ${y}`;
}
