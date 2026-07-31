import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuthModal } from '../context/auth-modal-context'
import { Lock, UserPlus, LogIn, X } from 'lucide-react'
import './AuthPromptModal.css'

export const AuthPromptModal: React.FC = () => {
  const { isAuthModalOpen, authModalReason, closeAuthModal } = useAuthModal()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAuthModalOpen, closeAuthModal])

  const getPrefix = () => {
    return location.pathname.startsWith('/en') || localStorage.getItem('lang') === 'en'
      ? '/en'
      : ''
  }

  const handleRegister = () => {
    closeAuthModal()
    navigate(`${getPrefix()}/reg`)
  }

  const handleLogin = () => {
    closeAuthModal()
    navigate(`${getPrefix()}/login`)
  }

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className="AuthModalOverlay">
          <motion.div
            className="AuthModalBackdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
          />

          <motion.div
            className="AuthModalContainer"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <button
              className="AuthModalCloseBtn"
              onClick={closeAuthModal}
              aria-label="Close modal"
              type="button"
            >
              <X size={20} />
            </button>

            <div className="AuthModalIconBadge">
              <Lock size={32} className="AuthModalLockIcon" />
            </div>

            <h2 id="auth-modal-title" className="AuthModalTitle">
              {t('authModal.title')}
            </h2>

            <p className="AuthModalSubtitle">
              {authModalReason || t('authModal.subtitle')}
            </p>

            <div className="AuthModalActions">
              <button
                className="AuthModalRegisterBtn"
                onClick={handleRegister}
                type="button"
              >
                <UserPlus size={18} />
                <span>{t('authModal.register')}</span>
              </button>

              <button
                className="AuthModalLoginBtn"
                onClick={handleLogin}
                type="button"
              >
                <LogIn size={18} />
                <span>{t('authModal.login')}</span>
              </button>
            </div>

            <button
              className="AuthModalContinueBtn"
              onClick={closeAuthModal}
              type="button"
            >
              {t('authModal.continueGuest')}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
