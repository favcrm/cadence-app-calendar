// Synthetic fixtures for the offline preview: Lantern Lane Café, invented people and
// `example.invalid` links only. Dates are generated relative to "now" in the fixture
// company zone so the preview always shows a live-looking week.
import { addDays, startOfWeek, todayIn } from "../../src/domain/calendar";
import type { DatedEntry, QueryReply, RoutineRow, Source } from "../../src/domain/entries";

export const FIXTURE_ZONE = "Asia/Hong_Kong";

/** Wall-clock time in Hong Kong (UTC+8, no DST) as an RFC 3339 instant. */
const at = (date: string, time: string): string => `${date}T${time}:00+08:00`;
/** The same instant written in UTC, to prove the screen converts rather than trusts the writing. */
const atUtc = (date: string, time: string): string => new Date(at(date, time)).toISOString().replace(".000Z", "Z");

export function fixtureEntries(now: Date): DatedEntry[] {
  const monday = startOfWeek(todayIn(FIXTURE_ZONE, now));
  const d = (n: number) => addDays(monday, n);
  const entry = (source: Source, id: string, when: { starts_at: string } | { date: string }, title: string, state: string, needs_you = false): DatedEntry => ({ source, id, ...when, title, state, needs_you });
  const out: DatedEntry[] = [
    entry("post", "p1", { starts_at: at(d(0), "09:00") }, "Monday menu board", "posted"),
    entry("post", "p2", { starts_at: atUtc(d(0), "11:30") }, "Rainy-day pickup reminder", "sending"),
    entry("post", "p3", { starts_at: at(d(1), "12:00") }, "Lunch set story", "scheduled"),
    entry("post", "p4", { starts_at: atUtc(d(2), "07:30") }, "Autumn latte reel", "approval", true),
    entry("post", "p5", { starts_at: at(d(3), "18:00") }, "Weekend brunch teaser", "scheduled"),
    entry("post", "p6", { starts_at: at(d(5), "09:30") }, "Saturday market photos", "draft"),
    entry("post", "p7", { starts_at: at(d(6), "08:00") }, "Sunday slow-morning post", "scheduled"),
    entry("crm", "c1", { starts_at: at(d(2), "10:00") }, "Thank-you note to regulars", "scheduled"),
    entry("crm", "c2", { starts_at: at(d(4), "09:00") }, "Lapsed-customer note", "approval", true),
    entry("routine", "r2@fri", { starts_at: at(d(4), "17:00") }, "Instagram weekly recap", "repoint", true),
    entry("task", "t0", { date: addDays(d(0), -3) }, "Update allergen sheet", "open"),
    entry("task", "t1", { date: d(1) }, "Order oat milk", "open"),
    entry("task", "t2", { date: d(3) }, "Renew food licence", "open"),
    entry("task", "t3", { date: d(8) }, "Quarterly stock count", "open"),
    entry("holiday", "h1", { date: d(3) }, "Sample public holiday", "holiday"),
    entry("post", "p8", { starts_at: at(d(9), "12:00") }, "Mid-month lunch special", "scheduled"),
    entry("crm", "c3", { starts_at: at(d(10), "10:00") }, "Birthday notes for the month", "scheduled"),
  ];
  // Morning brief every weekday, from a fortnight back to a month ahead.
  for (let n = -14; n <= 30; n += 1) {
    const day = d(n);
    if ([5, 6].includes((n % 7 + 7) % 7)) continue;
    out.push(entry("routine", `r1@${day}`, { starts_at: at(day, "08:00") }, "Morning brief", day < todayIn(FIXTURE_ZONE, now) ? "ran" : "planned"));
  }
  return out;
}

export function fixtureQuery(range: { from: string; to: string }, now: Date, options: { partial?: boolean; empty?: boolean } = {}): QueryReply {
  const zone = FIXTURE_ZONE;
  const sources = (["post", "crm", "routine", "task", "holiday"] as const).map((source) => ({ source, ok: !(options.partial && source === "post") }));
  if (options.empty) return { entries: [], zone, sources };
  // Same half-open window rule the host applies, in company-zone days.
  const inRange = (e: DatedEntry) => { const day = e.date ?? new Date(e.starts_at!).toLocaleDateString("sv-SE", { timeZone: zone }); return day >= range.from && day < range.to; };
  return { entries: fixtureEntries(now).filter(inRange).filter((e) => !(options.partial && e.source === "post")), zone, sources };
}

export function fixtureRoutines(now: Date): RoutineRow[] {
  const monday = startOfWeek(todayIn(FIXTURE_ZONE, now));
  const next = (n: number, time: string) => at(addDays(monday, n), time);
  return [
    { id: "r1", name: "Morning brief", agent: "Nova", schedule_text: "Weekdays at 08:00", next_run_at: next(7, "08:00"), status: "on", asks_first: false },
    { id: "r2", name: "Instagram weekly recap", agent: "Kai", schedule_text: "Every Friday at 17:00", next_run_at: next(4, "17:00"), status: "repoint", asks_first: false },
    { id: "r3", name: "Lapsed-customer win-back", agent: "Nova", schedule_text: "Every Friday at 09:00", next_run_at: next(4, "09:00"), status: "on", asks_first: true },
    { id: "r4", name: "Monthly owner report", agent: "Kai", schedule_text: "Day 1 of each month at 09:00", status: "paused", asks_first: false },
  ];
}
