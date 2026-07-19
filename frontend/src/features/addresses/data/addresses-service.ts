"use client";

import type { Address, AddressFormData } from "@/features/addresses/domain/types";

const store = new Map<string, Address[]>();

const seed: Record<string, Address[]> = {
  "p-001": [
    {
      id: "addr-ana-01",
      label: "Residencial",
      zip: "04567-010",
      street: "Rua das Acacias",
      number: "245",
      complement: "Apto 41",
      neighborhood: "Jardim Azul",
      city: "Sao Paulo",
      state: "SP",
      country: "Brasil",
      isPrimary: true,
    },
  ],
  "p-002": [
    {
      id: "addr-bruno-01",
      label: "Residencial",
      zip: "20040-020",
      street: "Av. Central",
      number: "900",
      complement: "Casa",
      neighborhood: "Centro",
      city: "Rio de Janeiro",
      state: "RJ",
      country: "Brasil",
      isPrimary: true,
    },
  ],
  "p-003": [
    {
      id: "addr-carla-01",
      label: "Residencial",
      zip: "30110-011",
      street: "Rua do Sol",
      number: "55",
      complement: "Bloco B",
      neighborhood: "Savassi",
      city: "Belo Horizonte",
      state: "MG",
      country: "Brasil",
      isPrimary: true,
    },
  ],
};

const ensureSeed = () => {
  if (store.size > 0) return;
  Object.entries(seed).forEach(([personId, items]) => {
    store.set(personId, items.map((item) => ({ ...item })));
  });
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getAddressesByPersonId(
  personId: string,
): Promise<Address[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createAddress(
  personId: string,
  data: AddressFormData,
): Promise<Address> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateAddress(
  personId: string,
  addressId: string,
  data: AddressFormData,
): Promise<Address | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: Address | null = null;
  const next = current.map((item) => {
    if (item.id !== addressId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteAddress(
  personId: string,
  addressId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== addressId),
  );
}
