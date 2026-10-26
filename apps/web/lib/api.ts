export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/**
 * Server components call the API directly; the browser goes through the
 * /api rewrite in next.config so cookies stay on our own domain.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = typeof window === 'undefined' ? process.env.API_URL ?? 'http://localhost:4000' : '/api';

  const res = await fetch(`${base}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? 'error', body.message ?? res.statusText, body.issues);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
