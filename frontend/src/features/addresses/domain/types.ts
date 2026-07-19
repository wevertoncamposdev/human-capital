export type Address = {
  id: string;
  label?: string;
  zip: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  country?: string;
  isPrimary?: boolean;
};

export type AddressFormData = Omit<Address, "id">;
