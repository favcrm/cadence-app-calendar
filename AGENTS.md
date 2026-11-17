# Cadence Calendar App development

Read README.md first. The app id is `calendar`; repository names do not change
installation identities.

This repository is public: no credentials, tokens, real people, customer data,
real prices, internal hostnames or workspace paths. Fixtures use invented
people (the "Lantern Lane Café" workspace) and the reserved `example.invalid`
domain.

Cadence keeps scope, data, approvals and every write; this app stores nothing
and changes nothing. The screen uses only the pinned `@cadence/app-kit` bridge
and `@cadence/screen-ui`; never add a private `postMessage` receiver, a copy of
the host frame or host CSS, and never reach for another app's records.

The host data operations `calendar.query` and `routines.list` do not exist in a
released Cadence yet. The host refuses an operation it does not know, so
`app/screens/calendar/screens.json` declares **no** operations (the build
writes it; never hand-edit its digests) and the screen reads "unavailable" -
"Calendar needs a newer version of Cadence" - rather than inventing dates or
showing an empty calendar. Declare the operations only in the release that
follows the host release that ships them, and add them to the build inventory
in `scripts/screen_inputs.mjs` in the same change. The bundle must not require
`app-storage`: a native `cadence app check` refuses it (exit 3).

Replies are parsed strictly in `src/domain/entries.ts`; a reply that is not
exactly the typed contract is "unavailable", never repaired. Times are shown in
the company time zone the host reports; date logic lives in
`src/domain/calendar.ts` and takes "now" as an argument. Mocks live only in
`dev/preview/`, at the transport boundary - never as branches or dummy arrays in
a component. Keep both locales (`en`, `zh-TW`) complete; the locale test checks.

Work on a branch, open a draft PR, keep tests under `tests/`. Never tag or
publish from an agent session without the owner's say; `publish.yml` is a
human release step.
