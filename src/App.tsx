import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { refreshSession } from './api/api-client'
import { ProtectedRoute } from './components/protected-route'
import { PublicRoute } from './components/public-route'
import { Layout } from './components/layout'
import { PageTransition } from './components/page-transition'
import { AnimatePresence } from 'framer-motion'
import { PlayerProvider } from './context/player-provider'
import { ProfileProvider } from './context/profile-provider'
import { ThemeProvider } from './context/theme-context'
import { PlaylistModalProvider } from './context/playlist-modal-context'
import { AuthModalProvider } from './context/auth-modal-context'
import { SubscriptionProvider } from './context/subscription-context'
import { ChatProvider } from './context/chat-context'
import { ShareModalProvider } from './context/share-modal-context'
import { ForwardModalProvider } from './context/forward-modal-context'
import { AuthPromptModal } from './components/AuthPromptModal'
import { SubscriptionModal } from './components/SubscriptionModal'
import { ShareTrackModal } from './components/ShareTrackModal'
import { ForwardMessageModal } from './components/ForwardMessageModal'
import './app.css'

import { getAccessToken } from './api/token-store'

import { Reg } from './pages/register'
import { Log } from './pages/login'
import { Create } from './pages/create'
import { Forgot } from './pages/forgot-password'
import { Cod } from './pages/email-code'
import { Recovery } from './pages/password-recovery'
import { AuthCallback } from './pages/auth-callback'

const Main = lazy(() => import('./pages/main-page').then(m => ({ default: m.Main })))
const SearchPage = lazy(() => import('./pages/search').then(m => ({ default: m.SearchPage })))
const AiMixPage = lazy(() => import('./pages/ai-mix').then(m => ({ default: m.AiMixPage })))
const LibraryPage = lazy(() => import('./pages/library').then(m => ({ default: m.LibraryPage })))
const LikedPage = lazy(() => import('./pages/liked').then(m => ({ default: m.LikedPage })))
const PlaylistsPage = lazy(() => import('./pages/playlists').then(m => ({ default: m.PlaylistsPage })))
const DownloadsPage = lazy(() => import('./pages/downloads').then(m => ({ default: m.DownloadsPage })))
const SubscriptionPage = lazy(() => import('./pages/subscription').then(m => ({ default: m.SubscriptionPage })))

const Profile = lazy(() => import('./pages/profile').then(m => ({ default: m.Profile })))
const PrivacyPolicy = lazy(() => import('./pages/privacy-policy').then(m => ({ default: m.PrivacyPolicy })))
const CookiesPolicy = lazy(() => import('./pages/cookies').then(m => ({ default: m.CookiesPolicy })))
const AboutPage = lazy(() => import('./pages/about').then(m => ({ default: m.AboutPage })))
const TrackPage = lazy(() => import('./pages/track').then(m => ({ default: m.TrackPage })))
const AlbumPage = lazy(() => import('./pages/album').then(m => ({ default: m.AlbumPage })))
const ChatPage = lazy(() => import('./pages/chat').then(m => ({ default: m.ChatPage })))
// Адмінка — окремий важкий бандл (власні Sidebar/Header + CSS), потрібна одиницям
// користувачів, тому вантажимо ліниво, як і решту великих сторінок.
const AdminPage = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminPage })))

import { AdminRoute } from './components/admin-route'
import Loader from './components/Loader'

const detectLanguage = (activeI18nLanguage?: string): 'en' | 'uk' => {
  const saved = localStorage.getItem('lang')
  if (saved === 'en' || saved === 'uk') return saved

  if (activeI18nLanguage) {
    const code = activeI18nLanguage.toLowerCase()
    if (code.startsWith('en')) return 'en'
    if (code.startsWith('uk') || code.startsWith('ua')) return 'uk'
  }

  for (const lang of navigator.languages ?? []) {
    const code = lang.toLowerCase()
    if (code.startsWith('en')) return 'en'
    if (code.startsWith('uk') || code.startsWith('ua')) return 'uk'
  }

  return (navigator.language ?? '').toLowerCase().startsWith('en') ? 'en' : 'uk'
}

const LanguageSync = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const [isSynced, setIsSynced] = useState(false)

  useEffect(() => {
    const savedLang = detectLanguage(i18n.language)
    const hasEnPrefix = location.pathname.startsWith('/en/') || location.pathname === '/en'

    if (hasEnPrefix) {
      if (i18n.language !== 'en') i18n.changeLanguage('en')
      localStorage.setItem('lang', 'en')
      setIsSynced(true)
    } else if (savedLang === 'en') {
      navigate(`/en${location.pathname}${location.search}`, { replace: true })
    } else {
      if (i18n.language !== 'uk') i18n.changeLanguage('uk')
      localStorage.setItem('lang', 'uk')
      setIsSynced(true)
    }
  }, [location.pathname, i18n, navigate])

  if (!isSynced) {
    const isEn = location.pathname.startsWith('/en') || detectLanguage(i18n.language) === 'en'
    return <Loader isEn={isEn} />
  }

  return <>{children}</>
}

const LanguageRedirect = () => {
  const { i18n } = useTranslation()
  const savedLang = detectLanguage(i18n.language)
  return savedLang === 'en'
    ? <Navigate to="/en/main" replace />
    : <Navigate to="/main" replace />
}

const WildcardRedirect = () => {
  const location = useLocation()
  const { i18n } = useTranslation()
  const savedLang = detectLanguage(i18n.language)
  const isEn = location.pathname.startsWith('/en') || savedLang === 'en'
  return <Navigate to={isEn ? '/en/main' : '/main'} replace />
}

