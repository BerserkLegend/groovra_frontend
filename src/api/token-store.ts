let accessToken: string | null = localStorage.getItem('AccessToken')

type TokenListener = (token: string | null) => void
let listeners: TokenListener[] = []

export const onAccessTokenChange = (listener: TokenListener): (() => void) => {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export const storeAccessToken = (token: string) => {
  accessToken = token
  localStorage.setItem('AccessToken', token)
  listeners.forEach((l) => l(token))
}

export const getAccessToken = () => {
  if (!accessToken) {
    accessToken = localStorage.getItem('AccessToken')
  }
  return accessToken
}

export const clearAccessToken = () => {
  accessToken = null
  localStorage.removeItem('AccessToken')
  listeners.forEach((l) => l(null))
}

export const getCurrentUserId = (): string | null => {
  const token = getAccessToken()
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    return (
      payload.nameid ||
      payload.sub ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      null
    )
  } catch {
    return null
  }
}
