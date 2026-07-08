/*
 * Low-level HTTP client for the FiberMeter Express API.
 * Reads the base URL from VITE_API_URL and attaches the developer JWT (dashboard
 * auth) or an API key (usage ingestion) as a Bearer token. Errors are parsed
 * from the API's standard `{ error: { code, message, details } }` envelope.
 */

export const API_BASE = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
).replace(/\/$/, '');

const TOKEN_KEY = 'fibermeter_token';
const API_KEY_KEY = 'fibermeter_api_key';

function makeStore(key: string) {
  return {
    get: () => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
    set: (value: string) => localStorage.setItem(key, value),
    clear: () => localStorage.removeItem(key),
  };
}

/* Developer JWT used for dashboard-authenticated endpoints. */
export const tokenStore = makeStore(TOKEN_KEY);

/* Raw API key (fm_...) used only by the demo service to record usage. */
export const apiKeyStore = makeStore(API_KEY_KEY);

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  apiKey?: string | null;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const apiKey = options.apiKey;
  const token = options.token ?? tokenStore.get();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) {
    return null as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      err?.message ?? res.statusText ?? 'Request failed',
      err?.code ?? 'error',
      res.status,
      err?.details,
    );
  }

  return data as T;
}
