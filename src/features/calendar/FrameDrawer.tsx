import { DrawerShell, type DrawerShellProps } from "@cadence/screen-ui";
import { useEffect, useRef } from "react";

const FOCUSABLE = "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex=\"0\"]";

/**
 * The content of a host-presented drawer: the kicker, title, subtitle, chips and
 * panels, and nothing else. The host's own header and x close it, and its frame
 * inset is the only padding, so this draws no second shell, close or footer.
 */
function BareDrawer({ label, kicker, title, subtitle, pills, warning, tabs, state }: Omit<DrawerShellProps, "geometry" | "scrim">) {
  return (
    <article className="cal cal-presented" aria-label={label}>
      <header className="cal-bare-head">
        {kicker != null && <div className="crm-drawer-kicker">{kicker}</div>}
        <h3 className="crm-drawer-title">{title}</h3>
        {subtitle != null && <div className="crm-drawer-sub">{subtitle}</div>}
        {pills != null && <div className="crm-drawer-pills">{pills}</div>}
        {warning != null && state == null && <p className="crm-drawer-warn">{warning}</p>}
      </header>
      {state ?? tabs.map((tab) => <div key={tab.id} className="cal-bare-body">{tab.panel}</div>)}
    </article>
  );
}

/**
 * Fallback for a host that does not present drawers (or refuses the open), and the
 * body of a presented drawer frame (`presented`, filling the host's drawer). Otherwise: the shared drawer shell, drawn inside this frame as a full-height right
 * drawer over a frame-wide scrim. While it is open the document behind it does not
 * scroll and Tab stays inside it. Escape, the scrim and the close control are the shell's own.
 */
export default function FrameDrawer({ presented = false, ...props }: Omit<DrawerShellProps, "geometry" | "scrim"> & { presented?: boolean }) {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A presented frame IS the host's drawer: nothing to lock or trap.
    if (presented) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = previous; };
  }, [presented]);
  useEffect(() => {
    if (presented) return;
    const trap = (event: KeyboardEvent) => {
      const panel = layer.current?.querySelector<HTMLElement>(".crm-drawer-shell");
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = nodes[0];
      const last = nodes.at(-1);
      const active = document.activeElement;
      // The title takes the initial focus, so it counts as the cycle start.
      const atStart = active === first || active === panel.querySelector(".crm-drawer-title") || !panel.contains(active);
      if (event.shiftKey && atStart) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (active === last || !panel.contains(active))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [presented]);
  if (presented) return <BareDrawer {...props} />;
  return <div className="cal-frame-drawer" ref={layer}><DrawerShell {...props} geometry={{ left: 0 }} /></div>;
}
