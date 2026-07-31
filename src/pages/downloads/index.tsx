import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayer } from '../../context/player-context'
import type { Track } from '../../context/player-context'
import { fetchDownloads, addDownload, removeDownload, downloadTrackFile } from '../../api/downloads'
import { saveOfflineTrack, getOfflineTracks, removeOfflineTrack } from '../../utils/offline-storage'
import { Music, Disc, Headphones } from 'lucide-react'
import searchIcon from './icon.svg'
import { Download02 } from './Download02'
import { TrackCover } from '../../components/common/TrackCover'
import { FooterFromJson } from '../../components/footer-from-json'
import { useAuthModal } from '../../context/auth-modal-context'
import './downloads.css'

export const DownloadsPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const { isGuest, openAuthModal } = useAuthModal()
  const {
    tracks,
    currentTrack,
    isPlaying,
    selectTrack,
    togglePlayPause,
    formatTime,
    popularTracks,
    fetchPopularTracks
  } = usePlayer()

  const [activeCategory, setActiveCategory] = useState<'songs' | 'playlists' | 'albums' | null>(null)

  const [allDownloadedSongs, setAllDownloadedSongs] = useState<Track[]>([])
  const [downloadStatus, setDownloadStatus] = useState<Record<string, 'idle' | 'loading' | 'success'>>({})

  const LS_DELETED_ITEMS = 'groovra_deleted_download_ids'

  const getDeletedIds = (): string[] => {
    try {
      const stored = localStorage.getItem(LS_DELETED_ITEMS)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const markAsDeleted = (id: string) => {
    try {
      const current = getDeletedIds()
      if (!current.includes(id)) {
        const next = [...current, id]
        localStorage.setItem(LS_DELETED_ITEMS, JSON.stringify(next))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const unmarkAsDeleted = (id: string) => {
    try {
      const current = getDeletedIds()
      const next = current.filter(x => x !== id)
      localStorage.setItem(LS_DELETED_ITEMS, JSON.stringify(next))
    } catch (e) {
      console.error(e)
    }
  }

  const loadDownloadedTracks = useCallback(async () => {
    const deletedIds = getDeletedIds()
    const indexedDBTracks = await getOfflineTracks()
    const validOffline = indexedDBTracks.filter(t => !deletedIds.includes(t.trackId))

    try {
      const items = await fetchDownloads('Track')
      const remoteDownloaded: Track[] = items
        .filter((item) => item.itemId && !deletedIds.includes(item.itemId))
        .map((item) => ({
          trackId: item.itemId!,
          title: item.title,
          artistName: item.subTitle || '',
          durationSeconds: item.totalDurationSeconds,
          fileSizeBytes: item.fileSizeBytes,
          contentType: 'audio/mpeg',
          audioUrl: item.audioUrl || '',
          coverImageUrl: item.coverImageUrl,
          uploadedAt: item.downloadedAt,
          playCount: 0
        }))

      const trackMap = new Map<string, Track>()
      remoteDownloaded.forEach(t => trackMap.set(t.trackId, t))
      validOffline.forEach(t => trackMap.set(t.trackId, t))

      const combined = Array.from(trackMap.values())

      setAllDownloadedSongs(combined)
      setDownloadStatus((prev) => {
        const next = { ...prev }
        combined.forEach((track) => { next[track.trackId] = 'success' })
        return next
      })
    } catch (err) {
      console.warn('Failed to fetch remote downloads, using IndexedDB offline storage:', err)
      setAllDownloadedSongs(validOffline)
      setDownloadStatus((prev) => {
        const next = { ...prev }
        validOffline.forEach((track) => { next[track.trackId] = 'success' })
        return next
      })
    }
  }, [])

  useEffect(() => {
    loadDownloadedTracks()
  }, [loadDownloadedTracks])

  useEffect(() => {
    if (fetchPopularTracks) {
      fetchPopularTracks()
    }
  }, [fetchPopularTracks])

  const recommendations = (popularTracks.length > 0 ? popularTracks : tracks).slice(0, 6)

  interface DownloadedPlaylist {
    id: string
    title: string
    tracksCount: number
    updateText: string
    color?: string
    tracks: Track[]
  }

  interface DownloadedAlbum {
    id: string
    title: string
    artist: string
    tracksCount: number
    updateText: string
    tracks: Track[]
  }

  const [mockPlaylists, setMockPlaylists] = useState<DownloadedPlaylist[]>([])
  const [mockAlbums, setMockAlbums] = useState<DownloadedAlbum[]>([])

  const loadDownloadedCollections = useCallback(async () => {
    const deletedIds = getDeletedIds()
    try {
      const [playlistItems, albumItems] = await Promise.all([
        fetchDownloads('Playlist').catch(() => []),
        fetchDownloads('Album').catch(() => [])
      ])

      const loadedPlaylists: DownloadedPlaylist[] = playlistItems
        .filter((item) => item.itemId && !deletedIds.includes(item.itemId))
        .map((item) => ({
          id: item.itemId!,
          title: item.title,
          tracksCount: item.trackCount || 0,
          updateText: item.subTitle || '',
          tracks: []
        }))

      const loadedAlbums: DownloadedAlbum[] = albumItems
        .filter((item) => (item.itemId || item.title) && !deletedIds.includes(item.itemId || item.title))
        .map((item) => ({
          id: item.itemId || item.title,
          title: item.title,
          artist: item.subTitle || '',
          tracksCount: item.trackCount || 0,
          updateText: '',
          tracks: []
        }))

      setMockPlaylists(loadedPlaylists)
      setMockAlbums(loadedAlbums)
    } catch (err) {
      console.warn('Failed to fetch remote playlists/albums downloads:', err)
      setMockPlaylists([])
      setMockAlbums([])
    }
  }, [])

  useEffect(() => {
    loadDownloadedCollections()
  }, [loadDownloadedCollections])

  const handleDeletePlaylist = async (e: React.MouseEvent, playlistId: string, title?: string) => {
    e.stopPropagation()
    markAsDeleted(playlistId)
    setMockPlaylists(prev => prev.filter(p => p.id !== playlistId))

    try {
      await removeDownload({ type: 'Playlist', itemId: playlistId, albumName: title })
    } catch (err) {
      console.error('Failed to remove playlist download from backend:', err)
    }
  }

  const handleDeleteAlbum = async (e: React.MouseEvent, albumId: string, title?: string) => {
    e.stopPropagation()
    markAsDeleted(albumId)
    setMockAlbums(prev => prev.filter(a => a.id !== albumId))

    try {
      await removeDownload({ type: 'Album', itemId: albumId, albumName: title })
    } catch (err) {
      console.error('Failed to remove album download from backend:', err)
    }
  }

  const renderCollage = (itemTracks: Track[], fallbackType: 'songs' | 'playlists' | 'albums' = 'songs') => {
    const validTracks = itemTracks.filter(t => t && (t.coverImageUrl || (t as any).coverPath || (t as any).coverUrl || (t as any).imageUrl))

    if (itemTracks.length === 0 || validTracks.length === 0) {
      return (
        <div className={`downloads-collage-single-fallback ${fallbackType}`}>
          <div className="downloads-fallback-glow" />
          {fallbackType === 'songs' && <Music size={38} className="downloads-fallback-icon" />}
          {fallbackType === 'playlists' && <Disc size={38} className="downloads-fallback-icon" />}
          {fallbackType === 'albums' && <Headphones size={38} className="downloads-fallback-icon" />}
        </div>
      )
    }

    return (
      <div className="downloads-collage-grid">
        {[0, 1, 2, 3].map(index => {
          const track = itemTracks[index]
          const coverSrc = track ? (track.coverImageUrl || (track as any).coverPath || (track as any).coverUrl || (track as any).imageUrl) : null

          return (
            <TrackCover
              key={index}
              src={coverSrc}
              className="downloads-collage-img"
              alt={track ? track.title : 'Cover'}
            />
          )
        })}
      </div>
    )
  }

  const handleRowClick = (track: Track) => {
    if (currentTrack?.trackId === track.trackId) {
      togglePlayPause()
    } else {
      selectTrack(track)
    }
  }

  const handleDownload = async (rec: Track) => {
    if (isGuest) {
      openAuthModal(t('authModal.reasons.protectedPage'))
      return
    }

    if (downloadStatus[rec.trackId] === 'success' || downloadStatus[rec.trackId] === 'loading') return

    setDownloadStatus(prev => ({ ...prev, [rec.trackId]: 'loading' }))
    unmarkAsDeleted(rec.trackId)

    try {
      await addDownload({ type: 'Track', itemId: rec.trackId }).catch(e => console.warn('addDownload warning:', e))
      const blob = await downloadTrackFile(rec.trackId, `${rec.artistName} - ${rec.title}.mp3`)
      await saveOfflineTrack(rec, blob)
      setDownloadStatus(prev => ({ ...prev, [rec.trackId]: 'success' }))
      loadDownloadedTracks()
    } catch (err) {
      console.error('Failed to download track:', err)
      setDownloadStatus(prev => {
        const next = { ...prev }
        delete next[rec.trackId]
        return next
      })
    }
  }

  const handleDeleteSong = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation()

    markAsDeleted(track.trackId)
    await removeOfflineTrack(track.trackId)
    setAllDownloadedSongs(prev => prev.filter(t => t.trackId !== track.trackId))
    setDownloadStatus(prev => {
      const next = { ...prev }
      delete next[track.trackId]
      return next
    })

    try {
      await removeDownload({ type: 'Track', itemId: track.trackId })
    } catch (err) {
      console.error('Failed to remove download:', err)
    }
  }

  return (
    <div className="downloads-page">
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />

      <div className="downloads-layout">
        <div className="downloads-wrapper">
          <div className="downloads-top-divider" />

          {activeCategory === null && (
            <div className="downloads-header-row">
              <h1 className="downloads-title">{t('downloads.title')}</h1>
              <div className="search">
                <img className="icon" alt="Search" src={searchIcon} />
              </div>
            </div>
          )}

          {activeCategory === null && (
            <div className="downloads-categories-list">
              <div
                className="downloads-category-card"
                onClick={() => setActiveCategory('songs')}
                tabIndex={0}
                aria-label={t('downloads.categories_songs')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveCategory('songs') }}
              >
                <div className="downloads-collage-frame">
                  {renderCollage(allDownloadedSongs, 'songs')}
                </div>
                <div className="downloads-category-info">
                  <h2 className="downloads-category-name">{t('downloads.categories_songs')}</h2>
                  <p className="downloads-category-update">{t('tracks_count', { count: allDownloadedSongs.length })}</p>
                </div>
              </div>

              <div
                className="downloads-category-card"
                onClick={() => setActiveCategory('playlists')}
                tabIndex={0}
                aria-label={t('downloads.categories_playlists')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveCategory('playlists') }}
              >
                <div className="downloads-collage-frame">
                  {renderCollage(mockPlaylists.flatMap(p => p.tracks || []), 'playlists')}
                </div>
                <div className="downloads-category-info">
                  <h2 className="downloads-category-name">{t('downloads.categories_playlists')}</h2>
                  <p className="downloads-category-update">{t('playlists_count', { count: mockPlaylists.length })}</p>
                </div>
              </div>

              <div
                className="downloads-category-card"
                onClick={() => setActiveCategory('albums')}
                tabIndex={0}
                aria-label={t('downloads.categories_albums')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveCategory('albums') }}
              >
                <div className="downloads-collage-frame">
                  {renderCollage(mockAlbums.flatMap(a => a.tracks || []), 'albums')}
                </div>
                <div className="downloads-category-info">
                  <h2 className="downloads-category-name">{t('downloads.categories_albums')}</h2>
                  <p className="downloads-category-update">{t('playlists_count', { count: mockAlbums.length })}</p>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'songs' && (
            <div className="downloads-detail-container">
              <button className="downloads-back-btn" onClick={() => setActiveCategory(null)}>
                <svg className="downloads-back-arrow" viewBox="0 0 24 24">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('downloads.back_btn')}
              </button>

              <div className="downloads-detail-header">
                <div className="downloads-collage-frame" style={{ width: 100, height: 100 }}>
                  {renderCollage(allDownloadedSongs, 'songs')}
                </div>
                <div className="downloads-detail-title-group">
                  <h2 className="downloads-detail-title">{t('downloads.categories_songs')}</h2>
                  <span className="downloads-detail-count">{t('tracks_count', { count: allDownloadedSongs.length })}</span>
                </div>
              </div>

              {allDownloadedSongs.length === 0 ? (
                <div className="downloads-empty-state">{t('downloads.empty_state')}</div>
              ) : (
                <div className="downloads-items-list">
                  {allDownloadedSongs.map((track, index) => {
                    const isCurrent = currentTrack?.trackId === track.trackId
                    const isPlayingTrack = isCurrent && isPlaying
                    const fileSizeMB = (track.fileSizeBytes / (1024 * 1024)).toFixed(1)

                    return (
                      <div
                        key={track.trackId}
                        className={`downloads-item-row ${isCurrent ? 'active' : ''}`}
                        onClick={() => handleRowClick(track)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(track) }}
                      >
                        <span className="downloads-row-index">{index + 1}</span>
                        <TrackCover
                          className="downloads-row-cover"
                          src={track.coverImageUrl}
                          alt={track.title}
                        />
                        <div className="downloads-row-info">
                          <span className="downloads-row-title">{track.title}</span>
                          <span className="downloads-row-artist">{track.artistName}</span>
                        </div>
                        <div className="downloads-row-meta">
                          <span className="downloads-row-size">{fileSizeMB} MB</span>
                          <span className="downloads-row-duration">{formatTime(track.durationSeconds)}</span>
                          <button
                            className="downloads-row-play-btn"
                            aria-label={isPlayingTrack ? t('player.pause') : t('player.play')}
                          >
                            {isPlayingTrack ? (
                              <svg className="downloads-row-play-icon" viewBox="0 0 24 24">
                                <rect x="4" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                              </svg>
                            ) : (
                              <svg className="downloads-row-play-icon" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>

                          <button
                            className="downloads-row-delete-btn"
                            onClick={(e) => handleDeleteSong(e, track)}
                            aria-label={t('downloads.delete')}
                            title={t('downloads.delete')}
                          >
                            <svg className="downloads-row-delete-icon" viewBox="0 0 24 24">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeCategory === 'playlists' && (
            <div className="downloads-detail-container">
              <button className="downloads-back-btn" onClick={() => setActiveCategory(null)}>
                <svg className="downloads-back-arrow" viewBox="0 0 24 24">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('downloads.back_btn')}
              </button>

              <div className="downloads-detail-header">
                <div className="downloads-collage-frame" style={{ width: 100, height: 100 }}>
                  {renderCollage(mockPlaylists.flatMap(p => p.tracks || []), 'playlists')}
                </div>
                <div className="downloads-detail-title-group">
                  <h2 className="downloads-detail-title">{t('downloads.categories_playlists')}</h2>
                  <span className="downloads-detail-count">{t('playlists_count', { count: mockPlaylists.length })}</span>
                </div>
              </div>

              {mockPlaylists.length === 0 ? (
                <div className="downloads-empty-state">{t('downloads.empty_state')}</div>
              ) : (
                <div className="downloads-items-list">
                  {mockPlaylists.map((playlist, index) => (
                    <div
                      key={playlist.id}
                      className="downloads-item-row"
                      onClick={() => {
                        if (playlist.tracks.length > 0) {
                          selectTrack(playlist.tracks[0])
                        }
                      }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (playlist.tracks.length > 0) selectTrack(playlist.tracks[0])
                        }
                      }}
                    >
                      <span className="downloads-row-index">{index + 1}</span>
                      <TrackCover
                        className="downloads-row-cover"
                        src={playlist.tracks[0]?.coverImageUrl || (playlist as any).coverPath || (playlist as any).coverUrl}
                        alt={playlist.title}
                      />
                      <div className="downloads-row-info">
                        <span className="downloads-row-title">{playlist.title}</span>
                        <span className="downloads-row-artist">{playlist.updateText}</span>
                      </div>
                      <div className="downloads-row-meta">
                        <span className="downloads-row-duration" style={{ width: 100 }}>{t('tracks_count', { count: playlist.tracksCount })}</span>
                        <button className="downloads-row-play-btn" aria-label={t('downloads.play_playlist')}>
                          <svg className="downloads-row-play-icon" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>

                        <button
                          className="downloads-row-delete-btn"
                          onClick={(e) => handleDeletePlaylist(e, playlist.id, playlist.title)}
                          aria-label={t('downloads.delete')}
                          title={t('downloads.delete')}
                        >
                          <svg className="downloads-row-delete-icon" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCategory === 'albums' && (
            <div className="downloads-detail-container">
              <button className="downloads-back-btn" onClick={() => setActiveCategory(null)}>
                <svg className="downloads-back-arrow" viewBox="0 0 24 24">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('downloads.back_btn')}
              </button>

              <div className="downloads-detail-header">
                <div className="downloads-collage-frame" style={{ width: 100, height: 100 }}>
                  {renderCollage(mockAlbums.flatMap(a => a.tracks || []), 'albums')}
                </div>
                <div className="downloads-detail-title-group">
                  <h2 className="downloads-detail-title">{t('downloads.categories_albums')}</h2>
                  <span className="downloads-detail-count">{t('playlists_count', { count: mockAlbums.length })}</span>
                </div>
              </div>

              {mockAlbums.length === 0 ? (
                <div className="downloads-empty-state">{t('downloads.empty_state')}</div>
              ) : (
                <div className="downloads-items-list">
                  {mockAlbums.map((album, index) => (
                    <div
                      key={album.id}
                      className="downloads-item-row"
                      onClick={() => {
                        if (album.tracks.length > 0) {
                          selectTrack(album.tracks[0])
                        }
                      }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (album.tracks.length > 0) selectTrack(album.tracks[0])
                        }
                      }}
                    >
                      <span className="downloads-row-index">{index + 1}</span>
                      <TrackCover
                        className="downloads-row-cover"
                        src={album.tracks[0]?.coverImageUrl || (album as any).coverPath || (album as any).coverUrl}
                        alt={album.title}
                      />
                      <div className="downloads-row-info">
                        <span className="downloads-row-title">{album.title}</span>
                        <span className="downloads-row-artist">{album.artist} • {album.updateText}</span>
                      </div>
                      <div className="downloads-row-meta">
                        <span className="downloads-row-duration" style={{ width: 100 }}>{t('tracks_count', { count: album.tracksCount })}</span>
                        <button className="downloads-row-play-btn" aria-label={t('downloads.play_album')}>
                          <svg className="downloads-row-play-icon" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>

                        <button
                          className="downloads-row-delete-btn"
                          onClick={(e) => handleDeleteAlbum(e, album.id, album.title)}
                          aria-label={t('downloads.delete')}
                          title={t('downloads.delete')}
                        >
                          <svg className="downloads-row-delete-icon" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="downloads-divider-line" />

        <aside className="downloads-right-panel">
          <h2 className="recommendations-title">{t('downloads.smart_title')}</h2>
          <p className="recommendations-desc">
            {t('downloads.smart_desc')}
          </p>

          <div className="recommendations-list">
            {recommendations.map((rec) => {
              const status = downloadStatus[rec.trackId] || 'idle'

              return (
                <div key={rec.trackId} className="recommendation-item">
                  <TrackCover
                    className="recommendation-cover"
                    src={rec.coverImageUrl || (rec as any).coverPath || (rec as any).coverUrl || (rec as any).imageUrl}
                    alt={rec.title}
                  />

                  <div className="recommendation-info">
                    <h3 className="recommendation-name">{rec.title}</h3>
                    <span className="recommendation-artist">{rec.artistName}</span>
                  </div>

                  <button
                    className="recommendation-download-btn"
                    onClick={() => handleDownload(rec)}
                    disabled={status !== 'idle'}
                    aria-label={`Download ${rec.title}`}
                    title={status === 'success' ? t('downloads.downloaded') : t('downloads.download')}
                  >
                    {status === 'idle' && (
                      <Download02 className="recommendation-download-icon" color="#A98FDB" />
                    )}
                    {status === 'loading' && (
                      <div className="recommendation-loading-spinner" />
                    )}
                    {status === 'success' && (
                      <svg className="recommendation-success-icon" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </aside>
      </div>
      <FooterFromJson />
    </div>
  )
}

export const Box = DownloadsPage
