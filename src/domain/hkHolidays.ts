import type { DatedEntry } from "./entries";

export type YMD = string; // YYYY-MM-DD
type Locale = "en" | "zh-TW";

export function hkHolidaysInRange(range: { from: YMD; to: YMD }, locale: Locale): DatedEntry[] {
  const holidays = [
    { date: "2025-01-01", titleEn: "The first day of January", titleZh: "一月一日" },
    { date: "2025-01-29", titleEn: "Lunar New Year's Day", titleZh: "農曆年初一" },
    { date: "2025-01-30", titleEn: "The second day of Lunar New Year", titleZh: "農曆年初二" },
    { date: "2025-01-31", titleEn: "The third day of Lunar New Year", titleZh: "農曆年初三" },
    { date: "2025-04-04", titleEn: "Ching Ming Festival", titleZh: "清明節" },
    { date: "2025-04-18", titleEn: "Good Friday", titleZh: "耶穌受難節" },
    { date: "2025-04-19", titleEn: "The day following Good Friday", titleZh: "耶穌受難節翌日" },
    { date: "2025-04-21", titleEn: "Easter Monday", titleZh: "復活節星期一" },
    { date: "2025-05-01", titleEn: "Labour Day", titleZh: "勞動節" },
    { date: "2025-05-05", titleEn: "The Birthday of the Buddha", titleZh: "佛誕" },
    { date: "2025-05-31", titleEn: "Tuen Ng Festival", titleZh: "端午節" },
    { date: "2025-07-01", titleEn: "HKSAR Establishment Day", titleZh: "香港特別行政區成立紀念日" },
    { date: "2025-10-01", titleEn: "National Day", titleZh: "國慶日" },
    { date: "2025-10-07", titleEn: "The day following the Chinese Mid-Autumn Festival", titleZh: "中秋節翌日" },
    { date: "2025-10-29", titleEn: "Chung Yeung Festival", titleZh: "重陽節" },
    { date: "2025-12-25", titleEn: "Christmas Day", titleZh: "聖誕節" },
    { date: "2025-12-26", titleEn: "The first weekday after Christmas Day", titleZh: "聖誕節後第一個周日" },
    { date: "2026-01-01", titleEn: "The first day of January", titleZh: "一月一日" },
    { date: "2026-02-17", titleEn: "Lunar New Year's Day", titleZh: "農曆年初一" },
    { date: "2026-02-18", titleEn: "The second day of Lunar New Year", titleZh: "農曆年初二" },
    { date: "2026-02-19", titleEn: "The third day of Lunar New Year", titleZh: "農曆年初三" },
    { date: "2026-04-03", titleEn: "Good Friday", titleZh: "耶穌受難節" },
    { date: "2026-04-04", titleEn: "The day following Good Friday", titleZh: "耶穌受難節翌日" },
    { date: "2026-04-06", titleEn: "The day following Ching Ming Festival", titleZh: "清明節翌日" },
    { date: "2026-04-07", titleEn: "The day following Easter Monday", titleZh: "復活節星期一翌日" },
    { date: "2026-05-01", titleEn: "Labour Day", titleZh: "勞動節" },
    { date: "2026-05-25", titleEn: "The day following the Birthday of the Buddha", titleZh: "佛誕翌日" },
    { date: "2026-06-19", titleEn: "Tuen Ng Festival", titleZh: "端午節" },
    { date: "2026-07-01", titleEn: "HKSAR Establishment Day", titleZh: "香港特別行政區成立紀念日" },
    { date: "2026-09-26", titleEn: "The day following the Chinese Mid-Autumn Festival", titleZh: "中秋節翌日" },
    { date: "2026-10-01", titleEn: "National Day", titleZh: "國慶日" },
    { date: "2026-10-19", titleEn: "The day following Chung Yeung Festival", titleZh: "重陽節翌日" },
    { date: "2026-12-25", titleEn: "Christmas Day", titleZh: "聖誕節" },
    { date: "2026-12-26", titleEn: "The first weekday after Christmas Day", titleZh: "聖誕節後第一個周日" },
    { date: "2027-01-01", titleEn: "The first day of January", titleZh: "一月一日" },
    { date: "2027-02-06", titleEn: "Lunar New Year's Day", titleZh: "農曆年初一" },
    { date: "2027-02-08", titleEn: "The third day of Lunar New Year", titleZh: "農曆年初三" },
    { date: "2027-02-09", titleEn: "The fourth day of Lunar New Year", titleZh: "農曆年初四" },
    { date: "2027-03-26", titleEn: "Good Friday", titleZh: "耶穌受難節" },
    { date: "2027-03-27", titleEn: "The day following Good Friday", titleZh: "耶穌受難節翌日" },
    { date: "2027-03-29", titleEn: "Easter Monday", titleZh: "復活節星期一" },
    { date: "2027-04-05", titleEn: "Ching Ming Festival", titleZh: "清明節" },
    { date: "2027-05-01", titleEn: "Labour Day", titleZh: "勞動節" },
    { date: "2027-05-13", titleEn: "The Birthday of the Buddha", titleZh: "佛誕" },
    { date: "2027-06-09", titleEn: "Tuen Ng Festival", titleZh: "端午節" },
    { date: "2027-07-01", titleEn: "HKSAR Establishment Day", titleZh: "香港特別行政區成立紀念日" },
    { date: "2027-09-16", titleEn: "The day following the Chinese Mid-Autumn Festival", titleZh: "中秋節翌日" },
    { date: "2027-10-01", titleEn: "National Day", titleZh: "國慶日" },
    { date: "2027-10-08", titleEn: "Chung Yeung Festival", titleZh: "重陽節" },
    { date: "2027-12-25", titleEn: "Christmas Day", titleZh: "聖誕節" },
    { date: "2027-12-27", titleEn: "The first weekday after Christmas Day", titleZh: "聖誕節後第一個周日" },
  ];

  return holidays
    .filter((h) => h.date >= range.from && h.date < range.to)
    .map((h) => ({
      source: "holiday",
      id: `hk-${h.date}`,
      date: h.date,
      title: locale === "en" ? h.titleEn : h.titleZh,
      state: "holiday",
      needs_you: false,
    }));
}
