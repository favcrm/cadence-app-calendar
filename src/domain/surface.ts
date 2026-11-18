// Host-presented drawer context. It is display data the primary hands the drawer
// frame through the host (`screen.drawer.open` context -> `screen.drawer.context`),
// never authority: the drawer frame re-validates it with the strict parsers in
// `entries.ts` and shows "unavailable" for anything that is not exactly this shape.
import { DRAWER_CONTEXT_BYTES } from "@cadence/app-kit";
import { isZone, parseEntry, parseRoutine, type DatedEntry, type RoutineRow } from "./entries";

export const SURFACES = ["entry", "routine", "about"] as const;
export type SurfaceName = (typeof SURFACES)[number];
export const isSurfaceName = (value: unknown): value is SurfaceName => typeof value === "string" && (SURFACES as readonly string[]).includes(value);

export interface EntryContext { entry: DatedEntry; zone: string }
export interface RoutineContext { routine: RoutineRow; zone: string }
export interface AboutContext { zone: string | null }

const within = (value: unknown): boolean => {
  try { return new TextEncoder().encode(JSON.stringify(value)).length <= DRAWER_CONTEXT_BYTES; } catch { return false; }
};

/** The entry (without its host `href`, which the drawer never shows) plus the company zone, or `null` when it would not fit the host's context cap. */
export function entryContext(entry: DatedEntry, zone: string): EntryContext | null {
  const { href: _href, ...shown } = entry;
  const context = { entry: shown as DatedEntry, zone };
  return within(context) ? context : null;
}

/** The routine row plus the company zone, or `null` when it would not fit the host's context cap. */
export function routineContext(routine: RoutineRow, zone: string): RoutineContext | null {
  const context = { routine, zone };
  return within(context) ? context : null;
}

/** The company zone, or `undefined` (no context at all) while the zone is not yet known. */
export function aboutContext(zone: string | null): AboutContext | undefined {
  if (zone === null) return undefined;
  const context = { zone };
  return within(context) ? context : undefined;
}

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseEntryContext(value: unknown): EntryContext | null {
  if (!record(value) || Object.keys(value).sort().join() !== "entry,zone" || !isZone(value.zone)) return null;
  try { return { entry: parseEntry(value.entry), zone: value.zone }; } catch { return null; }
}

export function parseRoutineContext(value: unknown): RoutineContext | null {
  if (!record(value) || Object.keys(value).sort().join() !== "routine,zone" || !isZone(value.zone)) return null;
  try { return { routine: parseRoutine(value.routine), zone: value.zone }; } catch { return null; }
}

/** A missing context (`null`) means the zone is not known yet. */
export function parseAboutContext(value: unknown): AboutContext | null {
  if (value === null || value === undefined) return { zone: null };
  if (!record(value) || Object.keys(value).join() !== "zone" || !isZone(value.zone)) return null;
  return { zone: value.zone };
}
