// Surface branching in the real screen, against a fake bridge at the module seam.
// Run: bun test tests/unit/surface-render.test.tsx
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();
import { afterEach, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const entry = { source: "post", id: "p1", starts_at: "2026-11-16T09:00:00+08:00", title: "Menu board", state: "scheduled", needs_you: false };
const reply = { entries: [entry], zone: "Asia/Hong_Kong", sources: [{ source: "post", ok: true }] };
const base = { scope: { installId: "i", digest: "d" }, digest: "d", presentationLocale: "en" };
let snapshot: typeof base & { route: { section: string } } = { ...base, route: { section: "calendar" } };

let surface = { role: "primary", name: undefined as string | undefined, modal: false };
let presents = true;
let context: unknown = null;
const opened: unknown[][] = [];
let refuse = false;
const listeners = new Set<() => void>();
const bridge = {
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  getSnapshot: () => snapshot,
  getState: () => ({ status: "ready", error: null, surface }),
  can: () => true,
  call: async (_s: unknown, verb: string) => (verb === "calendar.query" ? reply : { routines: [{ id: "r1", name: "Morning brief", agent: "Nova", schedule_text: "Weekdays at 08:00", status: "on", asks_first: false }] }),
  openDrawer: async (...a: unknown[]) => { opened.push(a); if (refuse) throw new Error("refused"); },
  closeDrawer: async () => undefined,
  drawerContext: async () => context,
};
mock.module("../../src/bridge/channel", () => ({
  SECTIONS: ["calendar", "routines"],
  channel: { bridge, hostPresents: () => presents, offers: () => true, request: (verb: string) => bridge.call(null, verb) },
}));
const { default: CalendarScreen } = await import("../../src/features/calendar/CalendarScreen");

const host = document.createElement("div");
document.body.append(host);
let root: Root | null = null;
const mount = async () => { root = createRoot(host); await act(async () => { root!.render(createElement(CalendarScreen)); }); await act(async () => { await new Promise((r) => setTimeout(r, 20)); }); };
const flip = async (next: typeof surface) => { surface = next; await act(async () => { listeners.forEach((l) => l()); }); };
afterEach(async () => { snapshot = { ...base, route: { section: "calendar" } }; await act(async () => { root?.unmount(); }); root = null; opened.length = 0; refuse = false; presents = true; surface = { role: "primary", name: undefined, modal: false }; context = null; });
const click = async (el: Element | null) => { await act(async () => { (el as HTMLElement).click(); await new Promise((r) => setTimeout(r, 5)); }); };
const openAbout = () => document.querySelector<HTMLElement>(".cal-trailing button.btn");
const drawers = () => document.querySelectorAll(".crm-drawer-shell").length;

test("a capable host presents the drawer; the primary draws no copy of its own", async () => {
  await mount();
  await click(openAbout());
  expect(opened.map((o) => o[0])).toEqual(["about"]);
  expect(drawers()).toBe(0);
  await flip({ role: "primary", name: undefined, modal: true });
  expect(drawers()).toBe(0);
});

test("no host surfaces, or a refused open, keeps the in-frame drawer", async () => {
  presents = false;
  await mount();
  await click(openAbout());
  expect(opened).toEqual([]);
  expect(drawers()).toBe(1);
});

test("a refused open falls back to the in-frame drawer", async () => {
  refuse = true;
  await mount();
  await click(openAbout());
  expect(opened.length).toBe(1);
  expect(drawers()).toBe(1);
});

test("while the host presents a drawer the in-frame copy is dropped", async () => {
  presents = false;
  await mount();
  await click(openAbout());
  expect(drawers()).toBe(1);
  await flip({ role: "primary", name: undefined, modal: true });
  expect(drawers()).toBe(0);
});

test("a drawer frame renders only the drawer, and an invalid context is unavailable", async () => {
  surface = { role: "drawer", name: "about", modal: false };
  context = { zone: "Asia/Hong_Kong" };
  await mount();
  // Only the content: no second shell, no close control, no footer Close.
  expect(drawers()).toBe(0);
  expect(document.querySelector(".cal-presented")).not.toBeNull();
  expect(document.querySelector(".cal-toolbar")).toBeNull();
  expect(document.querySelector(".cal-calendar")).toBeNull();
  expect(document.querySelector(".crm-drawer-top, .crm-drawer-foot, .crm-drawer-scrim")).toBeNull();
  expect(document.querySelector("button")).toBeNull();
  expect(document.querySelector(".cal-presented")?.textContent).toContain("About Calendar");
  await act(async () => { root!.unmount(); });
  root = null; host.textContent = "";
  context = { zone: "Not/AZone" };
  await mount();
  expect(document.querySelector(".cal-presented")?.textContent).toContain("could not be shown");
});

test("the host's section route drives the view and the app draws no tabs of its own", async () => {
  await mount();
  expect(document.querySelector(".app-outlet-tabs")).toBeNull();
  expect(document.querySelector<HTMLElement>(".cal-panel:nth-of-type(1)")?.hidden).toBe(false);
  snapshot = { ...base, route: { section: "routines" } };
  await flip(surface);
  const panels = document.querySelectorAll<HTMLElement>(".cal-panel");
  expect([panels[0].hidden, panels[1].hidden]).toEqual([true, false]);
});

test("a routine opens in the host's drawer, and a drawer frame draws it bare", async () => {
  snapshot = { ...base, route: { section: "routines" } };
  await mount();
  await click(document.querySelector(".cal-routine"));
  expect(opened.map((o) => o[0])).toEqual(["routine"]);
  expect(drawers()).toBe(0);
  await act(async () => { root!.unmount(); });
  root = null; host.textContent = "";
  surface = { role: "drawer", name: "routine", modal: false };
  context = { routine: { id: "r1", name: "Morning brief", agent: "Nova", schedule_text: "Weekdays at 08:00", status: "on", asks_first: false }, zone: "Asia/Hong_Kong" };
  await mount();
  expect(document.querySelector(".cal-presented")?.textContent).toContain("Morning brief");
  expect(document.querySelector("button")).toBeNull();
});
