// Тонкая обёртка над fetch для REST API.
import { auth } from './store.js';
import { t, lang } from './i18n.js';

export class ApiRequestError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, query } = {}) {
  let url = `/api${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '' && v !== false) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { Accept: 'application/json', 'Accept-Language': lang() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiRequestError(0, t('apiErr.network'));
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* пустой или не-JSON ответ */
  }

  if (!res.ok) {
    // Токен истёк или пользователь удалён — выходим из аккаунта.
    if (res.status === 401 && token) auth.clear();
    const err = data?.error;
    throw new ApiRequestError(res.status, err?.message || `Ошибка ${res.status}`, err?.details);
  }
  return data;
}
