import { useCallback, useEffect, useState } from "react";
import type { Outcome, UnavailableReason } from "../../bridge/calendarClient";

export type Phase<T> =
  | { phase: "loading" }
  | { phase: "ready"; data: T }
  | { phase: "unavailable"; reason: UnavailableReason }
  | { phase: "error"; message: string };

/** Runs `load` whenever `key` changes and ignores an answer that arrives after a newer request. */
export function useOutcome<T>(load: () => Promise<Outcome<T>>, key: string): [Phase<T>, () => void] {
  const [phase, setPhase] = useState<Phase<T>>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setPhase({ phase: "loading" });
    load().then((outcome) => {
      if (!live) return;
      setPhase(outcome.status === "ok" ? { phase: "ready", data: outcome.data } : outcome.status === "unavailable" ? { phase: "unavailable", reason: outcome.reason } : { phase: "error", message: outcome.message });
    }, (error: unknown) => {
      if (live) setPhase({ phase: "error", message: error instanceof Error ? error.message : "The request failed" });
    });
    return () => { live = false; };
  }, [key, attempt]); // eslint-disable-line react-hooks/exhaustive-deps -- `load` is keyed by `key`
  return [phase, useCallback(() => setAttempt((n) => n + 1), [])];
}
