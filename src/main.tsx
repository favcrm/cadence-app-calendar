import { ErrorNotice } from "@cadence/screen-ui";
import "@cadence/screen-ui/styles.css";
import { createRoot } from "react-dom/client";
import { channel } from "./bridge/channel";
import CalendarScreen from "./features/calendar/CalendarScreen";
const outlet = document.getElementById("root") ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: "root" }));
const root = createRoot(outlet);
try { channel.start(); root.render(<CalendarScreen />); }
catch (e) { root.render(<ErrorNotice>{e instanceof Error ? e.message : "Calendar bridge unavailable"}</ErrorNotice>); }
