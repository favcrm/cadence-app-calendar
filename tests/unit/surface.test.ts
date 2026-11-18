// Host-presented drawers: context is validated strictly, and every refusal path keeps the in-frame drawer.
// Run: bun test tests/unit/surface.test.ts
import { expect, test } from "bun:test";
import { DRAWER_CONTEXT_BYTES } from "@cadence/app-kit";

const { aboutContext, entryContext, parseAboutContext, parseEntryContext, parseRoutineContext, routineContext } = await import("../../src/domain/surface");
const { presentOrFallback } = await import("../../src/bridge/present");
const { resolveSurface } = await import("../../src/features/calendar/PresentedDrawer");
import type { DatedEntry } from "../../src/domain/entries";

const entry: DatedEntry = { source: "post", id: "p1", starts_at: "2026-11-16T09:00:00+08:00", title: "Menu board", state: "scheduled", needs_you: false, href: "/posts/p1" };

test("an entry context round-trips through the strict parser and drops href", () => {
  const context = entryContext(entry, "Asia/Hong_Kong");
  expect(context).not.toBeNull();
  expect(JSON.stringify(context)).not.toContain("href");
  expect(parseEntryContext(JSON.parse(JSON.stringify(context)))).toEqual(context!);
});

test("an entry that would exceed the host context cap has no context (local fallback)", () => {
  expect(entryContext({ ...entry, title: "€".repeat(300) }, "Asia/Hong_Kong")).toBeNull();
  expect(new TextEncoder().encode(JSON.stringify(entryContext(entry, "Asia/Hong_Kong"))).length).toBeLessThanOrEqual(DRAWER_CONTEXT_BYTES);
});

test("a drawer frame refuses a context that is not exactly the typed shape", () => {
  const good = entryContext(entry, "Asia/Hong_Kong")!;
  for (const bad of [null, "x", [], {}, { ...good, extra: 1 }, { ...good, zone: "Not/AZone" }, { entry: { ...good.entry, state: "BAD STATE" }, zone: good.zone }, { entry: { ...good.entry, date: "2026-11-16" }, zone: good.zone }]) {
    expect(parseEntryContext(bad)).toBeNull();
  }
  for (const bad of ["x", [], { zone: "Not/AZone" }, { zone: "Asia/Hong_Kong", x: 1 }]) expect(parseAboutContext(bad)).toBeNull();
});

test("about context is the zone or nothing", () => {
  expect(aboutContext(null)).toBeUndefined();
  expect(aboutContext("Asia/Hong_Kong")).toEqual({ zone: "Asia/Hong_Kong" });
  expect(parseAboutContext(null)).toEqual({ zone: null });
  expect(parseAboutContext({ zone: "Asia/Hong_Kong" })).toEqual({ zone: "Asia/Hong_Kong" });
});

test("a drawer frame draws only what its named surface and valid context say", () => {
  const ctx = entryContext(entry, "Asia/Hong_Kong");
  expect(resolveSurface("entry", ctx).status).toBe("entry");
  expect(resolveSurface("about", { zone: "Asia/Hong_Kong" }).status).toBe("about");
  expect(resolveSurface("entry", { zone: "Asia/Hong_Kong" }).status).toBe("invalid");
  expect(resolveSurface("about", ctx).status).toBe("invalid");
  expect(resolveSurface("settings", ctx).status).toBe("invalid");
  expect(resolveSurface(undefined, null).status).toBe("invalid");
});

const host = (presents: boolean, open: () => Promise<unknown>) => { const calls: unknown[][] = []; return { calls, h: { hostPresents: () => presents, openDrawer: (...a: unknown[]) => { calls.push(a); return open(); } } }; };
const tick = () => new Promise((r) => setTimeout(r, 0));

test("a capable host presents the drawer and no local copy opens", async () => {
  const { h, calls } = host(true, async () => ({}));
  let local = 0;
  presentOrFallback(h as never, "primary", "entry", { entry: 1 }, () => { local += 1; });
  await tick();
  expect(calls).toEqual([["entry", { context: { entry: 1 } }]]);
  expect(local).toBe(0);
});

test("no surfaces, a refused open or an oversized context keeps the in-frame drawer", async () => {
  let local = 0;
  const fallback = () => { local += 1; };
  const none = host(false, async () => ({}));
  presentOrFallback(none.h as never, "primary", "about", undefined, fallback);
  expect(none.calls).toEqual([]);
  const refused = host(true, async () => { throw new Error("refused"); });
  presentOrFallback(refused.h as never, "primary", "about", undefined, fallback);
  await tick();
  const big = host(true, async () => ({}));
  presentOrFallback(big.h as never, "primary", "entry", null, fallback);
  expect(big.calls).toEqual([]);
  expect(local).toBe(3);
});

test("a drawer frame never opens another drawer", async () => {
  const { h, calls } = host(true, async () => ({}));
  let local = 0;
  presentOrFallback(h as never, "drawer", "entry", {}, () => { local += 1; });
  await tick();
  expect(calls).toEqual([]);
  expect(local).toBe(0);
});

const routine = { id: "r1", name: "Morning brief", agent: "Nova", schedule_text: "Weekdays at 08:00", status: "on" as const, asks_first: false };

test("a routine context round-trips, is bounded and is parsed strictly", () => {
  const context = routineContext(routine, "Asia/Hong_Kong");
  expect(context).not.toBeNull();
  expect(parseRoutineContext(JSON.parse(JSON.stringify(context)))).toEqual(context!);
  expect(routineContext({ ...routine, schedule_text: "€".repeat(300) }, "Asia/Hong_Kong")).toBeNull();
  for (const bad of [null, {}, { routine, zone: "Not/AZone" }, { routine: { ...routine, status: "gone" }, zone: "Asia/Hong_Kong" }, { routine, zone: "Asia/Hong_Kong", x: 1 }]) expect(parseRoutineContext(bad)).toBeNull();
  expect(resolveSurface("routine", context).status).toBe("routine");
  expect(resolveSurface("entry", context).status).toBe("invalid");
});
