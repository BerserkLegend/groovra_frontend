import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlayer, type Track } from '../context/player-context'
import { apiFetch, GATEWAY_URL, getCurrentUserId } from '../api/api-client'
import { likePlaylist, unlikePlaylist, getDeletedPlaylists, restorePlaylist, permanentlyDeletePlaylist, reorderPlaylistTracks, deletePlaylist, type PlaylistListItem } from '../api/playlists'
import { getProfileByName } from '../api/profile'
import { TrackCover } from '../components/common/TrackCover'
import { FooterFromJson } from '../components/footer-from-json'
import { CreatePlaylistModal } from '../components/CreatePlaylistModal'
import { DeletePlaylistModal } from '../components/DeletePlaylistModal'
import Loader from '../components/Loader'
import type { PlaylistTrackDto, PlaylistDetail } from '../types/playlist'
import { getPlaylistTrackCover } from '../types/playlist'
import '../app.css'

const BackArrowIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const GlobeIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const LockIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const ChevronUpIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
)

const ChevronDownIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const TrashIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

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

const PAGE_SIZE = 10

const getPrefixedPath = (path: string): string => {
  const savedLang = localStorage.getItem('lang') || 'uk'
  const prefix = savedLang === 'en' ? '/en' : ''
  return `${prefix}${path}`
}

