// Strict parsing of the host's dated-entry replies. Run: bun test tests/unit/entries.test.ts
import { expect, test } from "bun:test";
import { isCalendarDate, isInstant, parseEntry, parseQueryReply, parseRoutinesReply, ReplyError } from "../../src/domain/entries";

const timed = { source: "post", id: "p1", starts_at: "2026-11-16T09:00:00+08:00", title: "Monday menu board", state: "posted", needs_you: false };
const allDay = { source: "task", id: "t1", date: "2026-11-17", title: "Order oat milk", state: "open", needs_you: false, href: "/work/t1" };
const reply = (over: Record<string, unknown> = {}) => ({ entries: [timed, allDay], zone: "Asia/Hong_Kong", sources: [{ source: "post", ok: true }, { source: "task", ok: false }], ...over });
const routine = { id: "r1", name: "Morning brief", agent: "Nova", schedule_text: "Weekdays at 08:00", next_run_at: "2026-11-17T00:00:00Z", status: "on", asks_first: true };

test("a timed entry and an all-day entry parse", () => {
  expect(parseEntry(timed)).toEqual(timed);
  expect(parseEntry(allDay)).toEqual(allDay);
});

test("exactly one of starts_at and date", () => {
  const { starts_at, ...neither } = timed;
  void starts_at;
  expect(() => parseEntry(neither)).toThrow(ReplyError);
  expect(() => parseEntry({ ...timed, date: "2026-11-16" })).toThrow(ReplyError);
});

test("a bad source, state, id, time or date is refused", () => {
  expect(() => parseEntry({ ...timed, source: "calendar" })).toThrow(ReplyError);
  expect(() => parseEntry({ ...timed, state: "Not A Token" })).toThrow(ReplyError);
  expect(() => parseEntry({ ...timed, id: "" })).toThrow(ReplyError);
  expect(() => parseEntry({ ...timed, starts_at: "2026-11-16 09:00" })).toThrow(ReplyError);
  expect(() => parseEntry({ ...timed, starts_at: "2026-11-16T09:00:00" })).toThrow(ReplyError); // no offset
  expect(() => parseEntry({ ...allDay, date: "2026-02-31" })).toThrow(ReplyError);
  expect(() => parseEntry({ ...timed, needs_you: "yes" })).toThrow(ReplyError);
  expect(() => parseEntry({ ...timed, title: "  " })).toThrow(ReplyError);
  expect(() => parseEntry({ ...allDay, href: "https://elsewhere.example.invalid/x" })).toThrow(ReplyError);
  expect(() => parseEntry({ ...allDay, href: "//elsewhere.example.invalid/x" })).toThrow(ReplyError);
});

test("an unknown field is refused, not ignored", () => {
  expect(() => parseEntry({ ...timed, body: "message text" })).toThrow(ReplyError);
});

test("calendar dates and instants are real", () => {
  expect(isCalendarDate("2026-02-28")).toBe(true);
  expect(isCalendarDate("2026-02-29")).toBe(false);
  expect(isCalendarDate("2028-02-29")).toBe(true);
  expect(isInstant("2026-11-16T23:30:00Z")).toBe(true);
  expect(isInstant("2026-11-16T24:00:00Z")).toBe(false);
  expect(isInstant("2026-11-16T10:00:00+25:00")).toBe(false);
});

test("a whole reply parses and keeps per-source health", () => {
  const parsed = parseQueryReply(reply());
  expect(parsed.entries).toHaveLength(2);
  expect(parsed.zone).toBe("Asia/Hong_Kong");
  expect(parsed.sources).toEqual([{ source: "post", ok: true }, { source: "task", ok: false }]);
});

test("a malformed reply is refused", () => {
  expect(() => parseQueryReply(null)).toThrow(ReplyError);
  expect(() => parseQueryReply([])).toThrow(ReplyError);
  expect(() => parseQueryReply({ entries: [] })).toThrow(ReplyError);
  expect(() => parseQueryReply(reply({ zone: "Mars/Olympus" }))).toThrow(ReplyError);
  expect(() => parseQueryReply(reply({ entries: "none" }))).toThrow(ReplyError);
  expect(() => parseQueryReply(reply({ entries: [timed, { ...timed, state: 3 }] }))).toThrow(ReplyError);
  expect(() => parseQueryReply(reply({ sources: [{ source: "post", ok: "yes" }] }))).toThrow(ReplyError);
  expect(() => parseQueryReply(reply({ sources: [{ source: "post", ok: true }, { source: "post", ok: false }] }))).toThrow(ReplyError);
  expect(() => parseQueryReply(reply({ extra: 1 }))).toThrow(ReplyError);
});

test("routines parse and refuse the same way", () => {
  expect(parseRoutinesReply({ routines: [routine, { ...routine, id: "r2", next_run_at: undefined, status: "paused", asks_first: false }] })).toHaveLength(2);
  expect(() => parseRoutinesReply({ routines: [{ ...routine, status: "running" }] })).toThrow(ReplyError);
  expect(() => parseRoutinesReply({ routines: [{ ...routine, asks_first: 1 }] })).toThrow(ReplyError);
  expect(() => parseRoutinesReply({ routines: [{ ...routine, next_run_at: "tomorrow" }] })).toThrow(ReplyError);
  expect(() => parseRoutinesReply({ routines: [{ ...routine, secret: "x" }] })).toThrow(ReplyError);
  expect(() => parseRoutinesReply([routine])).toThrow(ReplyError);
});
