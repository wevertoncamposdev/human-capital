export type Group = {
  id: string;
  name: string;
  description?: string;
  color?: string;
};

export type GroupFormData = Omit<Group, "id">;
