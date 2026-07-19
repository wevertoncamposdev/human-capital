"use client";

export type FavoriteDefinition<TState> = {
  id: string;
  name: string;
  state: TState;
  createdAt: string;
};

export function loadFavorites<TState>(key: string): Array<FavoriteDefinition<TState>> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as Array<FavoriteDefinition<TState>>;
  } catch {
    return [];
  }
}

export function saveFavorites<TState>(
  key: string,
  value: Array<FavoriteDefinition<TState>>,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

