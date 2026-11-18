import { ErrorNotice, Loading } from "@cadence/screen-ui";
import { useEffect, useState } from "react";
import { channel } from "../../bridge/channel";
import { isSurfaceName, parseAboutContext, parseEntryContext, parseRoutineContext, type AboutContext, type EntryContext, type RoutineContext } from "../../domain/surface";
import { AboutDrawer, EntryDrawer, RoutineDrawer } from "./Drawers";
import FrameDrawer from "./FrameDrawer";
import { useLocale } from "./locale";

type Loaded = { status: "loading" } | { status: "invalid" } | { status: "entry"; context: EntryContext } | { status: "routine"; context: RoutineContext } | { status: "about"; context: AboutContext };

/** Pure: what a drawer frame draws for the surface the host named and the context it returned. */
export function resolveSurface(name: unknown, raw: unknown): Loaded {
  if (name === "entry") { const context = parseEntryContext(raw); return context ? { status: "entry", context } : { status: "invalid" }; }
  if (name === "routine") { const context = parseRoutineContext(raw); return context ? { status: "routine", context } : { status: "invalid" }; }
  if (name === "about") { const context = parseAboutContext(raw); return context ? { status: "about", context } : { status: "invalid" }; }
  return { status: "invalid" };
}

const closeHost = () => { void channel.bridge.closeDrawer().catch(() => undefined); };

/**
 * The frame the host mounts in its board drawer: ONLY the drawer's content (no
 * second shell, close or footer: the host's own header and x close it). Context is display data and
 * is re-validated here; this frame never opens another drawer.
 */
export default function PresentedDrawer({ name }: { name: string | undefined }) {
  const { t } = useLocale();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [now] = useState(() => new Date());
  useEffect(() => {
    let live = true;
    if (!isSurfaceName(name)) { setLoaded({ status: "invalid" }); return; }
    channel.bridge.drawerContext().then((raw) => { if (live) setLoaded(resolveSurface(name, raw)); }, () => { if (live) setLoaded({ status: "invalid" }); });
    return () => { live = false; };
  }, [name]);
  if (loaded.status === "entry") return <EntryDrawer presented entry={loaded.context.entry} zone={loaded.context.zone} now={now} onClose={closeHost} />;
  if (loaded.status === "routine") return <RoutineDrawer presented routine={loaded.context.routine} zone={loaded.context.zone} now={now} onClose={closeHost} />;
  if (loaded.status === "about") return <AboutDrawer presented zone={loaded.context.zone} now={now} onClose={closeHost} />;
  const state = loaded.status === "loading" ? <Loading>{t("drawer.loading")}</Loading> : <ErrorNotice>{t("drawer.unavailable")}</ErrorNotice>;
  return <FrameDrawer presented kind="entry" label={t("app.title")} title={t("app.title")} tabs={[]} state={state} onClose={closeHost} />;
}
