import { useAuthStore } from '../stores/auth.store';
import { API_URL } from './config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const authHeader = (): Record<string, string> => {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeader(), ...init.headers },
    });
  } catch {
    throw new ApiError(0, `Can't reach the server (${API_URL})`);
  }

  if (res.status === 401) useAuthStore.getState().clear();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** React Native FormData file part. */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/** Multipart POST with upload progress (fetch can't report upload progress, XHR can). */
export function uploadForm<T>(path: string, form: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api${path}`);
    for (const [k, v] of Object.entries(authHeader())) xhr.setRequestHeader(k, v);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      // RN's XHR doesn't reliably honour responseType = 'json', so parse manually.
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status === 401) useAuthStore.getState().clear();
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else {
        const message = (body as { message?: string } | null)?.message ?? `Upload failed (${xhr.status})`;
        reject(new ApiError(xhr.status, message));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'Network error'));
    xhr.ontimeout = () => reject(new ApiError(0, 'Upload timed out'));
    xhr.send(form);
  });
}

/** Appends an RN file part ({ uri, name, type }); the DOM FormData typing doesn't know this shape. */
export function appendFile(form: FormData, field: string, file: UploadFile) {
  form.append(field, file as unknown as Blob);
}
