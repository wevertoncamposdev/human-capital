"use client";

import type { Domain, DomainCondition } from "@/web-client/domain/types";

function normalizeString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

export function foldText(value: unknown) {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function includesFoldedText(haystack: unknown, needle: string) {
  const normalizedHaystack = foldText(haystack);
  const normalizedNeedle = foldText(needle);
  if (!normalizedNeedle) return true;
  if (!normalizedHaystack) return false;
  return normalizedHaystack.includes(normalizedNeedle);
}

function startsWithFoldedText(haystack: unknown, needle: string) {
  const normalizedHaystack = foldText(haystack);
  const normalizedNeedle = foldText(needle);
  if (!normalizedNeedle) return true;
  if (!normalizedHaystack) return false;
  return normalizedHaystack.startsWith(normalizedNeedle);
}

function endsWithFoldedText(haystack: unknown, needle: string) {
  const normalizedHaystack = foldText(haystack);
  const normalizedNeedle = foldText(needle);
  if (!normalizedNeedle) return true;
  if (!normalizedHaystack) return false;
  return normalizedHaystack.endsWith(normalizedNeedle);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeDateOnly(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return null;
}

function normalizeValues(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [value];
  return value.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyValue);
  return normalizeString(value) === "";
}

function equalsValue(actual: unknown, expected: unknown) {
  const actualDate = normalizeDateOnly(actual);
  const expectedDate = normalizeDateOnly(expected);
  if (actualDate && expectedDate) {
    return actualDate === expectedDate;
  }

  const actualNumber = toNumber(actual);
  const expectedNumber = toNumber(expected);
  if (actualNumber !== null && expectedNumber !== null) {
    return actualNumber === expectedNumber;
  }

  return foldText(actual) === foldText(expected);
}

function compareValue(actual: unknown, expected: unknown, operator: ">" | ">=" | "<" | "<=") {
  const actualDate = normalizeDateOnly(actual);
  const expectedDate = normalizeDateOnly(expected);
  if (actualDate && expectedDate) {
    if (operator === ">") return actualDate > expectedDate;
    if (operator === ">=") return actualDate >= expectedDate;
    if (operator === "<") return actualDate < expectedDate;
    return actualDate <= expectedDate;
  }

  const actualNumber = toNumber(actual);
  const expectedNumber = toNumber(expected);
  if (actualNumber === null || expectedNumber === null) return false;

  if (operator === ">") return actualNumber > expectedNumber;
  if (operator === ">=") return actualNumber >= expectedNumber;
  if (operator === "<") return actualNumber < expectedNumber;
  return actualNumber <= expectedNumber;
}

function matchesBetween(actual: unknown, expected: unknown) {
  if (!Array.isArray(expected)) return true;
  const [fromRaw, toRaw] = expected;

  const actualDate = normalizeDateOnly(actual);
  const fromDate = normalizeDateOnly(fromRaw);
  const toDate = normalizeDateOnly(toRaw);
  if (actualDate && (fromDate || toDate)) {
    if (fromDate && actualDate < fromDate) return false;
    if (toDate && actualDate > toDate) return false;
    return true;
  }

  const actualNumber = toNumber(actual);
  const fromNumber = toNumber(fromRaw);
  const toNumberValue = toNumber(toRaw);
  if (actualNumber !== null && (fromNumber !== null || toNumberValue !== null)) {
    if (fromNumber !== null && actualNumber < fromNumber) return false;
    if (toNumberValue !== null && actualNumber > toNumberValue) return false;
    return true;
  }

  return true;
}

function matchesConditionValue(actual: unknown, condition: DomainCondition) {
  const values = normalizeValues(actual);
  const value = condition.value;

  switch (condition.operator) {
    case "is_null":
      return values.every(isEmptyValue);
    case "not_null":
      return values.some((entry) => !isEmptyValue(entry));
    case "in":
      return Array.isArray(value) ? values.some((entry) => value.some((item) => equalsValue(entry, item))) : true;
    case "not_in":
      return Array.isArray(value)
        ? values.every((entry) => value.every((item) => !equalsValue(entry, item)))
        : true;
    case "contains":
    case "ilike":
      return values.some((entry) => includesFoldedText(entry, String(value ?? "")));
    case "starts_with":
      return values.some((entry) => startsWithFoldedText(entry, String(value ?? "")));
    case "ends_with":
      return values.some((entry) => endsWithFoldedText(entry, String(value ?? "")));
    case "between":
      return values.some((entry) => matchesBetween(entry, value));
    case "=":
      return values.some((entry) => equalsValue(entry, value));
    case "!=":
      return values.every((entry) => !equalsValue(entry, value));
    case ">":
    case ">=":
    case "<":
    case "<=":
      return values.some((entry) =>
        compareValue(entry, value, condition.operator as ">" | ">=" | "<" | "<="),
      );
    default:
      return true;
  }
}

export function matchesDomainRecord<TRecord extends Record<string, unknown>>(
  record: TRecord,
  domain: Domain,
  resolveFieldValue?: (record: TRecord, field: string) => unknown,
): boolean {
  if (!domain) return true;

  if (domain.type === "condition") {
    const actual = resolveFieldValue ? resolveFieldValue(record, domain.field) : record[domain.field];
    return matchesConditionValue(actual, domain);
  }

  if (domain.type === "not") {
    return !matchesDomainRecord(record, domain.child, resolveFieldValue);
  }

  if (domain.type === "group") {
    if (domain.combinator === "and") {
      return domain.children.every((child) => matchesDomainRecord(record, child, resolveFieldValue));
    }

    return domain.children.some((child) => matchesDomainRecord(record, child, resolveFieldValue));
  }

  return true;
}
