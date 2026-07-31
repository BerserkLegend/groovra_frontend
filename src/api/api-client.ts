import { getAccessToken, storeAccessToken, clearAccessToken, getCurrentUserId, onAccessTokenChange } from './token-store'
import { getLangPrefix } from '../utils/lang'

const resolveGatewayUrl = (): string => {
  const envUrl = import.meta.env.VITE_GATEWAY_URL
  if (envUrl !== undefined && envUrl !== null && envUrl !== '') {
    return envUrl.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://groovra-api-gateway.azurewebsites.net'
    }
  }
  return 'http://localhost:5274'
}

export const GATEWAY_URL = resolveGatewayUrl()

export const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem('DeviceId')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('DeviceId', deviceId)
  }
  return deviceId
}

export const decodeTokenEmail = (token: string): string | null => {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    return (
      payload.email ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      null
    )
  } catch {
    return null
  }
}

export const setAccessToken = (token: string | null) => {
  if (token === null) {
    clearAccessToken()
  } else {
    storeAccessToken(token)
    const email = decodeTokenEmail(token)
    if (email) {
      localStorage.setItem('UserEmail', email)
    }
  }
}

export { getAccessToken, getCurrentUserId, onAccessTokenChange }

export const getAuthenticatedStreamUrl = (url?: string): string | undefined => {
  if (!url) return undefined
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  const token = getAccessToken()
  if (!token) return url
  const separator = url.includes('?') ? '&' : '?'
  if (url.includes('access_token=') || url.includes('token=')) return url
  return `${url}${separator}access_token=${encodeURIComponent(token)}`
}

export const trackStreamUrl = (trackId: string): string => {
  const token = getAccessToken()
  const baseUrl = `${GATEWAY_URL}/music/tracks/${trackId}/stream`
  return token ? `${baseUrl}?access_token=${encodeURIComponent(token)}` : baseUrl
}

export const resolveMediaUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  if (url.includes('localhost:')) {
    return url.replace(/^https?:\/\/localhost:\d+/, GATEWAY_URL)
  }
  return url
}

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback)
}

// Только очищает локальное состояние авторизации — НИКУДА не редиректит. Раньше эта
// функция сама делала window.location.href, из-за чего любой фоновый 401 (например,
// PlayerProvider подгружает /music/favorites сразу при монтировании приложения) мог
// мгновенно выкинуть гостя или кого угодно с устаревшим UserEmail на другую страницу —
// гостевое прослушивание и просто нахождение на защищённой странице (чат, история) при
// истёкшем токене ломались. Навигацию теперь делает только explicit redirectToLogin(),
// вызываемый из мест, где это действительно ожидаемо (logout).
export const clearAuth = () => {
  setAccessToken(null)
  localStorage.removeItem('UserEmail')
  localStorage.removeItem('groovy_last_track')
  localStorage.removeItem('groovy_last_time')
  localStorage.removeItem('groovy_was_playing')
  localStorage.removeItem('likedTrackIds')
}

export const redirectToLogin = () => {
  const cleanPath = window.location.pathname.replace(/^\/en/, '') || '/'
  const publicPaths = ['/login', '/reg', '/create', '/confirm-reg', '/forgotpassword', '/emailcod', '/passwordrecovery', '/auth/callback']
  if (!publicPaths.includes(cleanPath)) {
    window.location.href = `${getLangPrefix()}/login`
  }
}

export const refreshSession = async (): Promise<string | null> => {
  let email = localStorage.getItem('UserEmail')
  const deviceId = getOrCreateDeviceId()

  if (!email) {
    const currentToken = getAccessToken()
    if (currentToken) {
      email = decodeTokenEmail(currentToken)
      if (email) localStorage.setItem('UserEmail', email)
    }
  }

  if (!email) {
    return null
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, deviceId })
    })

    if (response.ok) {
      const data = await response.json()
      if (data.token) {
        setAccessToken(data.token)
        return data.token
      }
    }

    if (response.status === 401 || response.status === 403) {
      clearAuth()
    }

    return null
  } catch (error) {
    console.warn('[refreshSession] Backend temporarily unreachable or restarting:', error)
    return null
  }
}

export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let targetUrl = url
  if (targetUrl.startsWith('/')) {
    targetUrl = `${GATEWAY_URL}${targetUrl}`
  } else if (/^https?:\/\/localhost:(?:5178|5173)/.test(targetUrl)) {
    targetUrl = targetUrl.replace(/^https?:\/\/localhost:(?:5178|5173)/, GATEWAY_URL)
  }

  const token = getAccessToken()
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  }

  let response = await fetch(targetUrl, options)

  if (response.status === 401) {
    if (isRefreshing) {
      return new Promise((resolve) => {
        addRefreshSubscriber((token) => {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
          }
          resolve(fetch(targetUrl, options))
        })
      })
    }

    isRefreshing = true
    let newToken: string | null
    try {
      newToken = await refreshSession()
    } finally {
      isRefreshing = false
    }

    if (newToken) {
      onRefreshed(newToken)
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`
      }
      return fetch(targetUrl, options)
    }
  }

  return response
}

export const notifyTrackPlayed = async (trackId: string): Promise<void> => {
  try {
    await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (import.meta.env.DEV) console.error('[notifyTrackPlayed]', err)
  }
}
