import type { SurfaceName } from "../domain/surface";

export interface DrawerHost {
  /** The host has sent its surface message (it negotiated `screen-surfaces.v1`). */
  hostPresents(): boolean;
  openDrawer(surface: SurfaceName, options?: { context?: unknown }): Promise<unknown>;
}

/**
 * Ask the host to present `surface` in the board drawer; run `fallback` (the
 * in-frame drawer) when the host cannot, refuses, or the context does not fit.
 * `context`: `null` = too big or invalid (always local), `undefined` = none.
 * A drawer frame never opens another drawer; the caller passes `role`.
 */
export function presentOrFallback(host: DrawerHost, role: "primary" | "drawer", surface: SurfaceName, context: object | null | undefined, fallback: () => void): void {
  if (role !== "primary") return;
  if (context === null || !host.hostPresents()) { fallback(); return; }
  host.openDrawer(surface, context === undefined ? {} : { context }).catch(fallback);
}
