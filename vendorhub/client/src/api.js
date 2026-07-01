const BASE = '';

async function request(method, path, body, isFormData = false) {
  const opts = {
    method,
    credentials: 'include',
  };

  if (body) {
    if (isFormData) {
      opts.body = body;
    } else {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/setup')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data.data !== undefined ? data.data : data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, formData, true),
};

export default api;
