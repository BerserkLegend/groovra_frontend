import { useState, useRef, useEffect, Component, type ErrorInfo, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '../context/player-context'
import type { Track } from '../context/player-context'
import { useSubscription } from '../context/subscription-context'
import { logoutUser, changePasswordApi } from '../api/auth'
import { getAccessToken, apiFetch, GATEWAY_URL, getCurrentUserId, getOrCreateDeviceId, clearAuth, redirectToLogin } from '../api/api-client'
import { getLangPrefix } from '../utils/lang'
import {
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  uploadBanner,
  deleteBanner as deleteBannerApi,
  resolveMediaUrl,
  getUserHistory,
  getFavoriteTracks,
  applyArtist,
  getArtistStatus,
  uploadArtistTrack,
  getMyArtistTracks,
  deleteArtistTrack,
  getArtistStats,
  getProfile,
  getProfileById,
  followProfile,
  unfollowProfile,
  getFollowStatus,
  type HistoryTrackItem,
  type FavoriteTrackItem,
  type ArtistTrackItem,
  type ArtistStats
} from '../api/profile'
import { getSessions, revokeSession, revokeAllSessions } from '../api/sessions'
import { getBlockedUserIds, unblockUser } from '../api/chat-client'
import { renameTrack, getDeletedTracks, restoreTrack, permanentlyDeleteTrack } from '../api/tracks'
import {
  fetchMyAlbums,
  fetchDeletedAlbums,
  fetchAlbumById,
  restoreAlbum,
  deleteAlbum,
  permanentlyDeleteAlbum,
  createAlbum,
  updateAlbum,
  addAlbumTracks,
  removeAlbumTrack,
  type AlbumListItem,
  type BulkTrackOperationResult,
} from '../api/albums'
import { TrackCover } from '../components/common/TrackCover'
import { ConfirmModal } from '../components/ConfirmModal'
import { RenameTrackModal } from '../components/RenameTrackModal'
import IconAvatar from '../assets/IconAvatar.svg'
import '../app.css'
import './profile.css'
import { EditProfile } from './editprofile'
import type { ProfileData } from './editprofile'
import { Music, Image as ImageIcon, UploadCloud, Headphones, Disc3, TrendingUp, BarChart3, ArrowUpRight, Heart } from 'lucide-react'
import { useProfile } from '../context/profile-context'
import { getTwoFactorStatus } from '../api/two-factor'
import { TwoFactorModal } from '../components/TwoFactorModal'

interface TabErrorBoundaryProps {
  children: ReactNode
}

interface TabErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  public state: TabErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TabErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="ProfBody" style={{ padding: '32px' }}>
          <div className="ProfPanel" style={{ width: '100%', textAlign: 'center', color: '#FFF' }}>
            <h3 style={{ color: '#EF7274', marginBottom: '12px', fontSize: '20px' }}>Помилка завантаження розділу</h3>
            <p style={{ color: '#A1A1AA', fontSize: '14px', marginBottom: '20px' }}>
              {this.state.error?.message || 'Сталася неочікувана помилка під час рендерингу.'}
            </p>
            <button
              className="ArtistSubmitBigBtn"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Оновити розділ
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

type ProfileTabKey = 'account' | 'artist' | 'artist_dashboard' | 'settings' | 'favorites' | 'downloads' | 'history' | 'playlists' | 'premium' | 'logout'

interface ProfileTabItem {
  key: ProfileTabKey
  labelKey: string
}

const profileTabList: ProfileTabItem[] = [
  { key: 'account', labelKey: 'profile.tabs.account' },
  { key: 'artist', labelKey: 'profile.tabs.artist' },
  { key: 'artist_dashboard', labelKey: 'profile.tabs.artist_dashboard' },
  { key: 'settings', labelKey: 'profile.tabs.settings' },
  { key: 'favorites', labelKey: 'profile.tabs.favorites' },
  { key: 'downloads', labelKey: 'profile.tabs.downloads' },
  { key: 'history', labelKey: 'profile.tabs.history' },
  { key: 'playlists', labelKey: 'profile.tabs.playlists' },
  { key: 'premium', labelKey: 'profile.tabs.premium' },
  { key: 'logout', labelKey: 'profile.tabs.logout' },
]

type AccountSideNavKey = 'overview' | 'info' | 'connected' | 'subscription' | 'privacy' | 'sessions' | 'blocked'

interface AccountSideNavItem {
  key: AccountSideNavKey
  labelKey: string
}

const accountSideNavList: AccountSideNavItem[] = [
  { key: 'overview', labelKey: 'profile.side.overview' },
  { key: 'info', labelKey: 'profile.side.info' },
  { key: 'connected', labelKey: 'profile.side.connected' },
  { key: 'subscription', labelKey: 'profile.side.subscription' },
  { key: 'privacy', labelKey: 'profile.side.privacy' },
  { key: 'sessions', labelKey: 'profile.side.sessions' },
  { key: 'blocked', labelKey: 'profile.side.blocked' },
]

const ALBUMS_PAGE_SIZE = 12
const ALBUM_COVER_MAX_BYTES = 10 * 1024 * 1024
const ALBUM_COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// Бекенд (AlbumService.BuildCoverUrl) завжди повертає це посилання, коли для альбому
// не завантажено власну обкладинку — це не помилка і не "реальна" обкладинка.
const ALBUM_DEFAULT_COVER_URL = 'https://img.jamendo.com/albums/default.png'

const albumHasCustomCover = (album: AlbumListItem): boolean =>
  !!album.coverImageUrl && album.coverImageUrl !== ALBUM_DEFAULT_COVER_URL

const renderAlbumCoverArt = (album: AlbumListItem) => {
  if (albumHasCustomCover(album)) {
    return <TrackCover src={album.coverImageUrl} className='AlbumCardCover' alt={album.title} />
  }

  const coverItems: (string | null)[] = [...album.collageCovers]
  while (coverItems.length < 4) coverItems.push(null)
  const hasAnyCover = coverItems.some((url) => url !== null)

  return (
    <div className='PlaylistCollage'>
      {coverItems.map((url, idx) => (
        <div key={idx} className='PlaylistCollageItem'>
          {url ? <TrackCover src={url} alt='cover' /> : <div className='PlaylistCollagePlaceholder' />}
        </div>
      ))}
      {!hasAnyCover && (
        <div className='PlaylistCollageEmptyIcon'>
          <span className='PlaylistEmptyNote'>♪</span>
        </div>
      )}
    </div>
  )
}

const getSubscriptionPlans = (isEn: boolean) => [
  {
    key: 'free',
    title: 'Groovra Free',
    price: isEn ? '$0 / month' : '$0 / місяць',
    buttonText: isEn ? 'Current plan' : 'Поточний план',
    features: isEn ? [
      'Standard plan for all Groovra users',
      'Ads between tracks',
      'Standard audio quality (160 kbps)',
      'Create and save playlists',
      'Basic music recommendations',
      'Limited track skips',
    ] : [
      'Стандартний план для всіх користувачів Groovra',
      'Реклама між треками',
      'Стандартна якість звуку (160 kbps)',
      'Створення та збереження плейлистів',
      'Базові музичні рекомендації',
      'Обмежена кількість пропусків треків',
    ],
  },
  {
    key: 'plus',
    title: 'Groovra Plus',
    price: isEn ? '$5.99 / month' : '$5.99 / місяць',
    buttonText: isEn ? 'Get Plus' : 'Оформити Plus',
    footnote: isEn ? 'Cancel subscription anytime. First 7 days of Plus free' : 'Скасовуйте підписку будь-коли. Перші 7 днів Plus — безкоштовно',
    features: isEn ? [
      'Ideal for daily music listening',
      'Ad-free',
      'High audio quality (320 kbps)',
      'Unlimited track skips',
      'Background playback',
      'Listen on 2 devices simultaneously',
      'Early access to new features',
    ] : [
      'Ідеально для щоденного прослуховування музики',
      'Без реклами',
      'Висока якість звуку (320 kbps)',
      'Необмежена кількість пропусків треків',
      'Фонове відтворення',
      'Прослуховування на 2 пристроях одночасно',
      'Ранній доступ до нових функцій',
    ],
  },
  {
    key: 'premium',
    title: 'Groovra Premium',
    price: isEn ? '$11.99 / month' : '$11.99 / місяць',
    buttonText: isEn ? 'Upgrade to Premium' : 'Перейти на Premium',
    footnote: isEn ? 'Cancel subscription anytime. First 7 days of Premium free' : 'Скасовуйте підписку будь-коли. Перші 7 днів Premium — безкоштовно',
    features: isEn ? [
      'Maximum capabilities for true music lovers.',
      'All Plus benefits',
      'Lossless Audio (Hi-Fi quality)',
      'Unlimited access to AI Mix',
      'Sync across all devices',
      'Exclusive playlists and compilations',
      'Premium badge in profile',
    ] : [
      'Максимум можливостей для справжніх меломанів.',
      'Усі переваги Plus',
      'Lossless Audio (Hi-Fi якість)',
      'Необмежений доступ до AI Mix',
      'Синхронізація між усіма пристроями',
      'Ексклюзивні плейлисти та добірки',
      'Значок Premium у профілі',
    ],
  },
]

const User = {
  name: "",
  handle: "",
  bio: "",
  avatar: "",
  banner: "",
  playlists: 0,
  following: 0,
  followers: 0,
  email: "",
  country: "",
  memberSince: "",
  firstName: "",
  lastName: "",
  city: "",
  phone: "",
  birthday: "",
  gender: "",
  username: "",
}

type User = {
  name: string
  handle: string
  bio: string
  avatar: string
  banner: string
  playlists: number
  following: number
  followers: number
  email: string
  country: string
  memberSince: string
  firstName: string;
  lastName: string;
  city: string;
  phone: string;
  birthday: string;
  gender: string;
  username: string;
}

type ProfileProps = {
  user?: User
}

type EditableField = 'username' | 'phone' | 'country' | 'city' | 'birthday' | 'gender'

export const Profile = ({ user: initialUser = User }: ProfileProps) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setActiveTab, selectTrack, currentTrack, likedTrackIds } = usePlayer()
  const { subscription, paymentHistory, openStripeModal, fetchPaymentHistory, cancelSubscription } = useSubscription()
  const [isCancellingSub, setIsCancellingSub] = useState(false)
  const [showCancelSubModal, setShowCancelSubModal] = useState(false)
  const [cancelSuccessToast, setCancelSuccessToast] = useState(false)

  const {
    profileName, setProfileName,
    systemUsername,
    avatarUrl, setAvatarUrl,
    bannerUrl, setBannerUrl,
    profileData,
    refreshProfile,
  } = useProfile()

  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [viewedProfile, setViewedProfile] = useState<any>(null)
  const [selfFollowersCount, setSelfFollowersCount] = useState(0)
  const [selfFollowingCount, setSelfFollowingCount] = useState(0)

  const params = new URLSearchParams(location.search)
  const queryUserId = params.get('userId')
  const currentUserId = getCurrentUserId()

  useEffect(() => {
    const checkProfileMode = async () => {
      if (queryUserId && currentUserId && queryUserId.toLowerCase() !== currentUserId.toLowerCase()) {
        setIsReadOnly(true)
        try {
          const prof = await getProfileById(queryUserId)
          setViewedProfile(prof)

          const status = await getFollowStatus(queryUserId)
          setIsFollowing(status.isFollowing)
        } catch (err) {
          console.error('Failed to load viewed user profile:', err)
        }
      } else {
        setIsReadOnly(false)
        setViewedProfile(null)
      }
    }
    checkProfileMode()
  }, [queryUserId, currentUserId])

  const handleToggleFollow = async () => {
    if (!queryUserId) return
    try {
      if (isFollowing) {
        await unfollowProfile(queryUserId)
        setIsFollowing(false)
        if (viewedProfile) {
          setViewedProfile({
            ...viewedProfile,
            followersCount: Math.max(0, (viewedProfile.followersCount ?? 0) - 1)
          })
        }
      } else {
        await followProfile(queryUserId)
        setIsFollowing(true)
        if (viewedProfile) {
          setViewedProfile({
            ...viewedProfile,
            followersCount: (viewedProfile.followersCount ?? 0) + 1
          })
        }
      }
    } catch (err) {
      console.error('Failed to toggle follow status:', err)
    }
  }

  const [activeAccountSection, setActiveAccountSection] = useState<AccountSideNavKey>('overview')
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTabKey>(() => {
    const tabParam = params.get('tab')
    const locationState = location.state as { tab?: string } | null
    if (tabParam === 'settings' || locationState?.tab === 'settings') {
      return 'settings'
    }
    if (tabParam && ['account', 'artist', 'artist_dashboard', 'settings', 'favorites', 'downloads', 'history', 'playlists', 'premium'].includes(tabParam)) {
      return tabParam as ProfileTabKey
    }
    return 'account'
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab')
    const stateTab = (location.state as { tab?: string } | null)?.tab
    if (tabParam === 'settings' || stateTab === 'settings') {
      setActiveProfileTab('settings')
    } else if (tabParam && ['account', 'artist', 'artist_dashboard', 'settings', 'favorites', 'downloads', 'history', 'playlists', 'premium'].includes(tabParam)) {
      setActiveProfileTab(tabParam as ProfileTabKey)
    }
  }, [location.search, location.state])

  useEffect(() => {
    if (activeAccountSection === 'subscription') {
      fetchPaymentHistory()
    }
  }, [activeAccountSection, fetchPaymentHistory])

  const [sessions, setSessions] = useState<string[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionActionError, setSessionActionError] = useState<string | null>(null)
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const [isRevokeAllModalOpen, setIsRevokeAllModalOpen] = useState(false)
  const [thisDeviceId] = useState(() => getOrCreateDeviceId())

  const fetchSessionsList = () => {
    setIsLoadingSessions(true)
    setSessionsError(null)
    setSessionActionError(null)
    getSessions()
      .then(setSessions)
      .catch((err) => setSessionsError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to load sessions.' : 'Не вдалося завантажити сесії.')))
      .finally(() => setIsLoadingSessions(false))
  }

  useEffect(() => {
    if (activeAccountSection !== 'sessions') return
    fetchSessionsList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountSection])

  const handleRevokeSession = async (deviceId: string) => {
    setSessionActionError(null)
    try {
      await revokeSession(deviceId)
      if (deviceId === thisDeviceId) {
        // Revoking the session tied to this browser invalidates the refresh token
        // server-side immediately, so keep the UI in sync rather than waiting for
        // the next silent refresh to fail and bounce the user unexpectedly.
        clearAuth()
        redirectToLogin()
        return
      }
      setSessions((prev) => prev.filter((id) => id !== deviceId))
    } catch (err) {
      setSessionActionError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to revoke session.' : 'Не вдалося видалити сесію.'))
    } finally {
      setSessionToRevoke(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    setSessionActionError(null)
    try {
      await revokeAllSessions()
      clearAuth()
      redirectToLogin()
    } catch (err) {
      setSessionActionError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to revoke sessions.' : 'Не вдалося скасувати сесії.'))
    } finally {
      setIsRevokeAllModalOpen(false)
    }
  }

  interface BlockedUserRow {
    userId: string
    displayName: string
    avatarUrl?: string
  }

  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([])
  const [isLoadingBlockedUsers, setIsLoadingBlockedUsers] = useState(false)
  const [blockedUsersError, setBlockedUsersError] = useState<string | null>(null)
  const [userToUnblock, setUserToUnblock] = useState<BlockedUserRow | null>(null)

  const fetchBlockedUsersList = (cancelledRef?: { current: boolean }) => {
    setIsLoadingBlockedUsers(true)
    setBlockedUsersError(null)

    getBlockedUserIds()
      .then(async (ids) => {
        const rows = await Promise.all(ids.map(async (id): Promise<BlockedUserRow> => {
          try {
            const prof = await getProfileById(id)
            return {
              userId: id,
              displayName: prof.displayName || prof.username || id,
              avatarUrl: prof.avatarUrl ? resolveMediaUrl(prof.avatarUrl) : undefined,
            }
          } catch {
            return { userId: id, displayName: id }
          }
        }))
        if (!cancelledRef?.current) setBlockedUsers(rows)
      })
      .catch((err) => {
        if (!cancelledRef?.current) setBlockedUsersError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to load blocked users.' : 'Не вдалося завантажити список заблокованих.'))
      })
      .finally(() => {
        if (!cancelledRef?.current) setIsLoadingBlockedUsers(false)
      })
  }

  useEffect(() => {
    if (activeAccountSection !== 'blocked') return
    const cancelledRef = { current: false }
    fetchBlockedUsersList(cancelledRef)
    return () => { cancelledRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountSection])

  const handleUnblockUser = async (userId: string) => {
    try {
      await unblockUser(userId)
      setBlockedUsers((prev) => prev.filter((u) => u.userId !== userId))
    } catch (err) {
      setBlockedUsersError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to unblock user.' : 'Не вдалося розблокувати користувача.'))
    } finally {
      setUserToUnblock(null)
    }
  }

  const [artistDashSection, setArtistDashSection] = useState<'overview' | 'tracks' | 'upload' | 'albums'>('upload')
  const [uploadTrackForm, setUploadTrackForm] = useState({
    title: '',
    artist: '',
    genre: '',
    description: '',
    tags: '',
  })
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null)
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null)
  const [isDraggingAudio, setIsDraggingAudio] = useState(false)
  const [isDraggingCover, setIsDraggingCover] = useState(false)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [artistTracks, setArtistTracks] = useState<ArtistTrackItem[]>([])
  const [isLoadingArtistTracks, setIsLoadingArtistTracks] = useState(false)
  const [isUploadingTrack, setIsUploadingTrack] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCoverFile) {
      const url = URL.createObjectURL(selectedCoverFile)
      setCoverPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setCoverPreviewUrl(null)
    }
  }, [selectedCoverFile])

  const fetchUserTracks = async () => {
    setIsLoadingArtistTracks(true)
    try {
      const data = await getMyArtistTracks()
      setArtistTracks(Array.isArray(data?.items) ? data.items : [])
    } catch {
      setArtistTracks([])
    } finally {
      setIsLoadingArtistTracks(false)
    }
  }

  useEffect(() => {
    if (activeProfileTab === 'artist_dashboard') {
      fetchUserTracks()
    }
  }, [activeProfileTab])

  const handleUploadTrackSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setUploadError(null)
    setUploadSuccess(null)

    if (!uploadTrackForm.title.trim()) {
      setUploadError(i18n.language === 'en' ? 'Please enter a track title.' : 'Будь ласка, вкажіть назву треку.')
      return
    }

    if (!selectedAudioFile) {
      setUploadError(i18n.language === 'en' ? 'Please select an audio file.' : 'Будь ласка, оберіть аудіофайл.')
      return
    }

    setIsUploadingTrack(true)

    try {
      await uploadArtistTrack({
        title: uploadTrackForm.title.trim(),
        artistName: uploadTrackForm.artist.trim(),
        genre: uploadTrackForm.genre.trim(),
        file: selectedAudioFile,
        coverImage: selectedCoverFile,
      })

      setUploadSuccess(i18n.language === 'en' ? 'Track uploaded successfully!' : 'Трек успішно завантажено!')
      setUploadTrackForm((prev) => ({ ...prev, title: '', genre: '', description: '', tags: '' }))
      setSelectedAudioFile(null)
      setSelectedCoverFile(null)
      fetchUserTracks()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to upload track.' : 'Не вдалося завантажити трек.'))
    } finally {
      setIsUploadingTrack(false)
    }
  }

  const handleDeleteArtistTrack = async (trackId: string) => {
    if (!window.confirm(i18n.language === 'en' ? 'Are you sure you want to delete this track?' : 'Ви впевнені, що хочете видалити цей трек?')) return
    const success = await deleteArtistTrack(trackId)
    if (success) {
      setArtistTracks((prev) => prev.filter((t) => t.id !== trackId))
    }
  }

  const [trackToRename, setTrackToRename] = useState<ArtistTrackItem | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)

  const handleRenameTrack = async (newTitle: string) => {
    if (!trackToRename) return
    setRenameError(null)
    try {
      await renameTrack(trackToRename.id, newTitle)
      setTrackToRename(null)
      fetchUserTracks()
    } catch (err) {
      // Keep the modal open on failure (matches TwoFactorModal's inline-error convention)
      // so the user sees what went wrong and doesn't lose the title they typed.
      setRenameError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to rename track.' : 'Не вдалося перейменувати трек.'))
    }
  }

  const closeRenameModal = () => {
    setTrackToRename(null)
    setRenameError(null)
  }

  const [deletedTracks, setDeletedTracks] = useState<Track[]>([])
  const [isViewingTrackTrash, setIsViewingTrackTrash] = useState(false)
  const [isLoadingDeletedTracks, setIsLoadingDeletedTracks] = useState(false)
  const [deletedTracksError, setDeletedTracksError] = useState<string | null>(null)
  const [trackToPermanentlyDelete, setTrackToPermanentlyDelete] = useState<Track | null>(null)

  const fetchDeletedTracksList = async () => {
    setIsLoadingDeletedTracks(true)
    setDeletedTracksError(null)
    try {
      const items = await getDeletedTracks()
      setDeletedTracks(items)
    } catch (err) {
      setDeletedTracks([])
      setDeletedTracksError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to load deleted tracks.' : 'Не вдалося завантажити видалені треки.'))
    } finally {
      setIsLoadingDeletedTracks(false)
    }
  }

  const handleToggleTrackTrash = () => {
    const next = !isViewingTrackTrash
    setIsViewingTrackTrash(next)
    // Кошик перезавантажуємо завжди: його вміст змінюється після кожного видалення
    // чи відновлення, тому кешований непорожній список одразу став би застарілим.
    if (next) fetchDeletedTracksList()
  }

  const handleRestoreTrack = async (trackId: string) => {
    try {
      await restoreTrack(trackId)
      setDeletedTracks((prev) => prev.filter((t) => t.trackId !== trackId))
      fetchUserTracks()
    } catch (err) {
      setDeletedTracksError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to restore track.' : 'Не вдалося відновити трек.'))
    }
  }

  const handlePermanentlyDeleteTrack = async (track: Track) => {
    try {
      await permanentlyDeleteTrack(track.trackId)
      setDeletedTracks((prev) => prev.filter((t) => t.trackId !== track.trackId))
    } catch (err) {
      setDeletedTracksError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to permanently delete track.' : 'Не вдалося остаточно видалити трек.'))
    } finally {
      setTrackToPermanentlyDelete(null)
    }
  }

  const [artistStats, setArtistStats] = useState<ArtistStats | null>(null)
  const [isLoadingArtistStats, setIsLoadingArtistStats] = useState(false)
  const [artistStatsError, setArtistStatsError] = useState<string | null>(null)

  const fetchArtistStats = () => {
    setIsLoadingArtistStats(true)
    setArtistStatsError(null)
    getArtistStats()
      .then(setArtistStats)
      .catch((err) => setArtistStatsError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to load statistics.' : 'Не вдалося завантажити статистику.')))
      .finally(() => setIsLoadingArtistStats(false))
  }

  useEffect(() => {
    if (activeProfileTab === 'artist_dashboard' && artistDashSection === 'overview') {
      fetchArtistStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileTab, artistDashSection])

  const [myAlbums, setMyAlbums] = useState<AlbumListItem[]>([])
  const [myAlbumsTotal, setMyAlbumsTotal] = useState(0)
  const [myAlbumsPage, setMyAlbumsPage] = useState(1)
  const [isLoadingMyAlbums, setIsLoadingMyAlbums] = useState(false)
  const [isLoadingMoreAlbums, setIsLoadingMoreAlbums] = useState(false)
  const [myAlbumsError, setMyAlbumsError] = useState<string | null>(null)
  const [deletedAlbums, setDeletedAlbums] = useState<AlbumListItem[]>([])
  const [isViewingAlbumTrash, setIsViewingAlbumTrash] = useState(false)
  const [isLoadingDeletedAlbums, setIsLoadingDeletedAlbums] = useState(false)
  const [deletedAlbumsError, setDeletedAlbumsError] = useState<string | null>(null)
  const [albumFormMode, setAlbumFormMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [originalAlbumTrackIds, setOriginalAlbumTrackIds] = useState<string[]>([])
  const [editingAlbumCoverUrl, setEditingAlbumCoverUrl] = useState<string | null>(null)
  const [removeExistingAlbumCover, setRemoveExistingAlbumCover] = useState(false)
  const [isLoadingAlbumForm, setIsLoadingAlbumForm] = useState(false)
  const [albumForm, setAlbumForm] = useState({ title: '', description: '', releaseDate: '' })
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null)
  const [albumCoverPreviewUrl, setAlbumCoverPreviewUrl] = useState<string | null>(null)
  const [isDraggingAlbumCover, setIsDraggingAlbumCover] = useState(false)
  const albumCoverInputRef = useRef<HTMLInputElement>(null)
  const [selectedAlbumTrackIds, setSelectedAlbumTrackIds] = useState<string[]>([])
  const [isSubmittingAlbum, setIsSubmittingAlbum] = useState(false)
  const [albumFormError, setAlbumFormError] = useState<string | null>(null)
  const [albumNotice, setAlbumNotice] = useState<string | null>(null)
  const [albumToDelete, setAlbumToDelete] = useState<AlbumListItem | null>(null)
  const [albumToPermanentlyDelete, setAlbumToPermanentlyDelete] = useState<AlbumListItem | null>(null)

  useEffect(() => {
    if (albumCoverFile) {
      const url = URL.createObjectURL(albumCoverFile)
      setAlbumCoverPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setAlbumCoverPreviewUrl(null)
    }
  }, [albumCoverFile])

  // Валідація дзеркалить UploadService.UploadAlbumCoverAsync (10 МБ, jpeg/png/webp),
  // щоб користувач не чекав на upload лише щоб отримати 400 від бекенду.
  const applyAlbumCoverFile = (file: File | null) => {
    if (!file) {
      setAlbumCoverFile(null)
      return
    }
    if (!ALBUM_COVER_MIME_TYPES.includes(file.type)) {
      setAlbumFormError(i18n.language === 'en' ? 'Cover must be a JPEG, PNG or WebP image.' : 'Обкладинка має бути у форматі JPEG, PNG або WebP.')
      return
    }
    if (file.size > ALBUM_COVER_MAX_BYTES) {
      setAlbumFormError(i18n.language === 'en' ? 'Cover image must be 10 MB or smaller.' : 'Розмір обкладинки не має перевищувати 10 МБ.')
      return
    }
    setAlbumFormError(null)
    setAlbumCoverFile(file)
    // Новий файл переважає раніше поставлену позначку "прибрати обкладинку".
    setRemoveExistingAlbumCover(false)
  }

  const handleRemoveExistingAlbumCover = () => {
    setAlbumCoverFile(null)
    setRemoveExistingAlbumCover(true)
  }

  const fetchMyAlbumsList = async () => {
    setIsLoadingMyAlbums(true)
    setMyAlbumsError(null)
    try {
      const data = await fetchMyAlbums({ pageNumber: 1, pageSize: ALBUMS_PAGE_SIZE })
      setMyAlbums(data.items)
      setMyAlbumsTotal(data.totalCount)
      setMyAlbumsPage(1)
    } catch (err) {
      setMyAlbums([])
      setMyAlbumsTotal(0)
      setMyAlbumsError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to load albums.' : 'Не вдалося завантажити альбоми.'))
    } finally {
      setIsLoadingMyAlbums(false)
    }
  }

  const fetchMoreMyAlbums = async () => {
    const nextPage = myAlbumsPage + 1
    setIsLoadingMoreAlbums(true)
    try {
      const data = await fetchMyAlbums({ pageNumber: nextPage, pageSize: ALBUMS_PAGE_SIZE })
      setMyAlbums((prev) => [...prev, ...data.items])
      setMyAlbumsTotal(data.totalCount)
      setMyAlbumsPage(nextPage)
    } catch (err) {
      setMyAlbumsError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to load albums.' : 'Не вдалося завантажити альбоми.'))
    } finally {
      setIsLoadingMoreAlbums(false)
    }
  }

  useEffect(() => {
    if (activeProfileTab === 'artist_dashboard' && artistDashSection === 'albums') {
      fetchMyAlbumsList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileTab, artistDashSection])

  const fetchDeletedAlbumsList = async () => {
    setIsLoadingDeletedAlbums(true)
    setDeletedAlbumsError(null)
    try {
      const items = await fetchDeletedAlbums()
      setDeletedAlbums(items)
    } catch (err) {
      setDeletedAlbums([])
      setDeletedAlbumsError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to load deleted albums.' : 'Не вдалося завантажити видалені альбоми.'))
    } finally {
      setIsLoadingDeletedAlbums(false)
    }
  }

  const handleToggleAlbumTrash = () => {
    const next = !isViewingAlbumTrash
    setIsViewingAlbumTrash(next)
    // Кошик перезавантажуємо завжди: його вміст змінюється після кожного видалення
    // чи відновлення, тому кешований непорожній список одразу став би застарілим.
    if (next) fetchDeletedAlbumsList()
  }

  const resetAlbumForm = () => {
    setAlbumForm({ title: '', description: '', releaseDate: '' })
    setAlbumCoverFile(null)
    setRemoveExistingAlbumCover(false)
    setSelectedAlbumTrackIds([])
    setOriginalAlbumTrackIds([])
    setEditingAlbumCoverUrl(null)
    setAlbumFormError(null)
    setEditingAlbumId(null)
  }

  const openCreateAlbumForm = () => {
    resetAlbumForm()
    setAlbumNotice(null)
    setAlbumFormMode('create')
  }

  const openEditAlbumForm = async (album: AlbumListItem) => {
    resetAlbumForm()
    setAlbumNotice(null)
    setEditingAlbumId(album.id)
    setAlbumFormMode('edit')
    setIsLoadingAlbumForm(true)
    try {
      const full = await fetchAlbumById(album.id)
      const trackIds = full.tracks.map((tr) => tr.trackId)
      setAlbumForm({ title: full.title, description: full.description || '', releaseDate: full.releaseDate || '' })
      setSelectedAlbumTrackIds(trackIds)
      setOriginalAlbumTrackIds(trackIds)
      setEditingAlbumCoverUrl(albumHasCustomCover(full) ? resolveMediaUrl(full.coverImageUrl) || null : null)
    } catch (err) {
      // Форму не відкриваємо на половинчастих даних: збереження такої форми стерло б
      // опис альбому і не побачило б наявних треків.
      setAlbumFormMode('closed')
      setEditingAlbumId(null)
      setAlbumFormError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to load album details.' : 'Не вдалося завантажити дані альбому.'))
    } finally {
      setIsLoadingAlbumForm(false)
    }
  }

  const closeAlbumForm = () => {
    setAlbumFormMode('closed')
    resetAlbumForm()
  }

  const toggleAlbumTrackSelection = (trackId: string) => {
    setSelectedAlbumTrackIds((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    )
  }

  const describeSkippedTracks = (result: BulkTrackOperationResult | null): string | null => {
    if (!result) return null
    const messages: string[] = []

    const skipped = result.belongsToAnotherAlbumIds.length + result.notFoundIds.length
    if (skipped > 0) {
      messages.push(
        i18n.language === 'en'
          ? `${skipped} track(s) were not added — a track can belong to only one album.`
          : `${skipped} трек(ів) не додано — трек може належати лише одному альбому.`
      )
    }

    // Окреме повідомлення: альбом-блокувальник лежить у кошику, тому в списках його не
    // видно — без цієї підказки юзер не зрозуміє, чому трек "зайнятий" невідомо чим.
    const trashed = result.belongsToTrashedAlbumIds.length
    if (trashed > 0) {
      messages.push(
        i18n.language === 'en'
          ? `${trashed} track(s) belong to an album in the trash. Restore that album and remove the track from it, or delete the album permanently to free the track.`
          : `${trashed} трек(ів) належать альбому з кошика. Відновіть той альбом і приберіть трек із нього, або видаліть альбом назавжди — тоді трек звільниться.`
      )
    }

    return messages.length > 0 ? messages.join(' ') : null
  }

  const handleSubmitAlbumForm = async () => {
    if (!albumForm.title.trim()) {
      setAlbumFormError(i18n.language === 'en' ? 'Please enter an album title.' : 'Будь ласка, вкажіть назву альбому.')
      return
    }
    setIsSubmittingAlbum(true)
    setAlbumFormError(null)
    setAlbumNotice(null)
    try {
      let trackResult: BulkTrackOperationResult | null = null

      if (albumFormMode === 'create') {
        const created = await createAlbum({
          title: albumForm.title.trim(),
          description: albumForm.description.trim() || undefined,
          releaseDate: albumForm.releaseDate || undefined,
          trackIds: selectedAlbumTrackIds,
          coverFile: albumCoverFile,
        })
        trackResult = created.trackImport
      } else if (albumFormMode === 'edit' && editingAlbumId) {
        await updateAlbum(editingAlbumId, {
          title: albumForm.title.trim(),
          description: albumForm.description.trim(),
          releaseDate: albumForm.releaseDate || undefined,
          coverFile: albumCoverFile,
          removeCover: removeExistingAlbumCover,
        })

        // Дифимо проти складу треків, зафіксованого при відкритті форми — повторний
        // GET альбому тут був лишнім запитом і давав гонку з щойно збереженими змінами.
        const toAdd = selectedAlbumTrackIds.filter((id) => !originalAlbumTrackIds.includes(id))
        const toRemove = originalAlbumTrackIds.filter((id) => !selectedAlbumTrackIds.includes(id))
        if (toAdd.length > 0) trackResult = await addAlbumTracks(editingAlbumId, toAdd)
        if (toRemove.length > 0) {
          await Promise.all(toRemove.map((trackId) => removeAlbumTrack(editingAlbumId, trackId)))
        }
      }

      const notice = describeSkippedTracks(trackResult)
      closeAlbumForm()
      if (notice) setAlbumNotice(notice)
      fetchMyAlbumsList()
      // Склад альбомів у треках змінився — оновлюємо список, щоб пікер знав,
      // які треки вже зайняті.
      fetchUserTracks()
    } catch (err) {
      setAlbumFormError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to save album.' : 'Не вдалося зберегти альбом.'))
    } finally {
      setIsSubmittingAlbum(false)
    }
  }

  const handleDeleteAlbum = async (album: AlbumListItem) => {
    try {
      await deleteAlbum(album.id)
      setMyAlbums((prev) => prev.filter((a) => a.id !== album.id))
      setMyAlbumsTotal((prev) => Math.max(0, prev - 1))
      // Видалення альбому звільняє його треки на бекенді — оновлюємо список,
      // щоб пікер інших альбомів одразу перестав показувати їх як зайняті.
      fetchUserTracks()
    } catch (err) {
      setMyAlbumsError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to delete album.' : 'Не вдалося видалити альбом.'))
    } finally {
      setAlbumToDelete(null)
    }
  }

  const handleRestoreAlbum = async (albumId: string) => {
    try {
      await restoreAlbum(albumId)
      setDeletedAlbums((prev) => prev.filter((a) => a.id !== albumId))
      fetchMyAlbumsList()
      // Відновлений альбом знову займає свої треки — оновлюємо список, щоб пікер
      // не пропонував їх як вільні.
      fetchUserTracks()
    } catch (err) {
      setDeletedAlbumsError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to restore album.' : 'Не вдалося відновити альбом.'))
    }
  }

  const handlePermanentlyDeleteAlbum = async (album: AlbumListItem) => {
    try {
      await permanentlyDeleteAlbum(album.id)
      setDeletedAlbums((prev) => prev.filter((a) => a.id !== album.id))
      // Саме остаточне видалення звільняє треки альбому (кошик зв'язок зберігає),
      // тому оновити список треків треба тут — раніше цього не робилось, і пікер
      // працював зі старим станом, у якому трек ще вважався зайнятим.
      fetchUserTracks()
      fetchMyAlbumsList()
    } catch (err) {
      setDeletedAlbumsError(err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to permanently delete album.' : 'Не вдалося остаточно видалити альбом.'))
    } finally {
      setAlbumToPermanentlyDelete(null)
    }
  }

  const [showPlansModal, setShowPlansModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const [user, setUser] = useState({
    ...initialUser,
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    city: profileData.city,
    country: profileData.country,
    bio: profileData.bio,
    phone: profileData.phone,
    birthday: profileData.birthday,
    gender: profileData.gender,
  })

  useEffect(() => {
    setUser((prev) => ({
      ...prev,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      city: profileData.city,
      country: profileData.country,
      bio: profileData.bio,
      phone: profileData.phone,
      birthday: profileData.birthday,
      gender: profileData.gender,
    }))
  }, [profileData])

  const [EditProfileOpen, setEditProfileOpen] = useState(false)

  const [BannerMenuOpen, setBannerMenuOpen] = useState(false)
  const bannerMenuRef = useRef<HTMLDivElement>(null)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [twoFaStatus, setTwoFaStatus] = useState<string | null>(null)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false)
  const [twoFaModalMode, setTwoFaModalMode] = useState<'setup' | 'disable'>('setup')

  useEffect(() => {
    getTwoFactorStatus()
      .then((res) => setIs2FAEnabled(res.isEnabled))
      .catch(() => {})
  }, [])

  const [connectedAccounts, setConnectedAccounts] = useState({
    google: false,
    appleIdd: false,
    facebook: false,
    discord: false,
  })

  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [tempFieldValue, setTempFieldValue] = useState('')

  const [saveError, setSaveError] = useState('')

  const [settingOptions, setSettingsOptions] = useState(() => {
    try {
      const saved = localStorage.getItem('userSettings')
      if (saved) return JSON.parse(saved)
    } catch {
    }
    return {
      autoPlayNext: true,
      newReleases: false,
      recommendations: true,
      emailNotifications: false,
    }
  })

  const currentLang = location.pathname.startsWith('/en') || localStorage.getItem('lang') === 'en' ? 'en' : 'uk'

  useEffect(() => {
    const isEn = location.pathname.startsWith('/en')
    const targetLang = isEn ? 'en' : 'uk'
    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang)
    }
  }, [location.pathname, i18n])

  const handleLanguageChange = (targetLang: 'uk' | 'en') => {
    if (targetLang === currentLang) return
    localStorage.setItem('lang', targetLang)

    const updatedSettings = { ...settingOptions, language: targetLang }
    setSettingsOptions(updatedSettings)
    try {
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings))
    } catch {
    }

    updateProfile({ settingsJson: JSON.stringify(updatedSettings) }).catch(() => { })

    if (targetLang === 'en') {
      const cleanPath = location.pathname.replace(/^\/en/, '')
      navigate(`/en${cleanPath === '/' ? '' : cleanPath}`, { replace: true })
    } else {
      const newPath = location.pathname.replace(/^\/en/, '') || '/'
      navigate(newPath, { replace: true })
    }
  }

  const handleToggleSetting = (key: 'autoPlayNext' | 'newReleases' | 'recommendations' | 'emailNotifications') => {
    const updatedSettings = {
      ...settingOptions,
      [key]: !settingOptions[key]
    }
    setSettingsOptions(updatedSettings)
    try {
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings))
    } catch {
    }

    updateProfile({ settingsJson: JSON.stringify(updatedSettings) }).catch((err) => {
      if (import.meta.env.DEV) console.error('Failed to sync settings with server:', err)
    })
  }

  const [artistForm, setArtistForm] = useState({
    artistName: '',
    genre: '',
    country: '',
    platform: '',
  })

  const [atristAgreements, setArtistAgreements] = useState({
    ownsContent: false,
    acceptsTerms: false,
  })

  const [isArtistStatus, setIsArtistStatus] = useState(false)
  const [artistError, setArtistError] = useState('')
  const [artistSuccess, setArtistSuccess] = useState('')
  const [isSubmittingArtist, setIsSubmittingArtist] = useState(false)

  useEffect(() => {
    getArtistStatus().then((res) => {
      if (res.isArtist) setIsArtistStatus(true)
    })
  }, [])

  const handleApplyArtist = async () => {
    setArtistError('')
    setArtistSuccess('')

    if (!artistForm.artistName.trim()) {
      setArtistError("Будь ласка, вкажіть ім'я виконавця.")
      return
    }
    if (!atristAgreements.ownsContent || !atristAgreements.acceptsTerms) {
      setArtistError("Необхідно підтвердити володіння правами та погодитися з умовами.")
      return
    }

    setIsSubmittingArtist(true)
    try {
      const res = await applyArtist({
        artistName: artistForm.artistName.trim(),
        genre: artistForm.genre.trim(),
        country: artistForm.country.trim(),
        platform: artistForm.platform.trim(),
      })
      setArtistSuccess(res.message || 'Заявку успішно схвалено!')
      setIsArtistStatus(true)
      refreshProfile()
    } catch (err: any) {
      setArtistError(err.message || 'Не вдалося подати заявку.')
    } finally {
      setIsSubmittingArtist(false)
    }
  }

  const [userPlaylistsCount, setUserPlaylistsCount] = useState<number>(0)
  const [historyItems, setHistoryItems] = useState<HistoryTrackItem[]>([])
  const [favoriteItems, setFavoriteItems] = useState<FavoriteTrackItem[]>([])

  const uniqueHistoryItems = historyItems.filter((item, index, self) =>
    index === self.findIndex(t => t.trackId === item.trackId)
  )

  const visibleFavoriteItems = favoriteItems.filter(item => likedTrackIds.includes(item.trackId))

  useEffect(() => {
    let mounted = true
    const refreshFavorites = async () => {
      try {
        const favorites = await getFavoriteTracks(1, 50)
        if (mounted) setFavoriteItems(favorites.items)
      } catch {
      }
    }
    refreshFavorites()
    return () => { mounted = false }
  }, [likedTrackIds])

  useEffect(() => {
    let mounted = true
    const fetchCountsAndItems = async () => {
      try {
        const res = await apiFetch(`${GATEWAY_URL}/music/playlists?pageNumber=1&pageSize=1&includeFavorites=false`)
        if (res.ok) {
          const data = await res.json()
          if (mounted) {
            setUserPlaylistsCount(Number(data.totalCount ?? data.items?.length ?? 0))
          }
        }
      } catch {
      }

      try {
        const history = await getUserHistory(1, 20)
        if (mounted) setHistoryItems(history.items)
      } catch {
      }

      try {
        const favorites = await getFavoriteTracks(1, 50)
        if (mounted) setFavoriteItems(favorites.items)
      } catch {
      }

      try {
        const prof = await getProfile()
        if (mounted) {
          setSelfFollowersCount(prof.followersCount ?? 0)
          setSelfFollowingCount(prof.followingCount ?? 0)
        }
      } catch {
      }
    }
    fetchCountsAndItems()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const updateHistory = async () => {
      try {
        const history = await getUserHistory(1, 20)
        if (mounted) setHistoryItems(history.items)
      } catch {
      }
    }
    updateHistory()
    return () => { mounted = false }
  }, [activeProfileTab, currentTrack?.trackId])

  useEffect(() => {
    if (!BannerMenuOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (bannerMenuRef.current && !bannerMenuRef.current.contains(e.target as Node)) {
        setBannerMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [BannerMenuOpen])

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setUser((prev) => ({ ...prev, banner: previewUrl }))
    setBannerMenuOpen(false)

    try {
      const { bannerUrl: newBannerUrl } = await uploadBanner(file)
      setBannerUrl(resolveMediaUrl(newBannerUrl) || newBannerUrl)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Не вдалося завантажити банер:', err)
      setSaveError(err instanceof Error ? err.message : t('editprofile.err_banner_upload'))
    }
  }

  const handleRemoveBanner = async () => {
    setUser((prev) => ({ ...prev, banner: '' }))
    setBannerUrl('')
    setBannerMenuOpen(false)

    try {
      await deleteBannerApi()
    } catch (err) {
      if (import.meta.env.DEV) console.error('Не вдалося видалити банер на сервері:', err)
    }
  }

  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')

  const decodeToken = (t: string) => {
    try {
      const base64Url = t.split('.')[1]
      if (!base64Url) return null
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      return JSON.parse(window.atob(base64))
    } catch {
      return null
    }
  }

  const token = getAccessToken()
  const payload = token ? decodeToken(token) : null

  const email = payload?.email || payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || localStorage.getItem('UserEmail') || user.email
  const finalName = isReadOnly ? (viewedProfile?.displayName || viewedProfile?.firstName || 'User') : (profileName || user.name)
  const handle = isReadOnly
    ? `@${(viewedProfile?.username || viewedProfile?.displayName || 'user').toLowerCase().replace(/\s+/g, '_')}`
    : `@${(systemUsername || payload?.unique_name || profileName || user.name).toLowerCase().replace(/\s+/g, '_')}`

  // Ця мітка/поле насправді редагує DisplayName (нікнейм), не системний Username -
  // системний Username показуємо окремо, як read-only, нижче.
  const personalUsername = isReadOnly ? finalName : (profileName || user.name)
  const realSystemUsername = isReadOnly ? (viewedProfile?.username || '') : systemUsername
  const currentAvatar = isReadOnly ? (viewedProfile?.avatarUrl ? resolveMediaUrl(viewedProfile.avatarUrl) : null) : (avatarUrl || user.avatar)
  const currentBanner = isReadOnly ? (viewedProfile?.bannerUrl ? resolveMediaUrl(viewedProfile.bannerUrl) : null) : (bannerUrl || user.banner)
  const displayedBio = isReadOnly ? (viewedProfile?.bio || '') : user.bio
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    setAvatarError(false)
  }, [currentAvatar])

  const formatCountry = (countryStr?: string) => {
    if (!countryStr) return '-'
    const isEn = i18n.language === 'en'
    const normalized = countryStr.trim().toLowerCase()
    if (normalized === 'україна' || normalized === 'ukraine' || normalized === 'ua') {
      return isEn ? 'Ukraine' : 'Україна'
    }
    return countryStr
  }

  const getMemberSince = () => {
    const monthsUk = [
      'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
      'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
    ]
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const months = i18n.language === 'en' ? monthsEn : monthsUk
    if (profileData.createdAt) {
      try {
        const date = new Date(profileData.createdAt)
        return `${months[date.getMonth()]} ${date.getFullYear()}`
      } catch {
      }
    }
    if (payload?.nbf) {
      try {
        const date = new Date(payload.nbf * 1000)
        return `${months[date.getMonth()]} ${date.getFullYear()}`
      } catch {
      }
    }
    return user.memberSince || '-'
  }
  const memberSince = getMemberSince()

  const handleNameChange = async () => {
    const trimmed = tempName.trim()
    if (trimmed) {
      setProfileName(trimmed)
      try {
        await updateProfile({ displayName: trimmed })
      } catch (err) {
        if (import.meta.env.DEV) console.error('Не вдалося зберегти ім\'я на сервері:', err)
        setSaveError(err instanceof Error ? err.message : t('editprofile.err_name_save'))
      }
    }
    setIsEditingName(false)
  }

  const handleFieldEditStart = (field: EditableField, currentValue: string) => {
    setTempFieldValue(currentValue)
    setEditingField(field)
  }

  const fieldToPayloadKey: Record<EditableField, string> = {
    username: 'displayName',
    phone: 'phone',
    country: 'country',
    city: 'city',
    birthday: 'birthday',
    gender: 'gender',
  }

  const handleFieldSave = async () => {
    if (!editingField) return
    const trimmed = tempFieldValue.trim()
    setUser((prev) => ({ ...prev, [editingField]: trimmed }))

    if (editingField === 'username') {
      setProfileName(trimmed)
    }

    try {
      await updateProfile({ [fieldToPayloadKey[editingField]]: trimmed })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Не вдалося зберегти поле на сервері:', err)
      setSaveError(err instanceof Error ? err.message : t('editprofile.err_field_save'))
    }

    setEditingField(null)
  }

  const handleFieldCancel = () => {
    setEditingField(null)
  }

  const handleSaveProfile = async (data: ProfileData) => {
    setSaveError('')

    const trimmedName = data.displayName.trim()
    if (trimmedName) {
      setProfileName(trimmedName)
    }

    setUser((prev) => ({
      ...prev,
      firstName: data.firstName,
      lastName: data.lastName,
      city: data.city,
      country: data.country,
      bio: data.bio,
      avatar: data.avatarPreviewUrl,
    }))

    try {
      await updateProfile({
        displayName: trimmedName,
        firstName: data.firstName,
        lastName: data.lastName,
        city: data.city,
        country: data.country,
        bio: data.bio,
        linkUrl: data.linkUrl,
        linkLabel: data.linkLabel,
        supportLink: data.supportLink,
      })

      if (data.avatarFile) {
        const { avatarUrl: newAvatarUrl } = await uploadAvatar(data.avatarFile)
        setAvatarUrl(resolveMediaUrl(newAvatarUrl) || newAvatarUrl)
      } else if (!data.avatarPreviewUrl) {
        await deleteAvatar().catch(() => null)
        setAvatarUrl('')
      } else {
        setAvatarUrl(data.avatarPreviewUrl)
      }

      setEditProfileOpen(false)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Не вдалося зберегти профіль на сервері:', err)
      setSaveError(err instanceof Error ? err.message : t('editprofile.err_profile_save'))
    }
  }

  const handleTabClick = (tabKey: ProfileTabKey) => {
    const prefix = getLangPrefix()

    if (tabKey === 'logout') {
      setShowLogoutModal(true)
    } else if (tabKey === 'premium') {
      openStripeModal()
    } else if (tabKey === 'downloads') {
      setActiveTab('Downloads')
      navigate(`${prefix}/downloads`)
    } else if (tabKey === 'playlists') {
      setActiveTab('Playlist')
      navigate(`${prefix}/playlists`)
    } else {
      setActiveProfileTab(tabKey)
      if (tabKey === 'settings') {
        navigate(`${prefix}/profile?tab=settings`, { replace: true })
      } else if (location.search.includes('tab=')) {
        navigate(`${prefix}/profile`, { replace: true })
      }
    }
  }

  const toggleConnectedAccount = (account: keyof typeof connectedAccounts) => {
    setConnectedAccounts((prev) => ({ ...prev, [account]: !prev[account] }))
  }

  const getBirthdayParts = (val: string) => {
    if (!val) return { year: '', month: '', day: '' }
    const parts = val.split('-')
    if (parts.length === 3) {
      return { year: parts[0], month: parts[1], day: parts[2] }
    }
    return { year: '', month: '', day: '' }
  }

  const updateBirthdayPart = (part: 'year' | 'month' | 'day', newPartValue: string) => {
    const currentParts = getBirthdayParts(tempFieldValue)
    const updated = { ...currentParts, [part]: newPartValue }
    if (updated.year && updated.month && updated.day) {
      setTempFieldValue(`${updated.year}-${updated.month}-${updated.day}`)
    } else if (updated.year || updated.month || updated.day) {
      setTempFieldValue(`${updated.year || '2000'}-${updated.month || '01'}-${updated.day || '01'}`)
    } else {
      setTempFieldValue('')
    }
  }

  const formatBirthdayDisplay = (val: string) => {
    if (!val) return '-'
    const parts = val.split('-')
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parts[0]
      const monthIdx = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const monthsUk = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      if (monthIdx >= 0 && monthIdx < 12) {
        return i18n.language === 'en'
          ? `${monthsEn[monthIdx]} ${day}, ${year}`
          : `${day} ${monthsUk[monthIdx]} ${year} р.`
      }
    }
    return val
  }

  const formatGenderDisplay = (val: string) => {
    if (!val) return '-'
    const lower = val.toLowerCase()
    if (lower === 'male' || lower === 'чоловіча') return i18n.language === 'en' ? 'Male' : 'Чоловіча'
    if (lower === 'female' || lower === 'жіноча') return i18n.language === 'en' ? 'Female' : 'Жіноча'
    if (lower === 'other' || lower === 'інша') return i18n.language === 'en' ? 'Other' : 'Інша'
    return val
  }

  const renderEditableRow = (label: string, field: EditableField, value: string) => (
    <div className='ProfInfoRow'>
      <span className='ProfInfoLabel'>{label}</span>
      {editingField === field ? (
        <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }} className="ProfEditRowInput">
          {field === 'gender' ? (
            <div className="ProfGenderSelector">
              {[
                { key: 'Male', labelUk: 'Чоловіча', labelEn: 'Male', icon: '♂' },
                { key: 'Female', labelUk: 'Жіноча', labelEn: 'Female', icon: '♀' },
                { key: 'Other', labelUk: 'Інша', labelEn: 'Other', icon: '⚧' },
              ].map((g) => {
                const isSelected = (tempFieldValue || '').toLowerCase() === g.key.toLowerCase()
                return (
                  <motion.button
                    key={g.key}
                    type="button"
                    className={`ProfGenderOption ${isSelected ? 'ProfGenderOptionActive' : ''}`}
                    onClick={() => setTempFieldValue(g.key)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span className="ProfGenderOptionIcon">{g.icon}</span>
                    <span>{i18n.language === 'en' ? g.labelEn : g.labelUk}</span>
                  </motion.button>
                )
              })}
            </div>
          ) : field === 'birthday' ? (
            <div className="ProfBirthdayPicker">
              <select
                className="ProfDateSelect"
                value={getBirthdayParts(tempFieldValue).day}
                onChange={(e: any) => updateBirthdayPart('day', e.target.value)}
              >
                <option value="">{i18n.language === 'en' ? 'Day' : 'День'}</option>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = String(i + 1).padStart(2, '0')
                  return <option key={d} value={d}>{i + 1}</option>
                })}
              </select>

              <select
                className="ProfDateSelect ProfDateSelectMonth"
                value={getBirthdayParts(tempFieldValue).month}
                onChange={(e: any) => updateBirthdayPart('month', e.target.value)}
              >
                <option value="">{i18n.language === 'en' ? 'Month' : 'Місяць'}</option>
                {(i18n.language === 'en'
                  ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                  : ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']
                ).map((mName, idx) => {
                  const mVal = String(idx + 1).padStart(2, '0')
                  return <option key={mVal} value={mVal}>{mName}</option>
                })}
              </select>

              <select
                className="ProfDateSelect"
                value={getBirthdayParts(tempFieldValue).year}
                onChange={(e: any) => updateBirthdayPart('year', e.target.value)}
              >
                <option value="">{i18n.language === 'en' ? 'Year' : 'Рік'}</option>
                {Array.from({ length: 85 }, (_, i) => {
                  const y = String(2026 - i)
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>
          ) : (
            <input
              type="text"
              className='BtnInput'
              value={tempFieldValue}
              onChange={(e: any) => setTempFieldValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFieldSave()
                if (e.key === 'Escape') handleFieldCancel()
              }}
              autoFocus
            />
          )}
          <motion.button onClick={handleFieldSave} className='ProfInfoChange' style={{ background: 'var(--color-accent-blue)', color: 'var(--bg)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {t('profile.save_btn')}
          </motion.button>
          <motion.button onClick={handleFieldCancel} className='ProfInfoChange ProfBtnDanger' whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {t('profile.cancel_btn')}
          </motion.button>
        </div>
      ) : (
        <>
          <span className='ProfInfoValue'>
            {field === 'gender' ? formatGenderDisplay(value) : field === 'birthday' ? formatBirthdayDisplay(value) : value || '-'}
          </span>
          <motion.button className='ProfInfoChange' onClick={() => handleFieldEditStart(field, value)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {t('profile.change_btn')}
          </motion.button>
        </>
      )}
    </div>
  )

  return (
    <div className="ProfMain2">
      {saveError && (
        <div className="auth-error" role="alert" style={{ width: '100%' }}>
          {saveError}
        </div>
      )}
      <div className="ProfileUser">
        {currentBanner ? (
          <img src={currentBanner} className="ProfileUserBg" alt="Banner" />
        ) : null}
        <div className="ProfileUserOverlay"></div>

        {!isReadOnly && (
          <div className='BannerEditWrap' ref={bannerMenuRef}>
            <motion.button className='BannerEditButton' onClick={() => setBannerMenuOpen((prev) => !prev)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span className='BannerEditButtonText'>{t('profile.edit_banner', 'Редагувати банер')}</span>
            </motion.button>

            <AnimatePresence>
              {BannerMenuOpen && (
                <motion.div
                  className='BannerEditMenu'
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <button className='BannerEditMenuItem BannerEditMenuItemActive' onClick={() => bannerFileInputRef.current?.click()}>
                    {t('profile.change_banner', 'Замінити фото')}
                  </button>
                  <button className='BannerEditMenuItem' onClick={handleRemoveBanner}>
                    {t('profile.remove_banner', 'Видалити фото')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <input type="file" accept='image/*' ref={bannerFileInputRef} onChange={handleBannerFileChange} style={{ display: 'none' }} />
          </div>
        )}

        <div className="ProfAvatarWrap">
          {currentAvatar && !avatarError ? (
            <img src={currentAvatar} className="ProfAvatarImg" onError={() => setAvatarError(true)} alt="Profile avatar" />
          ) : (
            <img src={IconAvatar} className="ProfAvatarImg default-avatar" alt="Default avatar" />
          )}
        </div>

        <div className="ProfNameBlock">
          <span className="ProfName">{finalName}</span>
          <span className="ProfHandle">{handle}</span>
          <span className="ProfBio">{displayedBio}</span>
        </div>

        {isReadOnly ? (
          <motion.button
            className={`ProfEditButton ${isFollowing ? 'unfollow-btn' : 'follow-btn'}`}
            onClick={handleToggleFollow}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: isFollowing ? 'transparent' : '#72DEEF',
              border: isFollowing ? '1px solid #72DEEF' : 'none',
              color: isFollowing ? '#72DEEF' : '#000',
            }}
          >
            <span className="ProfEditButtonText" style={{ color: 'inherit' }}>
              {isFollowing ? t('profile.unsubscribe', 'Відписатися') : t('profile.subscribe', 'Підписатися')}
            </span>
          </motion.button>
        ) : (
          <motion.button className="ProfEditButton" onClick={() => { setEditProfileOpen(true) }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <span className="ProfEditButtonText">{t('profile.edit_btn', 'Редагувати профіль')}</span>
          </motion.button>
        )}

        <div className="ProfStats">
          {!isReadOnly && (
            <div className="ProfStatItem">
              <span className="ProfStatNumber">{userPlaylistsCount}</span>
              <span className="ProfStatLabel">{t('profile.stats.playlists', 'Плейлисти')}</span>
            </div>
          )}
          <div className="ProfStatItem">
            <span className="ProfStatNumber">
              {isReadOnly ? (viewedProfile?.followingCount ?? 0) : selfFollowingCount}
            </span>
            <span className="ProfStatLabel">{t('profile.stats.following', 'Підписки')}</span>
          </div>
          <div className="ProfStatItem">
            <span className="ProfStatNumber">
              {isReadOnly ? (viewedProfile?.followersCount ?? 0) : selfFollowersCount}
            </span>
            <span className="ProfStatLabel">{t('profile.stats.followers', 'Підписники')}</span>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <div className="ProfTabs">
          {profileTabList.map((tab) => (
            <motion.span
              key={tab.key}
              className={`ProfTabItem ${activeProfileTab === tab.key ? 'ProfTabActive' : ''}`}
              onClick={() => handleTabClick(tab.key)}
              style={{ cursor: 'pointer' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t(tab.labelKey)}
            </motion.span>
          ))}
        </div>
      )}

      {!isReadOnly && activeProfileTab === 'account' && (
        <div className="ProfBody">
          <div className="ProfSideNav">
            {accountSideNavList.map((item) => (
              <motion.div
                key={item.key}
                className={`ProfSideNavItem ${activeAccountSection === item.key ? 'ProfSideNavActive' : ''}`}
                onClick={() => setActiveAccountSection(item.key)}
                whileHover={{ x: 4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t(item.labelKey)}
              </motion.div>
            ))}
          </div>

          <div className="ProfPanel">

            {activeAccountSection === 'overview' && (
              <>
                <span className="ProfPanelTitle">{t('profile.side.overview')}</span>
                <p className="ProfPanelSubtitle">{t('profile.overview_desc')}</p>

                <div className="ProfInfoRow">
                  <span className="ProfInfoLabel">{t('profile.username')}</span>
                  {isEditingName ? (
                    <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }} className="ProfEditRowInput">
                      <input
                        type="text"
                        className='BtnInput'
                        value={tempName}
                        onChange={(e: any) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameChange()
                          if (e.key === 'Escape') setIsEditingName(false)
                        }}
                        autoFocus
                      />
                      <motion.button onClick={handleNameChange} className="ProfInfoChange" style={{ background: 'var(--color-accent-blue)', color: 'var(--bg)' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>{t('profile.save_btn')}</motion.button>
                      <motion.button onClick={() => setIsEditingName(false)} className="ProfInfoChange ProfBtnDanger" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>{t('profile.cancel_btn')}</motion.button>
                    </div>
                  ) : (
                    <>
                      <span className="ProfInfoValue">{finalName}</span>
                      <motion.button className="ProfInfoChange" onClick={() => { setTempName(finalName); setIsEditingName(true) }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>{t('profile.change_btn')}</motion.button>
                    </>
                  )}
                </div>
                <div className="ProfInfoRow">
                  <span className="ProfInfoLabel">{t('profile.system_username')}</span>
                  <span className="ProfInfoValue">{realSystemUsername || '—'}</span>
                </div>
                <div className="ProfInfoRow">
                  <span className="ProfInfoLabel">{t('profile.email')}</span>
                  <span className="ProfInfoValue">{email}</span>
                </div>
                <div className="ProfInfoRow">
                  <span className="ProfInfoLabel">{t('profile.country')}</span>
                  <span className="ProfInfoValue">{formatCountry(user.country)}</span>
                </div>
                <div className="ProfInfoRow">
                  <span className="ProfInfoLabel">{t('profile.joined')}</span>
                  <span className="ProfInfoValue">{memberSince}</span>
                </div>

                <motion.button className="ProfManageSub" onClick={() => openStripeModal()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <span className='ProfManageSubText'>{t('profile.manage_sub')}</span>
                </motion.button>
              </>
            )}

            {activeAccountSection === 'info' && (
              <>
                <span className="ProfPanelTitle">{t('profile.side.info')}</span>
                <p className="ProfPanelSubtitle">{t('profile.info_desc')}</p>
                <div className="ProfInfoRow">
                  <span className="ProfInfoLabel">{t('profile.full_name', 'Повне Ім\'я')}</span>
                  {isEditingName ? (
                    <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }} className="ProfEditRowInput">
                      <input type="text" className='BtnInput' value={tempName} onChange={(e: any) => setTempName(e.target.value)} onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameChange()
                        if (e.key === 'Escape') setIsEditingName(false)
                      }} autoFocus />
                      <button onClick={handleNameChange} className="ProfInfoChange" style={{ background: 'var(--color-accent-blue)', color: 'var(--bg)' }}>
                        {t('profile.save_btn')}
                      </button>
                      <button onClick={() => setIsEditingName(false)} className="ProfInfoChange ProfBtnDanger">
                        {t('profile.cancel_btn')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className='ProfInfoValue'>{finalName}</span>
                      <button className='ProfInfoChange' onClick={() => { setTempName(finalName); setIsEditingName(true) }}>
                        {t('profile.change_btn')}
                      </button>
                    </>
                  )}
                </div>

                {renderEditableRow(t('profile.username'), 'username', personalUsername)}
                {renderEditableRow(t('profile.phone', 'Номер телефону'), 'phone', user.phone)}
                {renderEditableRow(t('profile.country'), 'country', formatCountry(user.country))}

                {renderEditableRow(t('profile.city', 'Місто'), 'city', user.city)}
                {renderEditableRow(t('profile.birthday', 'День народження'), 'birthday', user.birthday)}
                {renderEditableRow(t('profile.gender', 'Стать'), 'gender', user.gender)}

                <div className='ProfInfoRow'>
                  <span className='ProfInfoLabel'>{t('profile.joined_date')}</span>
                  <span className='ProfInfoValue'>{memberSince}</span>
                </div>
              </>
            )}

            {activeAccountSection === 'connected' && (
              <>
                <span className='ProfPanelTitle'>{t('profile.side.connected')}</span>
                <p className="ProfPanelSubtitle">{t('profile.connected_desc')}</p>
                {(
                  [
                    { key: 'google', label: 'Google' },
                    { key: 'appleId', label: 'Apple ID' },
                    { key: 'facebook', label: 'Facebook' },
                    { key: 'discord', label: 'Discord' },
                  ] as { key: keyof typeof connectedAccounts; label: string }[]
                ).map(({ key, label }) => (
                  <div className='ProfInfoRow' key={key}>
                    <span className='ProfInfoLabel'>{label}</span>
                    <span className='ProfInfoValue' />
                    <button
                      className={`ProfInfoChange ${connectedAccounts[key] ? 'ProfBtnSuccess' : 'ProfBtnDanger'}`}
                      onClick={() => toggleConnectedAccount(key)}
                    >
                      {connectedAccounts[key] ? t('profile.status_connected') : t('profile.connect_btn', 'Підключити')}
                    </button>
                  </div>
                ))}
              </>
            )}

            {activeAccountSection === 'subscription' && (
              <>
                <span className='ProfPanelTitle'>{t('profile.side.subscription')}</span>
                <p className="ProfPanelSubtitle">{t('profile.sub_desc')}</p>
                <div className="ProfInfoRow">
                  <span className="ProfInfoLabel">{t('profile.current_plan')}</span>
                  <span className="ProfInfoValue" style={{ color: subscription.isActivePremium ? '#00d4b1' : undefined, fontWeight: subscription.isActivePremium ? 700 : undefined }}>
                    {subscription.isActivePremium
                      ? `Groovra Premium ${subscription.subscriptionExpiresAt ? `(активно до ${new Date(subscription.subscriptionExpiresAt).toLocaleDateString()})` : ''}`
                      : 'Free'}
                  </span>
                  <button className='ProfInfoChange' onClick={openStripeModal}>
                    {t('profile.change_btn', 'Змінити')}
                  </button>
                </div>
                <div className='ProfInfoRow'>
                  <span className='ProfInfoLabel'>{t('profile.payment_method', 'Спосіб оплати')}</span>
                  <span className='ProfInfoValue'>
                    {subscription.isActivePremium || paymentHistory.length > 0 ? 'Stripe Payment Gateway' : t('profile.not_specified', 'Не вказано')}
                  </span>
                  <button className='ProfInfoChange' onClick={openStripeModal}>
                    {t('profile.select_btn', 'Обрати')}
                  </button>
                </div>
                <div className='ProfInfoRow'>
                  <span className='ProfInfoLabel'>{t('profile.payment_history', 'Історія платежів')}</span>
                  <span className='ProfInfoValue'>
                    {paymentHistory.length > 0
                      ? `${paymentHistory.length} транзакцій (остання: ₴${paymentHistory[0].amount.toFixed(2)})`
                      : 'Історія порожня'}
                  </span>
                  <button className='ProfInfoChange' onClick={() => openStripeModal('history')}>
                    {t('profile.view_btn', 'Переглянути')}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                  <button className="ProfManageSub" onClick={openStripeModal} style={{ flex: 1, minWidth: '180px' }}>
                    <span className="ProfManageSubText">{t('profile.manage_sub', 'Керувати підпискою')}</span>
                  </button>
                  {subscription.isActivePremium && (
                    <button
                      className="ProfManageSub"
                      onClick={() => setShowCancelSubModal(true)}
                      disabled={isCancellingSub}
                      style={{
                        flex: 1,
                        minWidth: '180px',
                        background: 'rgba(255, 77, 77, 0.12)',
                        border: '1px solid rgba(255, 77, 77, 0.35)',
                        color: '#ff4d4d',
                      }}
                    >
                      <span className="ProfManageSubText" style={{ color: '#ff4d4d' }}>
                        {isCancellingSub ? 'Скасування...' : 'Скасувати підписку'}
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}

            {activeAccountSection === 'privacy' && (
              <div className="ProfPrivacyContainer">
                <div className="ProfPrivacyMainCol">
                  <span className='ProfPanelTitle'>{t('profile.privacy_title', 'Конфіденційність та безпека')}</span>
                  <p className='ProfPanelSubtitle'>{t('profile.privacy_desc')}</p>

                  <AnimatePresence>
                    {passwordStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`ProfStatusBanner ${passwordStatus.type === 'error' ? 'ProfStatusBannerError' : 'ProfStatusBannerSuccess'}`}
                      >
                        <span className="ProfStatusBannerIcon">{passwordStatus.type === 'error' ? '⚠️' : '✓'}</span>
                        <span style={{ flex: 1 }}>{passwordStatus.text}</span>
                        <button className="ProfStatusBannerClose" onClick={() => setPasswordStatus(null)}>×</button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                    <div className='ProfInfoRow'>
                      <span className='ProfInfoLabel'>{t('profile.current_password', 'Поточний пароль')}</span>
                      <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e: any) => { setCurrentPassword(e.target.value); if (passwordStatus) setPasswordStatus(null) }} placeholder='********' className='ProfPasswordInput' />
                    </div>
                    <div className='ProfInfoRow'>
                      <span className='ProfInfoLabel'>{t('profile.new_password', 'Новий пароль')}</span>
                      <input type="password" autoComplete="new-password" value={newPassword} onChange={(e: any) => { setNewPassword(e.target.value); if (passwordStatus) setPasswordStatus(null) }} placeholder='********' className='ProfPasswordInput' />
                    </div>
                    <div className='ProfInfoRow'>
                      <span className='ProfInfoLabel'>{t('profile.confirm_password', 'Підтвердьте пароль')}</span>
                      <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e: any) => { setConfirmPassword(e.target.value); if (passwordStatus) setPasswordStatus(null) }} placeholder='********' className='ProfPasswordInput' />
                    </div>
                    <div className="ProfPasswordBtnWrapper">
                      <button type="submit" className='ProfInfoChange' onClick={async () => {
                        if (!currentPassword) {
                          setPasswordStatus({ type: 'error', text: i18n.language === 'en' ? 'Enter current password' : 'Введіть поточний пароль' })
                          return
                        }
                        if (!newPassword) {
                          setPasswordStatus({ type: 'error', text: i18n.language === 'en' ? 'Enter new password' : 'Введіть новий пароль' })
                          return
                        }
                        if (newPassword !== confirmPassword) {
                          setPasswordStatus({ type: 'error', text: i18n.language === 'en' ? 'Passwords do not match' : 'Паролі не збігаються' })
                          return
                        }
                        try {
                          await changePasswordApi({ oldPassword: currentPassword, newPassword })
                          setPasswordStatus({ type: 'success', text: i18n.language === 'en' ? 'Password changed successfully!' : 'Пароль успішно змінено!' })
                          setCurrentPassword('')
                          setNewPassword('')
                          setConfirmPassword('')
                        } catch (err) {
                          setPasswordStatus({ type: 'error', text: err instanceof Error ? err.message : (i18n.language === 'en' ? 'Failed to change password' : 'Не вдалося змінити пароль') })
                        }
                      }}>
                        {t('profile.update_password_btn', 'Зберегти пароль')}
                      </button>
                    </div>
                  </form>
                </div>
                <div className="ProfPrivacy2FACol">
                  <span className='ProfPanelTitle'>{i18n.language === 'en' ? 'Two-Factor Authentication' : 'Двофакторна автентифікація'}</span>
                  <p className="Prof2FAStatus">
                    {i18n.language === 'en'
                      ? `Status: ${is2FAEnabled ? 'Enabled' : 'Disabled'}`
                      : `Статус: ${is2FAEnabled ? 'Увімкнено' : 'Вимкнено'}`}
                  </p>
                  <p className="Prof2FADesc">
                    {i18n.language === 'en' ? 'Add an extra layer of security to your account by enabling two-factor authentication.' : 'Додайте додатковий рівень безпеки до свого облікового запису, увімкнувши двофакторну автентифікацію.'}
                  </p>
                  <AnimatePresence>
                    {twoFaStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="ProfStatusBanner ProfStatusBannerError"
                        style={{ marginBottom: 16 }}
                      >
                        <span className="ProfStatusBannerIcon">ℹ️</span>
                        <span style={{ flex: 1 }}>{twoFaStatus}</span>
                        <button className="ProfStatusBannerClose" onClick={() => setTwoFaStatus(null)}>×</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    className={`ProfInfoChange ${is2FAEnabled ? 'ProfBtnDanger' : ''}`}
                    onClick={() => {
                      setTwoFaModalMode(is2FAEnabled ? 'disable' : 'setup')
                      setIs2FAModalOpen(true)
                    }}
                  >
                    {is2FAEnabled
                      ? (i18n.language === 'en' ? 'Disable 2FA' : 'Вимкнути 2FA')
                      : (i18n.language === 'en' ? 'Configure 2FA' : 'Налаштувати 2FA')}
                  </button>
                  <TwoFactorModal
                    isOpen={is2FAModalOpen}
                    mode={twoFaModalMode}
                    onClose={() => setIs2FAModalOpen(false)}
                    onSuccess={() => {
                      setIs2FAEnabled(twoFaModalMode === 'setup')
                    }}
                  />
                </div>
              </div>
            )}

            {activeAccountSection === 'sessions' && (
              <>
                <span className='ProfPanelTitle'>{t('profile.side.sessions')}</span>
                <p className='ProfPanelSubtitle'>
                  {i18n.language === 'en' ? 'Devices currently signed in to your account.' : 'Пристрої, які зараз авторизовані у вашому обліковому записі.'}
                </p>

                {sessionsError && (
                  <div className='ProfStatusBanner ProfStatusBannerError'>
                    <span className='ProfStatusBannerIcon'>⚠️</span>
                    <span style={{ flex: 1 }}>{sessionsError}</span>
                    <button className='ProfStatusBannerClose' onClick={fetchSessionsList} aria-label={i18n.language === 'en' ? 'Retry' : 'Повторити'}>
                      ↻
                    </button>
                  </div>
                )}
                {sessionActionError && (
                  <div className='ProfStatusBanner ProfStatusBannerError'>
                    <span className='ProfStatusBannerIcon'>⚠️</span>
                    <span style={{ flex: 1 }}>{sessionActionError}</span>
                    <button className='ProfStatusBannerClose' onClick={() => setSessionActionError(null)}>×</button>
                  </div>
                )}

                {isLoadingSessions ? (
                  <div style={{ padding: '32px 0', color: '#A1A1AA', textAlign: 'center' }}>
                    {t('common.loading', 'Завантаження...')}
                  </div>
                ) : sessionsError ? null : sessions.length === 0 ? (
                  <div className='EmptyStateText'>
                    {i18n.language === 'en' ? 'No active sessions found.' : 'Активних сесій не знайдено.'}
                  </div>
                ) : (
                  <>
                    {sessions.map((deviceId) => (
                      <div className='ProfInfoRow' key={deviceId}>
                        <span className='ProfInfoLabel' style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                          {deviceId}
                          {deviceId === thisDeviceId && (
                            <span
                              style={{
                                marginLeft: '8px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                background: 'rgba(128, 239, 114, 0.12)',
                                border: '1.5px solid rgba(128, 239, 114, 0.4)',
                                color: '#80EF72',
                              }}
                            >
                              {i18n.language === 'en' ? 'This device' : 'Цей пристрій'}
                            </span>
                          )}
                        </span>
                        <button className='ProfInfoChange ProfBtnDanger' onClick={() => setSessionToRevoke(deviceId)}>
                          {i18n.language === 'en' ? 'Revoke' : 'Видалити'}
                        </button>
                      </div>
                    ))}

                    <div style={{ marginTop: '20px' }}>
                      <button
                        className='ProfManageSub'
                        onClick={() => setIsRevokeAllModalOpen(true)}
                        style={{ background: 'rgba(255, 77, 77, 0.12)', border: '1px solid rgba(255, 77, 77, 0.35)' }}
                      >
                        <span className='ProfManageSubText' style={{ color: '#ff4d4d' }}>
                          {i18n.language === 'en' ? 'Revoke all sessions' : 'Скасувати всі сесії'}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {activeAccountSection === 'blocked' && (
              <>
                <span className='ProfPanelTitle'>{t('profile.side.blocked')}</span>
                <p className='ProfPanelSubtitle'>
                  {i18n.language === 'en' ? 'Users you have blocked from messaging you.' : 'Користувачі, яких ви заблокували.'}
                </p>

                {blockedUsersError && (
                  <div className='ProfStatusBanner ProfStatusBannerError'>
                    <span className='ProfStatusBannerIcon'>⚠️</span>
                    <span style={{ flex: 1 }}>{blockedUsersError}</span>
                    <button className='ProfStatusBannerClose' onClick={() => fetchBlockedUsersList()} aria-label={i18n.language === 'en' ? 'Retry' : 'Повторити'}>
                      ↻
                    </button>
                  </div>
                )}

                {isLoadingBlockedUsers ? (
                  <div style={{ padding: '32px 0', color: '#A1A1AA', textAlign: 'center' }}>
                    {t('common.loading', 'Завантаження...')}
                  </div>
                ) : blockedUsersError ? null : blockedUsers.length === 0 ? (
                  <div className='EmptyStateText'>
                    {i18n.language === 'en' ? "You haven't blocked anyone." : 'Ви ще нікого не заблокували.'}
                  </div>
                ) : (
                  blockedUsers.map((u) => (
                    <div className='ProfInfoRow' key={u.userId}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={u.avatarUrl || IconAvatar}
                          alt=''
                          className='BlockedUserAvatar'
                          onError={(e) => { e.currentTarget.src = IconAvatar }}
                        />
                        <span className='ProfInfoValue'>{u.displayName}</span>
                      </div>
                      <button className='ProfInfoChange' onClick={() => setUserToUnblock(u)}>
                        {i18n.language === 'en' ? 'Unblock' : 'Розблокувати'}
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!isReadOnly && activeProfileTab === 'artist' && (
        <div className='ProfBody'>
          <div className='ProfPanel ArtistApplyPanel'>
            {isArtistStatus ? (
              <div className='ArtistApplyFormCol' style={{ width: '100%' }}>
                <span className='ProfPanelTitle ArtistStatusSuccessTitle'>✓ {t('profile.artist_already')}</span>
                <p className='ProfPanelSubtitle' style={{ marginTop: '12px' }}>
                  {i18n.language === 'en' ? 'Your account has creator status. You can upload tracks, create albums, and use creator tools.' : 'Ваш обліковий запис має статус автора. Ви можете завантажувати власні треки, створювати альбоми та використовувати інструменти для творців.'}
                </p>
              </div>
            ) : (
              <div className='ArtistApplyFormCol'>
                <span className='ProfPanelTitle'>{t('profile.artist_title')}</span>
                <p className='ProfPanelSubtitle'>{t('profile.artist_subtitle')}</p>

                {artistError && (
                  <div style={{ color: '#EF7274', fontFamily: 'Manrope, sans-serif', fontSize: '14px', marginBottom: '12px' }}>
                    {artistError}
                  </div>
                )}
                {artistSuccess && (
                  <div style={{ color: '#80EF72', fontFamily: 'Manrope, sans-serif', fontSize: '14px', marginBottom: '12px' }}>
                    {artistSuccess}
                  </div>
                )}

                <div className='ArtistApplyRow'>
                  <span className='ProfInfoLabel'>{t('profile.artist_name')}*</span>
                  <input type="text" className='BtnInput ArtistApplyInput' value={artistForm.artistName} onChange={(e: any) => setArtistForm((prev) => ({ ...prev, artistName: e.target.value }))} />
                </div>
                <div className='ArtistApplyRow'>
                  <span className='ProfInfoLabel'>{t('profile.artist_genre')}</span>
                  <input type="text" className='BtnInput ArtistApplyInput' value={artistForm.genre} onChange={(e: any) => setArtistForm((prev) => ({ ...prev, genre: e.target.value }))} />
                </div>
                <div className='ArtistApplyRow'>
                  <span className='ProfInfoLabel'>{t('profile.artist_country')}</span>
                  <input type="text" className='BtnInput ArtistApplyInput' value={artistForm.country} onChange={(e: any) => setArtistForm((prev) => ({ ...prev, country: e.target.value }))} />
                </div>
                <div className='ArtistApplyRow'>
                  <span className='ProfInfoLabel'>{t('profile.artist_platform')}</span>
                  <input type="text" className='BtnInput ArtistApplyInput' value={artistForm.platform} onChange={(e: any) => setArtistForm((prev) => ({ ...prev, platform: e.target.value }))} />
                </div>

                <div className='ArtistApplyAgreements'>
                  <div className='ArtistApplyAgreementLabel'>
                    <span>{t('profile.artist_agreement1')}</span>
                    <input type="checkbox" checked={atristAgreements.ownsContent} onChange={() => setArtistAgreements((prev) => ({ ...prev, ownsContent: !prev.ownsContent }))} className='ArtistApplyCheckbox' />
                  </div>
                  <div className='ArtistApplyAgreementLabel'>
                    <span>{t('profile.artist_agreement2')}</span>
                    <input type="checkbox" checked={atristAgreements.acceptsTerms} onChange={() => setArtistAgreements((prev) => ({ ...prev, acceptsTerms: !prev.acceptsTerms }))} className='ArtistApplyCheckbox' />
                  </div>
                </div>

                <div className='ArtistApplyButtonsRow'>
                  <button className='ProfInfoChange' onClick={() => setActiveProfileTab('account')}>
                    {t('profile.cancel_btn')}
                  </button>
                  <button
                    className='ProfInfoChange ArtistApplySubmitBtn'
                    onClick={handleApplyArtist}
                    disabled={isSubmittingArtist}
                  >
                    {isSubmittingArtist ? t('common.loading') : t('profile.artist_submit')}
                  </button>
                </div>
              </div>
            )}

            <div className='ArtistApplyPerksCol'>
              <span className='ProfPanelTitle ArtistApplyPerksTitle'>{i18n.language === 'en' ? 'Creator Benefits' : 'Переваги для авторів'}</span>
              <div className='ArtistApplyPerksList'>
                {(i18n.language === 'en' ? [
                  'Upload unlimited tracks',
                  'Creator analytics',
                  'Monetization features',
                  'Verified artist badge',
                  'Audience insights',
                  'Playlist promotion tools',
                ] : [
                  'Завантажуйте необмежену кількість треків',
                  'Аналітика для творців',
                  'Функції монетизації',
                  'Значок підтвердженого виконавця',
                  'Статистика аудиторії',
                  'Можливості просування плейлистів',
                ]).map((perk) => (
                  <div key={perk} className='ArtistApplyPerkItem'>
                    <span className='ArtistApplyPerkBadge'>✓</span>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <TabErrorBoundary>
        {!isReadOnly && activeProfileTab === 'artist_dashboard' && !isArtistStatus && (
          <div className='ProfBody'>
            <div className='ProfPanel ArtistApplyPanel'>
              <div className='ArtistApplyFormCol' style={{ width: '100%' }}>
                <span className='ProfPanelTitle'>
                  {i18n.language === 'en' ? 'Creator tools require an artist account' : 'Інструменти для творців доступні лише артистам'}
                </span>
                <p className='ProfPanelSubtitle' style={{ marginTop: '12px' }}>
                  {i18n.language === 'en' ? 'Apply for an artist account to upload tracks, manage albums, and see your stats dashboard.' : 'Подайте заявку на статус артиста, щоб завантажувати треки, керувати альбомами та бачити дашборд статистики.'}
                </p>
                <button className='ProfInfoChange' style={{ marginTop: '16px' }} onClick={() => setActiveProfileTab('artist')}>
                  {t('profile.artist_submit')}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isReadOnly && activeProfileTab === 'artist_dashboard' && isArtistStatus && (
          <div className='ProfBody ArtistDashBody'>
            <div className='ArtistDashSideNav'>
              <div
                className={`ArtistDashSideItem ${artistDashSection === 'overview' ? 'active' : ''}`}
                onClick={() => setArtistDashSection('overview')}
              >
                {i18n.language === 'en' ? 'Stats Overview' : 'Огляд статистики'}
              </div>
              <div
                className={`ArtistDashSideItem ${artistDashSection === 'tracks' ? 'active' : ''}`}
                onClick={() => setArtistDashSection('tracks')}
              >
                {i18n.language === 'en' ? 'Tracks' : 'Треки'}
              </div>
              <div
                className={`ArtistDashSideItem ${artistDashSection === 'albums' ? 'active' : ''}`}
                onClick={() => setArtistDashSection('albums')}
              >
                {i18n.language === 'en' ? 'Albums' : 'Альбоми'}
              </div>
              <div
                className={`ArtistDashSideItem ${artistDashSection === 'upload' ? 'active' : ''}`}
                onClick={() => setArtistDashSection('upload')}
              >
                {i18n.language === 'en' ? 'Upload Track' : 'Завантажити трек'}
              </div>
            </div>

            <div className='ProfPanel ArtistDashMainPanel'>
              {artistDashSection === 'upload' && (
                <form className='ArtistUploadContainer' onSubmit={handleUploadTrackSubmit}>
                  <h2 className='ArtistUploadTitle'>
                    <UploadCloud size={24} style={{ color: '#72DEEF' }} />
                    {i18n.language === 'en' ? 'Music Upload' : 'Завантаження музики'}
                  </h2>

                  <AnimatePresence>
                    {uploadError && (
                      <motion.div
                        className='ArtistNotification Error'
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <span>⚠️ {uploadError}</span>
                      </motion.div>
                    )}
                    {uploadSuccess && (
                      <motion.div
                        className='ArtistNotification Success'
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <span>✓ {uploadSuccess}</span>
                        <button
                          type='button'
                          className='ArtistNotifBtn'
                          onClick={() => setArtistDashSection('tracks')}
                        >
                          {i18n.language === 'en' ? 'View Tracks' : 'Переглянути треки'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className='ArtistUploadContentLayout'>
                    <div className='ArtistUploadFormCol'>
                      <div className='ArtistFormGroup'>
                        <label className='ArtistFormLabel'>
                          {i18n.language === 'en' ? 'Track Title' : 'Назва Треку'}*
                        </label>
                        <input
                          type='text'
                          className='ArtistFormInput'
                          placeholder={i18n.language === 'en' ? 'Enter track title' : 'Введіть назву треку'}
                          value={uploadTrackForm.title || ''}
                          onChange={(e: any) => setUploadTrackForm((prev) => ({ ...prev, title: e.target.value }))}
                          required
                        />
                      </div>

                      <div className='ArtistFormGroup'>
                        <label className='ArtistFormLabel'>
                          {i18n.language === 'en' ? 'Main Artist' : 'Головний Виконавець'}
                        </label>
                        <input
                          type='text'
                          className='ArtistFormInput'
                          value={uploadTrackForm.artist || ''}
                          onChange={(e: any) => setUploadTrackForm((prev) => ({ ...prev, artist: e.target.value }))}
                        />
                      </div>

                      <div className='ArtistFormGroup'>
                        <label className='ArtistFormLabel'>
                          {i18n.language === 'en' ? 'Genre' : 'Жанр'}
                        </label>
                        <input
                          type='text'
                          className='ArtistFormInput'
                          placeholder='e.g. Pop, Electronic, Rock'
                          value={uploadTrackForm.genre || ''}
                          onChange={(e: any) => setUploadTrackForm((prev) => ({ ...prev, genre: e.target.value }))}
                        />
                      </div>

                      <div className='ArtistFormGroup'>
                        <label className='ArtistFormLabel'>
                          {i18n.language === 'en' ? 'Description' : 'Опис'}
                        </label>
                        <input
                          type='text'
                          className='ArtistFormInput'
                          placeholder={i18n.language === 'en' ? 'Track story or notes' : 'Опис треку або примітка'}
                          value={uploadTrackForm.description || ''}
                          onChange={(e: any) => setUploadTrackForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                      </div>

                      <div className='ArtistFormGroup'>
                        <label className='ArtistFormLabel'>
                          {i18n.language === 'en' ? 'Tags' : 'Теги'}
                        </label>
                        <input
                          type='text'
                          className='ArtistFormInput'
                          placeholder='e.g. synth, chill, 2026'
                          value={uploadTrackForm.tags || ''}
                          onChange={(e: any) => setUploadTrackForm((prev) => ({ ...prev, tags: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className='ArtistUploadDropZoneCol'>
                      <div className='ArtistUploadBoxesRow'>
                        <div
                          className={`ArtistDropZoneBox AudioZone ${isDraggingAudio ? 'dragging' : ''} ${selectedAudioFile ? 'has-file' : ''}`}
                          onClick={() => audioInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setIsDraggingAudio(true)
                          }}
                          onDragLeave={() => setIsDraggingAudio(false)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setIsDraggingAudio(false)
                            if (e.dataTransfer.files?.[0]) {
                              setSelectedAudioFile(e.dataTransfer.files[0])
                            }
                          }}
                        >
                          <input
                            type='file'
                            ref={audioInputRef}
                            accept='audio/*'
                            style={{ display: 'none' }}
                            onChange={(e: any) => setSelectedAudioFile(e.target.files?.[0] || null)}
                          />
                          {selectedAudioFile ? (
                            <div className='ArtistFilePreview'>
                              <span className='ArtistFileIcon'>🎵</span>
                              <span className='ArtistFileName'>{selectedAudioFile.name}</span>
                              <span className='ArtistFileSize'>({(selectedAudioFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                              <button
                                type='button'
                                className='ArtistFileClearBtn'
                                onClick={(e: any) => {
                                  e.stopPropagation()
                                  setSelectedAudioFile(null)
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className='ArtistDropZoneIconWrap'>
                                <Music size={26} />
                              </div>
                              <p className='ArtistDropZoneText'>
                                {isDraggingAudio
                                  ? (i18n.language === 'en' ? 'Drop audio file here...' : 'Відпустіть аудіофайл тут...')
                                  : (i18n.language === 'en' ? 'Drag and drop audio files.' : 'Перетягніть аудіофайли.')}
                              </p>
                              <button
                                type='button'
                                className='ArtistDropZonePillBtn'
                                onClick={(e: any) => {
                                  e.stopPropagation()
                                  audioInputRef.current?.click()
                                }}
                              >
                                {i18n.language === 'en' ? 'Select files' : 'Виберіть файли'}
                              </button>
                            </>
                          )}
                        </div>

                        <div
                          className={`ArtistDropZoneBox CoverZone ${isDraggingCover ? 'dragging' : ''} ${selectedCoverFile ? 'has-file' : ''}`}
                          onClick={() => coverInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setIsDraggingCover(true)
                          }}
                          onDragLeave={() => setIsDraggingCover(false)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setIsDraggingCover(false)
                            if (e.dataTransfer.files?.[0]) {
                              setSelectedCoverFile(e.dataTransfer.files[0])
                            }
                          }}
                        >
                          <input
                            type='file'
                            ref={coverInputRef}
                            accept='image/*'
                            style={{ display: 'none' }}
                            onChange={(e: any) => setSelectedCoverFile(e.target.files?.[0] || null)}
                          />
                          {coverPreviewUrl ? (
                            <div className='ArtistCoverPreviewBox'>
                              <img src={coverPreviewUrl} alt='Cover Preview' className='ArtistCoverImg' />
                              <button
                                type='button'
                                className='ArtistFileClearBtn CoverClear'
                                onClick={(e: any) => {
                                  e.stopPropagation()
                                  setSelectedCoverFile(null)
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className='ArtistDropZoneIconWrap'>
                                <ImageIcon size={26} />
                              </div>
                              <p className='ArtistDropZoneText'>
                                {isDraggingCover
                                  ? (i18n.language === 'en' ? 'Drop image cover here...' : 'Відпустіть зображення тут...')
                                  : (i18n.language === 'en' ? 'Add a cover.' : 'Додайте обкладинку.')}
                              </p>
                              <button
                                type='button'
                                className='ArtistDropZonePillBtn'
                                onClick={(e: any) => {
                                  e.stopPropagation()
                                  coverInputRef.current?.click()
                                }}
                              >
                                {i18n.language === 'en' ? 'Select files' : 'Виберіть файли'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className='ArtistSubmitRow'>
                        <button
                          type='submit'
                          className='ArtistSubmitBigBtn'
                          disabled={isUploadingTrack}
                        >
                          {isUploadingTrack
                            ? (i18n.language === 'en' ? 'Uploading...' : 'Завантаження...')
                            : (i18n.language === 'en' ? 'Upload' : 'Загрузити')}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {artistDashSection === 'overview' && (
                <div className='ArtistStatsContainer'>
                  <div className='ArtistHeaderWithAction'>
                    <h2 className='ArtistUploadTitle'>
                      <BarChart3 size={24} style={{ color: '#72DEEF' }} />
                      {i18n.language === 'en' ? 'Stats Overview' : 'Огляд статистики'}
                    </h2>
                    <button
                      type='button'
                      className='ArtistDropZonePillBtn'
                      onClick={() => setArtistDashSection('upload')}
                    >
                      + {i18n.language === 'en' ? 'Upload Track' : 'Завантажити трек'}
                    </button>
                  </div>

                  {artistStatsError && (
                    <div className='ProfStatusBanner ProfStatusBannerError' style={{ marginBottom: '16px' }}>
                      <span className='ProfStatusBannerIcon'>⚠️</span>
                      <span style={{ flex: 1 }}>{artistStatsError}</span>
                      <button className='ProfStatusBannerClose' onClick={fetchArtistStats} aria-label={i18n.language === 'en' ? 'Retry' : 'Повторити'}>
                        ↻
                      </button>
                    </div>
                  )}

                  <div className='ArtistDashGrid'>
                    <div className='ArtistDashCard'>
                      <div className='ArtistDashCardTop'>
                        <span className='ArtistDashCardLabel'>
                          {i18n.language === 'en' ? 'Total Streams' : 'Загалом прослуховувань'}
                        </span>
                        <div className='ArtistDashIconBadge Cyan'>
                          <Headphones size={20} />
                        </div>
                      </div>
                      <div className='ArtistDashCardMain'>
                        <span className='ArtistDashCardValue'>
                          {isLoadingArtistStats || artistStatsError || !artistStats ? '—' : artistStats.totalPlayCount.toLocaleString()}
                        </span>
                        <span className='ArtistDashCardSubText'>
                          {i18n.language === 'en' ? 'All-time' : 'За весь час'}
                        </span>
                      </div>
                    </div>

                    <div className='ArtistDashCard'>
                      <div className='ArtistDashCardTop'>
                        <span className='ArtistDashCardLabel'>
                          {i18n.language === 'en' ? 'Uploaded Tracks' : 'Завантажені треки'}
                        </span>
                        <div className='ArtistDashIconBadge Purple'>
                          <Disc3 size={20} />
                        </div>
                      </div>
                      <div className='ArtistDashCardMain'>
                        <span className='ArtistDashCardValue'>{(artistTracks || []).length}</span>
                        <span className='ArtistDashCardSubText'>
                          {i18n.language === 'en' ? 'Active releases' : 'Активні релізи'}
                        </span>
                      </div>
                    </div>

                    <div className='ArtistDashCard'>
                      <div className='ArtistDashCardTop'>
                        <span className='ArtistDashCardLabel'>
                          {i18n.language === 'en' ? 'Total Album Likes' : 'Лайки альбомів'}
                        </span>
                        <div className='ArtistDashIconBadge Cyan'>
                          <Heart size={20} />
                        </div>
                      </div>
                      <div className='ArtistDashCardMain'>
                        <span className='ArtistDashCardValue'>
                          {isLoadingArtistStats || artistStatsError || !artistStats ? '—' : artistStats.totalAlbumLikes.toLocaleString()}
                        </span>
                        <span className='ArtistDashCardSubText'>
                          {i18n.language === 'en' ? 'Across all your albums' : 'По всіх ваших альбомах'}
                        </span>
                      </div>
                    </div>

                    <div className='ArtistDashCard'>
                      <div className='ArtistDashCardTop'>
                        <span className='ArtistDashCardLabel'>
                          {i18n.language === 'en' ? 'Monthly Listeners (estimate)' : 'Слухачі за місяць (оцінка)'}
                        </span>
                        <div className='ArtistDashIconBadge Blue'>
                          <BarChart3 size={20} />
                        </div>
                      </div>
                      <div className='ArtistDashCardMain'>
                        <span className='ArtistDashCardValue'>
                          {Math.max(
                            (artistTracks || []).reduce((acc, t) => acc + (t.playCount || 0), 0) > 0
                              ? Math.floor((artistTracks || []).reduce((acc, t) => acc + (t.playCount || 0), 0) * 0.75)
                              : 0,
                            (artistTracks || []).length > 0 ? 1 : 0
                          ).toLocaleString()}
                        </span>
                        <span className='ArtistDashCardBadge Success'>
                          <TrendingUp size={13} /> +8.1%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='ArtistAnalyticsRow'>
                    <div className='ArtistAnalyticsCard'>
                      <div className='ArtistAnalyticsCardHeader'>
                        <div>
                          <h3 className='ArtistAnalyticsTitle'>
                            {i18n.language === 'en' ? 'Streaming Activity' : 'Динаміка прослуховувань'}
                          </h3>
                          <span className='ArtistAnalyticsSubtitle'>
                            {i18n.language === 'en' ? 'Illustrative preview — daily breakdown isn\'t tracked yet' : 'Ілюстративний приклад — щоденна статистика поки не веде облік'}
                          </span>
                        </div>
                        <span className='ArtistAnalyticsPill'>
                          {i18n.language === 'en' ? 'Preview' : 'Приклад'}
                        </span>
                      </div>

                      <div className='ArtistChartWrapper'>
                        <div className='ArtistChartBars'>
                          {[
                            { day: 'Пн', val: 40 },
                            { day: 'Вт', val: 65 },
                            { day: 'Ср', val: 55 },
                            { day: 'Чт', val: 80 },
                            { day: 'Пт', val: 95 },
                            { day: 'Сб', val: 70 },
                            { day: 'Нд', val: 85 },
                          ].map((item, i) => (
                            <div key={i} className='ArtistChartBarCol'>
                              <div className='ArtistChartBarTrack'>
                                <div
                                  className='ArtistChartBarFill'
                                  style={{ height: `${(artistTracks || []).length > 0 ? item.val : 15}%` }}
                                >
                                  <div className='ArtistChartBarGlow' />
                                </div>
                              </div>
                              <span className='ArtistChartBarLabel'>{item.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className='ArtistAnalyticsCard'>
                      <div className='ArtistAnalyticsCardHeader'>
                        <div>
                          <h3 className='ArtistAnalyticsTitle'>
                            {i18n.language === 'en' ? 'Top Performing Tracks' : 'Кращі треки автора'}
                          </h3>
                          <span className='ArtistAnalyticsSubtitle'>
                            {i18n.language === 'en' ? 'Sorted by total streams' : 'Сортування за прослуховуваннями'}
                          </span>
                        </div>
                        <button
                          type='button'
                          className='ArtistViewAllBtn'
                          onClick={() => setArtistDashSection('tracks')}
                        >
                          {i18n.language === 'en' ? 'View All' : 'Усі треки'}
                          <ArrowUpRight size={14} />
                        </button>
                      </div>

                      <div className='ArtistTopTracksList'>
                        {isLoadingArtistStats ? (
                          <div className='ArtistEmptyTopTracks'>
                            <p>{t('common.loading', 'Завантаження...')}</p>
                          </div>
                        ) : artistStatsError ? null : !artistStats || artistStats.topTracks.length === 0 ? (
                          <div className='ArtistEmptyTopTracks'>
                            <p>{i18n.language === 'en' ? 'No track statistics available yet.' : 'Статистика треків поки відсутня.'}</p>
                          </div>
                        ) : (
                          artistStats.topTracks.map((track, rank) => (
                            <div key={track.trackId} className='ArtistTopTrackItem'>
                              <span className='ArtistTopTrackRank'>#{rank + 1}</span>
                              <div className='ArtistTopTrackInfo'>
                                <span className='ArtistTopTrackTitle'>{track.title}</span>
                              </div>
                              <div className='ArtistTopTrackStreams'>
                                <Headphones size={13} />
                                <span>{track.playCount.toLocaleString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {artistDashSection === 'tracks' && (
                <div>
                  <div className='ArtistHeaderWithAction'>
                    <h2 className='ArtistUploadTitle'>{i18n.language === 'en' ? 'My Tracks' : 'Ваші треки'}</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type='button' className='ArtistDropZonePillBtn' onClick={handleToggleTrackTrash}>
                        {isViewingTrackTrash
                          ? (i18n.language === 'en' ? 'Back to Tracks' : 'Назад до треків')
                          : `🗑 ${i18n.language === 'en' ? 'Trash' : 'Кошик'}`}
                      </button>
                      {!isViewingTrackTrash && (
                        <button
                          type='button'
                          className='ArtistDropZonePillBtn'
                          onClick={() => setArtistDashSection('upload')}
                        >
                          + {i18n.language === 'en' ? 'Upload New' : 'Додати новий'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isViewingTrackTrash && deletedTracksError && (
                    <div className='ArtistNotification Error'>
                      <span>⚠️ {deletedTracksError}</span>
                      <button type='button' className='ArtistNotifBtn' onClick={() => setDeletedTracksError(null)}>×</button>
                    </div>
                  )}

                  {isViewingTrackTrash ? (
                    isLoadingDeletedTracks ? (
                      <div style={{ padding: '32px 0', color: '#A1A1AA', textAlign: 'center' }}>
                        {t('common.loading', 'Завантаження...')}
                      </div>
                    ) : deletedTracks.length === 0 ? (
                      <div className='ArtistEmptyTracks'>
                        <p>{i18n.language === 'en' ? 'Trash is empty.' : 'Кошик порожній.'}</p>
                      </div>
                    ) : (
                      <div className='ArtistDashTableWrapper' style={{ marginTop: '20px' }}>
                        <table className='ArtistDashTable'>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>{i18n.language === 'en' ? 'Track' : 'Назва треку'}</th>
                              <th>{i18n.language === 'en' ? 'Genre' : 'Жанр'}</th>
                              <th>{i18n.language === 'en' ? 'Actions' : 'Дії'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deletedTracks.map((track, idx) => (
                              <tr key={track.trackId}>
                                <td>{idx + 1}</td>
                                <td className='ArtistDashTrackTitle'>
                                  <div className='ArtistTrackRowCell'>
                                    <div className='ArtistTrackCoverWrap'>
                                      <TrackCover
                                        src={track.coverImageUrl}
                                        className={`ArtistDashTrackCover ${!track.coverImageUrl ? 'placeholder-cover' : ''}`}
                                        alt={track.title}
                                      />
                                    </div>
                                    <span className='ArtistTrackName'>{track.title}</span>
                                  </div>
                                </td>
                                <td>{track.genre || '—'}</td>
                                <td style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type='button'
                                    className='ArtistRenameTrackBtn'
                                    onClick={() => handleRestoreTrack(track.trackId)}
                                  >
                                    {i18n.language === 'en' ? 'Restore' : 'Відновити'}
                                  </button>
                                  <button
                                    type='button'
                                    className='ArtistDeleteTrackBtn'
                                    onClick={() => setTrackToPermanentlyDelete(track)}
                                  >
                                    {i18n.language === 'en' ? 'Delete forever' : 'Видалити назавжди'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : isLoadingArtistTracks ? (
                    <div style={{ padding: '32px 0', color: '#A1A1AA', textAlign: 'center' }}>
                      {t('common.loading', 'Завантаження...')}
                    </div>
                  ) : (artistTracks || []).length === 0 ? (
                    <div className='ArtistEmptyTracks'>
                      <p>{i18n.language === 'en' ? 'No tracks uploaded yet. Start by uploading your first track!' : 'У вас ще немає завантажених треків. Завантажте свій перший трек!'}</p>
                      <button
                        type='button'
                        className='ArtistSubmitBigBtn'
                        onClick={() => setArtistDashSection('upload')}
                        style={{ marginTop: '16px' }}
                      >
                        {i18n.language === 'en' ? 'Upload Track' : 'Завантажити трек'}
                      </button>
                    </div>
                  ) : (
                    <div className='ArtistDashTableWrapper' style={{ marginTop: '20px' }}>
                      <table className='ArtistDashTable'>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{i18n.language === 'en' ? 'Track' : 'Назва треку'}</th>
                            <th>{i18n.language === 'en' ? 'Genre' : 'Жанр'}</th>
                            <th>{i18n.language === 'en' ? 'Streams' : 'Прослуховування'}</th>
                            <th>{i18n.language === 'en' ? 'Actions' : 'Дії'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(artistTracks || []).map((track, idx) => (
                            <tr key={track.id}>
                              <td>{idx + 1}</td>
                              <td className='ArtistDashTrackTitle'>
                                <div className='ArtistTrackRowCell'>
                                  <div className='ArtistTrackCoverWrap'>
                                    <TrackCover
                                      src={track.coverImageUrl}
                                      className={`ArtistDashTrackCover ${!track.coverImageUrl ? 'placeholder-cover' : ''}`}
                                      alt={track.title}
                                    />
                                    <button
                                      type='button'
                                      className='ArtistPlayMiniBtn'
                                      onClick={() => selectTrack({
                                        trackId: track.id,
                                        title: track.title,
                                        artistName: track.artistName,
                                        album: track.album || '',
                                        genre: track.genre || '',
                                        durationSeconds: track.durationSeconds || 0,
                                        fileSizeBytes: 0,
                                        contentType: 'audio/mpeg',
                                        audioUrl: resolveMediaUrl(track.audioUrl) || '',
                                        coverImageUrl: resolveMediaUrl(track.coverImageUrl) || '',
                                        uploadedAt: track.uploadedAt || '',
                                        playCount: track.playCount || 0,
                                      })}
                                      aria-label={i18n.language === 'en' ? `Play ${track.title}` : `Відтворити ${track.title}`}
                                    >
                                      ▶
                                    </button>
                                  </div>
                                  <span className='ArtistTrackName'>{track.title}</span>
                                </div>
                              </td>
                              <td>{track.genre || '—'}</td>
                              <td>{(track.playCount || 0).toLocaleString()}</td>
                              <td style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type='button'
                                  className='ArtistRenameTrackBtn'
                                  onClick={() => setTrackToRename(track)}
                                >
                                  {i18n.language === 'en' ? 'Rename' : 'Перейменувати'}
                                </button>
                                <button
                                  type='button'
                                  className='ArtistDeleteTrackBtn'
                                  onClick={() => handleDeleteArtistTrack(track.id)}
                                >
                                  {t('common.delete', 'Видалити')}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {artistDashSection === 'albums' && (
                <div>
                  <div className='ArtistHeaderWithAction'>
                    <h2 className='ArtistUploadTitle'>{i18n.language === 'en' ? 'My Albums' : 'Мої альбоми'}</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type='button' className='ArtistDropZonePillBtn' onClick={handleToggleAlbumTrash}>
                        {isViewingAlbumTrash
                          ? (i18n.language === 'en' ? 'Back to Albums' : 'Назад до альбомів')
                          : `🗑 ${i18n.language === 'en' ? 'Trash' : 'Кошик'}`}
                      </button>
                      {!isViewingAlbumTrash && albumFormMode === 'closed' && (
                        <button type='button' className='ArtistDropZonePillBtn' onClick={openCreateAlbumForm}>
                          + {i18n.language === 'en' ? 'Create Album' : 'Створити альбом'}
                        </button>
                      )}
                    </div>
                  </div>

                  {albumFormError && (
                    <div className='ArtistNotification Error'>
                      <span>⚠️ {albumFormError}</span>
                      <button type='button' className='ArtistNotifBtn' onClick={() => setAlbumFormError(null)}>×</button>
                    </div>
                  )}

                  {albumNotice && (
                    <div className='ArtistNotification Error'>
                      <span>ℹ️ {albumNotice}</span>
                      <button type='button' className='ArtistNotifBtn' onClick={() => setAlbumNotice(null)}>×</button>
                    </div>
                  )}

                  {albumFormMode === 'closed' && !isViewingAlbumTrash && myAlbumsError && (
                    <div className='ArtistNotification Error'>
                      <span>⚠️ {myAlbumsError}</span>
                      <button type='button' className='ArtistNotifBtn' onClick={fetchMyAlbumsList}>↻</button>
                    </div>
                  )}

                  {albumFormMode === 'closed' && isViewingAlbumTrash && deletedAlbumsError && (
                    <div className='ArtistNotification Error'>
                      <span>⚠️ {deletedAlbumsError}</span>
                      <button type='button' className='ArtistNotifBtn' onClick={fetchDeletedAlbumsList}>↻</button>
                    </div>
                  )}

                  {albumFormMode !== 'closed' ? (
                    <div className='ArtistUploadContainer'>
                      <h2 className='ArtistUploadTitle'>
                        <Disc3 size={24} style={{ color: '#72DEEF' }} />
                        {albumFormMode === 'create'
                          ? (i18n.language === 'en' ? 'Create Album' : 'Створити альбом')
                          : (i18n.language === 'en' ? 'Edit Album' : 'Редагувати альбом')}
                      </h2>

                      <div className='ArtistUploadContentLayout'>
                        <div className='ArtistUploadFormCol'>
                          <div className='ArtistFormGroup'>
                            <label className='ArtistFormLabel'>
                              {i18n.language === 'en' ? 'Album Title' : 'Назва альбому'}*
                            </label>
                            <input
                              type='text'
                              className='ArtistFormInput'
                              value={albumForm.title}
                              onChange={(e: any) => setAlbumForm((prev) => ({ ...prev, title: e.target.value }))}
                              required
                            />
                          </div>

                          <div className='ArtistFormGroup'>
                            <label className='ArtistFormLabel'>
                              {i18n.language === 'en' ? 'Description' : 'Опис'}
                            </label>
                            <input
                              type='text'
                              className='ArtistFormInput'
                              value={albumForm.description}
                              onChange={(e: any) => setAlbumForm((prev) => ({ ...prev, description: e.target.value }))}
                            />
                          </div>

                          <div className='ArtistFormGroup'>
                            <label className='ArtistFormLabel'>
                              {i18n.language === 'en' ? 'Release Date' : 'Дата релізу'}
                            </label>
                            <input
                              type='date'
                              className='ArtistFormInput'
                              value={albumForm.releaseDate}
                              onChange={(e: any) => setAlbumForm((prev) => ({ ...prev, releaseDate: e.target.value }))}
                            />
                          </div>

                          <div className='ArtistFormGroup'>
                            <label className='ArtistFormLabel'>
                              {i18n.language === 'en' ? 'Tracks' : 'Треки'}
                            </label>
                            <div className='AlbumTrackPicker'>
                              {isLoadingArtistTracks ? (
                                <p className='ProfPanelSubtitle'>{t('common.loading', 'Завантаження...')}</p>
                              ) : artistTracks.length === 0 ? (
                                <p className='ProfPanelSubtitle'>
                                  {i18n.language === 'en' ? 'Upload tracks first to add them to an album.' : 'Спочатку завантажте треки, щоб додати їх до альбому.'}
                                </p>
                              ) : (
                                artistTracks.map((track) => {
                                  // Трек може належати лише одному альбому: бекенд мовчки
                                  // відкидає вже зайняті, тому блокуємо їх у пікері.
                                  const belongsElsewhere = !!track.album && !originalAlbumTrackIds.includes(track.id)
                                  return (
                                    <label
                                      key={track.id}
                                      className={`AlbumTrackPickerItem ${belongsElsewhere ? 'disabled' : ''}`}
                                    >
                                      <input
                                        type='checkbox'
                                        checked={selectedAlbumTrackIds.includes(track.id)}
                                        disabled={belongsElsewhere}
                                        onChange={() => toggleAlbumTrackSelection(track.id)}
                                      />
                                      <span>{track.title}</span>
                                      {belongsElsewhere && (
                                        <span className='AlbumTrackPickerHint'>
                                          {i18n.language === 'en' ? `in "${track.album}"` : `в «${track.album}»`}
                                        </span>
                                      )}
                                    </label>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='ArtistUploadDropZoneCol'>
                          <div
                            className={`ArtistDropZoneBox CoverZone ${isDraggingAlbumCover ? 'dragging' : ''} ${albumCoverFile ? 'has-file' : ''}`}
                            onClick={() => albumCoverInputRef.current?.click()}
                            onDragOver={(e) => {
                              e.preventDefault()
                              setIsDraggingAlbumCover(true)
                            }}
                            onDragLeave={() => setIsDraggingAlbumCover(false)}
                            onDrop={(e) => {
                              e.preventDefault()
                              setIsDraggingAlbumCover(false)
                              if (e.dataTransfer.files?.[0]) {
                                applyAlbumCoverFile(e.dataTransfer.files[0])
                              }
                            }}
                          >
                            <input
                              type='file'
                              ref={albumCoverInputRef}
                              accept='image/jpeg,image/png,image/webp'
                              style={{ display: 'none' }}
                              onChange={(e: any) => applyAlbumCoverFile(e.target.files?.[0] || null)}
                            />
                            {(albumCoverPreviewUrl || editingAlbumCoverUrl) && !removeExistingAlbumCover ? (
                              <div className='ArtistCoverPreviewBox'>
                                <img
                                  src={albumCoverPreviewUrl || editingAlbumCoverUrl || ''}
                                  alt='Cover Preview'
                                  className='ArtistCoverImg'
                                />
                                {albumCoverFile ? (
                                  <button
                                    type='button'
                                    className='ArtistFileClearBtn CoverClear'
                                    onClick={(e: any) => {
                                      e.stopPropagation()
                                      applyAlbumCoverFile(null)
                                    }}
                                  >
                                    ✕
                                  </button>
                                ) : (
                                  <button
                                    type='button'
                                    className='ArtistFileClearBtn CoverClear'
                                    onClick={(e: any) => {
                                      e.stopPropagation()
                                      handleRemoveExistingAlbumCover()
                                    }}
                                    aria-label={i18n.language === 'en' ? 'Remove cover' : 'Видалити обкладинку'}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className='ArtistDropZoneIconWrap'>
                                  <ImageIcon size={26} />
                                </div>
                                <p className='ArtistDropZoneText'>
                                  {isDraggingAlbumCover
                                    ? (i18n.language === 'en' ? 'Drop image cover here...' : 'Відпустіть зображення тут...')
                                    : (i18n.language === 'en' ? 'Add a cover.' : 'Додайте обкладинку.')}
                                </p>
                                <button
                                  type='button'
                                  className='ArtistDropZonePillBtn'
                                  onClick={(e: any) => {
                                    e.stopPropagation()
                                    albumCoverInputRef.current?.click()
                                  }}
                                >
                                  {i18n.language === 'en' ? 'Select files' : 'Виберіть файли'}
                                </button>
                              </>
                            )}
                          </div>

                          <div className='ArtistSubmitRow' style={{ gap: '8px' }}>
                            <button type='button' className='ProfInfoChange' onClick={closeAlbumForm}>
                              {t('createPlaylistModal.cancel')}
                            </button>
                            <button
                              type='button'
                              className='ArtistSubmitBigBtn'
                              disabled={isSubmittingAlbum || isLoadingAlbumForm}
                              onClick={handleSubmitAlbumForm}
                            >
                              {isSubmittingAlbum
                                ? (i18n.language === 'en' ? 'Saving...' : 'Збереження...')
                                : isLoadingAlbumForm
                                  ? t('common.loading', 'Завантаження...')
                                  : (i18n.language === 'en' ? 'Save' : 'Зберегти')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isViewingAlbumTrash ? (
                    isLoadingDeletedAlbums ? (
                      <div style={{ padding: '32px 0', color: '#A1A1AA', textAlign: 'center' }}>
                        {t('common.loading', 'Завантаження...')}
                      </div>
                    ) : deletedAlbums.length === 0 ? (
                      <div className='ArtistEmptyTracks'>
                        <p>{i18n.language === 'en' ? 'Trash is empty.' : 'Кошик порожній.'}</p>
                      </div>
                    ) : (
                      <div className='AlbumGrid'>
                        {deletedAlbums.map((album) => (
                          <div key={album.id} className='AlbumCard'>
                            {renderAlbumCoverArt(album)}
                            <span className='AlbumCardTitle'>{album.title}</span>
                            <span className='AlbumCardMeta'>
                              {album.trackCount} {i18n.language === 'en' ? 'tracks' : 'треків'}
                            </span>
                            <div className='AlbumCardActions'>
                              <button type='button' className='ArtistRenameTrackBtn' onClick={() => handleRestoreAlbum(album.id)}>
                                {i18n.language === 'en' ? 'Restore' : 'Відновити'}
                              </button>
                              <button type='button' className='ArtistDeleteTrackBtn' onClick={() => setAlbumToPermanentlyDelete(album)}>
                                {i18n.language === 'en' ? 'Delete forever' : 'Видалити назавжди'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : isLoadingMyAlbums ? (
                    <div style={{ padding: '32px 0', color: '#A1A1AA', textAlign: 'center' }}>
                      {t('common.loading', 'Завантаження...')}
                    </div>
                  ) : myAlbums.length === 0 ? (
                    <div className='ArtistEmptyTracks'>
                      <p>{i18n.language === 'en' ? 'No albums yet. Create your first album!' : 'У вас ще немає альбомів. Створіть свій перший альбом!'}</p>
                      <button type='button' className='ArtistSubmitBigBtn' onClick={openCreateAlbumForm} style={{ marginTop: '16px' }}>
                        {i18n.language === 'en' ? 'Create Album' : 'Створити альбом'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className='AlbumGrid'>
                        {myAlbums.map((album) => (
                          <div key={album.id} className='AlbumCard'>
                            {renderAlbumCoverArt(album)}
                            <span className='AlbumCardTitle'>{album.title}</span>
                            <span className='AlbumCardMeta'>
                              {album.trackCount} {i18n.language === 'en' ? 'tracks' : 'треків'}
                            </span>
                            <div className='AlbumCardActions'>
                              <button type='button' className='ArtistRenameTrackBtn' onClick={() => openEditAlbumForm(album)}>
                                {i18n.language === 'en' ? 'Edit' : 'Редагувати'}
                              </button>
                              <button type='button' className='ArtistDeleteTrackBtn' onClick={() => setAlbumToDelete(album)}>
                                {t('common.delete', 'Видалити')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {myAlbums.length < myAlbumsTotal && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                          <button
                            type='button'
                            className='ArtistDropZonePillBtn'
                            onClick={fetchMoreMyAlbums}
                            disabled={isLoadingMoreAlbums}
                          >
                            {isLoadingMoreAlbums
                              ? t('common.loading', 'Завантаження...')
                              : `${i18n.language === 'en' ? 'Load more' : 'Завантажити ще'} (${myAlbums.length}/${myAlbumsTotal})`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </TabErrorBoundary>

      {!isReadOnly && activeProfileTab === 'settings' && (
        <div className='ProfBody'>
          <div className='ProfPanel SettingPanel'>
            <div className='SettingsFormCol'>
              <span className='ProfPanelTitle'>{t('profile.tabs.settings')}</span>
              <p className='ProfPannelSubtitle'>{i18n.language === 'en' ? 'Customize the site for yourself' : 'Налаштовуйте сайт під себе'}</p>

              {[
                { key: 'autoPlayNext' as const, label: t('profile.settings_autoplay', 'Автоматично запускати схожі треки після завершення плейлиста') },
                { key: 'newReleases' as const, label: t('profile.settings_new_releases', 'Нові релізи виконавця') },
                { key: 'recommendations' as const, label: t('profile.settings_recommendations', 'Рекомендації від Groovra') },
                { key: 'emailNotifications' as const, label: t('profile.settings_email_notif', 'Email-сповіщення') },
              ].map((option) => (
                <div className='ProfInfoRow' key={option.key}>
                  <span className='ProfInfoLabel SettingsOptionLabel'>{option.label}</span>
                  <input
                    type="checkbox"
                    checked={!!settingOptions[option.key]}
                    onChange={() => handleToggleSetting(option.key)}
                    className='SettingsCheckbox'
                  />
                </div>
              ))}
              <div className='ProfInfoRow'>
                <span className='ProfInfoLabel'>{t('profile.settings_language', 'Мова')}</span>
                <div className='SettingsLanguageButtons'>
                  <button
                    type="button"
                    className={`SettingsLangBtn ${currentLang === 'uk' ? 'active' : ''}`}
                    onClick={() => handleLanguageChange('uk')}
                  >
                    Українська
                  </button>
                  <button
                    type="button"
                    className={`SettingsLangBtn ${currentLang === 'en' ? 'active' : ''}`}
                    onClick={() => handleLanguageChange('en')}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isReadOnly && activeProfileTab === 'favorites' && (
        <div className='ProfRecent'>
          <span className='ProfRecentTitle'>
            {t('profile.tabs.favorites')}: {visibleFavoriteItems.length} {i18n.language === 'en' ? (visibleFavoriteItems.length === 1 ? 'Track' : 'Tracks') : (visibleFavoriteItems.length === 1 ? 'Трек' : visibleFavoriteItems.length >= 2 && visibleFavoriteItems.length <= 4 ? 'Треки' : 'Треків')}
          </span>
          <div className='ProfRecentGrid'>
            {visibleFavoriteItems.length === 0 ? (
              <p className='ProfRecentEmptyText'>{i18n.language === 'en' ? 'You have no favorite tracks yet. Click the heart in the player to add tracks here!' : 'У вас поки немає улюблених треків. Натисніть серце у плеєрі, щоб додати трек сюди!'}</p>
            ) : (
              visibleFavoriteItems.map((track) => (
                <div className='ProfRecentCard ProfRecentCardClickable' key={track.trackId} onClick={() => selectTrack({
                  trackId: track.trackId,
                  title: track.title,
                  artistName: track.artistName,
                  audioUrl: resolveMediaUrl(track.audioUrl) || '',
                  coverImageUrl: resolveMediaUrl(track.coverImageUrl) || '',
                  durationSeconds: track.durationSeconds,
                  contentType: 'audio/mpeg',
                  uploadedAt: '',
                  fileSizeBytes: 0,
                  playCount: 0,
                  isLiked: true,
                })}>
                  <TrackCover
                    src={track.coverImageUrl}
                    className={`ProfRecentCardImg ${!track.coverImageUrl ? 'placeholder-cover' : ''}`}
                    alt={track.title}
                  />
                  <span className='ProfRecentCardTitle'>{track.title}</span>
                  <span className='ProfRecentCardArtist'>{track.artistName}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!isReadOnly && activeProfileTab === 'history' && (
        <div className='ProfRecent'>
          <span className='ProfRecentTitle'>{t('history.title', 'Історія Прослуховування')}</span>
          <div className='ProfRecentGrid'>
            {uniqueHistoryItems.length === 0 ? (
              <p className='ProfRecentEmptyText'>{t('history.empty', 'Історія прослуховування порожня.')}</p>
            ) : (
              uniqueHistoryItems.map((track) => (
                <div className={`ProfRecentCard ProfRecentCardClickable ${currentTrack?.trackId === track.trackId ? 'active-ink' : ''}`} key={`${track.trackId}-${track.playedAt}`} onClick={() => selectTrack({
                  trackId: track.trackId,
                  title: track.title,
                  artistName: track.artistName,
                  audioUrl: resolveMediaUrl(track.audioUrl) || `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
                  coverImageUrl: resolveMediaUrl(track.coverImageUrl) || '',
                  durationSeconds: track.durationSeconds,
                  contentType: 'audio/mpeg',
                  uploadedAt: '',
                  fileSizeBytes: 0,
                  playCount: 0,
                  isLiked: false,
                })}>
                  <TrackCover
                    src={track.coverImageUrl}
                    className={`ProfRecentCardImg ${!track.coverImageUrl ? 'placeholder-cover' : ''}`}
                    alt={track.title}
                  />
                  <span className='ProfRecentCardTitle'>{track.title}</span>
                  <span className='ProfRecentCardArtist'>{track.artistName}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!isReadOnly && (
        <div className="ProfRecent">
          <span className="ProfRecentTitle">{t('profile.recent_played', 'Нещодавно прослухане')}</span>
          <div className="ProfRecentGrid">
            {uniqueHistoryItems.length === 0 ? (
              <p className='ProfRecentEmptyText'>{i18n.language === 'en' ? 'No recently played tracks.' : 'Нещодавно прослухані треки відсутні.'}</p>
            ) : (
              uniqueHistoryItems.slice(0, 6).map((item) => (
                <div className="ProfRecentCard ProfRecentCardClickable" key={`rec-${item.trackId}-${item.playedAt}`} onClick={() => selectTrack({
                  trackId: item.trackId,
                  title: item.title,
                  artistName: item.artistName,
                  audioUrl: resolveMediaUrl(item.audioUrl) || `${GATEWAY_URL}/music/tracks/${item.trackId}/stream`,
                  coverImageUrl: resolveMediaUrl(item.coverImageUrl) || '',
                  durationSeconds: item.durationSeconds,
                  contentType: 'audio/mpeg',
                  uploadedAt: '',
                  fileSizeBytes: 0,
                  playCount: 0,
                  isLiked: false,
                })}>
                  <TrackCover
                    src={item.coverImageUrl}
                    className={`ProfRecentCardImg ${!item.coverImageUrl ? 'placeholder-cover' : ''}`}
                    alt={item.title}
                  />
                  <span className='ProfRecentCardTitle'>{item.title}</span>
                  <span className='ProfRecentCardArtist'>{item.artistName}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="ProfBody">
          <div className="ProfPanel" style={{ width: '100%' }}>
            <span className="ProfPanelTitle">{t('profile.side.overview', 'Огляд акаунта')}</span>
            <p className="ProfPanelSubtitle">{t('profile.overview_desc', 'Загальна інформація про користувача')}</p>

            <div className="ProfInfoRow">
              <span className="ProfInfoLabel">{t('profile.username', 'Ім\'я користувача')}</span>
              <span className="ProfInfoValue">{personalUsername}</span>
            </div>

            {(viewedProfile?.firstName || viewedProfile?.lastName) && (
              <div className="ProfInfoRow">
                <span className="ProfInfoLabel">{t('profile.full_name', 'Повне ім\'я')}</span>
                <span className="ProfInfoValue">
                  {`${viewedProfile.firstName || ''} ${viewedProfile.lastName || ''}`.trim()}
                </span>
              </div>
            )}

            {viewedProfile?.country && (
              <div className="ProfInfoRow">
                <span className="ProfInfoLabel">{t('profile.country', 'Країна')}</span>
                <span className="ProfInfoValue">{formatCountry(viewedProfile.country)}</span>
              </div>
            )}

            {viewedProfile?.city && (
              <div className="ProfInfoRow">
                <span className="ProfInfoLabel">{t('profile.city', 'Місто')}</span>
                <span className="ProfInfoValue">{viewedProfile.city}</span>
              </div>
            )}

            {viewedProfile?.createdAt && (
              <div className="ProfInfoRow">
                <span className="ProfInfoLabel">{t('profile.joined', 'Учасник з')}</span>
                <span className="ProfInfoValue">
                  {new Date(viewedProfile.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'uk-UA', { year: 'numeric', month: 'long' })}
                </span>
              </div>
            )}

            {viewedProfile?.bio && (
              <div className="ProfInfoRow" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <span className="ProfInfoLabel">{t('profile.bio', 'Про себе')}</span>
                <span className="ProfInfoValue" style={{ width: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {viewedProfile.bio}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {EditProfileOpen && (
        <EditProfile
          user={{
            avatar: currentAvatar || '',
            name: finalName,
            firstName: user.firstName,
            lastName: user.lastName,
            city: user.city,
            country: user.country,
            bio: user.bio,
          }}
          onClose={() => setEditProfileOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            className="ProfModalOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              className="ProfModalCard"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e: any) => e.stopPropagation()}
            >
              <span className="ProfModalTitle">{t('profile.logout_modal_title', 'Вийти з акаунта?')}</span>
              <p className="ProfModalSubtitle">{t('profile.logout_modal_desc', 'Ви справді хочете вийти? Ваша сесія буде завершена.')}</p>
              <div className="ProfModalActions">
                <motion.button
                  className="ProfModalBtn ProfModalBtnSecondary"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowLogoutModal(false)}
                >
                  {t('profile.stay_btn', 'Залишитись')}
                </motion.button>
                <motion.button
                  className="ProfModalBtn ProfModalBtnDanger"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setShowLogoutModal(false); logoutUser() }}
                >
                  {t('profile.tabs.logout', 'Вийти')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCancelSubModal && (
          <motion.div
            className="ProfModalOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCancelSubModal(false)}
          >
            <motion.div
              className="ProfModalCard"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e: any) => e.stopPropagation()}
              style={{ maxWidth: '420px', textAlign: 'center' }}
            >
              <span className="ProfModalTitle" style={{ fontSize: '20px' }}>
                Скасування підписки
              </span>
              <p className="ProfModalSubtitle" style={{ marginTop: '8px', lineHeight: '1.5' }}>
                Ви дійсно бажаєте скасувати підписку <strong>Groovra Premium</strong>?
                Після скасування ви втратите доступ до безлімітного AI-Mix, 3D Surround Audio та HQ якості звуку.
              </p>
              <div className="ProfModalActions" style={{ marginTop: '24px' }}>
                <motion.button
                  className="ProfModalBtn ProfModalBtnSecondary"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowCancelSubModal(false)}
                >
                  Залишити Premium
                </motion.button>
                <motion.button
                  className="ProfModalBtn ProfModalBtnDanger"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={isCancellingSub}
                  onClick={async () => {
                    setIsCancellingSub(true)
                    await cancelSubscription()
                    setIsCancellingSub(false)
                    setShowCancelSubModal(false)
                    setCancelSuccessToast(true)
                    setTimeout(() => setCancelSuccessToast(false), 4500)
                  }}
                >
                  {isCancellingSub ? 'Скасування...' : 'Так, скасувати'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {cancelSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              background: 'rgba(20, 18, 36, 0.95)',
              border: '1px solid rgba(255, 77, 77, 0.4)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)',
              padding: '14px 20px',
              borderRadius: '12px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <span>Підписку Groovra Premium успішно скасовано. Тариф змінено на Free.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlansModal && (
          <motion.div
            className="ProfModalOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPlansModal(false)}
          >
            <motion.div
              className="ProfPlansModal"
              initial={{ opacity: 0, scale: 0.93, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="ProfPlansModalHeader">
                <span className="ProfPlansModalTitle">{i18n.language === 'en' ? 'Choose your plan' : 'Оберіть свій план'}</span>
                <motion.button
                  className="ProfPlansModalClose"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPlansModal(false)}
                >×</motion.button>
              </div>
              <div className="ProfPlansGrid">
                {getSubscriptionPlans(i18n.language === 'en').map((plan) => (
                  <motion.div
                    key={plan.key}
                    className={`ProfPlanCard ${plan.key === 'premium' ? 'ProfPlanCardFeatured' : ''}`}
                    whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <span className="ProfPlanTitle">{plan.title}</span>
                    <span className="ProfPlanPrice">{plan.price}</span>
                    <ul className="ProfPlanFeatures">
                      {plan.features.map((f) => (
                        <li key={f} className="ProfPlanFeatureItem">
                          <span className="ProfPlanFeatureCheck">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    {plan.footnote && (
                      <p className="ProfPlanFootnote">{plan.footnote}</p>
                    )}
                    <motion.button
                      className={`ProfPlanButton ${plan.key === 'free' ? 'ProfPlanButtonCurrent' : plan.key === 'premium' ? 'ProfPlanButtonPremium' : 'ProfPlanButtonPlus'}`}
                      whileHover={{ scale: plan.key !== 'free' ? 1.04 : 1 }}
                      whileTap={{ scale: plan.key !== 'free' ? 0.96 : 1 }}
                      disabled={plan.key === 'free'}
                    >
                      {plan.buttonText}
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={sessionToRevoke !== null}
        title={i18n.language === 'en' ? 'Revoke session?' : 'Видалити сесію?'}
        message={
          sessionToRevoke === thisDeviceId
            ? (i18n.language === 'en' ? 'This is your current device — you will be signed out of Groovra right now.' : 'Це ваш поточний пристрій — вас негайно буде розлогінено з Groovra.')
            : (i18n.language === 'en' ? 'That device will be signed out immediately.' : 'Цей пристрій буде негайно розлогінено.')
        }
        confirmLabel={i18n.language === 'en' ? 'Revoke' : 'Видалити'}
        onClose={() => setSessionToRevoke(null)}
        onConfirm={async () => { if (sessionToRevoke) await handleRevokeSession(sessionToRevoke) }}
      />

      <ConfirmModal
        isOpen={isRevokeAllModalOpen}
        title={i18n.language === 'en' ? 'Revoke all sessions?' : 'Скасувати всі сесії?'}
        message={i18n.language === 'en' ? 'You will be signed out on every device, including this one.' : 'Ви будете розлогінені на всіх пристроях, включно з цим.'}
        confirmLabel={i18n.language === 'en' ? 'Revoke all' : 'Скасувати всі'}
        onClose={() => setIsRevokeAllModalOpen(false)}
        onConfirm={handleRevokeAllSessions}
      />

      <ConfirmModal
        isOpen={userToUnblock !== null}
        title={i18n.language === 'en' ? 'Unblock user?' : 'Розблокувати користувача?'}
        message={i18n.language === 'en' ? `${userToUnblock?.displayName ?? ''} will be able to message you again.` : `${userToUnblock?.displayName ?? ''} знову зможе писати вам повідомлення.`}
        confirmLabel={i18n.language === 'en' ? 'Unblock' : 'Розблокувати'}
        onClose={() => setUserToUnblock(null)}
        onConfirm={async () => { if (userToUnblock) await handleUnblockUser(userToUnblock.userId) }}
      />

      <ConfirmModal
        isOpen={albumToDelete !== null}
        title={i18n.language === 'en' ? 'Delete album?' : 'Видалити альбом?'}
        message={i18n.language === 'en' ? `"${albumToDelete?.title ?? ''}" will be moved to trash.` : `Альбом «${albumToDelete?.title ?? ''}» буде переміщено в кошик.`}
        confirmLabel={t('common.delete', 'Видалити')}
        onClose={() => setAlbumToDelete(null)}
        onConfirm={async () => { if (albumToDelete) await handleDeleteAlbum(albumToDelete) }}
      />

      <ConfirmModal
        isOpen={albumToPermanentlyDelete !== null}
        title={i18n.language === 'en' ? 'Delete album forever?' : 'Видалити альбом назавжди?'}
        message={i18n.language === 'en' ? `"${albumToPermanentlyDelete?.title ?? ''}" and its cover will be permanently deleted. This cannot be undone.` : `Альбом «${albumToPermanentlyDelete?.title ?? ''}» та його обкладинка будуть остаточно видалені. Цю дію не можна скасувати.`}
        confirmLabel={i18n.language === 'en' ? 'Delete forever' : 'Видалити назавжди'}
        onClose={() => setAlbumToPermanentlyDelete(null)}
        onConfirm={async () => { if (albumToPermanentlyDelete) await handlePermanentlyDeleteAlbum(albumToPermanentlyDelete) }}
      />

      <ConfirmModal
        isOpen={trackToPermanentlyDelete !== null}
        title={i18n.language === 'en' ? 'Delete track forever?' : 'Видалити трек назавжди?'}
        message={i18n.language === 'en' ? `"${trackToPermanentlyDelete?.title ?? ''}" and its audio file will be permanently deleted. This cannot be undone.` : `Трек «${trackToPermanentlyDelete?.title ?? ''}» та його аудіофайл будуть остаточно видалені. Цю дію не можна скасувати.`}
        confirmLabel={i18n.language === 'en' ? 'Delete forever' : 'Видалити назавжди'}
        onClose={() => setTrackToPermanentlyDelete(null)}
        onConfirm={async () => { if (trackToPermanentlyDelete) await handlePermanentlyDeleteTrack(trackToPermanentlyDelete) }}
      />

      {trackToRename && (
        <RenameTrackModal
          isOpen={trackToRename !== null}
          currentTitle={trackToRename.title}
          errorMessage={renameError}
          onClose={closeRenameModal}
          onRename={handleRenameTrack}
        />
      )}
    </div>
  )
}