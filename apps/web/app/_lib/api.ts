export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof Blob))
    headers.set('Content-Type', 'application/json');
  if (options.method && !['GET', 'HEAD'].includes(options.method)) {
    const response = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
    const csrf = await response.json();
    if (!response.ok)
      throw new Error('The API is unavailable. Check the database and API service.');
    headers.set('x-csrf-token', csrf.data.token);
  }
  const response = await fetch(`/api/v1${path}`, { ...options, headers, credentials: 'include' });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The API is unavailable. Start the project services to use live data.');
  }
  if (!response.ok) throw new Error(result.error?.message || 'The request failed.');
  return result.data as T;
}
