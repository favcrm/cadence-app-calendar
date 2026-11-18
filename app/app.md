---
app: calendar
title: Calendar
version: '0.1.0'
summary: Your week in one place - posts, customer sends, routine runs and task due dates - plus a workspace-wide list of routines. Read-only; it stores nothing.
needs:
  connections: []
  requires:
    contracts: {app-screens: [1], screen-records: [1], screen-startup: [1]}
listing:
  tagline: See posts, customer sends, routines and due dates in one calendar
  category: operations
  tags: [calendar, routines, planning]
  publisher:
    name: Cadence
  about: Calendar shows what is planned across your workspace in one week, month or agenda view - scheduled posts, customer sends, routine runs and task due dates - and lists every routine with the agent that owns it. Times are shown in your company time zone. It reads dated summaries through the host (titles, times and status only, never customer lists or message text) and stores nothing of its own. Nothing is sent, approved or rescheduled from here.
  can:
    - Show scheduled posts, customer sends, routine runs and task due dates by week, month or agenda
    - Show what needs your approval and what is not scheduled yet
    - List every routine in the workspace with the agent that owns it
    - Show optional Hong Kong public holidays when you turn that layer on
  screenshots: []
  setup: []
  data:
    stores: []
    personal: false
---

# Calendar

Calendar is a read-only view over dates the host already holds. It keeps
no tables, files or settings of its own: the bundle requires
`app-screens`, `screen-records` and `screen-startup` v1 and no storage
contract.

The screen asks the host for a dated summary through two bridge
operations, `calendar.query` (a half-open `{from, to}` range of dates) and
`routines.list`, both declared in its screen manifest with
`records.call`. A Cadence host older than the release that adds them
refuses this bundle at install; on a host that offers them but refuses a
call, the screen says "Calendar needs a newer version of Cadence" and
shows no dates. It never invents entries and never shows an empty calendar in
place of an unavailable one.

What a host reply may carry is deliberately small: a title, a time or a
date, a status and whether the owner has to act. Customer lists and
message text never travel through this app. Times are shown in the
company time zone the host reports.
