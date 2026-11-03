const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

export async function apiRequest(path, { method = 'GET', body, headers = {}, ...options } = {}) {
  const url = `${baseUrl}${path}`;
  const payload = body !== undefined ? JSON.stringify(body) : undefined;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: payload,
    ...options,
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Request failed');
  }

  return data;
}

export function apiGet(path, options = {}) {
  return apiRequest(path, { method: 'GET', ...options });
}

export function apiPost(path, body, options = {}) {
  return apiRequest(path, { method: 'POST', body, ...options });
}

export function apiPatch(path, body, options = {}) {
  return apiRequest(path, { method: 'PATCH', body, ...options });
}

export function apiDelete(path, options = {}) {
  return apiRequest(path, { method: 'DELETE', ...options });
}
