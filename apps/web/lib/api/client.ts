import { createClient } from '@/lib/supabase/server'

if (!process.env.API_URL && process.env.NODE_ENV === 'production') {
  throw new Error(
    'API_URL não está configurada. Defina a env var apontando para a URL pública da API.',
  )
}

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function accessToken(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken()

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.message ?? `Erro ${res.status} ao chamar a API`
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  if (!text) return undefined as T

  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('Resposta inválida da API', res.status)
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
