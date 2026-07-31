import React, { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch, GATEWAY_URL, getAuthenticatedStreamUrl, notifyTrackPlayed, onAccessTokenChange } from '../api/api-client'
import { PlayerContext, type PlayerContextType, type Track } from './player-context'
import { formatTime } from '../utils/format-time'
import { useAuthModal } from './auth-modal-context'
import { useSubscription } from './subscription-context'
import { triggerHaptic } from '../hooks/use-haptic'
import { useEqualizer } from '../hooks/use-equalizer'
import { getOfflineTrackBlob } from '../utils/offline-storage'

const normalizeUrl = (url?: string): string | undefined => {
  if (!url) return undefined
  return url.replace(/^https?:\/\/localhost:\d+/, GATEWAY_URL)
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGuest, openAuthModal } = useAuthModal()
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    try {
      const saved = localStorage.getItem('groovy_last_track')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('groovy_was_playing')
      return saved !== null ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  const [volume, setVolume] = useState(70)
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(70)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const initialTimeRef = useRef<number>(
    (() => {
      try {
        const saved = localStorage.getItem('groovy_last_time')
        return saved ? parseFloat(saved) : 0
      } catch {
        return 0
      }
    })()
  )

  const wasPlayingRef = useRef<boolean>(
    (() => {
      try {
        const saved = localStorage.getItem('groovy_was_playing')
        return saved !== null ? JSON.parse(saved) : false
      } catch {
        return false
      }
    })()
  )

  const hasRestoredTimeRef = useRef<boolean>(false)
  const lastSavedTimeRef = useRef<number>(0)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isLoadingTracks, setIsLoadingTracks] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Home')

  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('likedTrackIds')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Лічильник підтверджених сервером змін вподобаного (див. коментар у PlayerContextType).
  const [likedSyncVersion, setLikedSyncVersion] = useState(0)

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const mobileStreamUrlRef = useRef<string | null>(null)

  const isPlayingRef = useRef<boolean>(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.trackId) : false

  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreTracks, setHasMoreTracks] = useState(true)
  const [totalTracksCount, setTotalTracksCount] = useState(0)
  const [totalTracksPages, setTotalTracksPages] = useState(1)
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)
  const [popularTracks, setPopularTracks] = useState<Track[]>([])
  const [isLoadingPopular, setIsLoadingPopular] = useState(false)

  // Бэкенд (TracksController.GetPopularTracks) на холодный кеш "music:trending:top100"
  // намеренно не гоняет тяжёлый SQL синхронно: сразу отдаёт 200 с пустым списком и ставит
  // фоновый прогрев (комментарий в контроллере buквально говорит "фронтенд перезапросит
  // через пару секунд"). Раньше эта сторона контракта не была реализована — единственный
  // вызов fetchPopularTracks шёл при первом маунте Home-таба, получал пустоту с холодного
  // кеша и на этом всё: секция "Популярне" молча оставалась пустой до следующей смены таба
  // (которая перезапускала fetch, к тому моменту кеш уже прогревался). Теперь при пустом
  // ответе делаем несколько отложенных повторов, прежде чем показать "нічого не знайдено".
  const fetchPopularTracks = useCallback(async () => {
    setIsLoadingPopular(true)
    const retryDelaysMs = [2000, 3000]

    try {
      for (let attempt = 0; ; attempt++) {
        const response = await apiFetch(`${GATEWAY_URL}/music/tracks/popular?pageSize=10`)
        if (response.ok) {
          const result = await response.json()
          const fetched: Track[] =
            result.items ?? result.data ?? result.Items ?? result.Tracks ??
            (Array.isArray(result) ? result : [])

          if (fetched.length > 0 || attempt >= retryDelaysMs.length) {
            const normalized = fetched.map(track => ({
              ...track,
              coverImageUrl: normalizeUrl(track.coverImageUrl),
              audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
            }))
            setPopularTracks(normalized)
            return
          }
        } else if (attempt >= retryDelaysMs.length) {
          return
        }

        await new Promise(resolve => setTimeout(resolve, retryDelaysMs[attempt]))
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Помилка завантаження популярних треків:', err)
    } finally {
      setIsLoadingPopular(false)
    }
  }, [])

  useEffect(() => {
    if (currentTrack) {
      try {
        localStorage.setItem('groovy_last_track', JSON.stringify(currentTrack))
      } catch { }
    }
  }, [currentTrack])

  useEffect(() => {
    try {
      localStorage.setItem('groovy_was_playing', JSON.stringify(isPlaying))
    } catch { }
  }, [isPlaying])

  useEffect(() => {
    localStorage.setItem('likedTrackIds', JSON.stringify(likedTrackIds))
  }, [likedTrackIds])

  useEffect(() => {
    const unsubscribe = onAccessTokenChange((token) => {
      if (!token) {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        setIsPlaying(false)
        setCurrentTrack(null)
        setCurrentTime(0)
        setDuration(0)
        setLikedTrackIds([])
        mobileStreamUrlRef.current = null
        try {
          localStorage.removeItem('groovy_last_track')
          localStorage.removeItem('groovy_last_time')
          localStorage.removeItem('groovy_was_playing')
          localStorage.removeItem('likedTrackIds')
        } catch {
        }
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const loadLikedIds = async () => {
      try {
        const response = await apiFetch(`${GATEWAY_URL}/music/favorites`)
        if (response.ok) {
          const data = await response.json()
          const ids = (data as Track[]).map((t) => t.trackId)
          setLikedTrackIds(ids)
          localStorage.setItem('likedTrackIds', JSON.stringify(ids))
        }
      } catch {
      }
    }
    loadLikedIds()
  }, [])

  const toggleLiked = useCallback(async () => {
    if (!currentTrack) return false
    if (isGuest) {
      openAuthModal('Збереження вподобаних треків доступне лише для зареєстрованих користувачів.')
      return false
    }
    const trackId = currentTrack.trackId
    const currentlyLiked = likedTrackIds.includes(trackId)
    triggerHaptic('medium')

    setLikedTrackIds(prev =>
      currentlyLiked ? prev.filter(id => id !== trackId) : [...prev, trackId]
    )

    try {
      const response = currentlyLiked
        ? await apiFetch(`${GATEWAY_URL}/music/favorites/${trackId}`, { method: 'DELETE' })
        : await apiFetch(`${GATEWAY_URL}/music/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId }),
        })

      if (!response.ok) throw new Error(`Favorite sync failed: ${response.status}`)

      // Сигналимо СЮДИ, а не поруч із оптимістичним setLikedTrackIds вище: лише тепер
      // сервер справді знає про зміну, тому перезавантажений список поверне актуальні дані.
      setLikedSyncVersion(v => v + 1)
      return true
    } catch (err) {
      if (import.meta.env.DEV) console.error('Помилка синхронізації лайку:', err)
      setLikedTrackIds(prev =>
        currentlyLiked ? [...prev, trackId] : prev.filter(id => id !== trackId)
      )
      // Після відкату теж треба ресинк — інакше список лишиться розсинхронізованим із БД.
      setLikedSyncVersion(v => v + 1)
      return false
    }
  }, [currentTrack, likedTrackIds, isGuest, openAuthModal])

  const fetchTracks = useCallback(async (search = '', page = 1, append = false, genre = '') => {
    setIsLoadingTracks(true)
    try {
      const params = new URLSearchParams({ pageNumber: String(page), pageSize: '10' })
      if (search) params.set('search', search)
      if (genre) params.set('genre', genre)
      const response = await apiFetch(`${GATEWAY_URL}/music/tracks?${params}`)

      if (response.ok) {
        const result = await response.json()
        const fetched: Track[] =
          result.items ?? result.data ?? result.Items ?? result.Tracks ??
          (Array.isArray(result) ? result : [])

        const normalized = fetched.map(track => ({
          ...track,
          coverImageUrl: normalizeUrl(track.coverImageUrl),
          audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
        }))

        const incomingLikedIds = normalized.filter(t => t.isLiked).map(t => t.trackId)
        if (incomingLikedIds.length > 0) {
          setLikedTrackIds(prev => Array.from(new Set([...prev, ...incomingLikedIds])))
        }

        if (append) {
          setTracks(prev => [...prev, ...normalized])
        } else {
          setTracks(normalized)
          if (normalized.length > 0 && !currentTrack) {
            setCurrentTrack(normalized[0])
          }
        }

        const rawTotal = result.totalCount ?? result.TotalCount ?? result.total
        const totalCount = typeof rawTotal === 'number' ? rawTotal : (fetched.length === 10 ? (page + 1) * 10 : (page - 1) * 10 + fetched.length)
        const computedPages = typeof rawTotal === 'number' ? Math.max(1, Math.ceil(rawTotal / 10)) : (fetched.length === 10 ? page + 1 : page)
        setTotalTracksCount(totalCount)
        setTotalTracksPages(computedPages)
        setHasMoreTracks(fetched.length === 10)
        setCurrentPage(page)
      } else {
        const body = await response.text().catch(() => '')
        if (import.meta.env.DEV) console.error(`GET /music/tracks ${response.status}:`, body)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Помилка завантаження треків:', err)
    } finally {
      setIsLoadingTracks(false)
    }
  }, [currentTrack])

  useEffect(() => {
    fetchTracks()
    fetchPopularTracks()
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    fetchTracks(query)
  }, [fetchTracks])

  const fetchLibrary = useCallback(async () => {
    setIsLoadingLibrary(true)
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/library`)
      if (response.ok) {
        const result = await response.json()
        const fetched: Track[] =
          result.items ?? result.data ?? result.Items ?? result.Tracks ??
          (Array.isArray(result) ? result : [])
        const normalized = fetched.map(track => ({
          ...track,
          coverImageUrl: normalizeUrl(track.coverImageUrl),
          audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
        }))
        setLibraryTracks(normalized)
      } else {
        const body = await response.text().catch(() => '')
        if (import.meta.env.DEV) console.error(`GET /music/library ${response.status}:`, body)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Помилка завантаження бібліотеки:', err)
    } finally {
      setIsLoadingLibrary(false)
    }
  }, [])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const safeMobilePlay = useCallback(async (el: HTMLAudioElement) => {
    try {
      await el.play()
      setIsPlaying(true)
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        await new Promise<void>(resolve =>
          el.addEventListener('canplay', () => resolve(), { once: true })
        )
        try {
          await el.play()
          setIsPlaying(true)
        } catch (retryErr) {
          if (import.meta.env.DEV) console.warn('[safeMobilePlay] retry failed:', retryErr)
          setIsPlaying(false)
        }
      } else if (err?.name === 'NotAllowedError') {
        if (import.meta.env.DEV) console.warn('[safeMobilePlay] NotAllowedError — tap again')
        setIsPlaying(false)
      } else {
        if (import.meta.env.DEV) console.warn('[safeMobilePlay] play error:', err)
        setIsPlaying(false)
      }
    }
  }, [])

  const applyVolume = useCallback((newVolume: number) => {
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (isMuted || volume === 0) {
      const restored = prevVolume > 0 ? prevVolume : 50
      applyVolume(restored)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      applyVolume(0)
      setIsMuted(true)
    }
  }, [isMuted, volume, prevVolume, applyVolume])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  const prefetchedBlobsRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!isPlaying || !currentTrack) return

    const trackId = currentTrack.trackId
    const timer = setTimeout(() => {
      notifyTrackPlayed(trackId)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isPlaying, currentTrack?.trackId])

  useEffect(() => {
    let cancelled = false

    const loadAudio = async () => {
      if (!currentTrack) {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }
        setBlobUrl(null)
        return
      }

      const prefetched = prefetchedBlobsRef.current.get(currentTrack.trackId)
      if (prefetched) {
        if (blobUrlRef.current && blobUrlRef.current !== prefetched) {
          URL.revokeObjectURL(blobUrlRef.current)
        }
        blobUrlRef.current = prefetched
        setBlobUrl(prefetched)
        prefetchedBlobsRef.current.delete(currentTrack.trackId)
        return
      }

      try {
        const offlineBlob = await getOfflineTrackBlob(currentTrack.trackId)
        if (offlineBlob) {
          if (cancelled) return
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
          }
          const newUrl = URL.createObjectURL(offlineBlob)
          blobUrlRef.current = newUrl
          setBlobUrl(newUrl)
          return
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[PlayerProvider] IndexedDB check failed, falling back to network:', e)
      }

      const isMobileDevice = typeof navigator !== 'undefined' && (
        /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && navigator.maxTouchPoints > 0)
      )
      if (isMobileDevice) {
        const streamUrl = getAuthenticatedStreamUrl(
          `${GATEWAY_URL}/music/tracks/${currentTrack.trackId}/stream`
        ) || `${GATEWAY_URL}/music/tracks/${currentTrack.trackId}/stream`
        mobileStreamUrlRef.current = streamUrl
        setBlobUrl(null)
        return
      }

      try {
        const response = await apiFetch(currentTrack.audioUrl)
        if (!response.ok) {
          if (import.meta.env.DEV) console.error(`Помилка потоку: ${response.status}`)
          return
        }

        const blob = await response.blob()
        if (cancelled) return

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
        }

        const newUrl = URL.createObjectURL(blob)
        blobUrlRef.current = newUrl
        setBlobUrl(newUrl)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Не вдалося завантажити аудіо:', err)
      }
    }

    loadAudio()

    return () => {
      cancelled = true
    }
  }, [currentTrack?.trackId]) 

  useEffect(() => {
    if (!currentTrack || tracks.length <= 1) return
    const idx = tracks.findIndex(t => t.trackId === currentTrack.trackId)
    if (idx === -1 || idx >= tracks.length - 1) return

    const nextTrack = tracks[idx + 1]
    if (prefetchedBlobsRef.current.has(nextTrack.trackId)) return

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(nextTrack.audioUrl)
        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          prefetchedBlobsRef.current.forEach((oldUrl, oldId) => {
            if (oldId !== nextTrack.trackId) {
              URL.revokeObjectURL(oldUrl)
              prefetchedBlobsRef.current.delete(oldId)
            }
          })
          prefetchedBlobsRef.current.set(nextTrack.trackId, url)
        }
      } catch {
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [currentTrack?.trackId, tracks])

  useEffect(() => {
    if (!audioRef.current || !blobUrl) return

    audioRef.current.src = blobUrl
    audioRef.current.load()

    const restoredTime = initialTimeRef.current
    if (restoredTime > 0 && !hasRestoredTimeRef.current) {
      hasRestoredTimeRef.current = true
      audioRef.current.currentTime = restoredTime
      setCurrentTime(restoredTime)
    }

    if (isPlayingRef.current || wasPlayingRef.current) {
      wasPlayingRef.current = false
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(err => {
        if (import.meta.env.DEV) console.warn('Autoplay prevented by browser on reload:', err)
      })
    }
  }, [blobUrl]) 

  useEffect(() => {
    if (!isPlaying) return

    const handleFirstInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
        const activeSrc = blobUrl || mobileStreamUrlRef.current || getAuthenticatedStreamUrl(currentTrack?.audioUrl || `${GATEWAY_URL}/music/tracks/${currentTrack?.trackId}/stream`)
        if (activeSrc && (!audioRef.current.src || audioRef.current.src === window.location.href)) {
          audioRef.current.src = activeSrc
        }
        audioRef.current.play().then(() => {
          setIsPlaying(true)
        }).catch(() => { })
      }
    }

    window.addEventListener('click', handleFirstInteraction, { once: true })
    window.addEventListener('keydown', handleFirstInteraction, { once: true })
    window.addEventListener('touchstart', handleFirstInteraction, { once: true })
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true })

    return () => {
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
      window.removeEventListener('touchstart', handleFirstInteraction)
      window.removeEventListener('pointerdown', handleFirstInteraction)
    }
  }, [isPlaying, blobUrl, currentTrack])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
      prefetchedBlobsRef.current.forEach(url => URL.revokeObjectURL(url))
      prefetchedBlobsRef.current.clear()
    }
  }, [])

  const togglePlayPause = useCallback(() => {
    triggerHaptic('light')
    if (!audioRef.current || !currentTrack) return

    const el = audioRef.current
    const playing = isPlayingRef.current

    const rawUrl = blobUrl || mobileStreamUrlRef.current || currentTrack.audioUrl || `${GATEWAY_URL}/music/tracks/${currentTrack.trackId}/stream`
    const streamUrl = getAuthenticatedStreamUrl(rawUrl) || rawUrl

    if (playing) {
      el.pause()
      setIsPlaying(false)
    } else {
      if (!el.src || el.src === window.location.href || el.src !== streamUrl) {
        el.src = streamUrl
      }
      safeMobilePlay(el)
    }
  }, [blobUrl, currentTrack, safeMobilePlay])

  const selectTrack = useCallback((track: Track) => {
    triggerHaptic('light')
    hasRestoredTimeRef.current = true
    initialTimeRef.current = 0
    try {
      localStorage.setItem('groovy_last_time', '0')
    } catch { }

    const normalizedTrack: Track = {
      ...track,
      audioUrl: track.audioUrl ? (normalizeUrl(track.audioUrl) || `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`) : `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
      coverImageUrl: normalizeUrl(track.coverImageUrl),
    }

    setTracks(prev => {
      if (prev.some(t => t.trackId === normalizedTrack.trackId)) return prev
      return [normalizedTrack, ...prev]
    })

    setCurrentTrack(normalizedTrack)
    setIsPlaying(true)

    const isMobileDevice = typeof navigator !== 'undefined' && (
      /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && navigator.maxTouchPoints > 0)
    )
    if (isMobileDevice && audioRef.current) {
      const streamUrl = getAuthenticatedStreamUrl(
        `${GATEWAY_URL}/music/tracks/${normalizedTrack.trackId}/stream`
      ) || `${GATEWAY_URL}/music/tracks/${normalizedTrack.trackId}/stream`
      mobileStreamUrlRef.current = streamUrl
      const el = audioRef.current
      if (el.src !== streamUrl) {
        el.src = streamUrl
      }
      safeMobilePlay(el)
    }
  }, [safeMobilePlay])

  const playNext = useCallback(() => {
    triggerHaptic('light')
    if (tracks.length === 0 || !currentTrack) return
    if (isShuffle) {
      selectTrack(tracks[Math.floor(Math.random() * tracks.length)])
    } else {
      const idx = tracks.findIndex(t => t.trackId === currentTrack.trackId)
      if (idx === -1) return

      let autoPlayNextEnabled = true
      try {
        const saved = localStorage.getItem('userSettings')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.autoPlayNext === false) autoPlayNextEnabled = false
        }
      } catch {
      }

      const isLastTrack = idx === tracks.length - 1
      if (isLastTrack && !isRepeat && !autoPlayNextEnabled) {
        setIsPlaying(false)
        return
      }

      selectTrack(tracks[(idx + 1) % tracks.length])
    }
  }, [tracks, currentTrack, isShuffle, isRepeat, selectTrack])

  const playPrevious = useCallback(() => {
    if (tracks.length === 0 || !currentTrack) return
    const idx = tracks.findIndex(t => t.trackId === currentTrack.trackId)
    if (idx === -1) return
    selectTrack(tracks[(idx - 1 + tracks.length) % tracks.length])
  }, [tracks, currentTrack, selectTrack])

  const toggleShuffle = useCallback(() => setIsShuffle(prev => !prev), [])
  const toggleRepeat = useCallback(() => setIsRepeat(prev => !prev), [])

  const seekTo = useCallback((percent: number) => {
    if (audioRef.current && duration > 0) {
      const newTime = percent * duration
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
      lastSavedTimeRef.current = newTime
      try {
        localStorage.setItem('groovy_last_time', String(newTime))
      } catch { }
    }
  }, [duration])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    if (!currentTrack) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
      return
    }

    const artwork = currentTrack.coverImageUrl
      ? [
        { src: currentTrack.coverImageUrl, sizes: '96x96', type: 'image/png' },
        { src: currentTrack.coverImageUrl, sizes: '128x128', type: 'image/png' },
        { src: currentTrack.coverImageUrl, sizes: '192x192', type: 'image/png' },
        { src: currentTrack.coverImageUrl, sizes: '256x256', type: 'image/png' },
        { src: currentTrack.coverImageUrl, sizes: '384x384', type: 'image/png' },
        { src: currentTrack.coverImageUrl, sizes: '512x512', type: 'image/png' },
      ]
      : []

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistName || 'Groovra',
      album: currentTrack.album || 'Groovra Music',
      artwork,
    })

    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
      }
    }

    setHandler('play', () => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => { if (import.meta.env.DEV) console.error('MediaSession play error:', e) })
      }
    })
    setHandler('pause', () => {
      if (audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    })
    setHandler('previoustrack', playPrevious)
    setHandler('nexttrack', playNext)
    setHandler('seekto', (details) => {
      if (details.seekTime !== undefined && duration > 0) {
        seekTo(details.seekTime / duration)
      }
    })
    setHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10
      if (audioRef.current && duration > 0) {
        const target = Math.max(0, audioRef.current.currentTime - skipTime)
        seekTo(target / duration)
      }
    })
    setHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10
      if (audioRef.current && duration > 0) {
        const target = Math.min(duration, audioRef.current.currentTime + skipTime)
        seekTo(target / duration)
      }
    })

    return () => {
      setHandler('play', null)
      setHandler('pause', null)
      setHandler('previoustrack', null)
      setHandler('nexttrack', null)
      setHandler('seekto', null)
      setHandler('seekbackward', null)
      setHandler('seekforward', null)
    }
  }, [currentTrack, duration, playNext, playPrevious, seekTo])

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    }
  }, [isPlaying])

  useEffect(() => {
    if ('mediaSession' in navigator && duration > 0 && Number.isFinite(duration) && Number.isFinite(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: audioRef.current?.playbackRate || 1,
          position: Math.min(Math.max(0, currentTime), duration),
        })
      } catch {
      }
    }
  }, [currentTime, duration])

  const { subscription, spatialAudio } = useSubscription()
  const equalizer = useEqualizer(audioRef, spatialAudio && subscription.isActivePremium)

  const value: PlayerContextType = {
    tracks,
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    isShuffle,
    isRepeat,
    isLoadingTracks,
    searchQuery,
    likedTrackIds,
    likedSyncVersion,
    isLiked,
    audioUrl: blobUrl,
    audioRef,
    activeTab,
    setActiveTab,
    selectTrack,
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
    setTracks,
    setCurrentTrack,
    fetchTracks,
    popularTracks,
    isLoadingPopular,
    fetchPopularTracks,
    currentPage,
    hasMoreTracks,
    totalTracksPages,
    totalTracksCount,
    libraryTracks,
    isLoadingLibrary,
    fetchLibrary,
    equalizer,
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (isRepeat && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(err => { if (import.meta.env.DEV) console.error('Помилка повтору:', err) })
          } else {
            playNext()
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            const time = audioRef.current.currentTime
            setCurrentTime(time)
            if (Math.abs(time - lastSavedTimeRef.current) >= 1) {
              lastSavedTimeRef.current = time
              try {
                localStorage.setItem('groovy_last_time', String(time))
              } catch { }
            }
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration)
        }}
      />
    </PlayerContext.Provider>
  )
}