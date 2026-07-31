import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePlayer, type Track } from '../context/player-context'
import { apiFetch, GATEWAY_URL, trackStreamUrl, resolveMediaUrl } from '../api/api-client'
import { TrackCover } from '../components/common/TrackCover'
import { FooterFromJson } from '../components/footer-from-json'
import { History } from '../components/History'
import { AddToPlaylistButton } from '../components/AddToPlaylistButton'
import { DeletePlaylistModal } from '../components/DeletePlaylistModal'
import { Pagination } from '../components/pagination'
import { fetchLikedAlbums, unlikeAlbum, type AlbumListItem } from '../api/albums'
import { albumHasCustomCover } from '../utils/cover-utils'
import { unlikePlaylist, deletePlaylist } from '../api/playlists'
import { getFollowingList, unfollowProfile, getProfileByName } from '../api/profile'
import type { PagedResult } from '../types/shared'
import IconAvatar from '../assets/IconAvatar.svg'
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

type LibrarySection = 'tracks' | 'liked' | 'playlists' | 'albums' | 'follow' | 'history'

const PAGE_SIZE = 10

interface PlaylistSummary {
  id: string
  title: string
  trackCount: number
  coverImageUrl?: string
  collageCovers: string[]
  isOwner: boolean
}

const fetchPage = async <T,>(url: string): Promise<PagedResult<T> | null> => {
  const res = await apiFetch(url)
  if (!res.ok) return null
  const data = await res.json()
  return { items: (data.items ?? []) as T[], totalCount: Number(data.totalCount ?? 0), pageNumber: Number(data.pageNumber ?? 1), pageSize: Number(data.pageSize ?? PAGE_SIZE) }
}

const withStreamUrls = (items: Track[]): Track[] =>
  items.map((t) => ({
    ...t,
    audioUrl: trackStreamUrl(t.trackId),
    coverImageUrl: t.coverImageUrl
      ? t.coverImageUrl.startsWith('http://') || t.coverImageUrl.startsWith('https://')
        ? t.coverImageUrl.replace(/^https?:\/\/localhost:\d+/, GATEWAY_URL)
        : `${GATEWAY_URL}/music/files/${t.coverImageUrl.replace(/\\/g, '/')}`
      : undefined,
  }))

