import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { PageTransition } from './page-transition'
import { usePlayer } from '../context/player-context'
import { usePlaylistModal } from '../context/playlist-modal-context'
import { useProfile } from '../context/profile-context'
import { triggerHaptic } from '../hooks/use-haptic'
import { UserMenu } from './user-menu'
import LogoDark from '../assets/LogoReg.svg'
import LogoLight from '../assets/LogoRegLight.svg'
import Home from '../assets/IconHome.svg'
import Search from '../assets/IconSearch.svg'
import Library from '../assets/IconLibrary.svg'
import Playlist from '../assets/IconPlaylist.svg'
import Liked from '../assets/IconLiked.svg'
import AI from '../assets/IconAI.svg'
import Downloads from '../assets/IconDownloads.svg'
import Chat from '../assets/IconChat.svg'
import HeaderSearch from '../assets/HeaderSearch.svg'
import Notification from '../assets/IconNotification.svg'
import Right from '../assets/IconRight.svg'
import Remix from '../assets/IconRemix.svg'
import Settings from '../assets/IconSettings.svg'
import LeftArrow from '../assets/LeftArrowLogo.svg'
import Pause from '../assets/IconPause.svg'
import RightArrow from '../assets/RightArrowLogo.svg'
import Ref from '../assets/IconRef.svg'
import { TrackCover } from './common/TrackCover'
import { NotificationDropdown } from './notification-dropdown'
import { useTranslation } from 'react-i18next'
import { LangSwitcher } from './LangSwitcher'
import { useTheme } from '../context/theme-context'
import { useAuthModal } from '../context/auth-modal-context'
import '../app.css'

const PLAY_ICON_DATA = "data:image/svg+xml,%3csvg%20width='15'%20height='18'%20viewBox='0%200%2015%2018'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M0%2018V0L15%209L0%2018Z'%20fill='%230D0D12'/%3e%3c/svg%3e"

const BurgerIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#72DEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
)

const CloseIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A98FDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

