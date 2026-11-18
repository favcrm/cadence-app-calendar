# Cadence Calendar App

App identity: `calendar`. The repository name does not change installation identities.

Calendar shows a small business owner's week in one place: scheduled posts,
customer sends, routine runs and task due dates, optional Hong Kong public
holidays, plus a workspace-wide list of routines with the agent that owns each.

- **Calendar** tab: Week, Month and Agenda (Agenda by default on a phone), with
  layer chips (Posts, Customers, Routines, Tasks due, HK holidays - holidays are
  off by default), a rail for "Needs you" and "Not scheduled yet", and drawers for
  an entry and for "About" (how it works, company time zone, holidays, what it can
  access). Tasks appear only on their due date.
- **Routines** tab: every routine, its agent, schedule, next run and status.

It is read-only and stores nothing. Times are shown in the company time zone the
host reports.

## Status: waiting for host operations

The screen asks the host for two bridge operations, `calendar.query` (a half-open
`{from, to}` range of `YYYY-MM-DD`) and `routines.list`. They are not in a released
Cadence yet, and a host refuses an unknown operation in a screen manifest, so this
bundle declares none. Until a host offers them the screen shows "Calendar needs a
newer version of Cadence" and no dates; it never fills in fake data and never
shows an empty calendar in place of an unavailable one.

The typed contract is in `src/domain/entries.ts`; `src/bridge/calendarClient.ts`
validates every reply strictly and turns a refusal, an unknown operation or a
malformed reply into the unavailable state.

## Local development

Use the Node version in `screen-ui.lock.json` and the pnpm version in `package.json`.
The shared screen SDK archive is committed; the released app-kit bridge is vendored
at `app-kit/` and pinned by `app-kit.lock.json`. The build reads the SDK from
`.cadence-ui/package`, which CI extracts from the committed archive (see the first
step in `.github/workflows/ci.yml`); extract it the same way locally before the
first build.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the printed `/dev/preview/` URL (it defaults to `localhost`; app-kit rejects
HTTP IP-literal parents). For Cadence versions supporting package development:

```sh
cadence app dev --package . --port 3186
```

The preview is a fake host at the transport boundary (`dev/preview/host.ts`)
answering the two operations from synthetic fixtures. Switch the scenario, language
and theme from the bar at the top: a host that offers dates, an older Cadence with
no operations, a refusal, a malformed reply, a transient error, one unreadable
source, an empty workspace and a slow host. It is not an authenticated host session
and nothing is stored. If a port is occupied, choose another in 3110-3199:

```sh
CADENCE_APP_PORT=3193 pnpm dev
```

## Layout

- `src/domain/` - the dated-entry contract and pure date logic (no date library).
- `src/bridge/` - the app-kit bridge and the host client.
- `src/features/calendar/` - screens, drawers and the two locale catalogs.
- `app/` - the installable package: `app.md`, a minimal text-only workflow the
  toolchain requires, and the generated `screens/calendar/`.
- `dev/preview/` - local tooling only; not part of the screen build.
- `scripts/` - build, verify, packaging; `tests/` - unit, contract and packaging tests.

## Checks

```sh
pnpm typecheck
pnpm build
pnpm verify
pnpm test
python3 scripts/package_app.py check --source app
cadence app check app --json
```

Calendar has no storage, so `cadence app check` must exit 0 with `ok: true`. A local
pass is not installation, host, or production evidence.

## Release delivery

The manifest's plain `X.Y.Z` version and a matching `vX.Y.Z` tag identify an
immutable release. The `publish` workflow is tag-driven and OIDC-only; it is a
human release step and is never run from an agent session. Source, catalogue
publication and live installation are different states.
