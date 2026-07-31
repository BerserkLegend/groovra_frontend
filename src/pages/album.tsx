import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlayer, type Track } from '../context/player-context'
import { fetchAlbumById, likeAlbum, unlikeAlbum, type Album, type AlbumTrackItem } from '../api/albums'
import { trackStreamUrl } from '../api/api-client'
import { getProfileByName } from '../api/profile'
import { TrackCover } from '../components/common/TrackCover'
import { FooterFromJson } from '../components/footer-from-json'
import Loader from '../components/Loader'
import { albumHasCustomCover } from '../utils/cover-utils'
import '../app.css'

const PlayIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <polygon points="5 3 19 12 5 21" />
  </svg>
)

const PauseIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
)

const SpeakerIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
)

const BackArrowIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#72DEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const getPrefixedPath = (path: string): string => {
  const savedLang = localStorage.getItem('lang') || 'uk'
  const prefix = savedLang === 'en' ? '/en' : ''
  return `${prefix}${path}`
}

export function AlbumPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrack, selectTrack, setTracks, formatTime, isPlaying, togglePlayPause } = usePlayer()

  const [album, setAlbum] = useState<Album | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleArtistClick = async (artistName: string) => {
    try {
      const res = await getProfileByName(artistName)
      if (res && res.userId) {
        navigate(getPrefixedPath(`/profile?userId=${res.userId}`))
      }
    } catch (err) {
      console.warn('Artist profile not found or error occurred:', err)
    }
  }

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    fetchAlbumById(id)
      .then(setAlbum)
      .catch((err) => {
        console.error('Не вдалося завантажити альбом:', err)
        navigate(getPrefixedPath('/library'), { replace: true })
      })
      .finally(() => setIsLoading(false))
  }, [id])

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(getPrefixedPath('/library'))
    }
  }

  const handleToggleLike = async () => {
    if (!album) return
    const wasLiked = album.isLiked
    setAlbum({ ...album, isLiked: !wasLiked })
    try {
      if (wasLiked) {
        await unlikeAlbum(album.id)
      } else {
        await likeAlbum(album.id)
      }
    } catch (err) {
      console.error('Помилка зміни збереження альбому:', err)
      setAlbum((prev) => (prev ? { ...prev, isLiked: wasLiked } : prev))
    }
  }

  const handlePlayTrack = (_track: AlbumTrackItem, index: number) => {
    if (!album) return
    const mappedTracks: Track[] = album.tracks.map((t) => ({
      trackId: t.trackId,
      title: t.title,
      artistName: t.artistName,
      durationSeconds: t.durationSeconds,
      audioUrl: trackStreamUrl(t.trackId),
      coverImageUrl: t.coverImageUrl,
      fileSizeBytes: 0,
      contentType: 'audio/mpeg',
      uploadedAt: album.createdAt || new Date().toISOString(),
      playCount: 0,
    }))
    setTracks(mappedTracks)
    selectTrack(mappedTracks[index])
  }

  if (isLoading || !album) {
    return (
      <div className="PlaylistTabContent">
        <Loader variant="section" text={t('albumPageExt.loading')} />
        <FooterFromJson />
      </div>
    )
  }

  const coverItems: (string | null)[] = [...album.collageCovers]
  while (coverItems.length < 4) coverItems.push(null)
  const hasAnyCover = coverItems.some((url) => url !== null)

  return (
    <div className="PlaylistTabContent">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
            onClick={goBack}
            aria-label={t('common.back')}
          >
            <BackArrowIcon />
          </button>

          {albumHasCustomCover(album.coverImageUrl) ? (
            <div className="PlaylistCollage" style={{ width: '80px', flexShrink: 0 }}>
              <TrackCover
                src={album.coverImageUrl}
                alt={album.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div className="PlaylistCollage" style={{ width: '80px', flexShrink: 0 }}>
              {coverItems.map((url, idx) => (
                <div key={idx} className="PlaylistCollageItem">
                  {url ? (
                    <TrackCover
                      src={url}
                      alt="cover"
                    />
                  ) : (
                    <div className="PlaylistCollagePlaceholder" />
                  )}
                </div>
              ))}
              {!hasAnyCover && (
                <div className="PlaylistCollageEmptyIcon">
                  <span className="PlaylistEmptyNote">♪</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="SectionTitle" style={{ marginBottom: 0 }}>{album.title}</span>
            <span
              className="ClickableArtist"
              style={{ color: '#72DEEF', fontSize: '14px', fontFamily: 'SUSE, sans-serif', cursor: 'pointer' }}
              onClick={() => handleArtistClick(album.artistName)}
            >
              {album.artistName}
            </span>
            <span style={{ color: '#A1A1AA', fontSize: '14px', fontFamily: 'SUSE, sans-serif' }}>
              {t('tracks_count', { count: album.trackCount })} • {formatTime(album.totalDurationSeconds)}
            </span>
          </div>
        </div>

        <button
          className="ActionBtn"
          onClick={handleToggleLike}
        >
          {album.isLiked
            ? `♥ ${t('albumPageExt.saved')}`
            : `♡ ${t('albumPageExt.save')}`}
        </button>
      </div>

      {album.description && (
        <p style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif', marginBottom: '20px' }}>{album.description}</p>
      )}

      {album.tracks.length === 0 ? (
        <div className="EmptyStateText">
          {t('albumPageExt.empty')}
        </div>
      ) : (
        <div className="LibraryTrackList">
          <div className="LibraryTableHeader">
            <span className="ColHash">#</span>
            <span className="ColTitle">{t('library.song_title')}</span>
            <span className="ColGenre"></span>
            <span className="ColDuration">{t('library.duration')}</span>
          </div>
          <div className="LibraryTableBody">
            {album.tracks.map((track, index) => {
              const isCurrent = currentTrack?.trackId === track.trackId
              const isCurrentlyPlaying = isCurrent && isPlaying

              return (
                <div
                  key={track.trackId}
                  className={`LibraryRow ${isCurrent ? 'active-row' : ''} ${isCurrentlyPlaying ? 'playing-row' : ''}`}
                  onClick={() => handlePlayTrack(track, index)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlayTrack(track, index) }}
                >
                  <span className="ColHash" onClick={(e) => e.stopPropagation()}>
                    <span className="row-number">{index + 1}</span>
                    <span 
                      className="row-play-icon"
                      onClick={() => {
                        if (isCurrent) {
                          togglePlayPause()
                        } else {
                          handlePlayTrack(track, index)
                        }
                      }}
                    >
                      <PlayIcon />
                    </span>
                    <span 
                      className="row-pause-icon"
                      onClick={() => togglePlayPause()}
                    >
                      <PauseIcon />
                    </span>
                    <span className="row-speaker-icon"><SpeakerIcon /></span>
                  </span>
                  <div className="ColTitleDetail">
                    <TrackCover 
                      src={track.coverImageUrl} 
                      className="LibraryRowCover" 
                      alt={track.title} 
                    />
                    <div className="LibraryRowInfo">
                      <span className="RowTitle">{track.title}</span>
                      <span
                        className="RowArtist ClickableArtist"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleArtistClick(track.artistName)
                        }}
                      >
                        {track.artistName}
                      </span>
                    </div>
                  </div>
                  <span className="ColGenre"></span>
                  <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <FooterFromJson />
    </div>
  )
}
