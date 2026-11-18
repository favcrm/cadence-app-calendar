// The only place that talks to the host about dates. It asks for two bridge
// operations, `calendar.query` and `routines.list`, and turns every way they
// can go wrong into an explicit outcome:
//
//  - the host does not offer the operation, refuses it, or answers with
//    something that is not exactly the typed contract  ->  "unavailable"
//  - a transient transport failure (timeout, lost connection)  ->  "error"
//
// It never substitutes data. An unavailable host must read as unavailable, not
// as an empty calendar.
import { isCalendarDate, parseQueryReply, parseRoutinesReply, ReplyError, type QueryReply, type RoutineRow } from "../domain/entries";

export const QUERY_VERB = "calendar.query";
export const ROUTINES_VERB = "routines.list";

/** The transport boundary. Production wraps the app-kit bridge; the dev preview and tests supply their own. */
export interface HostCalls {
  offers(verb: string): boolean;
  request(verb: string, args: Record<string, unknown>): Promise<unknown>;
}

export type UnavailableReason = "not-offered" | "refused" | "malformed";
export type Outcome<T> =
  | { status: "ok"; data: T }
  | { status: "unavailable"; reason: UnavailableReason }
  | { status: "error"; message: string };

// A refusal that means "this host cannot answer this" rather than "try again".
const TRANSIENT = new Set([401, 409, 410, 429, 502, 504]);

function classify(error: unknown): Outcome<never> {
  const status = typeof (error as { status?: unknown } | null)?.status === "number" ? (error as { status: number }).status : 0;
  if (error instanceof ReplyError) return { status: "unavailable", reason: "malformed" };
  if (status !== 0 && !TRANSIENT.has(status)) return { status: "unavailable", reason: "refused" };
  return { status: "error", message: error instanceof Error ? error.message : "The request failed" };
}

async function ask<T>(host: HostCalls, verb: string, args: Record<string, unknown>, parse: (reply: unknown) => T): Promise<Outcome<T>> {
  if (!host.offers(verb)) return { status: "unavailable", reason: "not-offered" };
  try {
    return { status: "ok", data: parse(await host.request(verb, args)) };
  } catch (error) {
    return classify(error);
  }
}

/** Entries in the half-open date range `[from, to)`, as `YYYY-MM-DD` in the company zone. */
export function queryCalendar(host: HostCalls, range: { from: string; to: string }): Promise<Outcome<QueryReply>> {
  if (!isCalendarDate(range.from) || !isCalendarDate(range.to) || range.from >= range.to) throw new RangeError("calendar.query needs from < to as YYYY-MM-DD");
  return ask(host, QUERY_VERB, { from: range.from, to: range.to }, parseQueryReply);
}

/** Every routine in the workspace, with its owning agent. */
export function listRoutines(host: HostCalls): Promise<Outcome<RoutineRow[]>> {
  return ask(host, ROUTINES_VERB, {}, parseRoutinesReply);
}
