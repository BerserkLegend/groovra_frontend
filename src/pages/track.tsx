import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlayer } from '../context/player-context'
import { usePlaylistModal } from '../context/playlist-modal-context'
import { useAuthModal } from '../context/auth-modal-context'
import { ShareModal } from '../components/ShareModal'
import { CommentsModal } from '../components/CommentsModal'
import { MiniEqualizerModal } from '../components/MiniEqualizerModal'
import { apiFetch, GATEWAY_URL } from '../api/api-client'
import { addDownload, downloadTrackFile } from '../api/downloads'
import { saveOfflineTrack } from '../utils/offline-storage'
import { TrackCover } from '../components/common/TrackCover'
import './track.css'

import downstreamImg from '../assets/track-downstream.png'
import dustImg from '../assets/track-dust.png'
import flowingImg from '../assets/track-flowing.png'
import bezboiuImg from '../assets/track-bezboiu.png'
import adviceImg from '../assets/track-advice.png'
import mirrorsImg from '../assets/track-16mirrors.png'
import strileyImg from '../assets/track-striley.png'
import todayImg from '../assets/track-today.png'
import minimiseIcon from '../assets/minimise.svg'

import Remix from '../assets/IconRemix.svg'
import LeftArrow from '../assets/LeftArrowLogo.svg'
import Pause from '../assets/IconPause.svg'
import RightArrow from '../assets/RightArrowLogo.svg'
import Ref from '../assets/IconRef.svg'

const PLAY_ICON_DATA = "data:image/svg+xml,%3csvg%20width='15'%20height='18'%20viewBox='0%200%2015%2018'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M0%2018V0L15%209L0%2018Z'%20fill='%230D0D12'/%3e%3c/svg%3e"

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#72DEEF" : "none"} stroke={filled ? "#72DEEF" : "#A98FDB"} strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const AddSquareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A98FDB" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
)

const DownloadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A98FDB" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const ShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A98FDB" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

const AnnotationIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A98FDB" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const EqualizerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A98FDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <circle cx="18" cy="7" r="2" fill="#72DEEF" />
    <circle cx="12" cy="12" r="2" fill="#A98FDB" />
    <circle cx="6" cy="9" r="2" fill="#72DEEF" />
  </svg>
)

const playlistTracks = [
  { img: downstreamImg, title: 'Downstream', artist: 'Beats on 21st', album: 'Single' },
  { img: dustImg, title: 'Dust', artist: 'Soft Dunes', album: 'Dust' },
  { img: flowingImg, title: 'Flowing', artist: 'Spring Bingo', album: 'Flowing' },
  { img: adviceImg, title: 'Advice', artist: 'Alex G', album: 'Trick' },
  { img: strileyImg, title: 'Стріляй', artist: 'Океан Ельзи', album: 'Земля' },
  { img: bezboiuImg, title: 'Без бою', artist: 'Океан Ельзи', album: 'Без бою' },
  { img: mirrorsImg, title: '16 mirrors', artist: 'Alex G', album: 'Trick' },
  { img: todayImg, title: 'Today', artist: 'The smashing pumpkins', album: 'Siamese dream' },
]

interface LyricLine {
  time: number
  text: string
}

const parseLrc = (lrc: string): LyricLine[] => {
  const lines: LyricLine[] = []
  const regex = /\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.*)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(lrc)) !== null) {
    const minutes = parseInt(match[1], 10)
    const seconds = parseInt(match[2], 10)
    const hundredths = parseInt(match[3], 10)
    const totalSeconds = minutes * 60 + seconds + hundredths / 100
    const text = match[4].trim()
    if (text) lines.push({ time: totalSeconds, text })
  }
  return lines.sort((a, b) => a.time - b.time)
}

export const Minimise: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { t } = useTranslation()
  return (
    <div className="minimise" onClick={onClick} style={{ cursor: 'pointer' }} role="button" aria-label={t('trackPage.minimise')}>
      <img className="icon" alt="Icon" src={minimiseIcon} />
    </div>
  )
}

