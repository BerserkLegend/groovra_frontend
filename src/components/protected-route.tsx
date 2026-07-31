import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../api/api-client'
import { useAuthModal } from '../context/auth-modal-context'
import { useTranslation } from 'react-i18next'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const GUEST_ALLOWED_PATHS = [
  '/main',
  '/search',
  '/track',
  '/about',
  '/privacy-policy',
  '/cookies',
]

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = getAccessToken()
  const hasEmail = !!localStorage.getItem('UserEmail')
  const location = useLocation()
  const { openAuthModal } = useAuthModal()
  const { t } = useTranslation()

  const cleanPath = location.pathname.replace(/^\/en/, '') || '/main'
  const isGuestAllowed = GUEST_ALLOWED_PATHS.some(path => cleanPath === path || cleanPath.startsWith(path + '/'))

  const isGuest = !token && !hasEmail

  useEffect(() => {
    if (isGuest && !isGuestAllowed) {
      openAuthModal(t('authModal.reasons.protectedPage'))
    }
  }, [isGuest, isGuestAllowed, openAuthModal, t])

  if (isGuest && !isGuestAllowed) {
    const isEn = location.pathname.startsWith('/en')
    return <Navigate to={isEn ? '/en/main' : '/main'} replace />
  }

  return <>{children}</>
}
