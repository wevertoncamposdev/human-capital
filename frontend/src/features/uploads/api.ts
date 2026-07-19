"use client";

import { API_URL, type ApiError } from "@/lib/api";

export type UploadResponse = {
  path: string;
  mimeType?: string | null;
  size?: number | null;
  originalName?: string | null;
};

export async function uploadAvatar(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/avatars`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadHealthDocument(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/health-documents`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadTenantLogo(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/tenant-logos`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadActionPhoto(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/action-photos`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadPeopleAttachment(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/people-attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadPantryAttachment(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/pantry-attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadDepositAttachment(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/deposit-attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadTaskAttachment(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/task-attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadActionAttachment(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/action-attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadProjectAttachment(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/project-attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}

export async function uploadProgramAttachment(
  token: string,
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/files/program-attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as UploadResponse;
}
