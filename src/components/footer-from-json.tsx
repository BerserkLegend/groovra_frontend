import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import './footer-from-json.css'

const MotionLink = motion.create(Link)

export function FooterFromJson(): React.JSX.Element {
  const { t } = useTranslation()
  const { lang } = useParams<{ lang?: string }>()
  const prefix = lang === 'en' ? '/en' : ''

  return (
    <motion.div
      className="footer-from-json"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="ffj-margin">
        <div className="ffj-container">
          <motion.div className="ffj-logo-wrapper" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <div className="ffj-logo">Groovra</div>
          </motion.div>
        </div>
      </div>

      <div className="ffj-links">
        <MotionLink
          className="ffj-link"
          to={`${prefix}/privacy-policy`}
          tabIndex={0}
          aria-label={t('cookies.necessary_list.privacy') || 'Privacy Policy'}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="ffj-link-text">{t('privacy.title')}</span>
        </MotionLink>
        <MotionLink
          className="ffj-link"
          to={`${prefix}/cookies`}
          tabIndex={0}
          aria-label="Cookies"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="ffj-link-text">Cookies</span>
        </MotionLink>
        <MotionLink
          className="ffj-link"
          to={`${prefix}/about`}
          tabIndex={0}
          aria-label={t('about.title')}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="ffj-link-text ffj-link-text--light">{t('about.title')}</span>
        </MotionLink>
      </div>

      <div className="ffj-copyright-wrapper">
        <div className="ffj-copyright-inner">
          <p className="ffj-copyright">© 2026 Groovra Premium Music</p>
        </div>
      </div>
    </motion.div>
  )
}
