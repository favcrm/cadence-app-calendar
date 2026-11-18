import { Button, Notice } from "@cadence/screen-ui";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { queryCalendar } from "../../bridge/calendarClient";
import { channel } from "../../bridge/channel";
import { groupByDay, rangeLabel, stepAnchor, todayIn, viewRange, type ViewMode, type YMD } from "../../domain/calendar";
import { hkHolidaysInRange } from "../../domain/hkHolidays";
import { SOURCES, type DatedEntry, type QueryReply, type Source } from "../../domain/entries";
import { entryContext } from "../../domain/surface";
import { EntryDrawer } from "./Drawers";
import Gate from "./Gate";
import { useLocale } from "./locale";
import Rail from "./Rail";
import { usePresenter } from "./usePresenter";
import { useOutcome } from "./useOutcome";
import { AgendaView, MonthView, WeekView } from "./Views";

const VIEWS: ViewMode[] = ["week", "month", "agenda"];
const DEFAULT_LAYERS: Record<Source, boolean> = { post: true, crm: true, routine: true, task: true, holiday: false };
const NARROW = "(max-width: 759px)";

function Results({ reply, view, anchor, today, layers, onOpen, onPickDay }: { reply: QueryReply; view: ViewMode; anchor: YMD; today: YMD; layers: Record<Source, boolean>; onOpen: (e: DatedEntry) => void; onPickDay: (day: YMD) => void }) {
  const { locale, t } = useLocale();
  const { zone } = reply;
  const holidays = useMemo(() => layers.holiday ? hkHolidaysInRange({ from: rangeLabel(view, anchor, "sv-SE").split(' ')[0]!, to: rangeLabel(view, stepAnchor(view, anchor, 1), "sv-SE").split(' ')[0]! }, locale) : [], [layers.holiday, view, anchor, locale]);
  const combined = useMemo(() => {
    const raw = [...reply.entries, ...holidays.filter(h => !reply.sources.some(s => s.source === "holiday"))];
    return raw.filter((e) => layers[e.source]);
  }, [reply, holidays, layers]);
  const shown = combined;
  const grid = useMemo(() => shown.filter((e) => e.state !== "draft"), [shown]);
  const drafts = useMemo(() => shown.filter((e) => e.state === "draft"), [shown]);
  const needs = useMemo(() => [...groupByDay(shown.filter((e) => e.needs_you && e.state !== "draft"), zone).values()].flat(), [shown, zone]);
  const byDay = useMemo(() => groupByDay(grid, zone), [grid, zone]);
  const missing = reply.sources.filter((s) => !s.ok && layers[s.source]).map((s) => t(`layer.${s.source}`));
  const props = { anchor, today, zone, byDay, onOpen, onPickDay };
  return (
    <>
      {missing.length > 0 && <Notice state="partial">{t("partial.notice", { sources: missing.join(", ") })}</Notice>}
      <div className="cal-body">
        <div className="cal-main" data-view={view}>
          {view === "week" ? <WeekView {...props} /> : view === "month" ? <MonthView {...props} /> : <AgendaView {...props} />}
          {grid.length === 0 && view !== "agenda" && <p className="cal-empty" role="status">{t("empty.view")}</p>}
        </div>
        <Rail needs={needs} drafts={drafts} zone={zone} onOpen={onOpen} />
      </div>
    </>
  );
}

export default function CalendarTab({ zone, now, onZone, trailing }: { zone: string; now: Date; onZone: (zone: string) => void; trailing: ReactNode }) {
  const { locale, t } = useLocale();
  const [view, setView] = useState<ViewMode>(() => (typeof matchMedia === "function" && matchMedia(NARROW).matches ? "agenda" : "week"));
  const [pinned, setPinned] = useState<YMD | null>(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [open, setOpen] = useState<DatedEntry | null>(null);
  const { present, hostDraws } = usePresenter();
  const today = todayIn(zone, now);
  const anchor = pinned ?? today;
  const range = viewRange(view, anchor);
  const [phase, reload] = useOutcome(() => queryCalendar(channel, range), `${range.from}|${range.to}`);
  const replyZone = phase.phase === "ready" ? phase.data.zone : null;
  useEffect(() => { if (replyZone && replyZone !== zone) onZone(replyZone); }, [replyZone, zone, onZone]);
  useEffect(() => { if (hostDraws) setOpen(null); }, [hostDraws]);
  const openEntry = (entry: DatedEntry) => present("entry", entryContext(entry, replyZone ?? zone), () => setOpen(entry));
  const offeredSources = useMemo(() => phase.phase === "ready" ? new Set(phase.data.sources.map(s => s.source)) : new Set<Source>(), [phase]);

  return (
    <section className="cal-calendar" aria-label={t("tabs.calendar")}>
      <div className="cal-toolbar">
        <div className="cal-nav" role="group" aria-label={t("nav.today")}>
          <Button size="sm" aria-label={t("nav.prev")} onClick={() => setPinned(stepAnchor(view, anchor, -1))}>‹</Button>
          <Button size="sm" onClick={() => setPinned(null)}>{t("nav.today")}</Button>
          <Button size="sm" aria-label={t("nav.next")} onClick={() => setPinned(stepAnchor(view, anchor, 1))}>›</Button>
        </div>
        <h2 className="cal-range" aria-live="polite">{rangeLabel(view, anchor, locale)}</h2>
        <div className="cal-views" role="group" aria-label={t("view.label")}>
          {VIEWS.map((v) => <Button key={v} size="sm" variant={v === view ? "primary" : "secondary"} aria-pressed={v === view} onClick={() => setView(v)}>{t(`view.${v}`)}</Button>)}
        </div>
        {trailing}
      </div>
      <div className="cal-layers" role="group" aria-label={t("layers.label")}>
        {SOURCES.filter(s => s === "holiday" || offeredSources.has(s)).map((s) => <Button key={s} size="sm" variant={layers[s] ? "primary" : "secondary"} aria-pressed={layers[s]} onClick={() => setLayers({ ...layers, [s]: !layers[s] })}>{t(`layer.${s}`)}</Button>)}
      </div>
      <Gate phase={phase} loadingId="loading.calendar" errorId="error.calendar" onRetry={reload}>
        {(reply) => <Results reply={reply} view={view} anchor={anchor} today={todayIn(reply.zone, now)} layers={layers} onOpen={openEntry} onPickDay={(day) => { setPinned(day); setView("week"); }} />}
      </Gate>
      {open && !hostDraws && <EntryDrawer entry={open} zone={replyZone ?? zone} now={now} onClose={() => setOpen(null)} />}
    </section>
  );
}
