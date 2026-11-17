import { EmptyState } from "@cadence/screen-ui";
import { useState } from "react";
import { listRoutines } from "../../bridge/calendarClient";
import { channel } from "../../bridge/channel";
import { formatDay, wallClock } from "../../domain/calendar";
import type { RoutineRow } from "../../domain/entries";
import { RoutineDrawer } from "./Drawers";
import Gate from "./Gate";
import { stateLabel, useLocale } from "./locale";
import { useOutcome } from "./useOutcome";

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function RoutinesTab({ zone, now }: { zone: string; now: Date }) {
  const { locale, t } = useLocale();
  const [phase, reload] = useOutcome(() => listRoutines(channel), "routines");
  const [open, setOpen] = useState<RoutineRow | null>(null);
  return (
    <section className="cal-routines" aria-labelledby="cal-routines-h">
      <Gate phase={phase} loadingId="loading.routines" errorId="error.routines" onRetry={reload}>
        {(routines) => (
          <>
            <h2 id="cal-routines-h" className="cal-h2">{t("routines.heading")} <span className="num">{routines.length}</span></h2>
            {routines.length === 0
              ? <EmptyState name="routines" title={t("routines.empty.title")}>{t("routines.empty.body")}</EmptyState>
              : <ul className="cal-rows cal-routine-list">
                {routines.map((r) => {
                  const next = r.next_run_at ? wallClock(r.next_run_at, zone) : null;
                  return (
                    <li key={r.id}>
                      <button type="button" className="cal-routine" onClick={() => setOpen(r)}>
                        <span className="cal-avatar" aria-hidden="true">{initials(r.name)}</span>
                        <span className="cal-routine-copy"><b>{r.name}</b><small>{r.agent} · {r.schedule_text}</small></span>
                        <span className="cal-routine-end">
                          <small>{next ? t("routines.next", { when: `${formatDay(next.date, locale)} ${next.time}` }) : t("routines.next.none")}</small>
                          {r.asks_first && <span className="chip">{t("routine.asks.badge")}</span>}
                          <span className="chip" data-status={r.status}>{r.status === "on" ? t("state.on") : stateLabel(r.status, t)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>}
          </>
        )}
      </Gate>
      {open && <RoutineDrawer routine={open} zone={zone} now={now} onClose={() => setOpen(null)} />}
    </section>
  );
}
