import { apiRequest } from "@/lib/api";
import type {
  ApiHouseholdAsset,
  ApiHouseholdProfile,
  ApiPersonAsset,
  ApiPersonAssetsGroup,
} from "./types";

export async function getHouseholdProfile(token: string, id: string) {
  return apiRequest<ApiHouseholdProfile | null>(
    `/people/${id}/household-profile`,
    {},
    token,
  );
}

export async function upsertHouseholdProfile(
  token: string,
  id: string,
  payload: Partial<ApiHouseholdProfile>,
) {
  return apiRequest<ApiHouseholdProfile>(
    `/people/${id}/household-profile`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function getHouseholdAssets(token: string, id: string) {
  return apiRequest<ApiHouseholdAsset[]>(
    `/people/${id}/household-assets`,
    {},
    token,
  );
}

export async function createHouseholdAsset(
  token: string,
  id: string,
  payload: Omit<
    ApiHouseholdAsset,
    "id" | "householdId" | "createdAt" | "updatedAt"
  >,
) {
  return apiRequest<ApiHouseholdAsset>(
    `/people/${id}/household-assets`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateHouseholdAsset(
  token: string,
  id: string,
  assetId: string,
  payload: Partial<
    Omit<ApiHouseholdAsset, "id" | "householdId" | "createdAt" | "updatedAt">
  >,
) {
  return apiRequest<ApiHouseholdAsset>(
    `/people/${id}/household-assets/${assetId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteHouseholdAsset(
  token: string,
  id: string,
  assetId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}/household-assets/${assetId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function getPersonAssets(token: string, id: string) {
  return apiRequest<ApiPersonAsset[]>(`/people/${id}/person-assets`, {}, token);
}

export async function getHouseholdPersonAssets(token: string, id: string) {
  return apiRequest<ApiPersonAssetsGroup[]>(
    `/people/${id}/household-person-assets`,
    {},
    token,
  );
}

export async function createPersonAsset(
  token: string,
  id: string,
  payload: Omit<ApiPersonAsset, "id" | "personId" | "createdAt" | "updatedAt">,
) {
  return apiRequest<ApiPersonAsset>(
    `/people/${id}/person-assets`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePersonAsset(
  token: string,
  id: string,
  assetId: string,
  payload: Partial<
    Omit<ApiPersonAsset, "id" | "personId" | "createdAt" | "updatedAt">
  >,
) {
  return apiRequest<ApiPersonAsset>(
    `/people/${id}/person-assets/${assetId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonAsset(
  token: string,
  id: string,
  assetId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}/person-assets/${assetId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