export function PlaylistsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const {
    currentTrack,
    selectTrack,
    setTracks,
    formatTime,
    isPlaying,
    togglePlayPause,
  } = usePlayer()

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

  const [playlists, setPlaylists] = useState<PlaylistListItem[]>([])
  const [playlistsTotal, setPlaylistsTotal] = useState(0)
  const [playlistsPage, setPlaylistsPage] = useState(1)
  const [activePlaylistDetail, setActivePlaylistDetail] = useState<PlaylistDetail | null>(null)
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)
  const [isLoadingMorePlaylists, setIsLoadingMorePlaylists] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null)
  const [isViewingTrash, setIsViewingTrash] = useState(false)
  const [deletedPlaylists, setDeletedPlaylists] = useState<PlaylistListItem[]>([])
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false)
  const [isReorderingTracks, setIsReorderingTracks] = useState(false)
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; title: string } | null>(null)

  const currentUserId = getCurrentUserId()
  const activeIsOwner = !activePlaylistDetail || !currentUserId
    ? true
    : activePlaylistDetail.userId.toLowerCase() === currentUserId.toLowerCase()

  const showToast = (message: string) => {
    setToast({ message, visible: true })
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null)
      setTimeout(() => setToast(null), 400)
    }, 2500)
  }

  const fetchPlaylists = async () => {
    if (playlists.length === 0) {
      setIsLoadingPlaylists(true)
    }
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists?pageNumber=1&pageSize=${PAGE_SIZE}&includeFavorites=false`)
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.items ?? [])
        setPlaylistsTotal(Number(data.totalCount ?? 0))
        setPlaylistsPage(1)
      }
    } catch (error) {
      console.error('Помилка завантаження плейлистів:', error)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }

  const fetchMorePlaylists = async () => {
    setIsLoadingMorePlaylists(true)
    try {
      const nextPage = playlistsPage + 1
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists?pageNumber=${nextPage}&pageSize=${PAGE_SIZE}&includeFavorites=false`)
      if (response.ok) {
        const data = await response.json()
        setPlaylists(prev => [...prev, ...(data.items ?? [])])
        setPlaylistsPage(nextPage)
      }
    } catch (error) {
      console.error('Помилка завантаження плейлистів:', error)
    } finally {
      setIsLoadingMorePlaylists(false)
    }
  }

  const fetchPlaylistById = async (playlistId: string) => {
    setIsLoadingDetail(true)
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}`)
      if (response.ok) {
        const data = await response.json()
        setActivePlaylistDetail(data)
      } else {
        navigate(getPrefixedPath('/playlists'), { replace: true })
      }
    } catch (error) {
      console.error('Помилка завантаження деталей плейлиста:', error)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const openPlaylist = (playlistId: string) => {
    navigate(getPrefixedPath(`/playlists/${playlistId}`))
  }

  const goBackToList = () => {
    navigate(getPrefixedPath('/playlists'))
  }

  const handleCreatePlaylist = async (data: { title: string; description: string; isPrivate: boolean }) => {
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          isPrivate: data.isPrivate
        })
      })
      if (response.ok) {
        setIsCreatingPlaylist(false)
        fetchPlaylists()
        showToast(t('playlistsExt.created'))
      }
    } catch (error) {
      console.error('Помилка створення плейлиста:', error)
    }
  }

  const promptDeletePlaylist = (playlistId: string, playlistTitle: string) => {
    setPlaylistToDelete({ id: playlistId, title: playlistTitle })
  }

  const handleConfirmDeletePlaylist = async () => {
    if (!playlistToDelete) return
    try {
      await deletePlaylist(playlistToDelete.id)
      fetchPlaylists()
      showToast(t('playlistsExt.deleted'))
      goBackToList()
    } catch (error) {
      console.error('Помилка видалення плейлиста:', error)
      showToast(t('playlistsExt.delete_failed'))
    } finally {
      setPlaylistToDelete(null)
    }
  }

  const fetchDeletedPlaylists = async () => {
    setIsLoadingDeleted(true)
    try {
      const items = await getDeletedPlaylists()
      setDeletedPlaylists(items)
    } catch (error) {
      console.error('Помилка завантаження видалених плейлистів:', error)
    } finally {
      setIsLoadingDeleted(false)
    }
  }

  const handleToggleTrash = () => {
    const next = !isViewingTrash
    setIsViewingTrash(next)
    if (next && deletedPlaylists.length === 0) {
      fetchDeletedPlaylists()
    }
  }

  const handleRestorePlaylist = async (playlistId: string) => {
    try {
      await restorePlaylist(playlistId)
      setDeletedPlaylists(prev => prev.filter(p => p.id !== playlistId))
      showToast(t('playlistsExt.restored'))
      fetchPlaylists()
    } catch (error) {
      console.error('Помилка відновлення плейлиста:', error)
      showToast(t('playlistsExt.restore_failed'))
    }
  }

  const handlePermanentlyDeletePlaylist = async (playlistId: string) => {
    if (!window.confirm(t('playlistsExt.delete_forever_confirm'))) return
    try {
      await permanentlyDeletePlaylist(playlistId)
      setDeletedPlaylists(prev => prev.filter(p => p.id !== playlistId))
      showToast(t('playlistsExt.permanently_deleted'))
    } catch (error) {
      console.error('Помилка остаточного видалення плейлиста:', error)
      showToast(t('playlistsExt.permanently_delete_failed'))
    }
  }

  const handleMoveTrack = async (index: number, direction: 'up' | 'down') => {
    if (!activePlaylistDetail || isReorderingTracks) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= activePlaylistDetail.tracks.length) return

    const reordered = [...activePlaylistDetail.tracks]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    const previousDetail = activePlaylistDetail
    setActivePlaylistDetail({ ...activePlaylistDetail, tracks: reordered })
    setIsReorderingTracks(true)
    try {
      await reorderPlaylistTracks(activePlaylistDetail.id, reordered.map(t => t.trackId))
    } catch (error) {
      console.error('Помилка зміни порядку треків:', error)
      setActivePlaylistDetail(previousDetail)
      showToast(t('playlistsExt.reorder_failed'))
    } finally {
      setIsReorderingTracks(false)
    }
  }

  const handleTogglePrivacy = async (playlistId: string, currentPrivacy: boolean) => {
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate: !currentPrivacy })
      })
      if (response.ok) {
        fetchPlaylistById(playlistId)
        const toastMsg = !currentPrivacy ? t('playlistsExt.made_private') : t('playlistsExt.made_public')
        showToast(toastMsg)
      }
    } catch (error) {
      console.error('Помилка зміни приватності:', error)
    }
  }

  const handleToggleLikePlaylist = async (playlistId: string, isLiked: boolean) => {
    setActivePlaylistDetail(prev => (prev ? { ...prev, isLiked: !isLiked } : prev))
    try {
      if (isLiked) {
        await unlikePlaylist(playlistId)
      } else {
        await likePlaylist(playlistId)
      }
    } catch (error) {
      console.error('Помилка зміни збереження плейлиста:', error)
      setActivePlaylistDetail(prev => (prev ? { ...prev, isLiked } : prev))
    }
  }

  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const confirmMsg = t('playlistsExt.remove_track_confirm')
    if (!window.confirm(confirmMsg)) return
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchPlaylistById(playlistId)
        showToast(t('playlistsExt.track_removed'))
      }
    } catch (error) {
      console.error('Помилка видалення треку з плейлиста:', error)
    }
  }

  const handlePlayPlaylistTrack = (_trackDto: PlaylistTrackDto, index: number) => {
    if (!activePlaylistDetail) return
    const mappedTracks: Track[] = activePlaylistDetail.tracks.map(t => ({
      trackId: t.trackId,
      title: t.title,
      artistName: t.artistName,
      durationSeconds: t.durationSeconds,
      audioUrl: `${GATEWAY_URL}/music/tracks/${t.trackId}/stream`,
      coverImageUrl: getPlaylistTrackCover(t),
      fileSizeBytes: 0,
      contentType: 'audio/mpeg',
      uploadedAt: activePlaylistDetail.createdAt || new Date().toISOString(),
      playCount: 0
    }))
    setTracks(mappedTracks)
    selectTrack(mappedTracks[index])
  }

  useEffect(() => {
    fetchPlaylists()
  }, [])

  useEffect(() => {
    if (id) {
      fetchPlaylistById(id)
    } else {
      setActivePlaylistDetail(null)
    }
  }, [id])

  const showDetail = Boolean(id)

  return (
    <div className="PlaylistTabContent">
      {!showDetail ? (
        <>
          <div className="SearchHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
            <span className="SectionTitle" style={{ marginBottom: 0 }}>{t('main.playlists_title')}</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="ActionBtn"
                onClick={handleToggleTrash}
              >
                {isViewingTrash
                  ? t('playlistsExt.back_to_playlists')
                  : `🗑 ${t('playlistsExt.trash_title')}`}
              </button>
              {!isViewingTrash && (
                <button
                  className="CreateBtn"
                  onClick={() => setIsCreatingPlaylist(true)}
                >
                  {t('playlists.create_btn')}
                </button>
              )}
            </div>
          </div>

          <CreatePlaylistModal
            isOpen={isCreatingPlaylist}
            onClose={() => setIsCreatingPlaylist(false)}
            onCreate={handleCreatePlaylist}
          />

          {isViewingTrash ? (
            isLoadingDeleted ? (
              <Loader variant="section" text={t('playlistsExt.loading_trash')} />
            ) : deletedPlaylists.length === 0 ? (
              <div className="EmptyStateText">
                {t('playlistsExt.trash_empty')}
              </div>
            ) : (
              <div className="PlaylistGrid">
                {deletedPlaylists.map((playlist) => {
                  const coverItems: (string | null)[] = [...playlist.collageCovers]
                  while (coverItems.length < 4) coverItems.push(null)
                  const hasAnyCover = coverItems.some((url) => url !== null)

                  return (
                    <div
                      key={playlist.id}
                      className="PlaylistCard"
                      style={{ background: 'transparent', border: 'none' }}
                    >
                      <div className="PlaylistCollage">
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

                      <div className="PlaylistCardContent" style={{ marginTop: '12px' }}>
                        <span className="PlaylistCardTitle">{playlist.title}</span>
                        <span className="PlaylistCardCount">
                          {t('tracks_count', { count: playlist.trackCount })}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button
                            className="ActionBtn"
                            onClick={() => handleRestorePlaylist(playlist.id)}
                          >
                            ↺ {t('playlistsExt.restore')}
                          </button>
                          <button
                            className="ActionBtn"
                            style={{ color: '#FF6B6B', borderColor: '#FF6B6B' }}
                            onClick={() => handlePermanentlyDeletePlaylist(playlist.id)}
                          >
                            ✕ {t('playlistsExt.delete_forever')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : isLoadingPlaylists ? (
            <Loader variant="section" text={t('playlists.loading')} />
          ) : playlists.length === 0 ? (
            <div className="EmptyStateText">
              {t('playlists.empty')}
            </div>
          ) : (
            <div className="PlaylistGrid">
              {playlists.map((playlist) => {
                const coverItems: (string | null)[] = [...playlist.collageCovers]
                while (coverItems.length < 4) coverItems.push(null)
                const hasAnyCover = coverItems.some((url) => url !== null)

                return (
                  <div
                    key={playlist.id}
                    className="PlaylistCard"
                    style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}
                    onClick={() => openPlaylist(playlist.id)}
                  >
                    {playlist.isOwner && (
                      <button
                        type="button"
                        className="card-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          promptDeletePlaylist(playlist.id, playlist.title || (playlist as any).name || '')
                        }}
                        title={t('common.delete')}
                      >
                        🗑
                      </button>
                    )}
                    <div className="PlaylistCollage">
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

                    <div className="PlaylistCardContent" style={{ marginTop: '12px' }}>
                      <span className="PlaylistCardTitle">{playlist.title}</span>
                      <span className="PlaylistCardDesc">
                        {playlist.description || (playlist.isPrivate
                          ? t('playlists.private')
                          : t('playlists.public'))}
                      </span>
                      <span className="PlaylistCardCount">
                        {t('tracks_count', { count: playlist.trackCount })}
                      </span>
                      {!playlist.isOwner && (
                        <span className="PlaylistCardCount PlaylistBadgeSaved">
                          {t('albumPageExt.saved')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!isViewingTrash && playlists.length < playlistsTotal && (
            <div className="LoadMoreRow">
              <button
                type="button"
                className="LoadMoreBtn"
                onClick={fetchMorePlaylists}
                disabled={isLoadingMorePlaylists}
              >
                {isLoadingMorePlaylists
                  ? <Loader variant="inline" text={t('common.loading')} />
                  : t('common.load_more')}
              </button>
            </div>
          )}
        </>
      ) : isLoadingDetail || !activePlaylistDetail ? (
        <Loader variant="section" text={t('playlists.loading')} />
      ) : (
        <>
          {(() => {
            const detailCoverItems: (string | null)[] = activePlaylistDetail.tracks
              .slice(0, 4)
              .map((t) => getPlaylistTrackCover(t) || null)
            while (detailCoverItems.length < 4) detailCoverItems.push(null)
            const detailHasAnyCover = detailCoverItems.some((url) => url !== null)

            return (
              <div className="DetailHeader">
                <div className="DetailHeaderLeft">
                  <button
                    className="DetailBackBtn"
                    onClick={goBackToList}
                    aria-label={t('common.back')}
                  >
                    <BackArrowIcon />
                  </button>

                  <div className="DetailCollageWrapper">
                    {detailCoverItems.map((url, idx) => (
                      <div key={idx} className="DetailCollageItem">
                        {url ? (
                          <TrackCover
                            src={url}
                            alt="cover"
                          />
                        ) : (
                          <div className="DetailCollagePlaceholder" />
                        )}
                      </div>
                    ))}
                    {!detailHasAnyCover && (
                      <div className="DetailCollageEmptyIcon">
                        <span className="PlaylistEmptyNote" style={{ fontSize: '24px' }}>♪</span>
                      </div>
                    )}
                  </div>

                  <div className="DetailInfoBlock">
                    <div className="DetailTitleContainer">
                      <span className="DetailTitleText">{activePlaylistDetail.title}</span>
                      {activePlaylistDetail.isPrivate ? (
                        <span className="DetailPrivacyBadge private">
                          <LockIcon /> {t('playlists.private')}
                        </span>
                      ) : (
                        <span className="DetailPrivacyBadge public">
                          <GlobeIcon /> {t('playlists.public')}
                        </span>
                      )}
                    </div>
                    <span className="DetailMetaText">
                      {t('tracks_count', { count: activePlaylistDetail.trackCount })} • {formatTime(activePlaylistDetail.totalDurationSeconds)}
                    </span>
                  </div>
                </div>

                <div className="DetailHeaderRight">
                  {activeIsOwner ? (
                    <>
                      <button
                        className="DetailActionBtn"
                        onClick={() => handleTogglePrivacy(activePlaylistDetail.id, activePlaylistDetail.isPrivate)}
                      >
                        {activePlaylistDetail.isPrivate
                          ? t('playlists.make_public')
                          : t('playlists.make_private')}
                      </button>
                      <button
                        className="DetailDeleteBtn"
                        onClick={() => promptDeletePlaylist(activePlaylistDetail.id, (activePlaylistDetail as any).name || activePlaylistDetail.title || '')}
                      >
                        🗑 {t('common.delete')}
                      </button>
                    </>
                  ) : (
                    <button
                      className="DetailActionBtn"
                      onClick={() => handleToggleLikePlaylist(activePlaylistDetail.id, !!activePlaylistDetail.isLiked)}
                    >
                      {activePlaylistDetail.isLiked
                        ? `♥ ${t('albumPageExt.saved')}`
                        : `♡ ${t('albumPageExt.save')}`}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {activePlaylistDetail.tracks.length === 0 ? (
            <div className="EmptyStateText">
              {t('playlists.detail_empty')}
            </div>
          ) : (
            <div className="LibraryTrackList">
              <div className="LibraryTableHeader">
                <span className="ColHash">#</span>
                <span className="ColTitle">{t('library.song_title')}</span>
                <span className="ColGenre">{activeIsOwner ? t('library.actions') : ''}</span>
                <span className="ColDuration">{t('library.duration')}</span>
              </div>
              <div className="LibraryTableBody">
                {activePlaylistDetail.tracks.map((track, index) => {
                  const isCurrent = currentTrack?.trackId === track.trackId
                  const isCurrentlyPlaying = isCurrent && isPlaying

                  return (
                    <div
                      key={track.trackId}
                      className={`LibraryRow ${isCurrent ? 'active-row' : ''} ${isCurrentlyPlaying ? 'playing-row' : ''}`}
                      onClick={() => handlePlayPlaylistTrack(track, index)}
                    >
                      <span className="ColHash" onClick={(e) => e.stopPropagation()}>
                        <span className="row-number">{index + 1}</span>
                        <span
                          className="row-play-icon"
                          onClick={() => {
                            if (isCurrent) {
                              togglePlayPause()
                            } else {
                              handlePlayPlaylistTrack(track, index)
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
                          src={getPlaylistTrackCover(track)}
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
                      <span className="ColGenre" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {activeIsOwner && (
                          <>
                            <button
                              className="track-action-btn"
                              disabled={index === 0 || isReorderingTracks}
                              onClick={(e) => { e.stopPropagation(); handleMoveTrack(index, 'up') }}
                              title={t('playlistsExt.move_up') || 'Вгору'}
                              aria-label={t('playlistsExt.move_up') || 'Вгору'}
                            >
                              <ChevronUpIcon />
                            </button>
                            <button
                              className="track-action-btn"
                              disabled={index === activePlaylistDetail.tracks.length - 1 || isReorderingTracks}
                              onClick={(e) => { e.stopPropagation(); handleMoveTrack(index, 'down') }}
                              title={t('playlistsExt.move_down') || 'Вниз'}
                              aria-label={t('playlistsExt.move_down') || 'Вниз'}
                            >
                              <ChevronDownIcon />
                            </button>
                            <button
                              className="track-action-btn delete-btn"
                              onClick={(e) => { e.stopPropagation(); handleRemoveTrackFromPlaylist(activePlaylistDetail.id, track.trackId) }}
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                      </span>
                      <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className={`ToastNotification ${toast.visible ? 'toast-show' : 'toast-hide'}`}>
          {toast.message}
        </div>
      )}

      <DeletePlaylistModal
        isOpen={Boolean(playlistToDelete)}
        playlistTitle={playlistToDelete?.title ?? ''}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={handleConfirmDeletePlaylist}
      />

      <FooterFromJson />
    </div>
  )
}
