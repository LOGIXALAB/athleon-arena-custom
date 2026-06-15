"use client";

export interface ApiError {
  error: { code: string; message: string };
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit & { json?: unknown; manageToken?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) headers.set("Content-Type", "application/json");
  if (init?.manageToken) headers.set("x-manage-token", init.manageToken);
  const res = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as ApiError)?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
