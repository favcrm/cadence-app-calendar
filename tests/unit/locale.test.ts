// The two locale columns stay in step. Run: bun test tests/unit/locale.test.ts
import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { en, zhTW } from "../../src/features/calendar/messages";
import { makeLocale, stateLabel } from "../../src/features/calendar/locale";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("en and zh-TW carry exactly the same ids", () => {
  expect(Object.keys(zhTW).sort()).toEqual(Object.keys(en).sort());
});

test("no message is empty and placeholders match", () => {
  for (const id of Object.keys(en) as (keyof typeof en)[]) {
    expect(zhTW[id].trim().length, id).toBeGreaterThan(0);
    expect(placeholders(zhTW[id]), id).toEqual(placeholders(en[id]));
  }
});

test("zh-TW is actually translated", () => {
  const same = (Object.keys(en) as (keyof typeof en)[]).filter((id) => en[id] === zhTW[id]);
  expect(same).toEqual([]);
});

const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });

test("every literal t(\"…\") id in the source exists", () => {
  const used = new Set<string>();
  for (const file of walk("src").filter((f) => /\.tsx?$/.test(f) && !f.endsWith("messages.ts"))) {
    for (const m of readFileSync(file, "utf8").matchAll(/\bt\(\s*"([a-zA-Z.]+)"/g)) used.add(m[1]);
    for (const m of readFileSync(file, "utf8").matchAll(/(?:loadingId|errorId|title|ids?)=?\W*\[?\[?"([a-z]+\.[a-zA-Z.]+)"/g)) used.add(m[1]);
  }
  expect(used.size).toBeGreaterThan(20);
  expect([...used].filter((id) => !(id in en))).toEqual([]);
});

test("every id that is built from a source, state, layer, view or tab exists", () => {
  for (const source of ["post", "crm", "routine", "task", "holiday"]) for (const family of ["source", "layer", "where"]) expect(`${family}.${source}` in en).toBe(true);
  for (const view of ["week", "month", "agenda"]) expect(`view.${view}` in en).toBe(true);
  for (const tab of ["calendar", "routines"]) expect(`tabs.${tab}` in en).toBe(true);
  for (const s of ["on", "paused", "repoint"]) expect(`state.${s}` in en).toBe(true);
});

test("placeholders are filled and an unknown state is shown as it is", () => {
  expect(makeLocale("en").t("entry.more", { count: 3 })).toBe("+3 more");
  expect(makeLocale("zh-TW").t("entry.more", { count: 3 })).toBe("另外 3 項");
  const { t } = makeLocale("en");
  expect(stateLabel("scheduled", t)).toBe("Scheduled");
  expect(stateLabel("awaiting_review", t)).toBe("Awaiting review");
});
