import { ApiError } from "@cadence/screen-ui";
import { createScreenBridge, type ScreenBridge } from "@cadence/app-kit";
import type { HostCalls } from "./calendarClient";

export type CalendarSection = "calendar" | "routines";
export type CalendarView = "list";
export const SECTIONS: readonly CalendarSection[] = ["calendar", "routines"];

/**
 * The operations the screen asks for. They are NOT listed in the screen
 * manifest (`screens.json`): a host refuses an operation it does not know, so
 * the bundle declares none until a host release ships them. Without a
 * declaration the host never lists them among the pushed actions, `can()` is
 * false, and the client reports "unavailable" without sending anything. When a
 * host release declares them, nothing here changes.
 */
export const CLIENT_CALLS: Record<string, readonly string[]> = {
  "calendar.query": ["from", "to"],
  "routines.list": [],
};

export type CalendarBridge = ScreenBridge<CalendarSection, CalendarView, ApiError>;

export function createCalendarBridge(): CalendarBridge {
  return createScreenBridge<CalendarSection, CalendarView, ApiError>({
    tag: "calendar",
    appName: "calendar",
    records: true,
    locale: true,
    // Host-local presentation verbs only (open/close/context); they are not records operations and add none to screens.json.
    surfaces: true,
    calls: CLIENT_CALLS,
    route: { sections: SECTIONS, defaultSection: "calendar", views: ["list"] },
    maxInFlight: 4,
    timeoutMs: 65000,
    createError: (message, status, options) => new ApiError(message, status, options),
  });
}

export class Channel implements HostCalls {
  private instance: CalendarBridge | null = null;
  private initialSurface: unknown = null;

  get bridge(): CalendarBridge {
    if (!this.instance) {
      this.instance = createCalendarBridge();
      this.initialSurface = this.instance.getState().surface;
    }
    return this.instance;
  }

  start(): void {
    this.bridge.start();
    const state = this.bridge.getState();
    if (state.status === "error" && state.error) throw state.error;
  }

  /**
   * True once the host has sent its surface message, which only a host that
   * negotiated `screen-surfaces.v1` does. Until then (older host, no host) the
   * screen keeps its own in-frame drawer.
   */
  hostPresents = (): boolean => this.bridge.getState().surface !== this.initialSurface;

  offers = (verb: string): boolean => this.bridge.can(verb);

  request = (verb: string, args: Record<string, unknown>): Promise<unknown> => {
    const snapshot = this.bridge.getSnapshot();
    if (!snapshot || this.bridge.getState().status === "error") {
      return Promise.reject(new ApiError("The Calendar bridge is unavailable", 503, { code: "unavailable" }));
    }
    // A refusal must not close the whole screen: the screen reports "unavailable" itself.
    return this.bridge.call(snapshot.scope, verb, args, { keepAliveOnForbidden: true });
  };
}

export const createChannel = (): Channel => new Channel();
export const channel = createChannel();
