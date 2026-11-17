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

const frame = document.querySelector<HTMLIFrameElement>("#calendar-frame")!;
const digest = `sha256:${"0".repeat(64)}`;
const installId = "calendar-local-fixture";
const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
let port: MessagePort | null = null;

// An older host never lists the operations among the actions it pushes.
const actions = scenario === "old" ? [] : ["calendar.query", "routines.list"];

function project() {
  port?.postMessage({
    v: 2, op: "screen", tag: "calendar", install_id: installId, digest,
    installation: { install_id: installId, name: "calendar", title: "Calendar", version: "development", digest, summary: "Local browser-memory fixtures" },
    actions, route: { section: "calendar", view: "list", record_id: null, segment_id: null }, presentation_locale: locale,
  });
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

function handle(message: Record<string, unknown>) {
  if (message?.v === 1 && message.op === "ready") { project(); return; }
  if (message?.v !== 2 || message.op !== "call" || typeof message.id !== "string") return;
  const id = message.id;
  const verb = String(message.verb);
  if (!actions.includes(verb)) {
    port?.postMessage({ v: 2, op: "reply", id, ok: false, refusal: { code: "forbidden", text: "This workspace doesn't offer that action." } });
    return;
  }
  const send = () => {
    const result = answer(verb, (message.args ?? {}) as Record<string, unknown>);
    port?.postMessage(result.ok ? { v: 2, op: "reply", id, ok: true, data: result.data } : { v: 2, op: "reply", id, ok: false, refusal: result.refusal });
  };
  if (scenario === "slow") setTimeout(send, 1500); else send();
}

window.addEventListener("message", (event) => {
  const message = event.data;
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (!message || message.v !== 1 || message.op !== "init" || message.tag !== "calendar" || message.bridge_nonce !== nonce || message.generation !== 1 || event.ports.length !== 1) return;
  port?.close();
  port = event.ports[0];
  port.onmessage = (e) => { try { handle(e.data); } catch { port?.close(); port = null; } };
  port.start();
});
window.addEventListener("pagehide", () => port?.close());
frame.src = `./frame.html?nonce=${nonce}&theme=${theme}`;
