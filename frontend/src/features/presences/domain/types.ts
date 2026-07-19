export type PresenceStatus = "Presenca" | "Falta";

export type Presence = {
  id: string;
  date: string;
  status: PresenceStatus;
};

export type PresenceFormData = Omit<Presence, "id">;
