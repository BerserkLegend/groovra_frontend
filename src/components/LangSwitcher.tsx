import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import './LangSwitcher.css'

export const LangSwitcher: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const currentLang = location.pathname.startsWith('/en') || localStorage.getItem('lang') === 'en' ? 'en' : 'uk'

  const handleLanguageChange = (targetLang: 'uk' | 'en') => {
    if (targetLang === currentLang) return

    localStorage.setItem('lang', targetLang)

    if (targetLang === 'en') {
      const cleanPath = location.pathname.replace(/^\/en/, '')
      navigate(`/en${cleanPath === '/' ? '' : cleanPath}`, { replace: true })
    } else {
      const newPath = location.pathname.replace(/^\/en/, '') || '/'
      navigate(newPath, { replace: true })
    }
  }

  return (
    <div className="lang-switcher" role="radiogroup" aria-label="Language Selector">
      <motion.button
        type="button"
        className={`lang-btn ${currentLang === 'uk' ? 'active' : ''}`}
        onClick={() => handleLanguageChange('uk')}
        role="radio"
        aria-checked={currentLang === 'uk'}
        aria-label="Ukrainian Language"
        style={{ position: 'relative' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {currentLang === 'uk' && (
          <motion.span
            layoutId="activeLangIndicator"
            className="lang-active-indicator"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span style={{ position: 'relative', zIndex: 10 }}>UA</span>
      </motion.button>
      <motion.button
        type="button"
        className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
        onClick={() => handleLanguageChange('en')}
        role="radio"
        aria-checked={currentLang === 'en'}
        aria-label="English Language"
        style={{ position: 'relative' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {currentLang === 'en' && (
          <motion.span
            layoutId="activeLangIndicator"
            className="lang-active-indicator"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span style={{ position: 'relative', zIndex: 10 }}>EN</span>
      </motion.button>
    </div>
  )
}
