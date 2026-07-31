import { GATEWAY_URL, apiFetch } from './api-client'

export interface TwoFactorStatusResponse {
  isEnabled: boolean
}

export interface TwoFactorSetupResponse {
  secretKey: string
  otpAuthUri: string
}

export interface TwoFactorEnableResponse {
  success: boolean
  recoveryCodes: string[]
}

export const getTwoFactorStatus = async (): Promise<TwoFactorStatusResponse> => {
  const res = await apiFetch(`${GATEWAY_URL}/auth/2fa/status`, {
    method: 'GET'
  })

  if (!res.ok) {
    throw new Error(`Не вдалося отримати статус 2FA: ${res.status}`)
  }

  return res.json()
}

export const setupTwoFactor = async (): Promise<TwoFactorSetupResponse> => {
  const res = await apiFetch(`${GATEWAY_URL}/auth/2fa/setup`, {
    method: 'POST'
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || data?.Message || `Помилка налаштування 2FA: ${res.status}`)
  }

  return data
}

export const enableTwoFactor = async (code: string): Promise<TwoFactorEnableResponse> => {
  const res = await apiFetch(`${GATEWAY_URL}/auth/2fa/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || data?.Message || `Помилка активації 2FA: ${res.status}`)
  }

  return data
}

export const disableTwoFactor = async (password: string, code?: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password, code })
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || data?.Message || `Помилка вимкнення 2FA: ${res.status}`)
  }
}

export const verifyLoginTwoFactor = async (ticket: string, code: string, deviceId?: string) => {
  const res = await fetch(`${GATEWAY_URL}/auth/2fa/verify-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ ticket, code, deviceId: deviceId || 'default_web_client' })
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || data?.Message || `Невірний код 2FA: ${res.status}`)
  }

  return data
}
