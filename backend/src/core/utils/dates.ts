export function parseDateInput(
  value?: string | null,
  options?: { endOfDay?: boolean },
) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.includes('T')) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const suffix = options?.endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  // Date-only inputs (YYYY-MM-DD) must be interpreted as UTC to avoid timezone
  // shifts when the API is consumed from different timezones.
  const parsed = new Date(`${trimmed}${suffix}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
