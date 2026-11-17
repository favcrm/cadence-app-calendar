// The dated-entry contract between this screen and the host (`calendar.query`,
// `routines.list`). A reply is parsed strictly: anything that is not exactly
// this shape is refused, never repaired, so a protocol drift shows up as an
// "unavailable" screen instead of a calendar with invented or missing dates.

export const SOURCES = ["post", "crm", "routine", "task", "holiday"] as const;
export type Source = (typeof SOURCES)[number];

export interface DatedEntry {
  source: Source;
  id: string;
  /** RFC 3339 instant, for a timed entry. Exactly one of `starts_at` / `date`. */
  starts_at?: string;
  /** `YYYY-MM-DD` in the company zone, for an all-day entry. */
  date?: string;
  title: string;
  state: string;
  needs_you: boolean;
  href?: string;
}

export interface SourceHealth { source: Source; ok: boolean }
export interface QueryReply { entries: DatedEntry[]; zone: string; sources: SourceHealth[] }

export const ROUTINE_STATUSES = ["on", "paused", "repoint", "waiting"] as const;
export type RoutineStatus = (typeof ROUTINE_STATUSES)[number];
export interface RoutineRow {
  id: string;
  name: string;
  agent: string;
  schedule_text: string;
  next_run_at?: string;
  status: RoutineStatus;
  asks_first: boolean;
}

export class ReplyError extends Error {
  constructor(message: string) { super(message); this.name = "ReplyError"; }
}

const MAX_ENTRIES = 2000;
const MAX_ROUTINES = 500;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
const ID = /^[A-Za-z0-9_.:@-]{1,160}$/;
const STATE = /^[a-z][a-z0-9_-]{0,63}$/;

const fail = (what: string): never => { throw new ReplyError(what); };
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function exact(value: unknown, required: readonly string[], optional: readonly string[], what: string): Record<string, unknown> {
  if (!isRecord(value)) return fail(`${what} is not an object`);
  for (const key of required) if (!Object.hasOwn(value, key)) fail(`${what} lacks ${key}`);
  for (const key of Object.keys(value)) if (!required.includes(key) && !optional.includes(key)) fail(`${what} has unknown field ${key}`);
  return value;
}

const text = (v: unknown, what: string, max: number): string => {
  if (typeof v !== "string" || v.trim() === "" || v.length > max) return fail(`${what} is not a short non-empty string`);
  return v;
};

/** True for a real calendar day (`2026-02-31` is not one). */
export function isCalendarDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const at = new Date(Date.UTC(y, mo - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === mo - 1 && at.getUTCDate() === d;
}

/** True for an RFC 3339 instant with an explicit offset and real date/time parts. */
export function isInstant(value: string): boolean {
  const m = INSTANT.exec(value);
  if (!m) return false;
  if (!isCalendarDate(`${m[1]}-${m[2]}-${m[3]}`)) return false;
  if (Number(m[4]) > 23 || Number(m[5]) > 59 || Number(m[6]) > 59) return false;
  if (m[7] !== "Z" && (Number(m[7].slice(1, 3)) > 23 || Number(m[7].slice(4, 6)) > 59)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function isZone(value: unknown): value is string {
  if (typeof value !== "string" || value === "" || value.length > 64) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}

const isSource = (v: unknown): v is Source => typeof v === "string" && (SOURCES as readonly string[]).includes(v);

export function parseEntry(value: unknown): DatedEntry {
  const row = exact(value, ["source", "id", "title", "state", "needs_you"], ["starts_at", "date", "href"], "entry");
  if (!isSource(row.source)) fail("entry source is not recognised");
  if (typeof row.id !== "string" || !ID.test(row.id)) fail("entry id is malformed");
  if (typeof row.needs_you !== "boolean") fail("entry needs_you is not a boolean");
  if (typeof row.state !== "string" || !STATE.test(row.state)) fail("entry state is malformed");
  const hasInstant = row.starts_at !== undefined, hasDate = row.date !== undefined;
  if (hasInstant === hasDate) fail("entry must carry exactly one of starts_at and date");
  if (hasInstant && !(typeof row.starts_at === "string" && isInstant(row.starts_at))) fail("entry starts_at is not an RFC 3339 instant");
  if (hasDate && !(typeof row.date === "string" && isCalendarDate(row.date))) fail("entry date is not a calendar date");
  // `href` is kept for the host-navigation slice; only a host-relative path is admitted.
  if (row.href !== undefined && !(typeof row.href === "string" && /^\/(?!\/)[^\s]{0,500}$/.test(row.href))) fail("entry href is not a host path");
  return {
    source: row.source as Source,
    id: row.id as string,
    ...(hasInstant ? { starts_at: row.starts_at as string } : { date: row.date as string }),
    title: text(row.title, "entry title", 300),
    state: row.state as string,
    needs_you: row.needs_you as boolean,
    ...(row.href !== undefined ? { href: row.href as string } : {}),
  };
}

export function parseQueryReply(value: unknown): QueryReply {
  const reply = exact(value, ["entries", "zone", "sources"], [], "calendar reply");
  if (!isZone(reply.zone)) fail("calendar reply zone is not an IANA time zone");
  if (!Array.isArray(reply.entries) || reply.entries.length > MAX_ENTRIES) return fail("calendar reply entries is not a bounded list");
  if (!Array.isArray(reply.sources) || reply.sources.length > SOURCES.length) return fail("calendar reply sources is not a bounded list");
  const seen = new Set<string>();
  const sources = reply.sources.map((item): SourceHealth => {
    const row = exact(item, ["source", "ok"], [], "source health");
    if (!isSource(row.source) || typeof row.ok !== "boolean" || seen.has(row.source)) fail("source health is malformed");
    seen.add(row.source as string);
    return { source: row.source as Source, ok: row.ok as boolean };
  });
  return { entries: reply.entries.map(parseEntry), zone: reply.zone as string, sources };
}

export function parseRoutine(value: unknown): RoutineRow {
  const row = exact(value, ["id", "name", "agent", "schedule_text", "status", "asks_first"], ["next_run_at"], "routine");
  if (typeof row.id !== "string" || !ID.test(row.id)) fail("routine id is malformed");
  if (!(ROUTINE_STATUSES as readonly unknown[]).includes(row.status)) fail("routine status is not recognised");
  if (typeof row.asks_first !== "boolean") fail("routine asks_first is not a boolean");
  if (row.next_run_at !== undefined && !(typeof row.next_run_at === "string" && isInstant(row.next_run_at))) fail("routine next_run_at is not an RFC 3339 instant");
  return {
    id: row.id as string,
    name: text(row.name, "routine name", 200),
    agent: text(row.agent, "routine agent", 120),
    schedule_text: text(row.schedule_text, "routine schedule", 300),
    ...(row.next_run_at !== undefined ? { next_run_at: row.next_run_at as string } : {}),
    status: row.status as RoutineStatus,
    asks_first: row.asks_first as boolean,
  };
}

export function parseRoutinesReply(value: unknown): RoutineRow[] {
  const reply = exact(value, ["routines"], [], "routines reply");
  if (!Array.isArray(reply.routines) || reply.routines.length > MAX_ROUTINES) return fail("routines reply is not a bounded list");
  return reply.routines.map(parseRoutine);
}
