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

// Загрузка файла (фото товара, аватарка): тело запроса — сам файл, а не JSON.
export async function apiUpload(blob, { path = '/uploads', method = 'POST' } = {}) {
  const headers = { Accept: 'application/json', 'Accept-Language': lang(), 'Content-Type': blob.type };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: blob });
  } catch {
    throw new ApiRequestError(0, t('apiErr.network'));
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth.token) auth.clear();
    throw new ApiRequestError(res.status, data?.error?.message || `Ошибка ${res.status}`, data?.error?.details);
  }
  return data;
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
