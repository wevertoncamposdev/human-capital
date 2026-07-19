"use client";

export type AddressLike = {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
};

export function formatCep(value?: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildAddressLabel(input?: AddressLike) {
  if (!input) return null;
  const street = normalizeText(input.street);
  const number = normalizeText(input.number);
  const neighborhood = normalizeText(input.neighborhood);
  const city = normalizeText(input.city);
  const state = normalizeText(input.state);
  const cep = formatCep(input.cep);

  const left = street ? `${street}${number ? `, ${number}` : ""}` : null;
  const mid =
    neighborhood || city || state
      ? [neighborhood, city && state ? `${city}/${state}` : city ?? state]
          .filter(Boolean)
          .join(" - ")
      : null;
  const parts = [left, mid, cep].filter(Boolean);
  return parts.length ? parts.join(" • ") : null;
}

export function buildAddressQuery(input?: AddressLike) {
  if (!input) return null;
  const street = normalizeText(input.street);
  const number = normalizeText(input.number);
  const neighborhood = normalizeText(input.neighborhood);
  const city = normalizeText(input.city);
  const state = normalizeText(input.state);
  const cep = normalizeText(formatCep(input.cep));

  const line1 = street ? `${street}${number ? `, ${number}` : ""}` : null;
  const parts = [line1, neighborhood, city, state, cep].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function buildGoogleMapsSearchUrl(input?: AddressLike) {
  const query = buildAddressQuery(input);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