export const LibraryPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentTrack, selectTrack, formatTime, isPlaying, togglePlayPause } = usePlayer()
  const [activeSection, setActiveSection] = useState<LibrarySection>('tracks')

  const [libraryTracks, setLibraryTracks] = useState<Track[]>([])
  const [libraryTotal, setLibraryTotal] = useState(0)
  const [libraryPage, setLibraryPage] = useState(1)
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)

  const loadLibraryTracks = useCallback(async (page = 1) => {
    setIsLoadingLibrary(true)
    try {
      const result = await fetchPage<Track>(`${GATEWAY_URL}/music/library?pageNumber=${page}&pageSize=${PAGE_SIZE}`)
      if (result) {
        setLibraryTracks(withStreamUrls(result.items))
        setLibraryTotal(result.totalCount)
        setLibraryPage(page)
      }
    } catch (err) {
      console.error('Failed to load library tracks:', err)
    } finally {
      setIsLoadingLibrary(false)
    }
  }, [])

  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  const [likedTotal, setLikedTotal] = useState(0)
  const [likedPage, setLikedPage] = useState(1)
  const [isLoadingLiked, setIsLoadingLiked] = useState(false)

  const loadLikedTracks = useCallback(async (page = 1) => {
    setIsLoadingLiked(true)
    try {
      const result = await fetchPage<Track>(`${GATEWAY_URL}/music/favorites?pageNumber=${page}&pageSize=${PAGE_SIZE}`)
      if (result) {
        setLikedTracks(withStreamUrls(result.items))
        setLikedTotal(result.totalCount)
        setLikedPage(page)
      }
    } catch (err) {
      console.error('Failed to load liked tracks:', err)
    } finally {
      setIsLoadingLiked(false)
    }
  }, [])

  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
  const [playlistsTotal, setPlaylistsTotal] = useState(0)
  const [playlistsPage, setPlaylistsPage] = useState(1)
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)

  const loadPlaylists = useCallback(async (page = 1) => {
    setIsLoadingPlaylists(true)
    try {
      const result = await fetchPage<PlaylistSummary>(`${GATEWAY_URL}/music/playlists?pageNumber=${page}&pageSize=${PAGE_SIZE}`)
      if (result) {
        setPlaylists(result.items)
        setPlaylistsTotal(result.totalCount)
        setPlaylistsPage(page)
      }
    } catch (err) {
      console.error('Failed to load playlists:', err)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }, [])

  const openPlaylist = (playlistId: string) => {
    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''
    navigate(`${prefix}/playlists/${playlistId}`)
  }

  const handleUnlikePlaylist = async (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId))
    setPlaylistsTotal((prev) => Math.max(0, prev - 1))
    try {
      await unlikePlaylist(playlistId)
    } catch (err) {
      console.error('Failed to remove saved playlist:', err)
      loadPlaylists()
    }
  }

  const openAlbum = (albumId: string) => {
    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''
    navigate(`${prefix}/albums/${albumId}`)
  }

  const [albums, setAlbums] = useState<AlbumListItem[]>([])
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false)
  const [albumsError, setAlbumsError] = useState('')

  const loadAlbums = useCallback(async () => {
    setIsLoadingAlbums(true)
    setAlbumsError('')
    try {
      setAlbums(await fetchLikedAlbums())
    } catch (err) {
      setAlbumsError(err instanceof Error ? err.message : t('errors.unknown'))
    } finally {
      setIsLoadingAlbums(false)
    }
  }, [t])

  const handleUnlikeAlbum = async (albumId: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== albumId))
    try {
      await unlikeAlbum(albumId)
    } catch (err) {
      console.error('Failed to remove saved album:', err)
      loadAlbums()
    }
  }

  const [followedProfiles, setFollowedProfiles] = useState<any[]>([])
  const [isLoadingFollows, setIsLoadingFollows] = useState(false)
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; title: string } | null>(null)

  const loadFollowedProfiles = useCallback(async () => {
    setIsLoadingFollows(true)
    try {
      const list = await getFollowingList()
      setFollowedProfiles(list)
    } catch (err) {
      console.error('Failed to load followed profiles:', err)
    } finally {
      setIsLoadingFollows(false)
    }
  }, [])

  const handleUnfollowFromList = async (userId: string) => {
    setFollowedProfiles((prev) => prev.filter((p) => p.userId !== userId))
    try {
      await unfollowProfile(userId)
    } catch (err) {
      console.error('Failed to unfollow profile:', err)
      loadFollowedProfiles()
    }
  }

  const handleArtistClick = async (artistName: string) => {
    try {
      const res = await getProfileByName(artistName)
      if (res && res.userId) {
        const savedLang = localStorage.getItem('lang') || 'uk'
        const prefix = savedLang === 'en' ? '/en' : ''
        navigate(`${prefix}/profile?userId=${res.userId}`)
      }
    } catch (err) {
      console.warn('Artist profile not found or error occurred:', err)
    }
  }

  useEffect(() => {
    if (activeSection === 'tracks' && libraryTracks.length === 0) loadLibraryTracks()
    if (activeSection === 'liked' && likedTracks.length === 0) loadLikedTracks()
    if (activeSection === 'playlists' && playlists.length === 0) loadPlaylists()
    if (activeSection === 'albums' && albums.length === 0) loadAlbums()
    if (activeSection === 'follow' && followedProfiles.length === 0) loadFollowedProfiles()
  }, [activeSection, loadLibraryTracks, loadLikedTracks, loadPlaylists, loadAlbums, loadFollowedProfiles, libraryTracks.length, likedTracks.length, playlists.length, albums.length, followedProfiles.length])

  const TABS: { key: LibrarySection; label: string }[] = [
    { key: 'tracks', label: t('library.tab_tracks') },
    { key: 'liked', label: t('library.tab_liked') },
    { key: 'playlists', label: t('library.tab_playlists') },
    { key: 'albums', label: t('library.tab_albums') },
    { key: 'follow', label: t('library.tab_follow') },
    { key: 'history', label: t('library.tab_history') },
  ]

  return (
    <div className="LibraryTabContent">
      <span className="SectionTitle">{t('library.title')}</span>

      <div className="LibraryTabsBar" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeSection === tab.key}
            className={`LibraryTabPill ${activeSection === tab.key ? 'active' : ''}`}
            onClick={() => setActiveSection(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'tracks' && (
        <div className="LibraryTrackList">
          <div className="LibraryTableHeader">
            <span className="ColHash">#</span>
            <span className="ColTitle">{t('library.song_title')}</span>
            <span className="ColGenre">{t('library.actions')}</span>
            <span className="ColDuration">{t('library.duration')}</span>
          </div>
          <div className="LibraryTableBody">
            {isLoadingLibrary ? (
              <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('library.loading')}</div>
            ) : libraryTracks.length === 0 ? (
              <div className="EmptyStateText">{t('liked.empty')}</div>
            ) : (
              libraryTracks.map((track, index) => {
                const isCurrent = currentTrack?.trackId === track.trackId
                const isCurrentlyPlaying = isCurrent && isPlaying

                return (
                  <div
                    key={track.trackId}
                    className={`LibraryRow ${isCurrent ? 'active-row' : ''} ${isCurrentlyPlaying ? 'playing-row' : ''}`}
                    onClick={() => selectTrack(track)}
                    tabIndex={0}
                    role="button"
                    aria-label={t('library.play_track', { title: track.title, artist: track.artistName })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectTrack(track) }}
                  >
                    <span className="ColHash" onClick={(e) => e.stopPropagation()}>
                      <span className="row-number">{index + 1}</span>
                      <span
                        className="row-play-icon"
                        onClick={() => {
                          if (isCurrent) {
                            togglePlayPause()
                          } else {
                            selectTrack(track)
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
                    <span className="ColGenre">
                      <AddToPlaylistButton trackId={track.trackId} className="ActionBtn" />
                    </span>
                    <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                  </div>
                )
              })
            )}
          </div>
          {libraryTotal > PAGE_SIZE && (
            <Pagination
              currentPage={libraryPage}
              totalPages={Math.ceil(libraryTotal / PAGE_SIZE)}
              onPageChange={(page) => loadLibraryTracks(page)}
              isLoading={isLoadingLibrary}
            />
          )}
        </div>
      )}

      {activeSection === 'liked' && (
        <div className="LibraryTrackList">
          <div className="LibraryTableHeader">
            <span className="ColHash">#</span>
            <span className="ColTitle">{t('library.song_title')}</span>
            <span className="ColGenre">{t('library.actions')}</span>
            <span className="ColDuration">{t('library.duration')}</span>
          </div>
          <div className="LibraryTableBody">
            {isLoadingLiked ? (
              <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('library.loading')}</div>
            ) : likedTracks.length === 0 ? (
              <div className="EmptyStateText">{t('liked.empty')}</div>
            ) : (
              likedTracks.map((track, index) => {
                const isCurrent = currentTrack?.trackId === track.trackId
                const isCurrentlyPlaying = isCurrent && isPlaying

                return (
                  <div
                    key={track.trackId}
                    className={`LibraryRow ${isCurrent ? 'active-row' : ''} ${isCurrentlyPlaying ? 'playing-row' : ''}`}
                    onClick={() => selectTrack(track)}
                    tabIndex={0}
                    role="button"
                    aria-label={t('library.play_track', { title: track.title, artist: track.artistName })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectTrack(track) }}
                  >
                    <span className="ColHash" onClick={(e) => e.stopPropagation()}>
                      <span className="row-number">{index + 1}</span>
                      <span
                        className="row-play-icon"
                        onClick={() => {
                          if (isCurrent) {
                            togglePlayPause()
                          } else {
                            selectTrack(track)
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
                    <span className="ColGenre">
                      <AddToPlaylistButton trackId={track.trackId} className="ActionBtn" />
                    </span>
                    <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                  </div>
                )
              })
            )}
          </div>
          {likedTotal > PAGE_SIZE && (
            <Pagination
              currentPage={likedPage}
              totalPages={Math.ceil(likedTotal / PAGE_SIZE)}
              onPageChange={(page) => loadLikedTracks(page)}
              isLoading={isLoadingLiked}
            />
          )}
        </div>
      )}

      {activeSection === 'playlists' && (
        <div className="MusicCardCont">
          {isLoadingPlaylists ? (
            <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('library.loading')}</div>
          ) : playlists.length === 0 ? (
            <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('library.no_playlists')}</div>
          ) : (
            playlists.map((playlist) => {
              const coverItems: (string | null)[] = [...playlist.collageCovers]
              while (coverItems.length < 4) coverItems.push(null)
              const hasAnyCover = coverItems.some((url) => url !== null)
              return (
                <div
                  key={playlist.id}
                  className="MusicCard"
                  style={{ position: 'relative' }}
                  onClick={() => openPlaylist(playlist.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPlaylist(playlist.id) }}
                >
                  {playlist.isOwner && (
                    <button
                      type="button"
                      className="card-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPlaylistToDelete({ id: playlist.id, title: playlist.title || (playlist as any).name || '' })
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
                  <div className="ContMusicCardText">
                    <span className="HeadText">{playlist.title}</span>
                    <span className="StyleTrack">{t('library.album_track_count', { count: playlist.trackCount })}</span>
                    {!playlist.isOwner && (
                      <span className="StyleTrack PlaylistBadgeSaved">{t('library.saved_playlist_badge')}</span>
                    )}
                  </div>
                  {!playlist.isOwner && (
                    <button
                      type="button"
                      className="ActionBtn"
                      onClick={(e) => { e.stopPropagation(); handleUnlikePlaylist(playlist.id) }}
                      aria-label={t('library.remove_saved_playlist')}
                    >
                      {t('library.remove_saved_playlist')}
                    </button>
                  )}
                </div>
              )
            })
          )}
          {playlistsTotal > PAGE_SIZE && (
            <Pagination
              currentPage={playlistsPage}
              totalPages={Math.ceil(playlistsTotal / PAGE_SIZE)}
              onPageChange={(page) => loadPlaylists(page)}
              isLoading={isLoadingPlaylists}
            />
          )}
        </div>
      )}

      {activeSection === 'albums' && (
        <div className="MusicCardCont">
          {isLoadingAlbums ? (
            <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('library.loading')}</div>
          ) : albumsError ? (
            <div className="auth-error" role="alert">{albumsError}</div>
          ) : albums.length === 0 ? (
            <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('library.no_saved_albums')}</div>
          ) : (
            albums.map((album) => {
              const coverItems: (string | null)[] = [...album.collageCovers]
              while (coverItems.length < 4) coverItems.push(null)
              const hasAnyCover = coverItems.some((url) => url !== null)
              return (
                <div
                  key={album.id}
                  className="MusicCard"
                  style={{ position: 'relative' }}
                  onClick={() => openAlbum(album.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openAlbum(album.id) }}
                >
                  {albumHasCustomCover(album.coverImageUrl) ? (
                    <div className="PlaylistCollage">
                      <TrackCover
                        src={album.coverImageUrl}
                        alt={album.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
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
                  )}
                  <div className="ContMusicCardText">
                    <span className="HeadText">{album.title}</span>
                    <span className="AuthorText">{album.artistName}</span>
                    <span className="StyleTrack">{t('library.album_track_count', { count: album.trackCount })}</span>
                  </div>
                  <button
                    type="button"
                    className="ActionBtn"
                    onClick={(e) => { e.stopPropagation(); handleUnlikeAlbum(album.id) }}
                    aria-label={t('library.remove_saved_album')}
                  >
                    {t('library.remove_saved_album')}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeSection === 'follow' && (
        <div className="MusicCardCont">
          {isLoadingFollows ? (
            <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('library.loading')}</div>
          ) : followedProfiles.length === 0 ? (
            <div className="EmptyStateText">{t('library.no_follows', 'Ви ще не підписалися на жодного користувача')}</div>
          ) : (
            followedProfiles.map((profile) => (
              <div
                key={profile.userId}
                className="MusicCard"
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => {
                  const savedLang = localStorage.getItem('lang') || 'uk'
                  const prefix = savedLang === 'en' ? '/en' : ''
                  navigate(`${prefix}/profile?userId=${profile.userId}`)
                }}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    const savedLang = localStorage.getItem('lang') || 'uk'
                    const prefix = savedLang === 'en' ? '/en' : ''
                    navigate(`${prefix}/profile?userId=${profile.userId}`)
                  }
                }}
              >
                <div className="PlaylistCollage" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: '50%', aspectRatio: '1/1' }}>
                  <img
                    src={resolveMediaUrl(profile.avatarUrl) || IconAvatar}
                    alt={profile.displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = IconAvatar }}
                  />
                </div>
                <div className="ContMusicCardText">
                  <span className="HeadText">{profile.displayName || t('common.user_fallback')}</span>
                  <span className="StyleTrack" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.bio || t('profile.stats.following', 'Підписки')}
                  </span>
                </div>
                <button
                  type="button"
                  className="ActionBtn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUnfollowFromList(profile.userId)
                  }}
                  aria-label={t('profile.unsubscribe', 'Відписатися')}
                >
                  {t('profile.unsubscribe', 'Відписатися')}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === 'history' && <History />}

      <DeletePlaylistModal
        isOpen={Boolean(playlistToDelete)}
        playlistTitle={playlistToDelete?.title ?? ''}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={async () => {
          if (!playlistToDelete) return
          try {
            await deletePlaylist(playlistToDelete.id)
            loadPlaylists(playlistsPage)
          } catch (err) {
            console.error('Failed to delete playlist:', err)
          } finally {
            setPlaylistToDelete(null)
          }
        }}
      />

      <FooterFromJson />
    </div>
  )
}
