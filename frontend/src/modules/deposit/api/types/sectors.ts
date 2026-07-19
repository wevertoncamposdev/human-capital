export type ApiDepositSector = {
  id: string;
  name: string;
};

export type DepositSectorsListResponse = {
  data: ApiDepositSector[];
};

export type DepositSectorInput = {
  name: string;
};

