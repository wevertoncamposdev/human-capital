"use client";

export function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayLocalIsoDate() {
  return toLocalIsoDate(new Date());
}

function toDateOnlyIso(value: string | Date | null | undefined) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return toLocalIsoDate(value);
  }

  const text = String(value).trim();
  if (!text) return null;

  // Handles:
  // - "YYYY-MM-DD"
  // - "YYYY-MM-DDTHH:mm:ss..." (ISO coming from the API)
  const iso = text.length >= 10 ? text.slice(0, 10) : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return iso;
}

export function toDateInputValue(value: string | Date | null | undefined) {
  return toDateOnlyIso(value) ?? "";
}

export function formatDateOnlyPtBR(value: string | Date | null | undefined) {
  const iso = toDateOnlyIso(value);
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateTimePtBR(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
export function parseLocalDateOnly(value: string | Date | null | undefined) {
  const iso = toDateOnlyIso(value);
  if (!iso) return null;
  const [yearRaw, monthRaw, dayRaw] = iso.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export type DateBucket = "day" | "week" | "month" | "year";

function isoWeekOfLocalDate(date: Date) {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = localMidnight.getDay() || 7; // 1..7 (Mon..Sun)
  localMidnight.setDate(localMidnight.getDate() + 4 - day);
  const yearStart = new Date(localMidnight.getFullYear(), 0, 1);
  const diffDays = Math.floor((localMidnight.getTime() - yearStart.getTime()) / 86400000);
  const week = Math.ceil((diffDays + 1) / 7);
  return { year: localMidnight.getFullYear(), week };
}

export function bucketLocalDate(date: Date, bucket: DateBucket) {
  const isoDay = toLocalIsoDate(date);

  switch (bucket) {
    case "day":
      return { key: isoDay, label: formatDateOnlyPtBR(isoDay) };
    case "month": {
      const key = isoDay.slice(0, 7);
      const year = key.slice(0, 4);
      const month = key.slice(5, 7);
      return { key, label: `${month}/${year}` };
    }
    case "year": {
      const key = isoDay.slice(0, 4);
      return { key, label: key };
    }
    case "week": {
      const { year, week } = isoWeekOfLocalDate(date);
      const weekLabel = String(week).padStart(2, "0");
      return { key: `${year}-W${weekLabel}`, label: `W${weekLabel}/${year}` };
    }
    default:
      return { key: isoDay, label: formatDateOnlyPtBR(isoDay) };
  }
}

