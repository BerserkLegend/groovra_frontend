import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { logoutUser } from '../api/auth'
import { usePlayer } from '../context/player-context'
import { useTranslation } from 'react-i18next'
import { useProfile } from '../context/profile-context'
import { useAuthModal } from '../context/auth-modal-context'
import { LogIn } from 'lucide-react'
import Avatar from '../assets/IconAvatar.svg'
import '../app.css'

interface UserMenuProps {
  profileName: string
}

export const UserMenu: React.FC<UserMenuProps> = ({ profileName }) => {
  const { t } = useTranslation()
  const { avatarUrl } = useProfile()
  const { isGuest } = useAuthModal()
  const [imgError, setImgError] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { setActiveTab } = usePlayer()

  const prefix = location.pathname.startsWith('/en') || localStorage.getItem('lang') === 'en' ? '/en' : ''

  const dropdownVariants = {
    hidden: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 22,
        staggerChildren: 0.05,
        delayChildren: 0.05
      }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95,
      transition: {
        duration: 0.12,
        ease: 'easeIn'
      }
    }
  } as const

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    }
  } as const

  const handleLogout = async () => {
    await logoutUser()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isGuest) {
    return (
      <div className="GuestHeaderCont">
        <button
          className="GuestHeaderBtn"
          onClick={() => navigate(`${prefix}/login`)}
          type="button"
        >
          <LogIn size={15} />
          <span>{t('authModal.login')}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="profileCont" ref={menuRef} onClick={() => setIsOpen(!isOpen)}>
      <div>
        <img
          src={avatarUrl && !imgError ? avatarUrl : Avatar}
          className="AvatarIcon"
          onError={() => setImgError(true)}
          alt="Avatar"
        />
      </div>

      <button className="ButtonProfile" type="button">
        {profileName}
      </button>

      <svg className={`ArrowDown ${isOpen ? 'open' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
      </svg>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ProfileDropdown"
            onClick={(e: any) => e.stopPropagation()}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.button 
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setIsOpen(false); navigate(`${prefix}/profile`) }} 
              className="ProfileDropdownItem"
            >
              {t('userMenu.account')}
            </motion.button>

            <motion.button 
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setIsOpen(false); setActiveTab('Settings'); navigate(`${prefix}/profile?tab=settings`, { state: { tab: 'settings' } }) }} 
              className="ProfileDropdownItem"
            >
              {t('userMenu.settings')}
            </motion.button>

            <motion.div variants={itemVariants} className="ProfileDropdownDivider"></motion.div>

            <motion.button 
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout} 
              className="ProfileDropdownItem"
            >
              {t('userMenu.logout')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
