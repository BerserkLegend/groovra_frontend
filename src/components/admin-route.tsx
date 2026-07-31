import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../api/api-client'

// ClaimTypes.Role = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

// Decode JWT token to get user roles
const decodeTokenRoles = (token: string): string[] => {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return []
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    const roles: string[] = []

    // Standard ASP.NET Core JWT claim type (ClaimTypes.Role)
    const r = payload[ROLE_CLAIM]
    if (typeof r === 'string') roles.push(r)
    else if (Array.isArray(r)) roles.push(...r)

    // Fallback: legacy claim locations
    if (roles.length === 0) {
      const legacy = payload.role || payload.roles || []
      if (typeof legacy === 'string') roles.push(legacy)
      else if (Array.isArray(legacy)) roles.push(...legacy)
    }

    return roles
  } catch {
    return []
  }
}

interface AdminRouteProps {
  children: React.ReactNode
}

// Клиентская проверка — только чтобы не показывать админку тем, кому она не полагается.
// Настоящая защита на бэкенде: policy "AdminOnly" на маршрутах gateway + EnsureAdmin()
// в AdminController/AdminTracksController. Подделанный токен здесь ничего не даёт.
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const token = getAccessToken()
  const hasEmail = !!localStorage.getItem('UserEmail')
  const location = useLocation()

  const isGuest = !token && !hasEmail
  const isEn = location.pathname.startsWith('/en')

  // Если не авторизован - редирект на main
  if (isGuest) {
    return <Navigate to={isEn ? '/en/main' : '/main'} replace />
  }

  // Проверяем роль Admin
  const roles = token ? decodeTokenRoles(token) : []
  const isAdmin = roles.includes('Admin')

  // Если нет роли Admin - редирект на main
  if (!isAdmin) {
    return <Navigate to={isEn ? '/en/main' : '/main'} replace />
  }

  return <>{children}</>
}
