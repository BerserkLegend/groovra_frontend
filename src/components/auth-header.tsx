import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import LogoReg from '../assets/LogoReg.svg'

interface AuthHeaderProps {
  onBack?: () => void
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ onBack }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    const isEn = location.pathname.startsWith('/en')
    if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
      navigate(-1)
    } else {
      navigate(isEn ? '/en/main' : '/main')
    }
  }

  return (
    <div className='auth-header'>
      <button 
        type="button" 
        className="auth-back-btn" 
        onClick={handleBack}
        aria-label={t('auth.back', 'Назад')}
      >
        <ArrowLeft size={18} />
        <span>{t('auth.back', 'Назад')}</span>
      </button>
      <img src={LogoReg} className='auth-logo' alt='RegLogo' />
    </div>
  )
}

export default AuthHeader
