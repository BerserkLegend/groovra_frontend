import { GATEWAY_URL, apiFetch } from './api-client'

export const getSessions = async (): Promise<string[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/auth/sessions`, {
    method: 'GET',
  })

  if (!res.ok) {
    throw new Error(`Не вдалося отримати список сесій: ${res.status}`)
  }

  const data = await res.json()
  return (data.Sessions ?? data.sessions ?? []) as string[]
}

export const revokeSession = async (deviceId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/auth/revoke-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.Message || data?.message || `Не вдалося видалити сесію: ${res.status}`)
  }
}

export const revokeAllSessions = async (): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/auth/revoke-all`, {
    method: 'POST',
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.Message || data?.message || `Не вдалося скасувати всі сесії: ${res.status}`)
  }
}
