export type ApiPantrySector = {
  id: string;
  name: string;
};

export type PantrySectorsListResponse = {
  data: ApiPantrySector[];
};

export type PantrySectorInput = {
  name: string;
};

