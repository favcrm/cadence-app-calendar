import { LocaleTextProvider } from "@cadence/screen-ui";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { intlLocale, type Locale } from "../../domain/calendar";
import { en, uiZhTW, zhTW, type MessageId } from "./messages";

export interface LocaleValue {
  locale: Locale;
  /** Copy by id, with `{name}` placeholders filled from `params`. */
  t: (id: MessageId, params?: Record<string, string | number>) => string;
  intl: string;
}

const fill = (text: string, params?: Record<string, string | number>) =>
  params ? text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole)) : text;

export const makeLocale = (locale: Locale): LocaleValue => {
  const catalog: Record<MessageId, string> = locale === "zh-TW" ? zhTW : en;
  return { locale, intl: intlLocale(locale), t: (id, params) => fill(catalog[id], params) };
};

const LocaleContext = createContext<LocaleValue>(makeLocale("en"));

/** Host-selected display data only. No preferences, session or authority access. */
export function CalendarLocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => makeLocale(locale), [locale]);
  const ui = useMemo(() => (locale === "zh-TW" ? (english: string) => uiZhTW[english] ?? english : (english: string) => english), [locale]);
  return <LocaleContext.Provider value={value}><LocaleTextProvider value={ui}>{children}</LocaleTextProvider></LocaleContext.Provider>;
}
export const useLocale = () => useContext(LocaleContext);

/** A state token as readable text; an unknown token is shown as it is, never hidden. */
export const stateLabel = (state: string, t: LocaleValue["t"]): string => {
  const id = `state.${state}` as MessageId;
  return id in en ? t(id) : state.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
};
