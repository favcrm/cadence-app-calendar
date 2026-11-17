import type { DatedEntry } from "../../domain/entries";
import { entryDay, entryTime, formatDay } from "../../domain/calendar";
import { stateLabel, useLocale } from "./locale";

function RailItem({ entry, zone, onOpen }: { entry: DatedEntry; zone: string; onOpen: (entry: DatedEntry) => void }) {
  const { locale, t } = useLocale();
  const time = entryTime(entry, zone);
  return (
    <li>
      <button type="button" className="cal-rail-item" data-source={entry.source} onClick={() => onOpen(entry)}>
        <b>{entry.title}</b>
        <small>{formatDay(entryDay(entry, zone), locale)}{time ? ` · ${time}` : ""} · {stateLabel(entry.state, t)}</small>
      </button>
    </li>
  );
}

/** Needs you, and drafts that have no slot yet. Both are derived from the same entries as the grid. */
export default function Rail({ needs, drafts, zone, onOpen }: { needs: DatedEntry[]; drafts: DatedEntry[]; zone: string; onOpen: (entry: DatedEntry) => void }) {
  const { t } = useLocale();
  return (
    <aside className="cal-rail" aria-label={t("rail.label")}>
      <section className="cal-rail-sec">
        <h2>{t("rail.needs")} <span className="num">{needs.length}</span></h2>
        {needs.length === 0 ? <p className="cal-rail-note">{t("rail.needs.empty")}</p> : <ul>{needs.map((e, i) => <RailItem key={`${e.source}:${e.id}:${i}`} entry={e} zone={zone} onOpen={onOpen} />)}</ul>}
      </section>
      <section className="cal-rail-sec">
        <h2>{t("rail.drafts")} <span className="num">{drafts.length}</span></h2>
        {drafts.length === 0 ? <p className="cal-rail-note">{t("rail.drafts.empty")}</p> : <ul>{drafts.map((e, i) => <RailItem key={`${e.source}:${e.id}:${i}`} entry={e} zone={zone} onOpen={onOpen} />)}</ul>}
      </section>
    </aside>
  );
}
