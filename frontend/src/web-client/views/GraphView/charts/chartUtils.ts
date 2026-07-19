"use client";

export type AxisLabelByValue = Map<string, string> | null;

export function safeLabel(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function truncateText(text: string, maxLen: number) {
  if (maxLen <= 0) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1))}\u2026`;
}

export function resolveAxisLabel(value: unknown, labelByAxisValue: AxisLabelByValue) {
  const key = safeLabel(value);
  return labelByAxisValue?.get(key) ?? key;
}

export function formatCategoryTick(
  value: unknown,
  labelByAxisValue: AxisLabelByValue,
  maxLen: number,
) {
  const raw = resolveAxisLabel(value, labelByAxisValue).trim();
  if (!raw) return "\u2014";
  return truncateText(raw, maxLen);
}

export function buildCategoryTicks(data: Array<Record<string, unknown>>, axisKey: string) {
  return data.map((row) => safeLabel(row[axisKey]));
}
