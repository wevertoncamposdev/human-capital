import { apiRequest, buildQuery } from "@/lib/api";

export type AccessLogAction = "LOGIN" | "REFRESH" | "LOGOUT";

export type AccessLog = {
  id: string;
  action: AccessLogAction;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export type CurrentUserRole = {
  id: string;
  name: string;
  description?: string | null;
};

export type MentionableUser = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export type CurrentUserProfile = {
  id: string;
  name?: string | null;
  email: string;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
  isActive: boolean;
  mfaTotpEnabled?: boolean;
  roles: CurrentUserRole[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type TenantProfile = {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
  cnpj?: string | null;
  startYear?: number | null;
  description?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AccessLogListResponse = {
  data: AccessLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function getAccessLogs(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    action?: AccessLogAction;
    search?: string;
  },
) {
  const query = buildQuery(params);
  return apiRequest<AccessLogListResponse>(`/auth/access-logs${query}`, {}, token);
}

export async function getCurrentUser(token: string) {
  return apiRequest<CurrentUserProfile>('/users/me', {}, token);
}

export async function listMentionableUsers(
  token: string,
  params: {
    permission: string;
    search?: string;
  },
) {
  const query = buildQuery(params);
  return apiRequest<MentionableUser[]>(`/users/mentionable${query}`, {}, token);
}

export async function updateMyProfile(
  token: string,
  payload: {
    name?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
  },
) {
  return apiRequest<CurrentUserProfile>(
    "/users/me",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function getTenantProfile(token: string) {
  return apiRequest<TenantProfile>('/tenants/me', {}, token);
}

export async function updateTenantProfile(
  token: string,
  payload: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    cnpj?: string;
    startYear?: number;
    description?: string;
  },
) {
  return apiRequest<TenantProfile>(
    '/tenants/me',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function requestPasswordReset(email: string) {
  return apiRequest<{ ok: true }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: { token: string; password: string }) {
  return apiRequest<{ ok: true }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
