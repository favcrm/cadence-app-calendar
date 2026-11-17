// The fake host, at the transport boundary: it speaks the app's real MessageChannel
// wire (init, ready, push, call/reply) and answers `calendar.query` and `routines.list`
// from synthetic fixtures. The screen's code has no idea it is not talking to Cadence.
// Scenario, language and theme come from this page's own URL (`?host=old&locale=zh-TW&theme=light`).
import "./shell.css";
import { fixtureQuery, fixtureRoutines } from "./fixtures";

const params = new URLSearchParams(location.search);
const scenario = params.get("host") ?? "ready";
const locale = params.get("locale") === "zh-TW" ? "zh-TW" : "en";
const theme = params.get("theme") === "light" ? "light" : "dark";
document.documentElement.dataset.theme = theme;

for (const [id, value] of [["p-host", scenario], ["p-locale", locale], ["p-theme", theme]] as const) {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`)!;
  select.value = value;
  select.addEventListener("change", () => { const next = new URL(location.href); next.searchParams.set(id.slice(2), select.value); location.href = next.href; });
}

const primaryFrame = document.querySelector<HTMLIFrameElement>("#calendar-frame")!;
const stage = document.querySelector<HTMLElement>(".preview-stage")!;
const digest = `sha256:${"0".repeat(64)}`;
const installId = "calendar-local-fixture";
const DRAWER_SURFACE = /^[a-z0-9_-]{1,64}$/;
const newNonce = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");

// One mount per frame: the primary, and (while open) the drawer frame the host presents.
interface Mount { frame: HTMLIFrameElement; nonce: string; role: "primary" | "drawer"; surface?: string; context?: unknown; port: MessagePort | null; wantsSurfaces: boolean }
const mounts: Mount[] = [];
let drawer: Mount | null = null;
let layer: HTMLElement | null = null;

// An older host never lists the operations among the actions it pushes.
const actions = scenario === "old" ? [] : ["calendar.query", "routines.list"];
// `nodrawer` is a host that predates drawer presentation: no surface message, and it refuses the open, so the app keeps its own drawer.
const presents = scenario !== "nodrawer" && scenario !== "old";

function project(mount: Mount) {
  mount.port?.postMessage({
    v: 2, op: "screen", tag: "calendar", install_id: installId, digest,
    installation: { install_id: installId, name: "calendar", title: "Calendar", version: "development", digest, summary: "Local browser-memory fixtures" },
    actions, route: { section: "calendar", view: "list", record_id: null, segment_id: null }, presentation_locale: locale,
  });
}

// The host's surface message: only sent to a frame that negotiated `screen-surfaces.v1`, and only by a host that presents drawers.
function postSurface(mount: Mount, modal: boolean) {
  if (!presents || !mount.wantsSurfaces) return;
  mount.port?.postMessage({ v: 1, op: "surface", role: mount.role, modal, ...(mount.role === "drawer" && mount.surface ? { surface: mount.surface } : {}) });
}

function closeDrawer() {
  if (!drawer) return;
  const gone = drawer;
  drawer = null;
  gone.port?.close();
  gone.frame.remove();
  layer?.remove();
  layer = null;
  mounts.splice(mounts.indexOf(gone), 1);
  postSurface(mounts[0], false);
}

// Emulates the board shell: a scrim over the primary and a full-height drawer frame on the right, booted with the drawer role.
function openDrawer(surface: string, context: unknown) {
  closeDrawer();
  const mount: Mount = { frame: document.createElement("iframe"), nonce: newNonce(), role: "drawer", surface, context, port: null, wantsSurfaces: false };
  layer = document.createElement("div");
  layer.className = "preview-scrim";
  layer.addEventListener("click", closeDrawer);
  mount.frame.id = "drawer-frame";
  mount.frame.title = "Calendar app — presented drawer";
  mount.frame.className = "preview-drawer";
  drawer = mount;
  mounts.push(mount);
  stage.append(layer, mount.frame);
  mount.frame.src = `./frame.html?nonce=${mount.nonce}&theme=${theme}`;
  postSurface(mounts[0], true);
}

type Reply = { ok: true; data: unknown } | { ok: false; refusal: { code: string; text: string } };

function answer(verb: string, args: Record<string, unknown>): Reply {
  const now = new Date();
  if (scenario === "refuse") return { ok: false, refusal: { code: "forbidden", text: "This workspace doesn't offer that action." } };
  if (scenario === "error") return { ok: false, refusal: { code: "conflict", text: "The host is busy." } };
  if (scenario === "malformed") return { ok: true, data: verb === "routines.list" ? { routines: [{ id: "r1" }] } : { entries: [{ source: "post", id: "p1", title: "No time at all", state: "scheduled", needs_you: false }], zone: "Asia/Hong_Kong", sources: [] } };
  if (verb === "calendar.query") {
    const { from, to } = args;
    if (typeof from !== "string" || typeof to !== "string") return { ok: false, refusal: { code: "invalid", text: "from and to are required." } };
    return { ok: true, data: fixtureQuery({ from, to }, now, { partial: scenario === "partial", empty: scenario === "empty" }) };
  }
  if (verb === "routines.list") return { ok: true, data: { routines: scenario === "empty" ? [] : fixtureRoutines(now) } };
  return { ok: false, refusal: { code: "forbidden", text: "This workspace doesn't offer that action." } };
}

const refusal = (id: string) => ({ v: 2, op: "reply", id, ok: false, refusal: { code: "forbidden", text: "This workspace doesn't offer that action." } });

function handle(mount: Mount, message: Record<string, unknown>) {
  if (message?.v === 1 && message.op === "ready") {
    mount.wantsSurfaces = Array.isArray(message.accepts) && message.accepts.includes("screen-surfaces.v1");
    postSurface(mount, false); // before the first projection, like the real host
    project(mount);
    return;
  }
  if (message?.v !== 2 || message.op !== "call" || typeof message.id !== "string") return;
  const id = message.id;
  const verb = String(message.verb);
  const args = (message.args ?? {}) as Record<string, unknown>;
  // Host-local presentation verbs: never part of the pushed actions.
  if (verb === "screen.drawer.open" || verb === "screen.drawer.close" || verb === "screen.drawer.context") {
    if (!presents || !mount.wantsSurfaces) { mount.port?.postMessage(refusal(id)); return; }
    if (verb === "screen.drawer.open" && mount.role === "primary" && typeof args.surface === "string" && DRAWER_SURFACE.test(args.surface)) {
      openDrawer(args.surface, args.context);
      mount.port?.postMessage({ v: 2, op: "reply", id, ok: true, data: {} });
    } else if (verb === "screen.drawer.close") {
      mount.port?.postMessage({ v: 2, op: "reply", id, ok: true, data: {} });
      closeDrawer();
    } else if (verb === "screen.drawer.context" && mount.role === "drawer") {
      mount.port?.postMessage({ v: 2, op: "reply", id, ok: true, data: { context: mount.context ?? null } });
    } else mount.port?.postMessage(refusal(id));
    return;
  }
  if (!actions.includes(verb)) { mount.port?.postMessage(refusal(id)); return; }
  const send = () => {
    const result = answer(verb, args);
    mount.port?.postMessage(result.ok ? { v: 2, op: "reply", id, ok: true, data: result.data } : { v: 2, op: "reply", id, ok: false, refusal: result.refusal });
  };
  if (scenario === "slow") setTimeout(send, 1500); else send();
}

window.addEventListener("message", (event) => {
  const message = event.data;
  const mount = mounts.find((m) => m.frame.contentWindow === event.source);
  if (!mount || event.origin !== location.origin) return;
  if (!message || message.v !== 1 || message.op !== "init" || message.tag !== "calendar" || message.bridge_nonce !== mount.nonce || message.generation !== 1 || event.ports.length !== 1) return;
  mount.port?.close();
  mount.port = event.ports[0];
  mount.port.onmessage = (e) => { try { handle(mount, e.data); } catch { mount.port?.close(); mount.port = null; } };
  mount.port.start();
});
window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });
window.addEventListener("pagehide", () => mounts.forEach((m) => m.port?.close()));
const primary: Mount = { frame: primaryFrame, nonce: newNonce(), role: "primary", port: null, wantsSurfaces: false };
mounts.push(primary);
primaryFrame.src = `./frame.html?nonce=${primary.nonce}&theme=${theme}`;
