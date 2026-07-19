"use client";

function normalizeTagValue(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeTags(tags?: Iterable<string> | null) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags ?? []) {
    const nextTag = normalizeTagValue(String(tag ?? ""));
    if (!nextTag) continue;

    const key = nextTag.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(nextTag);
  }

  return normalized;
}

export function parseDelimitedTags(input: string) {
  return normalizeTags(input.split(","));
}

export function formatDelimitedTags(tags?: Iterable<string> | null) {
  return normalizeTags(tags).join(", ");
}

export function areTagsEqual(left?: Iterable<string> | null, right?: Iterable<string> | null) {
  return JSON.stringify(normalizeTags(left)) === JSON.stringify(normalizeTags(right));
}