const renderRouteTree = () => (
  <>
    <Route index element={<LanguageRedirect />} />

    <Route path="reg" element={<LanguageSync><PublicRoute><PageTransition><Reg /></PageTransition></PublicRoute></LanguageSync>} />
    <Route path="login" element={<LanguageSync><PublicRoute><PageTransition><Log /></PageTransition></PublicRoute></LanguageSync>} />
    <Route path="create" element={<LanguageSync><PublicRoute><PageTransition><Create /></PageTransition></PublicRoute></LanguageSync>} />
    <Route path="forgotpassword" element={<LanguageSync><PublicRoute><PageTransition><Forgot /></PageTransition></PublicRoute></LanguageSync>} />
    <Route path="emailcod" element={<LanguageSync><PublicRoute><PageTransition><Cod /></PageTransition></PublicRoute></LanguageSync>} />
    <Route path="passwordrecovery" element={<LanguageSync><PublicRoute><PageTransition><Recovery /></PageTransition></PublicRoute></LanguageSync>} />
    <Route path="auth/callback" element={<LanguageSync><PublicRoute><AuthCallback /></PublicRoute></LanguageSync>} />

    <Route element={<LanguageSync><ProtectedRoute><Layout /></ProtectedRoute></LanguageSync>}>
      <Route path="profile" element={<Suspense fallback={<Loader variant="section" />}><Profile /></Suspense>} />
      <Route path="main" element={<Suspense fallback={<Loader variant="section" />}><Main /></Suspense>} />
      <Route path="playlists" element={<Suspense fallback={<Loader variant="section" />}><PlaylistsPage /></Suspense>} />
      <Route path="playlists/:id" element={<Suspense fallback={<Loader variant="section" />}><PlaylistsPage /></Suspense>} />
      <Route path="albums/:id" element={<Suspense fallback={<Loader variant="section" />}><AlbumPage /></Suspense>} />
      <Route path="ai-mix" element={<Suspense fallback={<Loader variant="section" />}><AiMixPage /></Suspense>} />
      <Route path="downloads" element={<Suspense fallback={<Loader variant="section" />}><DownloadsPage /></Suspense>} />
      <Route path="subscription" element={<Suspense fallback={<Loader variant="section" />}><SubscriptionPage /></Suspense>} />
      <Route path="search" element={<Suspense fallback={<Loader variant="section" />}><SearchPage /></Suspense>} />
      <Route path="library" element={<Suspense fallback={<Loader variant="section" />}><LibraryPage /></Suspense>} />
      <Route path="liked" element={<Suspense fallback={<Loader variant="section" />}><LikedPage /></Suspense>} />
      <Route path="privacy-policy" element={<Suspense fallback={<Loader variant="section" />}><PrivacyPolicy /></Suspense>} />
      <Route path="cookies" element={<Suspense fallback={<Loader variant="section" />}><CookiesPolicy /></Suspense>} />
      <Route path="about" element={<Suspense fallback={<Loader variant="section" />}><AboutPage /></Suspense>} />
      <Route path="track" element={<Suspense fallback={<Loader variant="section" />}><TrackPage /></Suspense>} />
      <Route path="chat" element={<Suspense fallback={<Loader variant="section" />}><ChatPage /></Suspense>} />
    </Route>

    {/* Адмінка навмисно ПОЗА групою з <Layout /> — вона малює власні Sidebar/Header і не
        повинна бути обгорнута плеєрним лейаутом. Оскільки renderRouteTree() викликається
        і під "/en", і під "/", цей один рядок дає одразу /admin і /en/admin. */}
    <Route
      path="admin"
      element={
        <LanguageSync>
          <AdminRoute>
            <Suspense fallback={<Loader variant="section" />}>
              <AdminPage />
            </Suspense>
          </AdminRoute>
        </LanguageSync>
      }
    />

    <Route path="*" element={<WildcardRedirect />} />
  </>
)

const AppRoutes = () => {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/en">
          {renderRouteTree()}
        </Route>
        <Route path="/">
          {renderRouteTree()}
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

export const App = () => {
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const init = async () => {
      const hasToken = !!getAccessToken()
      const email = localStorage.getItem('UserEmail')

      if (hasToken) {
        setIsInitializing(false)
        if (email) {
          refreshSession().catch(() => {})
        }
      } else if (email) {
        setIsInitializing(false)
        refreshSession().catch(() => {})
      } else {
        setIsInitializing(false)
      }
    }
    init()
  }, [])

  if (isInitializing) {
    return <Loader isEn={localStorage.getItem('lang') === 'en'} />
  }

  return (
    <ThemeProvider>
      <ProfileProvider>
        <SubscriptionProvider>
          <AuthModalProvider>
            <PlayerProvider>
              <ChatProvider>
                <ShareModalProvider>
                  <ForwardModalProvider>
                    <PlaylistModalProvider>
                      <Router>
                        <AuthPromptModal />
                        <SubscriptionModal />
                        <ShareTrackModal />
                        <ForwardMessageModal />
                        <Suspense fallback={<Loader isEn={localStorage.getItem('lang') === 'en'} />}>
                          <AppRoutes />
                        </Suspense>
                      </Router>
                    </PlaylistModalProvider>
                  </ForwardModalProvider>
                </ShareModalProvider>
              </ChatProvider>
            </PlayerProvider>
          </AuthModalProvider>
        </SubscriptionProvider>
      </ProfileProvider>
    </ThemeProvider>
  )
}

export default App
