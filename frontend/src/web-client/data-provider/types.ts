"use client";

import type { Domain } from "@/web-client/domain/types";

export type SortDirection = "asc" | "desc";

export type SortSpec = { field: string; direction: SortDirection };

export type PaginationSpec = { pageIndex: number; pageSize: number };

export type DataProviderContext = Record<string, unknown>;

export type SearchArgs = {
  domain?: Domain;
  searchText?: string;
  groupBy?: string[];
  sort?: SortSpec[];
  pagination?: PaginationSpec;
  all?: boolean;
  context?: DataProviderContext;
};

export type SearchPagination = {
  total: number;
  pages: number;
  page: number;
  limit: number;
};

export type SearchResult<T> = {
  data: T[];
  pagination: SearchPagination;
  meta?: Record<string, unknown>;
};

export type DataProvider = {
  search<T>(model: string, args: SearchArgs): Promise<SearchResult<T>>;
  read<T>(model: string, id: string): Promise<T>;
  create<T>(model: string, payload: unknown): Promise<T>;
  update<T>(model: string, id: string, payload: unknown): Promise<T>;
  delete(model: string, id: string): Promise<void>;
};

