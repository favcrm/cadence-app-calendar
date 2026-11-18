import type { DatedEntry } from "../../domain/entries";
import { entryTime } from "../../domain/calendar";
import { stateLabel, useLocale } from "./locale";

/** One dated entry as a button. The source shows only as the colour stripe; text carries the meaning. */
export default function EntryCard({ entry, zone, onOpen, compact = false, showAllDay = false }: { entry: DatedEntry; zone: string; onOpen: (entry: DatedEntry) => void; compact?: boolean; showAllDay?: boolean }) {
  const { t } = useLocale();
  const time = entryTime(entry, zone);
  const status = entry.needs_you ? t("entry.needsYou") : stateLabel(entry.state, t);
  return (
    <button type="button" className="cal-entry" data-source={entry.source} data-needs={entry.needs_you || undefined} data-compact={compact || undefined}
      aria-label={`${entry.title}, ${time ?? t("entry.allDay")}, ${status}`} onClick={() => onOpen(entry)}>
      {(time || showAllDay) && <span className="cal-entry-time">{time ?? t("entry.allDay")}</span>}
      <span className="cal-entry-title">{entry.title}</span>
      {!compact && <span className="cal-entry-state">{status}</span>}
    </button>
  );
}
