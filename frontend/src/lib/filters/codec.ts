import type { FilterSchema } from "./types";

export function parseFiltersFromSearchParams<
  TValues extends Record<string, unknown>,
>(
  schema: FilterSchema<TValues>,
  searchParams: URLSearchParams,
  defaults: TValues,
) {
  const next = { ...defaults } as TValues;
  schema.forEach((field) => {
    const apiKey = field.apiKey ?? field.key;
    const raw = searchParams.get(apiKey);
    if (raw == null) return;

    if (field.type === "select") {
      const option = field.options.find((o) => o.value === raw);
      (next as Record<string, unknown>)[field.key] = option
        ? option.value
        : raw;
      return;
    }

    (next as Record<string, unknown>)[field.key] = raw;
  });
  return next;
}

export function buildSearchParamsFromFilters<
  TValues extends Record<string, unknown>,
>(
  schema: FilterSchema<TValues>,
  values: TValues,
  defaults: TValues,
) {
  const params = new URLSearchParams();
  schema.forEach((field) => {
    const value = (values as Record<string, unknown>)[field.key];
    const apiKey = field.apiKey ?? field.key;
    const omit =
      value == null ||
      value === "" ||
      value === (defaults as Record<string, unknown>)[field.key] ||
      (field.omitWhen ? field.omitWhen(value, values) : false);
    if (omit) return;
    params.set(apiKey, String(value));
  });
  return params;
}

export function areFilterValuesEqual<TValues extends Record<string, unknown>>(
  a: TValues,
  b: TValues,
) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  return aKeys.every(
    (key) => String(aRecord[key] ?? "") === String(bRecord[key] ?? ""),
  );
}