export const Label: React.FC = () => {
  return (
    <div className="label">
      <p className="over-my-shoulder-i-m">
        Over my shoulder <br />
        I'm dying to meet you <br />
        But everybody says I'm wrong <br />
        Said I'm dying to meet you, girl <br />
        But everybody says I'm wrong <br />
        Everybody says I'm wrong <br />
        But we keep it going on <br />
        Feelings coming on <br />
        But the ******** got too long, yeah <br />
        Over my shoulder <br />
        I'm dying to meet you <br />
        Though everybody says I'm wrong <br />
        Over my shoulder <br />
        I'm dying to meet you <br />
        Though everybody says I'm wrong
      </p>
    </div>
  )
}

export const TrackPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const {
    tracks,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    isRepeat,
    isLiked,
    togglePlayPause,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    toggleLiked,
    seekTo,
    formatTime,
    selectTrack,
    equalizer,
  } = usePlayer()

  const [isEqModalOpen, setIsEqModalOpen] = useState(false)

  const timelineRef = useRef<HTMLDivElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [isInstrumental, setIsInstrumental] = useState(false)

  // Fetch lyrics from backend when track changes
  useEffect(() => {
    if (!currentTrack?.trackId) {
      setLyrics([])
      return
    }
    const controller = new AbortController()
    setLyricsLoading(true)
    setIsInstrumental(false)
    setLyrics([])
    apiFetch(`${GATEWAY_URL}/music/tracks/${currentTrack.trackId}/lyrics`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then((data: { lrc: string; isInstrumental: boolean }) => {
        if (data.isInstrumental) {
          setIsInstrumental(true)
          setLyrics([])
        } else {
          setLyrics(parseLrc(data.lrc))
        }
      })
      .catch(err => {
        if (err?.name === 'AbortError' || err === 'AbortError') return
        if (import.meta.env.DEV) console.warn('Lyrics fetch failed:', err)
      })
      .finally(() => setLyricsLoading(false))
    return () => controller.abort()
  }, [currentTrack?.trackId])

  const activeLineIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1]
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time)
  })

  useEffect(() => {
    const activeEl = lyricsContainerRef.current?.querySelector('.active-lyric-line') as HTMLElement
    if (activeEl && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current
      const offsetTop = activeEl.offsetTop
      const containerHeight = container.clientHeight
      const elementHeight = activeEl.clientHeight
      container.scrollTo({
        top: offsetTop - containerHeight / 2 + elementHeight / 2,
        behavior: 'smooth'
      })
    }
  }, [activeLineIndex])

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const { openModal } = usePlaylistModal()

  const handleAddClick = () => {
    if (currentTrack?.trackId) {
      openModal(currentTrack.trackId)
    } else {
      setIsAddModalOpen(true)
    }
  }

  const { isGuest, openAuthModal } = useAuthModal()

  const handleCommentsClick = () => {
    if (isGuest) {
      openAuthModal(t('authModal.reasons.comments'))
      return
    }
    setIsCommentsModalOpen(true)
  }

  const handleEqualizerClick = () => {
    if (isGuest) {
      openAuthModal(t('authModal.reasons.equalizer'))
      return
    }
    setIsEqModalOpen(true)
  }

  const handleDownloadClick = async () => {
    if (!currentTrack) return

    if (isGuest) {
      openAuthModal(t('authModal.reasons.protectedPage'))
      return
    }

    showToast(t('trackPageExt.downloaded_offline'))

    try {
      await addDownload({ type: 'Track', itemId: currentTrack.trackId }).catch(e => console.warn('addDownload warning:', e))
      const blob = await downloadTrackFile(currentTrack.trackId, `${currentTrack.artistName} - ${currentTrack.title}.mp3`)
      await saveOfflineTrack(currentTrack, blob)
    } catch (e) {
      console.error('Error saving track offline:', e)
    }

    // 1. Restore the track if it was previously deleted in /downloads
    try {
      const deletedIdsSaved = localStorage.getItem('groovra_deleted_download_ids')
      let deletedIds: string[] = deletedIdsSaved ? JSON.parse(deletedIdsSaved) : []
      if (deletedIds.includes(currentTrack.trackId)) {
        deletedIds = deletedIds.filter(id => id !== currentTrack.trackId)
        localStorage.setItem('groovra_deleted_download_ids', JSON.stringify(deletedIds))
      }
    } catch (e) {
      console.error('Error updating deleted track IDs:', e)
    }

    // 2. Add to downloaded recommendations in localStorage
    try {
      const savedTracks = localStorage.getItem('downloads_recommendation_tracks')
      const downloadedTracks: typeof tracks = savedTracks ? JSON.parse(savedTracks) : []
      if (!downloadedTracks.some(t => t.trackId === currentTrack.trackId)) {
        downloadedTracks.unshift(currentTrack)
        localStorage.setItem('downloads_recommendation_tracks', JSON.stringify(downloadedTracks))
      }
    } catch (e) {
      console.error('Error updating downloaded tracks:', e)
    }

    // 3. Set status to success in downloads_recommendation_status
    try {
      const savedStatus = localStorage.getItem('downloads_recommendation_status')
      const downloadStatus: Record<string, string> = savedStatus ? JSON.parse(savedStatus) : {}
      downloadStatus[currentTrack.trackId] = 'success'
      localStorage.setItem('downloads_recommendation_status', JSON.stringify(downloadStatus))
    } catch (e) {
      console.error('Error updating download status:', e)
    }
  }

  const handleShareClick = () => {
    setIsShareModalOpen(true)
  }

  useEffect(() => {
    const handleResize = () => {
      const targetWidth = 1524
      const targetHeight = 811

      if (window.innerWidth <= 768) {
        setScale(1)
      } else {
        const scaleX = (window.innerWidth - 48) / targetWidth
        const scaleY = (window.innerHeight - 48) / targetHeight
        const newScale = Math.min(1, scaleX, scaleY)
        setScale(newScale)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!timelineRef.current || duration === 0) return
    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const clickPercent = Math.max(0, Math.min(1, clickX / width))
    seekTo(clickPercent)
  }

  const handleMinimise = () => {
    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(`${prefix}/main`)
    }
  }

  return (
    <div className="box">
      <div className="track-player-scale-wrapper" style={{ transform: `scale(${scale})` }}>
        <div className="group">
          <div className="rectangle" />
          <TrackCover
            src={currentTrack?.coverImageUrl}
            className={`img ${!currentTrack?.coverImageUrl ? 'placeholder-cover' : ''}`}
            alt={currentTrack?.title || 'Cover'}
          />

          <div className="div">
            <button
              className={`track-action-btn heart-instance ${isLiked ? 'liked' : ''}`}
              onClick={async () => {
                const ok = await toggleLiked()
                if (!ok) showToast(t('player.like_error'))
              }}
              title={isLiked ? t('player.unlike') : t('player.like')}
            >
              <HeartIcon filled={isLiked} />
            </button>
            <button className="track-action-btn icon-instance-node" onClick={handleAddClick} title={t('trackPage.add')}>
              <AddSquareIcon />
            </button>
            <button className="track-action-btn icon-instance-node" onClick={handleDownloadClick} title={t('trackPage.download')}>
              <DownloadIcon />
            </button>
            <button className="track-action-btn icon-instance-node" onClick={handleShareClick} title={t('trackPage.share')}>
              <ShareIcon />
            </button>
            <button className="track-action-btn icon-instance-node" onClick={handleCommentsClick} title={t('trackPage.comments')}>
              <AnnotationIcon />
            </button>
            <button className="track-action-btn icon-instance-node" onClick={handleEqualizerClick} title={t('trackPage.equalizer')}>
              <EqualizerIcon />
            </button>
          </div>

          <div className="track-mini-eq-widget desktop-eq-widget" onClick={handleEqualizerClick} title={t('trackPage.equalizer')}>
            <div className="track-mini-eq-bars">
              {(equalizer?.spectrum ?? [10, 15, 20, 15, 10]).map((val, idx) => {
                const h = equalizer?.isEnabled && isPlaying ? Math.max(20, val) : (equalizer?.isEnabled ? 25 : 10)
                return (
                  <div
                    key={idx}
                    className={`track-mini-eq-bar-item ${isPlaying && equalizer?.isEnabled ? 'active' : ''}`}
                    style={{ height: `${h}%` }}
                  />
                )
              })}
            </div>
            <span className="track-mini-eq-badge">EQ</span>
          </div>

          <div className="text-wrapper">{t('trackPage.lyrics')}</div>

          <div className="over-my-shoulder-i-m" ref={lyricsContainerRef}>
            {lyricsLoading ? (
              <span className="lyric-line" style={{ opacity: 0.4 }}>
                {t('trackPageExt.lyrics_loading')}
              </span>
            ) : isInstrumental ? (
              <span className="lyric-line" style={{ opacity: 0.4 }}>
                {t('trackPageExt.lyrics_instrumental')}
              </span>
            ) : lyrics.length === 0 ? (
              <span className="lyric-line" style={{ opacity: 0.4 }}>
                {t('trackPageExt.lyrics_unavailable')}
              </span>
            ) : lyrics.map((line, index) => {
              const isActive = index === activeLineIndex
              return (
                <span
                  key={index}
                  className={`lyric-line ${isActive ? 'active-lyric-line' : ''}`}
                  style={{
                    opacity: isActive ? 1 : index < activeLineIndex ? 0.6 : 0.3
                  }}
                  onClick={() => seekTo(line.time / duration)}
                >
                  {line.text}
                </span>
              )
            })}
          </div>

          <div className="text-wrapper-2">{currentTrack ? currentTrack.title : t('player.track')}</div>
          <div className="text-wrapper-3">{currentTrack ? currentTrack.artistName : t('player.artist')}</div>

          <Minimise onClick={handleMinimise} />

          <div className="playback-controls">
            <div className="container-2">
              <div className="track-time-wrapper">
                <div className="text-wrapper-4">{formatTime(currentTime)}</div>
              </div>
              <div className="background" ref={timelineRef} onClick={handleTimelineClick} style={{ cursor: 'pointer' }}>
                <div className="background-shadow" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
              </div>
              <div className="track-time-wrapper">
                <div className="text-wrapper-4">{formatTime(duration)}</div>
              </div>
            </div>

            <div className="track-player-buttons">
              <button className={`track-btn-remix ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title={t('player.shuffle')}>
                <img src={Remix} className="LogoRemix" alt="Shuffle" />
              </button>
              <button className="track-btn-prev" onClick={playPrevious} title={t('player.previous')}>
                <img src={LeftArrow} className="LeftArrow" alt="Previous" />
              </button>
              <button className="track-btn-play" onClick={togglePlayPause} title={isPlaying ? t('player.pause') : t('player.play')}>
                <img src={isPlaying ? Pause : PLAY_ICON_DATA} className="PauseLogo" style={isPlaying ? undefined : { marginLeft: '2px' }} alt="Play/Pause" />
              </button>
              <button className="track-btn-next" onClick={playNext} title={t('player.next')}>
                <img src={RightArrow} className="RightArrowLogo" alt="Next" />
              </button>
              <button className={`track-btn-repeat ${isRepeat ? 'active' : ''}`} onClick={toggleRepeat} title={isRepeat ? t('player.repeatOn') : t('player.repeat')}>
                <img src={Ref} className="RefLogo" alt="Repeat" />
              </button>
            </div>
          </div>
        </div>

        <div className="playlist-sidebar-panel">
          <div className="playlist-sidebar-header">
            <h2 className="playlist-sidebar-title">{t('trackPage.sidebar_title')}</h2>
            <div className="track-mini-eq-widget mobile-eq-widget" onClick={handleEqualizerClick} title={t('trackPage.equalizer')}>
              <div className="track-mini-eq-bars">
                {(equalizer?.spectrum ?? [10, 15, 20, 15, 10]).map((val, idx) => {
                  const h = equalizer?.isEnabled && isPlaying ? Math.max(20, val) : (equalizer?.isEnabled ? 25 : 10)
                  return (
                    <div
                      key={idx}
                      className={`track-mini-eq-bar-item ${isPlaying && equalizer?.isEnabled ? 'active' : ''}`}
                      style={{ height: `${h}%` }}
                    />
                  )
                })}
              </div>
              <span className="track-mini-eq-badge">EQ</span>
            </div>
          </div>
          <div className="playlist-sidebar-list">
            {tracks.length > 0 ? (
              tracks.map((track) => (
                <div
                  className={`playlist-item-card ${currentTrack?.trackId === track.trackId ? 'active' : ''}`}
                  key={track.trackId}
                  onClick={() => selectTrack(track)}
                >
                  <TrackCover
                    src={track.coverImageUrl}
                    className={`playlist-item-thumbnail ${!track.coverImageUrl ? 'placeholder-cover' : ''}`}
                    alt={track.title}
                  />
                  <div className="playlist-item-details">
                    <h3 className="playlist-item-title">
                      {track.title}
                    </h3>
                    <p className="playlist-item-meta">{track.artistName}</p>
                    {track.album && <p className="playlist-item-meta" style={{ opacity: 0.6 }}>{track.album}</p>}
                  </div>
                </div>
              ))
            ) : (
              playlistTracks.map((track) => (
                <div className="playlist-item-card" key={track.title}>
                  <img className="playlist-item-thumbnail" alt={track.title} src={track.img} />
                  <div className="playlist-item-details">
                    <h3 className="playlist-item-title">{track.title}</h3>
                    <p className="playlist-item-meta">{track.artist}</p>
                    <p className="playlist-item-meta" style={{ opacity: 0.6 }}>{track.album}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="track-toast">
          {toastMessage}
        </div>
      )}

      {isAddModalOpen && (
        <div className="playlist-add-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="playlist-add-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{t('trackPage.add')}</h3>
            <div className="playlist-options">
              {['Вечірній вайб', 'Енергійний мікс', 'Релакс'].map((playlistName) => (
                <button
                  key={playlistName}
                  className="playlist-option-btn"
                  onClick={() => {
                    showToast(
                      i18n.language === 'en'
                        ? `Added to "${playlistName}"`
                        : `Додано в "${playlistName}"`
                    )
                    setIsAddModalOpen(false)
                  }}
                >
                  {playlistName}
                </button>
              ))}
            </div>
            <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
              {t('createPlaylistModal.cancel')}
            </button>
          </div>
        </div>
      )}

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trackTitle={currentTrack?.title}
        artistName={currentTrack?.artistName}
        coverUrl={currentTrack?.coverImageUrl}
        trackId={currentTrack?.trackId}
      />

      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        trackId={currentTrack?.trackId}
        trackTitle={currentTrack?.title}
        artistName={currentTrack?.artistName}
      />

      <MiniEqualizerModal
        isOpen={isEqModalOpen}
        onClose={() => setIsEqModalOpen(false)}
        isEnabled={equalizer.isEnabled}
        onToggleEnabled={equalizer.toggleEnabled}
        activePreset={equalizer.activePreset}
        onSelectPreset={equalizer.selectPreset}
        gains={equalizer.gains}
        onSetBandGain={equalizer.setBandGain}
        onReset={equalizer.resetEq}
        spectrum={equalizer.spectrum}
        isPlaying={isPlaying}
      />
    </div>
  )
}

// Export Box component for Figma import compatibility
export const Box: React.FC = () => {
  return (
    <div className="box">
      <div className="rectangle" />
    </div>
  )
}

export default TrackPage
