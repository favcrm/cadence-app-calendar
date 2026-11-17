import { Button, ErrorNotice, Loading } from "@cadence/screen-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { SECTIONS, type CalendarSection } from "../../bridge/channel";
import { useBridgeError, useSnapshot } from "../../bridge/scope";
import { zoneLabel, type Locale } from "../../domain/calendar";
import CalendarTab from "./CalendarTab";
import { AboutDrawer } from "./Drawers";
import { CalendarLocaleProvider, useLocale } from "./locale";
import RoutinesTab from "./RoutinesTab";
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
  const { t } = useLocale();
  const [unreachable, setUnreachable] = useState(false);
  const [about, setAbout] = useState(false);
  // The company zone is only known once the host has answered; until then dates fall back to this device's zone and no zone is claimed.
  const [companyZone, setZone] = useState<string | null>(null);
  const zone = companyZone ?? browserZone();
  const [section, setSection] = useState<CalendarSection>("calendar");
  const onZone = useCallback((z: string) => setZone(z), []);
  const routeSection = snapshot?.route?.section;
  // The host's own section navigation drives the tab; in-app tabs just follow it too.
  useEffect(() => { if (routeSection) setSection(routeSection); }, [routeSection]);
  useEffect(() => {
    if (snapshot) return;
    const timer = setTimeout(() => setUnreachable(true), HOST_PUSH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [snapshot]);

  if (!snapshot) {
    if (reason) return <main className="app-outlet cal"><ErrorNotice>{t("bridge.lost")} {reason}</ErrorNotice></main>;
    return <main className="app-outlet cal">{unreachable ? <ErrorNotice>{t("host.unreachable")}</ErrorNotice> : <Loading>{t("loading.host")}</Loading>}</main>;
  }
  const now = new Date();
  return (
    <main className="app-outlet cal" key={`${snapshot.scope.installId}:${snapshot.digest}`}>
      <header className="cal-head">
        <nav className="app-outlet-tabs" aria-label={t("tabs.label")}>
          {SECTIONS.map((id) => (
            <button key={id} type="button" className="app-outlet-tab" data-on={id === section || undefined} aria-current={id === section ? "page" : undefined} onClick={() => setSection(id)}>{t(`tabs.${id}`)}</button>
          ))}
        </nav>
        <span className="cal-grow" />
        {companyZone && <button type="button" className="chip cal-zone" title={t("zone.title")} onClick={() => setAbout(true)}>{zoneLabel(zone, now)}</button>}
        <Button size="sm" variant="ghost" aria-label={t("about.aria")} onClick={() => setAbout(true)}>{t("about.button")}</Button>
      </header>
      <div hidden={section !== "calendar"}><CalendarTab zone={zone} now={now} onZone={onZone} /></div>
      <div hidden={section !== "routines"}><RoutinesTab zone={zone} now={now} /></div>
      {about && <AboutDrawer zone={companyZone} now={now} onClose={() => setAbout(false)} />}
    </main>
  );
}
