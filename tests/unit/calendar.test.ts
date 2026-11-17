// Pure date logic. Run: bun test tests/unit/calendar.test.ts
import { expect, test } from "bun:test";
import { addDays, addMonths, entryDay, entryTime, groupByDay, monthGrid, startOfWeek, stepAnchor, todayIn, viewRange, wallClock, zoneLabel } from "../../src/domain/calendar";
import type { DatedEntry } from "../../src/domain/entries";

const entry = (id: string, when: { starts_at: string } | { date: string }, title = id): DatedEntry => ({ source: "post", id, ...when, title, state: "scheduled", needs_you: false });

test("an entry at 2026-11-16T23:30:00Z lands on Tue 17 Nov in Asia/Hong_Kong", () => {
  const e = entry("late", { starts_at: "2026-11-16T23:30:00Z" });
  expect(entryDay(e, "Asia/Hong_Kong")).toBe("2026-11-17");
  expect(entryTime(e, "Asia/Hong_Kong")).toBe("07:30");
  // The same instant is still Monday in UTC and on the US west coast: the zone decides the day.
  expect(entryDay(e, "UTC")).toBe("2026-11-16");
  expect(entryDay(e, "America/Los_Angeles")).toBe("2026-11-16");
  const days = groupByDay([e], "Asia/Hong_Kong");
  expect([...days.keys()]).toEqual(["2026-11-17"]);
});

test("midnight renders as 00:00, not 24:00", () => {
  expect(wallClock("2026-11-16T16:00:00Z", "Asia/Hong_Kong")).toEqual({ date: "2026-11-17", time: "00:00" });
});

test("an all-day entry keeps its own date and has no time", () => {
  const e = entry("task", { date: "2026-11-17" });
  expect(entryDay(e, "America/Los_Angeles")).toBe("2026-11-17");
  expect(entryTime(e, "America/Los_Angeles")).toBeNull();
});

test("a day lists all-day first, then by time, then by title", () => {
  const rows = [
    entry("b", { starts_at: "2026-11-17T10:00:00+08:00" }, "Beta"),
    entry("a", { starts_at: "2026-11-17T09:00:00+08:00" }, "Alpha"),
    entry("d", { date: "2026-11-17" }, "Due"),
    entry("c", { starts_at: "2026-11-17T09:00:00+08:00" }, "Aardvark"),
  ];
  expect(groupByDay(rows, "Asia/Hong_Kong").get("2026-11-17")!.map((e) => e.id)).toEqual(["d", "c", "a", "b"]);
});

test("weeks start on Monday and months pad to whole weeks", () => {
  expect(startOfWeek("2026-11-16")).toBe("2026-11-16"); // Monday
  expect(startOfWeek("2026-11-22")).toBe("2026-11-16"); // Sunday
  expect(startOfWeek("2026-11-23")).toBe("2026-11-23");
  const grid = monthGrid("2026-11-18");
  expect(grid[0][0]).toBe("2026-10-26");
  expect(grid.at(-1)![6]).toBe("2026-12-06");
  expect(grid.every((week) => week.length === 7)).toBe(true);
});

test("view ranges are half-open", () => {
  expect(viewRange("week", "2026-11-18")).toEqual({ from: "2026-11-16", to: "2026-11-23" });
  expect(viewRange("month", "2026-11-18")).toEqual({ from: "2026-10-26", to: "2026-12-07" });
  expect(viewRange("agenda", "2026-11-18")).toEqual({ from: "2026-11-18", to: "2026-12-02" });
});

test("stepping moves by the view's own unit", () => {
  expect(stepAnchor("week", "2026-11-18", 1)).toBe("2026-11-25");
  expect(stepAnchor("month", "2026-11-18", -1)).toBe("2026-10-01");
  expect(stepAnchor("agenda", "2026-11-18", 1)).toBe("2026-12-02");
  expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
});

test("today is read in the company zone, not the machine's", () => {
  const now = new Date("2026-11-16T20:00:00Z");
  expect(todayIn("Asia/Hong_Kong", now)).toBe("2026-11-17");
  expect(todayIn("America/New_York", now)).toBe("2026-11-16");
});

test("the zone label is a short name where there is one", () => {
  const at = new Date("2026-11-16T00:00:00Z");
  expect(zoneLabel("Asia/Hong_Kong", at)).toBe("HKT");
  expect(zoneLabel("America/New_York", at)).toBe("EST");
});
