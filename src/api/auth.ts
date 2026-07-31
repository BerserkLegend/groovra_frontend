import { GATEWAY_URL, clearAuth, redirectToLogin, apiFetch } from './api-client'

export interface RegisterData {
  username: string
  email: string
  password: string
  role?: string
}

export const register = async (data: RegisterData) => {
  const res = await fetch(`${GATEWAY_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    credentials: 'include'
  })

  const result = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(result?.Message || result?.title || `Помилка з'єднання: ${res.status}`)
  }

  return result
}

export interface ConfirmData {
  email: string
  code: string
  deviceId?: string
}

export const confirmRegister = async (data: ConfirmData) => {
  const res = await fetch(`${GATEWAY_URL}/auth/confirmregister`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    credentials: 'include'
  })

  const result = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(result?.Message || result?.title || `Помилка з'єднання: ${res.status}`)
  }

  return result
}

export interface LogoutPayload {
  email: string
  deviceId?: string
}

export const logoutApi = async ({ email, deviceId }: LogoutPayload): Promise<void> => {
  try {
    await fetch(`${GATEWAY_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email,
        deviceId: deviceId || 'default_web_client'
      }),
    })
  } catch (error) {
    if (import.meta.env.DEV) console.error('Помилка логауту на сервері:', error)
  }
}

export interface GoogleAuthData {
  code: string
  deviceId: string
  redirectUri?: string
}

export const loginWithGoogleApi = async (data: GoogleAuthData) => {
  const res = await fetch(`${GATEWAY_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    credentials: 'include'
  })

  const result = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(result?.message || result?.Message || result?.title || `Помилка з'єднання: ${res.status}`)
  }

  return result
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

export const changePasswordApi = async (payload: ChangePasswordPayload): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/auth/changepassword`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      OldPassword: payload.oldPassword,
      NewPassword: payload.newPassword
    })
  })

  const result = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(result?.Message || result?.message || `Не вдалося змінити пароль: ${res.status}`)
  }
}

export const logoutUser = async (): Promise<void> => {
  const email = localStorage.getItem('UserEmail') ?? ''
  const deviceId = localStorage.getItem('DeviceId') ?? 'default_web_client'
  await logoutApi({ email, deviceId }).catch((error) => {
    if (import.meta.env.DEV) console.error('Logout server error:', error)
  })
  localStorage.removeItem('UserEmail')
  localStorage.removeItem('RegistrationEmail')
  localStorage.removeItem('profileName')
  clearAuth()
  // Logout — единственное место, где редирект на /login действительно ожидаем (явное действие юзера).
  redirectToLogin()
}

export interface UserSearchResult {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  if (!query.trim()) return [];
  const res = await apiFetch(`/auth/users/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((u: any) => ({
    ...u,
    userId: u.userId || u.id || '',
    id: u.id || u.userId || '',
  }));
};
