import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import '../app.css'

interface NotificationItem {
  id: string
  titleKey: string
  titleFallback: string
  descriptionKey: string
  descriptionFallback: string
  gradient: string
  initials: string
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    titleKey: 'notifications.items.rec_title',
    titleFallback: 'Перегляньте нові релізи цієї п’ятниці',
    descriptionKey: 'notifications.items.rec_desc',
    descriptionFallback: 'Понад 20 артистов зробили нові релізи',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    initials: '🔥'
  },
  {
    id: '2',
    titleKey: 'notifications.items.weezer_title',
    titleFallback: '“Weezer” випустили новий альбом',
    descriptionKey: 'notifications.items.weezer_desc',
    descriptionFallback: 'Станьте одним із перших слухачів',
    gradient: 'linear-gradient(135deg, #A98FDB 0%, #72DEEF 100%)',
    initials: '🎸'
  },
  {
    id: '3',
    titleKey: 'notifications.items.ua_title',
    titleFallback: 'Музика України',
    descriptionKey: 'notifications.items.ua_desc',
    descriptionFallback: 'Ми зробили підбірку найпопулярніших треків серед українців',
    gradient: 'linear-gradient(135deg, #FFD93D 0%, #FF8400 100%)',
    initials: '🇺🇦'
  },
  {
    id: '4',
    titleKey: 'notifications.items.world_title',
    titleFallback: 'Музика світу',
    descriptionKey: 'notifications.items.world_desc',
    descriptionFallback: 'Ми зробили підбірку найпопулярніших треків в усьому світі',
    gradient: 'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)',
    initials: '🌎'
  },
  {
    id: '5',
    titleKey: 'notifications.items.rock_title',
    titleFallback: 'Новинки рок музики',
    descriptionKey: 'notifications.items.rock_desc',
    descriptionFallback: 'Перегляньте релізи серед жанру рок',
    gradient: 'linear-gradient(135deg, #ED213A 0%, #93291E 100%)',
    initials: '⚡'
  }
]

interface NotificationDropdownProps {
  isOpen: boolean
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen }) => {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('notifications')
    if (saved !== null) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        if (import.meta.env.DEV) console.error('Помилка парсингу повідомлень з localStorage', e)
      }
    }

    localStorage.setItem('notifications', JSON.stringify(INITIAL_NOTIFICATIONS))
    return INITIAL_NOTIFICATIONS
  })

  const handleClearAll = () => {
    setNotifications([])
    localStorage.setItem('notifications', JSON.stringify([]))
  }

  const handleRemoveItem = (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(item => item.id !== id)
      localStorage.setItem('notifications', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`div-wrapper ${notifications.length === 0 ? 'empty-state' : ''}`}
          onClick={(e: any) => e.stopPropagation()}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {notifications.length === 0 ? (
            <>
              <div className="text-wrapper">{t('notifications.empty_title')}</div>
              <p className="div">
                {t('notifications.empty_desc')}
              </p>
            </>
          ) : (
            <>
              <div className="notification-header">
                <span className="notification-title">{t('notifications.title')}</span>
                <button className="notification-clear-btn" onClick={handleClearAll}>
                  {t('notifications.clear_all')}
                </button>
              </div>

              <div className="notification-list">
                {notifications.map((item) => (
                  <div key={item.id} className="notification-item">
                    <div
                      className="notification-avatar"
                      style={{ background: item.gradient }}
                    >
                      {item.initials}
                    </div>
                    <div className="notification-content">
                      <span className="notification-item-title">
                        {item.titleKey ? t(item.titleKey) : item.titleFallback}
                      </span>
                      <span className="notification-item-desc">
                        {item.descriptionKey ? t(item.descriptionKey) : item.descriptionFallback}
                      </span>
                    </div>
                    <button
                      className="notification-delete-btn"
                      onClick={() => handleRemoveItem(item.id)}
                      title={t('notifications.remove_title')}
                      aria-label={t('notifications.aria_remove')}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
