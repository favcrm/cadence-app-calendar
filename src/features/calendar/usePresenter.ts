import { useCallback } from "react";
import { presentOrFallback } from "../../bridge/present";
import { channel } from "../../bridge/channel";
import { useSurface } from "../../bridge/scope";
import type { SurfaceName } from "../../domain/surface";

/**
 * Open a drawer in the host's board drawer when it can present one, else in this
 * frame. `hostDraws` is true while the host presents a drawer over this primary:
 * the primary then draws no copy of its own.
 */
export function usePresenter() {
  const surface = useSurface();
  const present = useCallback((name: SurfaceName, context: object | null | undefined, fallback: () => void) => {
    presentOrFallback({ hostPresents: channel.hostPresents, openDrawer: (s, o) => channel.bridge.openDrawer(s, o) }, surface.role, name, context, fallback);
  }, [surface.role]);
  return { present, hostDraws: surface.role === "primary" && surface.modal };
}
