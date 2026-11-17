import type { DatedEntry } from "../../domain/entries";
import { dayOfMonth, eachDay, formatDay, formatWeekday, monthGrid, startOfWeek, viewRange, AGENDA_DAYS, type YMD } from "../../domain/calendar";
import EntryCard from "./Entry";
import { useLocale } from "./locale";

interface ViewProps {
  anchor: YMD;
  today: YMD;
  zone: string;
  byDay: Map<YMD, DatedEntry[]>;
  onOpen: (entry: DatedEntry) => void;
  onPickDay: (day: YMD) => void;
}

function DayHead({ day, today }: { day: YMD; today: YMD }) {
  const { locale, t } = useLocale();
  return (
    <header className="cal-dayhead" data-today={day === today || undefined}>
      <span className="cal-dayname">{formatWeekday(day, locale)}</span>
      <span className="cal-daynum">{dayOfMonth(day)}</span>
      {day === today && <span className="cal-today-chip">{t("day.today")}</span>}
    </header>
  );
}

export function WeekView({ anchor, today, zone, byDay, onOpen }: ViewProps) {
  return (
    <div className="cal-week" role="list">
      {eachDay(startOfWeek(anchor), 7).map((day) => (
        <section key={day} className="cal-daycol" role="listitem" aria-label={day} data-today={day === today || undefined}>
          <DayHead day={day} today={today} />
          <div className="cal-daylist">
            {(byDay.get(day) ?? []).map((entry, i) => <EntryCard key={`${entry.source}:${entry.id}:${i}`} entry={entry} zone={zone} onOpen={onOpen} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

const MONTH_LIMIT = 3;

export function MonthView({ anchor, today, zone, byDay, onOpen, onPickDay }: ViewProps) {
  const { locale, t } = useLocale();
  const month = anchor.slice(0, 7);
  const weeks = monthGrid(anchor);
  return (
    <div className="cal-month" role="grid" aria-label={month}>
      <div className="cal-month-head" role="row">
        {weeks[0].map((day) => <span key={day} role="columnheader">{formatWeekday(day, locale)}</span>)}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="cal-month-row" role="row">
          {week.map((day) => {
            const entries = byDay.get(day) ?? [];
            return (
              <div key={day} className="cal-cell" role="gridcell" data-today={day === today || undefined} data-outside={!day.startsWith(month) || undefined}>
                <button type="button" className="cal-cell-num" onClick={() => onPickDay(day)} aria-label={formatDay(day, locale)}>{dayOfMonth(day)}</button>
                <div className="cal-cell-list">
                  {entries.slice(0, MONTH_LIMIT).map((entry, i) => <EntryCard key={`${entry.source}:${entry.id}:${i}`} entry={entry} zone={zone} onOpen={onOpen} compact />)}
                  {entries.length > MONTH_LIMIT && <button type="button" className="cal-more" onClick={() => onPickDay(day)}>{t("entry.more", { count: entries.length - MONTH_LIMIT })}</button>}
                </div>
                {entries.length > 0 && <span className="cal-dots" aria-hidden="true">{entries.slice(0, 4).map((e, i) => <i key={i} data-source={e.source} />)}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AgendaView({ anchor, today, zone, byDay, onOpen }: ViewProps) {
  const { locale, t } = useLocale();
  const days = eachDay(viewRange("agenda", anchor).from, AGENDA_DAYS).filter((day) => byDay.has(day));
  if (days.length === 0) return <p className="cal-empty" role="status">{t("empty.view")}</p>;
  return (
    <div className="cal-agenda">
      {days.map((day) => (
        <section key={day} className="cal-agenda-day" aria-label={formatDay(day, locale)}>
          <h3 className="cal-agenda-head" data-today={day === today || undefined}>{formatDay(day, locale)}{day === today && <span className="cal-today-chip">{t("day.today")}</span>}</h3>
          <div className="cal-daylist">
            {byDay.get(day)!.map((entry, i) => <EntryCard key={`${entry.source}:${entry.id}:${i}`} entry={entry} zone={zone} onOpen={onOpen} showAllDay />)}
          </div>
        </section>
      ))}
    </div>
  );
}

