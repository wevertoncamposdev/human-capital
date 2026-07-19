"use client";

import type { Contact, ContactFormData } from "@/features/contacts/domain/types";

const store = new Map<string, Contact[]>();

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const seed: Record<string, Contact[]> = {
  "p-001": [
    {
      id: "c-ana-01",
      name: "Lucas Campos",
      relationship: "Responsavel",
      phone: "+55 11 97777-8888",
      email: "lucas.campos@exemplo.com",
      isPrimary: true,
    },
  ],
  "p-002": [
    {
      id: "c-bruno-01",
      name: "Marina Ferreira",
      relationship: "Familiar",
      phone: "+55 21 98888-1111",
      email: "marina.ferreira@exemplo.com",
      isPrimary: true,
    },
    {
      id: "c-bruno-02",
      name: "Julia Souza",
      relationship: "Emergencia",
      phone: "+55 21 93333-2222",
    },
  ],
  "p-003": [],
};

const ensureSeed = () => {
  if (store.size > 0) return;
  Object.entries(seed).forEach(([personId, contacts]) => {
    store.set(personId, contacts.map((contact) => ({ ...contact })));
  });
};

export async function getContactsByPersonId(
  personId: string,
): Promise<Contact[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createContact(
  personId: string,
  data: ContactFormData,
): Promise<Contact> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateContact(
  personId: string,
  contactId: string,
  data: ContactFormData,
): Promise<Contact | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: Contact | null = null;
  const next = current.map((item) => {
    if (item.id !== contactId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteContact(
  personId: string,
  contactId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== contactId),
  );
}
