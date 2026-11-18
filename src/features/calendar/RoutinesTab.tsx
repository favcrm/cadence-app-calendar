import { EmptyState } from "@cadence/screen-ui";
import { useEffect, useState, type ReactNode } from "react";
import { listRoutines } from "../../bridge/calendarClient";
import { channel } from "../../bridge/channel";
import { formatDay, wallClock } from "../../domain/calendar";
import type { RoutineRow } from "../../domain/entries";
import { routineContext } from "../../domain/surface";
import { RoutineDrawer } from "./Drawers";
import Gate from "./Gate";
import { stateLabel, useLocale } from "./locale";
import { usePresenter } from "./usePresenter";
import { useOutcome } from "./useOutcome";

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function RoutinesTab({ zone, now, trailing }: { zone: string; now: Date; trailing: ReactNode }) {
  const { locale, t } = useLocale();
  const [phase, reload] = useOutcome(() => listRoutines(channel), "routines");
  const [open, setOpen] = useState<RoutineRow | null>(null);
  const { present, hostDraws } = usePresenter();
  // The host presenting a drawer takes over: drop any in-frame copy so exactly one drawer shows.
  useEffect(() => { if (hostDraws) setOpen(null); }, [hostDraws]);
  const openRoutine = (r: RoutineRow) => present("routine", routineContext(r, zone), () => setOpen(r));
  return (
    <section className="cal-routines" aria-labelledby="cal-routines-h">
      <div className="cal-toolbar cal-routines-head">
        <h2 id="cal-routines-h" className="cal-h2 cal-range">{t("routines.heading")}{phase.phase === "ready" && <> <span className="num">{phase.data.length}</span></>}</h2>
        {trailing}
      </div>
      <Gate phase={phase} loadingId="loading.routines" errorId="error.routines" onRetry={reload}>
        {(routines) => (
          <>
            {routines.length === 0
              ? <EmptyState name="routines" title={t("routines.empty.title")}>{t("routines.empty.body")}</EmptyState>
              : <ul className="cal-rows cal-routine-list">
                {routines.map((r) => {
                  const next = r.next_run_at ? wallClock(r.next_run_at, zone) : null;
                  return (
                    <li key={r.id}>
                      <button type="button" className="cal-routine" onClick={() => openRoutine(r)}>
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
      {open && !hostDraws && <RoutineDrawer routine={open} zone={zone} now={now} onClose={() => setOpen(null)} />}
    </section>
  );
}
