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
const snapshot = { scope: { installId: "i", digest: "d" }, digest: "d", presentationLocale: "en", route: { section: "calendar" } };

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
  call: async (_s: unknown, verb: string) => (verb === "calendar.query" ? reply : { routines: [] }),
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
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; opened.length = 0; refuse = false; presents = true; surface = { role: "primary", name: undefined, modal: false }; context = null; });
const click = async (el: Element | null) => { await act(async () => { (el as HTMLElement).click(); await new Promise((r) => setTimeout(r, 5)); }); };
const openAbout = () => document.querySelector<HTMLElement>(".cal-head button.btn");
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
  expect(drawers()).toBe(1);
  expect(document.querySelector(".cal-presented")).not.toBeNull();
  expect(document.querySelector(".cal-head")).toBeNull();
  expect(document.querySelector(".cal-calendar")).toBeNull();
  await act(async () => { root!.unmount(); });
  root = null; host.textContent = "";
  context = { zone: "Not/AZone" };
  await mount();
  expect(document.querySelector(".cal-presented")?.textContent).toContain("could not be shown");
});
