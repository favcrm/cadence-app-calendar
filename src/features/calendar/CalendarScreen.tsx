import { Button, ErrorNotice, Loading } from "@cadence/screen-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { SECTIONS, type CalendarSection } from "../../bridge/channel";
import { useBridgeError, useSnapshot, useSurface } from "../../bridge/scope";
import { aboutContext } from "../../domain/surface";
import { zoneLabel, type Locale } from "../../domain/calendar";
import CalendarTab from "./CalendarTab";
import { AboutDrawer } from "./Drawers";
import { CalendarLocaleProvider, useLocale } from "./locale";
import PresentedDrawer from "./PresentedDrawer";
import RoutinesTab from "./RoutinesTab";
import { usePresenter } from "./usePresenter";
import "./calendar.css";

// Waiting longer than this for the first verified host push means the host is unreachable.
const HOST_PUSH_TIMEOUT_MS = 15000;
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export default function CalendarScreen() {
  const snapshot = useSnapshot();
  // Keep the last language through a lost connection, so the notice reads in the owner's language.
  const last = useRef<Locale>("en");
  if (snapshot) last.current = snapshot.presentationLocale;
  return <CalendarLocaleProvider locale={last.current}><Body /></CalendarLocaleProvider>;
}

function Body() {
  const snapshot = useSnapshot();
  const reason = useBridgeError();
  const surface = useSurface();
  const { present, hostDraws } = usePresenter();
  const { t } = useLocale();
  const [unreachable, setUnreachable] = useState(false);
  const [about, setAbout] = useState(false);
  // The company zone is only known once the host has answered; until then dates fall back to this device's zone and no zone is claimed.
  const [companyZone, setZone] = useState<string | null>(null);
  const zone = companyZone ?? browserZone();
  const onZone = useCallback((z: string) => setZone(z), []);
  // The host's sidebar (the declared navigation sections) is the only navigation: its route picks the view.
  const routeSection = snapshot?.route?.section;
  const section: CalendarSection = routeSection && SECTIONS.includes(routeSection) ? routeSection : "calendar";
  useEffect(() => { if (hostDraws) setAbout(false); }, [hostDraws]);
  useEffect(() => {
    if (snapshot) return;
    const timer = setTimeout(() => setUnreachable(true), HOST_PUSH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [snapshot]);

  if (!snapshot) {
    if (reason) return <main className="app-outlet cal"><ErrorNotice>{t("bridge.lost")} {reason}</ErrorNotice></main>;
    return <main className="app-outlet cal">{unreachable ? <ErrorNotice>{t("host.unreachable")}</ErrorNotice> : <Loading>{t("loading.host")}</Loading>}</main>;
  }
  // The host mounted this frame as its board drawer: draw only that drawer.
  if (surface.role === "drawer") return <PresentedDrawer name={surface.name} />;
  const now = new Date();
  const openAbout = () => present("about", aboutContext(companyZone), () => setAbout(true));
  const trailing = (
    <div className="cal-trailing">
      {companyZone && <button type="button" className="chip cal-zone" title={t("zone.title")} onClick={openAbout}>{zoneLabel(zone, now)}</button>}
      <Button size="sm" variant="ghost" aria-label={t("about.aria")} onClick={openAbout}>{t("about.button")}</Button>
    </div>
  );
  return (
    <main className="app-outlet cal" key={`${snapshot.scope.installId}:${snapshot.digest}`}>
      <div className="cal-panel" hidden={section !== "calendar"}><CalendarTab zone={zone} now={now} onZone={onZone} trailing={trailing} /></div>
      <div className="cal-panel" hidden={section !== "routines"}><RoutinesTab zone={zone} now={now} trailing={trailing} /></div>
      {about && !hostDraws && <AboutDrawer zone={companyZone} now={now} onClose={() => setAbout(false)} />}
    </main>
  );
}
