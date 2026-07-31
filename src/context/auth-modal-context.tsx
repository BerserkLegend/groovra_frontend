import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAccessToken, onAccessTokenChange } from '../api/api-client'

export type UserRole = 'guest' | 'user' | 'artist' | 'admin'

export const getCurrentUserRole = (): UserRole => {
  const token = getAccessToken()
  if (!token) return 'guest'
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return 'guest'
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    const rawRole =
      payload.role ||
      payload.roles ||
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']

    if (!rawRole) return 'user'

    const roleStr = Array.isArray(rawRole) ? rawRole[0] : String(rawRole)
    const normalized = roleStr.toLowerCase()

    if (normalized.includes('admin')) return 'admin'
    if (normalized.includes('artist')) return 'artist'
    return 'user'
  } catch {
    return 'guest'
  }
}

interface AuthModalContextType {
  userRole: UserRole
  isGuest: boolean
  isAuthModalOpen: boolean
  authModalReason: string | null
  openAuthModal: (reason?: string) => void
  closeAuthModal: () => void

  requireAuth: (action: () => void, reason?: string) => boolean
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>(getCurrentUserRole)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalReason, setAuthModalReason] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAccessTokenChange(() => {
      setUserRole(getCurrentUserRole())
    })
    return unsubscribe
  }, [])

  const openAuthModal = useCallback((reason?: string) => {
    setAuthModalReason(reason || null)
    setIsAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
    setAuthModalReason(null)
  }, [])

  const requireAuth = useCallback(
    (action: () => void, reason?: string): boolean => {
      if (userRole !== 'guest') {
        action()
        return true
      }
      openAuthModal(reason)
      return false
    },
    [userRole, openAuthModal]
  )

  const isGuest = userRole === 'guest'

  return (
    <AuthModalContext.Provider
      value={{
        userRole,
        isGuest,
        isAuthModalOpen,
        authModalReason,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  )
}

export const useAuthModal = () => {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider')
  }
  return context
}
