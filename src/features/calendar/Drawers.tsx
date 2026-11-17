import { Button } from "@cadence/screen-ui";
import type { ReactNode } from "react";
import { entryDay, entryTime, formatLongDay, wallClock, zoneLabel } from "../../domain/calendar";
import type { DatedEntry, RoutineRow } from "../../domain/entries";
import FrameDrawer from "./FrameDrawer";
import { stateLabel, useLocale } from "./locale";
import type { MessageId } from "./messages";

const Detail = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="cal-detail">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
);

function CloseButton({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  return <Button size="sm" variant="primary" onClick={onClose}>{t("drawer.close")}</Button>;
}

export function EntryDrawer({ entry, zone, now, onClose, presented }: { entry: DatedEntry; zone: string; now: Date; onClose: () => void; presented?: boolean }) {
  const { locale, t } = useLocale();
  const time = entryTime(entry, zone);
  const when = `${formatLongDay(entryDay(entry, zone), locale)} · ${time ? `${time} ${zoneLabel(zone, now)}` : t("entry.allDay")}`;
  return (
    <FrameDrawer presented={presented} kind="entry" label={t(`source.${entry.source}`)} kicker={t(`source.${entry.source}`)} title={entry.title}
      pills={<><span className="chip" data-status={entry.state}>{stateLabel(entry.state, t)}</span>{entry.needs_you && <span className="chip" data-status="needs">{t("entry.needsYou")}</span>}</>}
      tabs={[{ id: "details", label: t("drawer.when"), panel: (
        <Detail rows={[
          [t("drawer.when"), when],
          [t("drawer.status"), stateLabel(entry.state, t)],
          [t("drawer.source"), t(`source.${entry.source}`)],
          [t("drawer.needs"), entry.needs_you ? t("drawer.needs.yes") : t("drawer.needs.no")],
          [t("drawer.where"), t(`where.${entry.source}`)],
        ]} />
      ) }]}
      primary={<CloseButton onClose={onClose} />} onClose={onClose} />
  );
}

export function RoutineDrawer({ routine, zone, now, onClose }: { routine: RoutineRow; zone: string; now: Date; onClose: () => void }) {
  const { locale, t } = useLocale();
  const next = routine.next_run_at ? wallClock(routine.next_run_at, zone) : null;
  const status = routine.status === "on" ? t("state.on") : stateLabel(routine.status, t);
  return (
    <FrameDrawer kind="routine" label={t("routine.kicker")} kicker={t("routine.kicker")} title={routine.name} subtitle={routine.agent}
      pills={<><span className="chip" data-status={routine.status}>{status}</span>{routine.asks_first && <span className="chip">{t("routine.asks.badge")}</span>}</>}
      tabs={[{ id: "details", label: t("routine.kicker"), panel: (
        <>
          <Detail rows={[
            [t("routine.agent"), routine.agent],
            [t("routine.schedule"), routine.schedule_text],
            [t("routine.nextRun"), next ? `${formatLongDay(next.date, locale)} · ${next.time} ${zoneLabel(zone, now)}` : t("routines.next.none")],
            [t("routine.status"), status],
            [t("routine.asks"), routine.asks_first ? t("routine.asks.yes") : t("routine.asks.no")],
          ]} />
          <p className="cal-hint">{t("routine.where")}</p>
        </>
      ) }]}
      primary={<CloseButton onClose={onClose} />} onClose={onClose} />
  );
}

function Section({ title, ids }: { title: MessageId; ids: [MessageId, Record<string, string>?][] }) {
  const { t } = useLocale();
  return <section className="cal-about-sec"><h4>{t(title)}</h4><ul>{ids.map(([id, params]) => <li key={id}>{t(id, params)}</li>)}</ul></section>;
}

export function AboutDrawer({ zone, now, onClose, presented }: { zone: string | null; now: Date; onClose: () => void; presented?: boolean }) {
  const { t } = useLocale();
  const zoneName = zone ? `${zone} (${zoneLabel(zone, now)})` : null;
  return (
    <FrameDrawer presented={presented} kind="about" label={t("about.title")} kicker={t("app.title")} title={t("about.title")} subtitle={t("about.subtitle")}
      tabs={[{ id: "about", label: t("about.title"), panel: (
        <div className="cal-about">
          <Section title="about.how" ids={[["about.how.1"], ["about.how.2"], ["about.how.3"]]} />
          <Section title="about.zone" ids={zoneName ? [["about.zone.1", { zone: zoneName }], ["about.zone.2"]] : [["about.zone.2"]]} />
          <Section title="about.holidays" ids={[["about.holidays.1"]]} />
          <section className="cal-about-sec">
            <h4>{t("about.access")}</h4>
            <ul className="cal-rows">
              <li><span><b>{t("access.dates.title")}</b><small>{t("access.dates.body")}</small></span><span className="chip" data-status="warn">{t("access.dates.badge")}</span></li>
              <li><span><b>{t("access.routines.title")}</b><small>{t("access.routines.body")}</small></span></li>
              <li><span><b>{t("access.storage.title")}</b><small>{t("access.storage.body")}</small></span></li>
            </ul>
            <p className="cal-hint">{t("about.never")}</p>
          </section>
        </div>
      ) }]}
      primary={<CloseButton onClose={onClose} />} onClose={onClose} />
  );
}
