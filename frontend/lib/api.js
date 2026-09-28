const API_BASE_URL = '/api/v1';

/**
 * Fetch wrapper that attaches JWT token and handles JSON response
 */
export async function apiFetch(endpoint, options = {}) {
  const rawToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}
