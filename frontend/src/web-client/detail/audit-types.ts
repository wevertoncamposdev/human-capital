"use client";

export type DetailAuditLogAction = "CREATE" | "UPDATE" | "DELETE";

export type DetailAuditLogUser = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string | null;
};

export type DetailAuditLog = {
  id: string;
  action: DetailAuditLogAction;
  entity: string;
  entityId: string | null;
  before: unknown | null;
  after: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  userId: string | null;
  createdAt: string;
  user: DetailAuditLogUser | null;
};

export type DetailAuditLogListResponse = {
  data: DetailAuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type DetailAuditFeedItem = DetailAuditLog & {
  sourceKey: string;
  sourceLabel: string;
  fieldLabels?: Record<string, string>;
  valueFormatters?: Record<string, (value: unknown) => string>;
};

export type DetailAuditFeedState = {
  logs: DetailAuditFeedItem[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  reload: () => Promise<void>;
};
