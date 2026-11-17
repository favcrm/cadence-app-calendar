import { EmptyState, ErrorNotice, Loading } from "@cadence/screen-ui";
import type { ReactNode } from "react";
import type { Phase } from "./useOutcome";
import { useLocale } from "./locale";
import type { MessageId } from "./messages";

/** Loading, unavailable and error states shared by both tabs; renders `children` only for ready data. */
export default function Gate<T>({ phase, loadingId, errorId, onRetry, children }: { phase: Phase<T>; loadingId: MessageId; errorId: MessageId; onRetry: () => void; children: (data: T) => ReactNode }) {
  const { t } = useLocale();
  if (phase.phase === "loading") return <Loading>{t(loadingId)}</Loading>;
  if (phase.phase === "error") return <ErrorNotice onRetry={onRetry} retryLabel={t("retry")}>{t(errorId)}</ErrorNotice>;
  if (phase.phase === "unavailable") {
    const body: MessageId = phase.reason === "not-offered" ? "unavailable.missing" : phase.reason === "refused" ? "unavailable.refused" : "unavailable.malformed";
    return <EmptyState name="unavailable" title={t("unavailable.title")}>{t(body)}</EmptyState>;
  }
  return <>{children(phase.data)}</>;
}