export const Layout: React.FC = () => {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { isGuest, openAuthModal } = useAuthModal()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    isShuffle,
    isRepeat,
    searchQuery,
    isLiked,
    activeTab,
    setActiveTab,
    togglePlayPause,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    toggleMute,
    applyVolume,
    seekTo,
    handleSearchChange,
    toggleLiked,
    formatTime,
  } = usePlayer()
  const { showToast } = usePlaylistModal()

  const trackRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isDraggingVolume = useRef(false)

  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  const { profileName } = useProfile()

  const volumeProgress = useMotionValue(isMuted ? 0 : volume)
  const volumeFillWidth = useTransform(volumeProgress, (v: any) => `${v}%`)

  useEffect(() => {
    if (!isDraggingVolume.current) {
      volumeProgress.set(isMuted ? 0 : volume)
    }
  }, [volume, isMuted, volumeProgress])

  const getTabFromPath = useCallback((pathname: string, search: string = ''): string => {
    const cleanPath = pathname.replace(/^\/en/, '') || '/'
    if (cleanPath === '/chat') return 'Chat'
    if (cleanPath === '/downloads') return 'Downloads'
    if (cleanPath === '/ai-mix') return 'AI'
    if (cleanPath === '/profile') {
      const params = new URLSearchParams(search)
      if (params.get('tab') === 'settings') return 'Settings'
      return 'Profile'
    }
    if (cleanPath === '/library') return 'Library'
    if (cleanPath === '/liked') return 'Liked'
    if (cleanPath === '/playlists') return 'Playlist'
    if (cleanPath === '/search') return 'Search'
    if (cleanPath === '/main') return 'Home'
    return 'Home'
  }, [])

  const currentActiveTab = getTabFromPath(location.pathname, location.search)

  useLayoutEffect(() => {
    if (activeTab !== currentActiveTab) {
      setActiveTab(currentActiveTab)
    }
  }, [currentActiveTab, activeTab, setActiveTab])

  useEffect(() => {
    if (currentActiveTab === 'Search' && searchInputRef.current && location.pathname.replace(/^\/en/, '') === '/search') {
      searchInputRef.current.focus()
    }
  }, [currentActiveTab, location.pathname])

  useLayoutEffect(() => {
    setIsMobileSearchOpen(false) 
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSidebarClick = (tab: string) => {
    const restrictedTabs = ['Chat', 'Downloads', 'AI', 'Library', 'Liked', 'Playlist']
    if (isGuest && restrictedTabs.includes(tab)) {
      setIsSidebarOpen(false)
      openAuthModal(t('authModal.reasons.protectedPage'))
      return
    }

    setActiveTab(tab)
    setIsSidebarOpen(false)

    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''

    if (tab === 'Downloads') {
      navigate(`${prefix}/downloads`)
    } else if (tab === 'AI') {
      navigate(`${prefix}/ai-mix`)
    } else if (tab === 'Chat') {
      navigate(`${prefix}/chat`)
    } else if (tab === 'Library') {
      navigate(`${prefix}/library`)
    } else if (tab === 'Liked') {
      navigate(`${prefix}/liked`)
    } else if (tab === 'Playlist') {
      navigate(`${prefix}/playlists`)
    } else if (tab === 'Search') {
      navigate(`${prefix}/search`)
    } else if (tab === 'Home') {
      navigate(`${prefix}/main`)
    } else if (tab === 'Settings') {
      navigate(`${prefix}/profile?tab=settings`, { state: { tab: 'settings' } })
    } else {
      navigate(`${prefix}/main`)
    }
  }

  const handleSearchFocus = () => {
    const cleanPath = location.pathname.replace(/^\/en/, '')
    if (cleanPath === '/main' || cleanPath === '/' || cleanPath === '') {
      return
    }

    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''

    if (cleanPath !== '/search') {
      setActiveTab('Search')
      navigate(`${prefix}/search`)
    } else {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }
  }

  const calcVolumeFromEvent = useCallback((clientX: number): number => {
    if (!trackRef.current) return volume
    const rect = trackRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    return Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)))
  }, [volume])

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (isDraggingVolume.current) return
    const newVol = calcVolumeFromEvent(e.clientX)
    volumeProgress.set(newVol)
    applyVolume(newVol)
  }

  const handleVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    isDraggingVolume.current = true
    const startVol = calcVolumeFromEvent(e.clientX)
    volumeProgress.set(startVol)
    applyVolume(startVol)

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingVolume.current) return
      const newVol = calcVolumeFromEvent(ev.clientX)
      volumeProgress.set(newVol)
      applyVolume(newVol)
    }
    const onMouseUp = () => {
      isDraggingVolume.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!timelineRef.current || duration === 0) return
    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const clickPercent = Math.max(0, Math.min(1, clickX / width))
    seekTo(clickPercent)
  }

  const handleTimelineTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (!timelineRef.current || duration === 0) return
    const touch = e.touches[0] || e.changedTouches[0]
    if (!touch) return
    const rect = timelineRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    seekTo(percent)
  }

  const isTrackPage = location.pathname.endsWith('/track')

  const handleFullscreenClick = () => {
    if (!currentTrack) return
    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''
    navigate(`${prefix}/track`)
  }

  const isMainPage = location.pathname.replace(/^\/en/, '') === '/main' || location.pathname === '/'
  const isSearchActive = activeTab === 'Search' || isMobileSearchOpen
  const showBackBtn = !isMainPage || isSearchActive

  const handleMobileBack = () => {
    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''

    if (currentActiveTab === 'Search' || isMobileSearchOpen) {
      setIsMobileSearchOpen(false)
      if (window.history.length > 1) {
        navigate(-1)
      } else {
        navigate(`${prefix}/main`, { replace: true })
      }
    } else {
      setIsMobileSearchOpen(false)
      navigate(-1)
    }
  }

  return (
    <div className={`Main ${isTrackPage ? 'fullscreen-active' : ''}`}>

      {!isTrackPage && (
        <>
          {isSidebarOpen && (
            <div
              className="SidebarBackdrop"
              onClick={() => setIsSidebarOpen(false)}
              onKeyDown={(e: any) => { if (e.key === 'Enter' || e.key === ' ') setIsSidebarOpen(false) }}
              role="button"
              tabIndex={0}
              aria-label="Close sidebar menu"
            />
          )}
          <aside className={`Sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div className="SidebarHeader">
              <img src={theme === 'light' ? LogoLight : LogoDark} className="Logo" alt="Logo" />
              <span className="Groovra">GROOVRA</span>
              <button
                className="SidebarCloseBtn"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close sidebar menu"
              >
                <CloseIcon />
              </button>
            </div>

            <motion.div className={`NavItem ${currentActiveTab === 'Home' ? 'active' : ''}`} onClick={() => handleSidebarClick('Home')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'Home' && <div className="ActiveLine" />}
              <img src={Home} alt="Home" />
              <span className="NavText">{t('nav.home')}</span>
            </motion.div>

            <motion.div className={`NavItem ${currentActiveTab === 'Search' ? 'active' : ''}`} onClick={() => handleSidebarClick('Search')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'Search' && <div className="ActiveLine" />}
              <img src={Search} alt="Search" />
              <span className="NavText">{t('nav.search')}</span>
            </motion.div>

            <motion.div className={`NavItem ${currentActiveTab === 'Library' ? 'active' : ''}`} onClick={() => handleSidebarClick('Library')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'Library' && <div className="ActiveLine" />}
              <img src={Library} alt="Library" />
              <span className="NavText">{t('nav.library')}</span>
            </motion.div>

            <div className="ContTextColl">
              <span className="TextColl">{t('nav.collections')}</span>
            </div>

            <motion.div className={`NavItem ${currentActiveTab === 'Playlist' ? 'active' : ''}`} onClick={() => handleSidebarClick('Playlist')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'Playlist' && <div className="ActiveLine" />}
              <img src={Playlist} alt="Playlist" />
              <span className="NavText">{t('nav.playlists')}</span>
            </motion.div>

            <motion.div className={`NavItem ${currentActiveTab === 'Liked' ? 'active' : ''}`} onClick={() => handleSidebarClick('Liked')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'Liked' && <div className="ActiveLine" />}
              <img src={Liked} alt="Liked" />
              <span className="NavText">{t('nav.liked')}</span>
            </motion.div>

            <motion.div className={`NavItem ${currentActiveTab === 'AI' ? 'active' : ''}`} onClick={() => handleSidebarClick('AI')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'AI' && <div className="ActiveLine" />}
              <img src={AI} alt="AI mix" />
              <span className="NavText">{t('nav.aiMix')}</span>
            </motion.div>

            <motion.div className={`NavItem ${currentActiveTab === 'Downloads' ? 'active' : ''}`} onClick={() => handleSidebarClick('Downloads')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'Downloads' && <div className="ActiveLine" />}
              <img src={Downloads} alt="Downloads" />
              <span className="NavText">{t('nav.downloads')}</span>
            </motion.div>

            <motion.div className={`NavItem ${currentActiveTab === 'Chat' ? 'active' : ''}`} onClick={() => handleSidebarClick('Chat')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'Chat' && <div className="ActiveLine" />}
              <img src={Chat} alt="Chat" />
              <span className="NavText">{t('nav.chat')}</span>
            </motion.div>

            <motion.div className={`NavItem ${currentActiveTab === 'Settings' ? 'active' : ''}`} onClick={() => handleSidebarClick('Settings')} whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {currentActiveTab === 'Settings' && <div className="ActiveLine" />}
              <img src={Settings} alt="Settings" />
              <span className="NavText">{t('nav.settings')}</span>
            </motion.div>

            <div className="SidebarLangSwitcher">
              <LangSwitcher />
            </div>

            {isGuest && (
              <div className="SidebarGuestCard">
                <span className="SidebarGuestTitle">{t('authModal.title')}</span>
                <span className="SidebarGuestText">{t('authModal.subtitle')}</span>
                <div className="SidebarGuestActions">
                  <button
                    className="SidebarRegisterBtn"
                    onClick={() => {
                      setIsSidebarOpen(false)
                      const prefix = localStorage.getItem('lang') === 'en' ? '/en' : ''
                      navigate(`${prefix}/reg`)
                    }}
                    type="button"
                  >
                    {t('authModal.register')}
                  </button>
                  <button
                    className="SidebarLoginBtn"
                    onClick={() => {
                      setIsSidebarOpen(false)
                      const prefix = localStorage.getItem('lang') === 'en' ? '/en' : ''
                      navigate(`${prefix}/login`)
                    }}
                    type="button"
                  >
                    {t('authModal.login')}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
      <div className='RightColumn'>
        {!isTrackPage && (
          <header className={`MainHeader ${(currentActiveTab === 'Search' || isMobileSearchOpen) ? 'search-active' : ''}`}>
            {!showBackBtn ? (
              <button
                className="BurgerMenuBtn"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar menu"
              >
                <BurgerIcon />
              </button>
            ) : (
              <button
                className="HeaderBackBtnMobile"
                onClick={handleMobileBack}
                aria-label="Back"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#72DEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </button>
            )}

            <div className="HeaderTitle">
              {currentActiveTab === 'Profile'
                ? profileName
                : currentActiveTab === 'Playlist'
                  ? t('nav.playlists')
                  : t(`nav.${currentActiveTab === 'AI' ? 'aiMix' : currentActiveTab.toLowerCase()}`)}
            </div>

            <div className="ContSearch">
              <motion.div
                className="SecContHeader"
                animate={{
                  scale: isSearchFocused ? 1.03 : 1,
                  borderColor: isSearchFocused ? '#72DEEF' : 'rgba(169, 143, 219, 0.4)',
                  boxShadow: isSearchFocused ? '0 0 15px rgba(114, 222, 239, 0.25)' : 'none'
                }}
                transition={{ duration: 0.2 }}
              >
                <img src={HeaderSearch} className="HeaderSearch" alt="Search" />
                <input
                  id="layout-search-input"
                  name="searchQuery"
                  autoComplete="off"
                  ref={searchInputRef}
                  type="text"
                  className="InputSearch"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e: any) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    handleSearchFocus()
                    setIsSearchFocused(true)
                  }}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </motion.div>
            </div>

            <div className="UserCont">
              {currentActiveTab !== 'Search' && !isMobileSearchOpen && (
                <button
                  type="button"
                  className="HeaderSearchBtnMobile"
                  onClick={() => {
                    const cleanPath = location.pathname.replace(/^\/en/, '')
                    setIsMobileSearchOpen(true)
                    if (cleanPath !== '/main' && cleanPath !== '/' && cleanPath !== '') {
                      const savedLang = localStorage.getItem('lang') || 'uk'
                      const prefix = savedLang === 'en' ? '/en' : ''
                      navigate(`${prefix}/search`)
                    }
                    setTimeout(() => {
                      searchInputRef.current?.focus()
                    }, 100)
                  }}
                  title={t('search.placeholder')}
                  aria-label="Search"
                >
                  <img src={HeaderSearch} className="HeaderSearchIcon" alt="Search" />
                </button>
              )}

              <div className="NotificationContainer" ref={notificationRef}>
                <button
                  type="button"
                  className={`NotificationBtn ${isNotificationOpen ? 'active' : ''}`}
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  title={t('notifications.title')}
                  aria-label={t('notifications.title')}
                >
                  <img src={Notification} className="Notificationicon" alt={t('notifications.title')} />
                </button>
                <NotificationDropdown isOpen={isNotificationOpen} />
              </div>
              <motion.button
                type="button"
                className="ThemeToggleBtn"
                onClick={toggleTheme}
                title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {theme === 'light' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ThemeIcon">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ThemeIcon">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </motion.button>
              <LangSwitcher />
              <UserMenu profileName={profileName} />
            </div>
          </header>
        )}

        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>

        {!isTrackPage && (
          <motion.footer
            className="FooterPlayer"
            onPanEnd={(_: any, info: any) => {
              if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
                if (info.offset.x > 40) {
                  triggerHaptic('medium')
                  playPrevious()
                } else if (info.offset.x < -40) {
                  triggerHaptic('medium')
                  playNext()
                }
              } else if (info.offset.y < -40) {
                triggerHaptic('light')
                handleFullscreenClick()
              }
            }}
          >
            <div className="MobileDragHandle" onClick={handleFullscreenClick} />
            {currentTrack ? (
              <motion.div className="TrackContainer" onClick={handleFullscreenClick} style={{ cursor: 'pointer' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className="CurrentPlaying">
                  <TrackCover
                    src={currentTrack.coverImageUrl}
                    className="CoverImg"
                    style={{ borderRadius: '8px' }}
                    alt={currentTrack.title || 'Cover'}
                  />
                  {isPlaying && (
                    <div className="PlayingEqOverlay">
                      <span className="EqBar EqBar1" />
                      <span className="EqBar EqBar2" />
                      <span className="EqBar EqBar3" />
                    </div>
                  )}
                </div>

                <div className="TrackInfoText">
                  <span className="NameOfTrack">{currentTrack.title}</span>
                  <span className="Author">{currentTrack.artistName}</span>
                </div>

                <motion.button
                  className={`IconLiked ${isLiked ? 'liked' : ''}`}
                  onClick={async (e: any) => {
                    e.stopPropagation()
                    const ok = await toggleLiked()
                    if (!ok) showToast(t('player.like_error'))
                  }}
                  title={isLiked ? t('player.unlike') : t('player.like')}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.85 }}
                  animate={{ scale: isLiked ? [1, 1.25, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <img src={Liked} alt="Like icon" />
                </motion.button>
              </motion.div>
            ) : (
              <div className="TrackContainer" />
            )}

            <div className="ContPlayBack">
              <div className="PlayeerCont">
                <motion.button className={`ButtonRemix ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title={t('player.shuffle')} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <img src={Remix} className="LogoRemix" alt="Shuffle" />
                </motion.button>
                <motion.button className="LeftArrowButton" onClick={playPrevious} title={t('player.previous')} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <img src={LeftArrow} className="LeftArrow" alt="Previous" />
                </motion.button>
                <motion.button className="PauseButton" onClick={togglePlayPause} title={isPlaying ? t('player.pause') : t('player.play')} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <img src={isPlaying ? Pause : PLAY_ICON_DATA} className="PauseLogo" style={isPlaying ? undefined : { marginLeft: '2px' }} alt="Play/Pause" />
                </motion.button>
                <motion.button className="ButtonRightArrow" onClick={playNext} title={t('player.next')} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <img src={RightArrow} className="RightArrowLogo" alt="Next" />
                </motion.button>
                <motion.button className={`RefButton ${isRepeat ? 'active' : ''}`} onClick={toggleRepeat} title={isRepeat ? t('player.repeatOn') : t('player.repeat')} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <img src={Ref} className="RefLogo" alt="Repeat" />
                </motion.button>
              </div>

              <div className="ContStartTime">
                <span className="StartTime">{formatTime(currentTime)}</span>
                <motion.div
                  className="PlayBackLine"
                  ref={timelineRef}
                  onClick={handleTimelineClick}
                  onTouchStart={handleTimelineTouch}
                  onTouchMove={handleTimelineTouch}
                  onTouchEnd={handleTimelineTouch}
                  whileHover={{ scaleY: 1.4 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="PlayBackFill" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                </motion.div>
                <span className="EndTime">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="Volume">
              <motion.svg
                className="VolumeIcon"
                viewBox="0 0 17 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                onClick={toggleMute}
                style={{ cursor: 'pointer' }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
              >
                {isMuted || volume === 0 ? (
                  <>
                    <path d="M0 10.6595V5.65961H3.71152L7.99993 1.3712V14.9479L3.71152 10.6595H0ZM6.49996 5.00957L4.34996 7.15957H1.49996V9.15957H4.34996L6.49996 11.3096V5.00957Z" fill="#72DEEF" />
                    <path d="M11 5.5L15 9.5M15 5.5L11 9.5" stroke="#72DEEF" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                ) : volume < 50 ? (
                  <>
                    <path d="M0 10.6595V5.65961H3.71152L7.99993 1.3712V14.9479L3.71152 10.6595H0ZM6.49996 5.00957L4.34996 7.15957H1.49996V9.15957H4.34996L6.49996 11.3096V5.00957Z" fill="#72DEEF" />
                    <path d="M10.3846 11.8134V4.45575C11.0589 4.82242 11.5801 5.33876 11.948 6.00478C12.316 6.6708 12.4999 7.38906 12.4999 8.15957C12.4999 8.91982 12.3144 9.62719 11.9432 10.2817C11.5721 10.9361 11.0525 11.4467 10.3846 11.8134Z" fill="#72DEEF" />
                  </>
                ) : (
                  <>
                    <path d="M10.3846 16.2691V14.7192C11.8269 14.2602 12.9887 13.4269 13.8701 12.2192C14.7515 11.0115 15.1922 9.64995 15.1922 8.13457C15.1922 6.61919 14.7515 5.25765 13.8701 4.04996C12.9887 2.84227 11.8269 2.00894 10.3846 1.54996V0C12.2461 0.49872 13.7627 1.49808 14.9345 2.99807C16.1063 4.49806 16.6922 6.21023 16.6922 8.13457C16.6922 10.0589 16.1063 11.7711 14.9345 13.2711C13.7627 14.7711 12.2461 15.7704 10.3846 16.2691ZM0 10.6595V5.65961H3.71152L7.99993 1.3712V14.9479L3.71152 10.6595H0ZM10.3846 11.8134V4.45575C11.0589 4.82242 11.5801 5.33876 11.948 6.00478C12.316 6.6708 12.4999 7.38906 12.4999 8.15957C12.4999 8.91982 12.3144 9.62719 11.9432 10.2817C11.5721 10.9361 11.0525 11.4467 10.3846 11.8134ZM6.49996 5.00957L4.34996 7.15957H1.49996V9.15957H4.34996L6.49996 11.3096V5.00957Z" fill="#72DEEF" />
                  </>
                )}
              </motion.svg>
              <motion.div
                className="ContVolume"
                ref={trackRef}
                onClick={handleSliderClick}
                onMouseDown={handleVolumeMouseDown}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                whileHover={{ scaleY: 1.4 }}
                transition={{ duration: 0.15 }}
              >
                <motion.div className="VolumeFill" style={{ width: volumeFillWidth }} />
              </motion.div>
              <motion.button className="ButtonRight" onClick={handleFullscreenClick} title={t('player.fullscreen')} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                <img src={Right} alt="Fullscreen" />
              </motion.button>
            </div>
          </motion.footer>
        )}
      </div>
    </div>
  )
}