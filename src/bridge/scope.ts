import { useSyncExternalStore } from "react";
import { channel, type CalendarBridge } from "./channel";

type Snapshot = ReturnType<CalendarBridge["getSnapshot"]>;

/** The host's last verified push, or `null` until the first one arrives. */
export function useSnapshot(): Snapshot {
  const bridge = channel.bridge;
  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
}

/** The reason the bridge closed, if it did. */
export function useBridgeError(): string | null {
  const bridge = channel.bridge;
  return useSyncExternalStore(bridge.subscribe, () => bridge.getState().error?.message ?? null);
}
