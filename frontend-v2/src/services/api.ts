const getApiBase = () => {
  let envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      envUrl = `https://${envUrl}`;
    }
    return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api/v1`;
  }
  if (
    typeof window !== 'undefined' && 
    (window.location.hostname.includes('.onrender.com') || window.location.hostname.includes('.vercel.app'))
  ) {
    return 'https://aicte-fdr-backend.onrender.com/api/v1';
  }
  return '/api/v1';
};

export const API_BASE = getApiBase();

export const getDownloadUrl = (pathOrKey: string, directUrl?: string | null) => {
  if (directUrl && directUrl.startsWith('http')) {
    if (typeof window !== 'undefined' && directUrl.includes('localhost:8000') && window.location.hostname !== 'localhost') {
      return directUrl.replace('localhost:8000', `${window.location.hostname}:8000`);
    }
    return directUrl;
  }
  const cleanKey = pathOrKey.replace(/^\/+/, '');
  const token = localStorage.getItem('aicte_token');
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  if (cleanKey.startsWith('api/v1/')) {
    return `${API_BASE.replace(/\/api\/v1\/?$/, '')}/${cleanKey}${tokenParam}`;
  }
  return `${API_BASE}/documents/download/${cleanKey}${tokenParam}`;
};

export const fetchDocumentBlob = async (pathOrKey: string, directUrl?: string | null): Promise<Blob> => {
  const token = localStorage.getItem('aicte_token');
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let targetUrl: string;
  if (directUrl && directUrl.startsWith('http')) {
    targetUrl = directUrl;
    if (typeof window !== 'undefined' && targetUrl.includes('localhost:8000') && window.location.hostname !== 'localhost') {
      targetUrl = targetUrl.replace('localhost:8000', `${window.location.hostname}:8000`);
    }
  } else {
    const cleanKey = pathOrKey.replace(/^\/+/, '');
    if (cleanKey.startsWith('api/v1/')) {
      targetUrl = `${API_BASE.replace(/\/api\/v1\/?$/, '')}/${cleanKey}`;
    } else {
      targetUrl = `${API_BASE}/documents/download/${encodeURIComponent(cleanKey)}`;
    }
  }

  const response = await fetch(targetUrl, { headers });
  if (!response.ok) {
    let errorDetail = `Document retrieval failed (${response.status})`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // not json
    }
    throw new ApiError(errorDetail, response.status);
  }

  return await response.blob();
};

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('aicte_token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'TypeError' && (err?.message === 'Failed to fetch' || err?.message?.includes('fetch'))) {
      throw new ApiError('Unable to connect to the authentication server. Please check your network or backend connection.', 0);
    }
    throw new ApiError(err?.message || 'Network request failed', 0);
  }

  if (response.status === 401) {
    let errorDetail = 'Authentication failed.';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // response is not json
    }

    if (endpoint.includes('/auth/login')) {
      throw new ApiError(errorDetail, 401);
    }

    localStorage.removeItem('aicte_token');
    localStorage.removeItem('aicte_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // response is not json
    }
    throw new ApiError(errorDetail, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: 'POST',
      body: formData,
    }),
};

