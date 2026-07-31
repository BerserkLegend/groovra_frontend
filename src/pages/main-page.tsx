import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlayer, type Track } from '../context/player-context'
import { logoutUser } from '../api/auth'
import { apiFetch, GATEWAY_URL } from '../api/api-client'
import { useAuthModal } from '../context/auth-modal-context'
import { useDebounce } from '../hooks/use-debounce'
import { AiMixesPanel } from '../components/ai-mixes-panel'
import { MoodRecommendationsPanel } from '../components/mood-recommendations-panel'
import { FooterFromJson } from '../components/footer-from-json'
import { CreatePlaylistModal } from '../components/CreatePlaylistModal'
import { DeletePlaylistModal } from '../components/DeletePlaylistModal'
import BackLogo from '../assets/Frame 4.svg'
import AI from '../assets/IconAI.svg'
import Arrow from '../assets/IconArrow.svg'
import { TrackCover } from '../components/common/TrackCover'
import { searchArtists, type ArtistListItem } from '../api/artists'
import { fetchAlbums, type AlbumListItem } from '../api/albums'
import { fetchGenres } from '../api/tracks'
import { searchPlaylists, type PlaylistListItem } from '../api/playlists'
import '../app.css'
import { Pagination } from '../components/pagination'
import { AddToPlaylistButton } from '../components/AddToPlaylistButton'
import Loader from '../components/Loader'
import type { PlaylistTrackDto, PlaylistDetail } from '../types/playlist'
import { getPlaylistTrackCover } from '../types/playlist'
import type { HistoryTrackItem, FavoriteTrackItem } from '../api/profile'

export const Main: React.FC = () => {
  const { t, i18n } = useTranslation()
  const getGreetingKey = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'greetings.morning'
    if (hour >= 12 && hour < 17) return 'greetings.afternoon'
    if (hour >= 17 && hour < 22) return 'greetings.evening'
    return 'greetings.night'
  }
  const location = useLocation()
  const {
    tracks,
    currentTrack,
    isLoadingTracks,
    searchQuery,
    activeTab,
    setActiveTab,
    selectTrack,
    handleSearchChange,
    formatTime,
    setTracks,
    currentPage,
    hasMoreTracks,
    totalTracksPages,
    fetchTracks,
    popularTracks,
    isLoadingPopular,
    fetchPopularTracks,
  } = usePlayer()

  const { isGuest } = useAuthModal()
  const [profileName, setProfileName] = useState(() => localStorage.getItem('profileName') || 'Profile')
  const [showAllTracks, setShowAllTracks] = useState(false)

  const [playlists, setPlaylists] = useState<PlaylistListItem[]>([])
  const [activePlaylistDetail, setActivePlaylistDetail] = useState<PlaylistDetail | null>(null)
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; title: string } | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null)

  const [historyItems, setHistoryItems] = useState<Track[]>([])
  const [, setHistoryTotalCount] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const HISTORY_PAGE_SIZE = 10

  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  const [isLoadingLiked, setIsLoadingLiked] = useState(false)

  const navigate = useNavigate()
  type SearchType = 'tracks' | 'albums' | 'playlists' | 'artists'
  const [searchType, setSearchType] = useState<SearchType>('tracks')
  const [genreFilter, setGenreFilter] = useState('')
  const [genreOptions, setGenreOptions] = useState<string[]>([])

  useEffect(() => {
    fetchGenres()
      .then(setGenreOptions)
      .catch((err) => console.error('Failed to load genres:', err))
  }, [])

  const [searchAlbums, setSearchAlbums] = useState<AlbumListItem[]>([])
  const [isLoadingSearchAlbums, setIsLoadingSearchAlbums] = useState(false)
  const [searchAlbumsPage, setSearchAlbumsPage] = useState(1)
  const [searchAlbumsTotal, setSearchAlbumsTotal] = useState(0)

  const [searchPlaylistsList, setSearchPlaylistsList] = useState<PlaylistListItem[]>([])
  const [isLoadingSearchPlaylists, setIsLoadingSearchPlaylists] = useState(false)
  const [searchPlaylistsPage, setSearchPlaylistsPage] = useState(1)
  const [searchPlaylistsTotal, setSearchPlaylistsTotal] = useState(0)

  const [searchArtistsList, setSearchArtistsList] = useState<ArtistListItem[]>([])
  const [isLoadingSearchArtists, setIsLoadingSearchArtists] = useState(false)
  const [searchArtistsPage, setSearchArtistsPage] = useState(1)
  const [searchArtistsTotal, setSearchArtistsTotal] = useState(0)

  const getPrefixedPath = (path: string): string => {
    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''
    return `${prefix}${path}`
  }

  const debouncedQuery = useDebounce(searchQuery, 300)

  const loadSearchAlbums = useCallback(async (page: number) => {
    setIsLoadingSearchAlbums(true)
    try {
      const result = await fetchAlbums({ search: debouncedQuery, genre: genreFilter, pageNumber: page, pageSize: 10 })
      setSearchAlbums(result.items)
      setSearchAlbumsTotal(result.totalCount)
      setSearchAlbumsPage(page)
    } catch (err) {
      console.error('Failed to search albums:', err)
    } finally {
      setIsLoadingSearchAlbums(false)
    }
  }, [debouncedQuery, genreFilter])

  const loadSearchPlaylists = useCallback(async (page: number) => {
    setIsLoadingSearchPlaylists(true)
    try {
      const result = await searchPlaylists({ search: debouncedQuery, pageNumber: page, pageSize: 10 })
      setSearchPlaylistsList(result.items)
      setSearchPlaylistsTotal(result.totalCount)
      setSearchPlaylistsPage(page)
    } catch (err) {
      console.error('Failed to search playlists:', err)
    } finally {
      setIsLoadingSearchPlaylists(false)
    }
  }, [debouncedQuery])

  const loadSearchArtists = useCallback(async (page: number) => {
    setIsLoadingSearchArtists(true)
    try {
      const result = await searchArtists({ search: debouncedQuery, pageNumber: page, pageSize: 10 })
      setSearchArtistsList(result.items)
      setSearchArtistsTotal(result.totalCount)
      setSearchArtistsPage(page)
    } catch (err) {
      console.error('Failed to search artists:', err)
    } finally {
      setIsLoadingSearchArtists(false)
    }
  }, [debouncedQuery])

  useEffect(() => {
    if (!debouncedQuery.trim()) return
    if (searchType === 'tracks') {
      fetchTracks(debouncedQuery, 1, false, genreFilter)
    } else if (searchType === 'albums') {
      loadSearchAlbums(1)
    } else if (searchType === 'playlists') {
      loadSearchPlaylists(1)
    } else if (searchType === 'artists') {
      loadSearchArtists(1)
    }
  }, [debouncedQuery, genreFilter, searchType, fetchTracks, loadSearchAlbums, loadSearchPlaylists, loadSearchArtists])

  const showToast = (message: string) => {
    setToast({ message, visible: true })
    setTimeout(() => {
      setToast(prev => (prev ? { ...prev, visible: false } : null))
      setTimeout(() => setToast(null), 400)
    }, 2500)
  }

  const fetchHistory = async (page: number = 1, append: boolean = false) => {
    if (isLoadingHistory) return
    setIsLoadingHistory(true)
    try {
      const url = `${GATEWAY_URL}/api/history?pageNumber=${page}&pageSize=${HISTORY_PAGE_SIZE}`
      const response = await apiFetch(url)
      if (response.ok) {
        const data = await response.json()
        const mappedTracks: Track[] = data.items.map((item: HistoryTrackItem) => ({
          trackId: item.trackId,
          title: item.title,
          artistName: item.artistName,
          durationSeconds: item.durationSeconds || 0,
          audioUrl: item.audioUrl || `${GATEWAY_URL}/music/tracks/${item.trackId}/stream`,
          coverImageUrl: item.coverImageUrl,
          fileSizeBytes: (item as any).fileSizeBytes || 0,
          contentType: (item as any).contentType || 'audio/mpeg',
          uploadedAt: (item as any).uploadedAt || (item as any).playedAt || new Date().toISOString(),
          playCount: (item as any).playCount || 0,
          genre: (item as any).genre || 'POP',
        }))
        if (append) {
          setHistoryItems(prev => [...prev, ...mappedTracks])
        } else {
          setHistoryItems(mappedTracks)
        }
        setHistoryTotalCount(data.totalCount)
        setHasMoreHistory(page * HISTORY_PAGE_SIZE < data.totalCount)
        setHistoryPage(page)
      }
    } catch (error) {
      console.error('Помилка завантаження історії:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const loadMoreHistory = () => {
    if (!isLoadingHistory && hasMoreHistory) {
      fetchHistory(historyPage + 1, true)
    }
  }

  useEffect(() => {
    if (activeTab === 'Library') {
      fetchHistory(1, false)
    }
  }, [activeTab])

  useEffect(() => {
    if (currentTrack && activeTab === 'Library') {
      const timer = setTimeout(() => fetchHistory(1, false), 2000)
      return () => clearTimeout(timer)
    }
  }, [currentTrack, activeTab])

  const fetchLikedTracks = async () => {
    setIsLoadingLiked(true)
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/favorites`)
      if (response.ok) {
        const data = await response.json()
        const enrichedTracks: Track[] = data.map((track: FavoriteTrackItem & { fileSizeBytes?: number; contentType?: string; uploadedAt?: string; playCount?: number; genre?: string }) => ({
          trackId: track.trackId,
          title: track.title,
          artistName: track.artistName,
          durationSeconds: track.durationSeconds || 0,
          audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
          coverImageUrl: track.coverImageUrl,
          fileSizeBytes: track.fileSizeBytes || 0,
          contentType: track.contentType || 'audio/mpeg',
          uploadedAt: track.uploadedAt || new Date().toISOString(),
          playCount: track.playCount || 0,
          genre: track.genre || 'POP',
        }))
        setLikedTracks(enrichedTracks)
      }
    } catch (error) {
      console.error('Помилка завантаження улюблених:', error)
    } finally {
      setIsLoadingLiked(false)
    }
  }

  const fetchPlaylists = async () => {
    setIsLoadingPlaylists(true)
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists`)
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data)
      }
    } catch (error) {
      console.error('Помилка завантаження плейлистів:', error)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }

  const fetchPlaylistById = async (id: string) => {
    setIsLoadingPlaylists(true)
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${id}`)
      if (response.ok) {
        const data = await response.json()
        setActivePlaylistDetail(data)
      }
    } catch (error) {
      console.error('Помилка завантаження деталей плейлиста:', error)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }

  const handleCreatePlaylist = async (data: { title: string; description: string; isPrivate: boolean }) => {
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          isPrivate: data.isPrivate,
        }),
      })
      if (response.ok) {
        setIsCreatingPlaylist(false)
        fetchPlaylists()
        showToast(i18n.language === 'en' ? 'Playlist created!' : 'Плейлист створено!')
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
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        setActivePlaylistDetail(null)
        fetchPlaylists()
        showToast(i18n.language === 'en' ? 'Playlist deleted' : 'Плейлист видалено')
      }
    } catch (error) {
      console.error('Помилка видалення плейлиста:', error)
    } finally {
      setPlaylistToDelete(null)
    }
  }

  const handleTogglePrivacy = async (playlistId: string, currentPrivacy: boolean) => {
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate: !currentPrivacy }),
      })
      if (response.ok) {
        fetchPlaylistById(playlistId)
        const toastMsg =
          i18n.language === 'en'
            ? `Playlist is now ${!currentPrivacy ? 'private' : 'public'}`
            : `Плейлист тепер ${!currentPrivacy ? 'приватний' : 'публічний'}`
        showToast(toastMsg)
      }
    } catch (error) {
      console.error('Помилка зміни приватності:', error)
    }
  }

  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const confirmMsg =
      i18n.language === 'en' ? 'Remove track from playlist?' : 'Видалити трек з плейлиста?'
    if (!window.confirm(confirmMsg)) return
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchPlaylistById(playlistId)
        showToast(i18n.language === 'en' ? 'Track removed' : 'Трек видалено з плейлиста')
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
      playCount: 0,
    }))
    setTracks(mappedTracks)
    selectTrack(mappedTracks[index])
  }

  const handlePlayLikedTrack = (_track: Track, index: number) => {
    setTracks(likedTracks)
    selectTrack(likedTracks[index])
  }

  const handleProfileNameChange = (name: string) => {
    setProfileName(name)
    localStorage.setItem('profileName', name)
  }

  const handleLogout = async () => await logoutUser()
  const handleGenreClick = (genreName: string) => handleSearchChange(genreName)

  const handleAiMixLaunch = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => 0.5 - Math.random())
      setTracks(shuffled)
      selectTrack(shuffled[0])
      setActiveTab('Home')
    }
  }

  const popularList = popularTracks || []
  const homeTracks = showAllTracks ? popularList : popularList.slice(0, 6)

  useEffect(() => {
    if (activeTab === 'Liked') {
      fetchLikedTracks()
    } else if (['Home', 'Search'].includes(activeTab)) {
      if (tracks.length === 0) {
        fetchTracks(searchQuery, 1, false)
      }
      if (activeTab === 'Home' && popularList.length === 0) {
        fetchPopularTracks?.()
      }
    } else if (activeTab === 'Playlist') {
      fetchPlaylists()
      setActivePlaylistDetail(null)
    }
  }, [activeTab])

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state, setActiveTab])

  return (
    <main className="Main2">
      {activeTab === 'Home' && (
        <>
          {searchQuery.trim() !== '' ? (
            <div className="SearchResults" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="ActionBtn SearchBackBtn"
                    onClick={() => {
                      handleSearchChange('')
                      setGenreFilter('')
                    }}
                  >
                    ← {t('search.back_to_categories', 'До категорій')}
                  </button>
                  <span className="SubSectionTitle" style={{ margin: 0 }}>
                    {t('search.results', { query: searchQuery })}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div className="LibraryTabsBar" role="tablist" style={{ margin: 0 }}>
                    <button
                      role="tab"
                      aria-selected={searchType === 'tracks'}
                      className={`LibraryTabPill ${searchType === 'tracks' ? 'active' : ''}`}
                      onClick={() => setSearchType('tracks')}
                    >
                      {t('search.categories.music', 'Музика')}
                    </button>
                    <button
                      role="tab"
                      aria-selected={searchType === 'artists'}
                      className={`LibraryTabPill ${searchType === 'artists' ? 'active' : ''}`}
                      onClick={() => setSearchType('artists')}
                    >
                      {t('search.categories.artists', 'Артисти')}
                    </button>
                    <button
                      role="tab"
                      aria-selected={searchType === 'albums'}
                      className={`LibraryTabPill ${searchType === 'albums' ? 'active' : ''}`}
                      onClick={() => setSearchType('albums')}
                    >
                      {t('search.categories.albums', 'Альбоми')}
                    </button>
                    <button
                      role="tab"
                      aria-selected={searchType === 'playlists'}
                      className={`LibraryTabPill ${searchType === 'playlists' ? 'active' : ''}`}
                      onClick={() => setSearchType('playlists')}
                    >
                      {t('search.categories.playlists', 'Плейлісти')}
                    </button>
                  </div>

                  {searchType === 'tracks' && (
                    <select
                      id="genre-filter-select"
                      name="genreFilter"
                      className="GenreFilterSelect"
                      value={genreFilter}
                      onChange={(e) => setGenreFilter(e.target.value)}
                      aria-label={t('search.genre_filter_label', 'Фільтр по жанру')}
                    >
                      <option value="">{t('search.genre_filter_all', 'Всі жанри')}</option>
                      {genreOptions.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {searchType === 'tracks' && (
                <>
                  <div className="MusicCardCont show-all">
                    {isLoadingTracks && tracks.length === 0 ? (
                      <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.loading')}</div>
                    ) : tracks.length === 0 ? (
                      <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.not_found', { query: searchQuery })}</div>
                    ) : (
                      tracks.map((track) => (
                        <div
                          key={track.trackId}
                          className={`MusicCard ${currentTrack?.trackId === track.trackId ? 'active-track' : ''}`}
                          onClick={() => selectTrack(track)}
                          style={{ position: 'relative' }}
                        >
                          <div className="OverCover">
                            <TrackCover
                              src={track.coverImageUrl}
                              className="CoverImg"
                              alt={track.title}
                            />
                          </div>
                          <div className="ContMusicCardText">
                            <span className="HeadText">{track.title}</span>
                            <span className="AuthorText">{track.artistName}</span>
                            <span className="StyleTrack">{track.genre || 'POP'}</span>
                          </div>
                          <AddToPlaylistButton trackId={track.trackId} />
                        </div>
                      ))
                    )}
                  </div>
                  {tracks.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalTracksPages}
                      onPageChange={(page) => fetchTracks(searchQuery, page, false, genreFilter)}
                      isLoading={isLoadingTracks}
                    />
                  )}
                </>
              )}

              {searchType === 'artists' && (
                <>
                  <div className="MusicCardCont show-all">
                    {isLoadingSearchArtists ? (
                      <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.loading')}</div>
                    ) : searchArtistsList.length === 0 ? (
                      <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.no_artists_found', 'Артистів не знайдено')}</div>
                    ) : (
                      searchArtistsList.map((artist) => (
                        <div
                          key={artist.name}
                          className="MusicCard ArtistCard"
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={() => {
                            setSearchType('tracks')
                            handleSearchChange(artist.name)
                          }}
                        >
                          <div className="OverCover" style={{ borderRadius: '50%', overflow: 'hidden' }}>
                            <TrackCover
                              src={artist.avatarUrl}
                              className="CoverImg"
                              alt={artist.name}
                            />
                          </div>
                          <div className="ContMusicCardText">
                            <span className="HeadText">{artist.name}</span>
                            <span className="StyleTrack">{t('tracks_count', { count: artist.trackCount })} • {t('albums_count', { count: artist.albumCount })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {searchArtistsTotal > 10 && (
                    <Pagination
                      currentPage={searchArtistsPage}
                      totalPages={Math.ceil(searchArtistsTotal / 10)}
                      onPageChange={(page) => loadSearchArtists(page)}
                      isLoading={isLoadingSearchArtists}
                    />
                  )}
                </>
              )}

              {searchType === 'albums' && (
                <>
                  <div className="MusicCardCont show-all">
                    {isLoadingSearchAlbums ? (
                      <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.loading')}</div>
                    ) : searchAlbums.length === 0 ? (
                      <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.no_albums_found')}</div>
                    ) : (
                      searchAlbums.map((album) => (
                        <div
                          key={album.id}
                          className="MusicCard"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(getPrefixedPath(`/albums/${album.id}`))}
                        >
                          <div className="OverCover">
                            <TrackCover
                              src={album.coverImageUrl}
                              className="CoverImg"
                              alt={album.title}
                            />
                          </div>
                          <div className="ContMusicCardText">
                            <span className="HeadText">{album.title}</span>
                            <span className="AuthorText">{album.artistName}</span>
                            <span className="StyleTrack">{t('library.album_track_count', { count: album.trackCount })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {searchAlbumsTotal > 10 && (
                    <Pagination
                      currentPage={searchAlbumsPage}
                      totalPages={Math.ceil(searchAlbumsTotal / 10)}
                      onPageChange={(page) => loadSearchAlbums(page)}
                      isLoading={isLoadingSearchAlbums}
                    />
                  )}
                </>
              )}

              {searchType === 'playlists' && (
                <>
                  <div className="MusicCardCont show-all">
                    {isLoadingSearchPlaylists ? (
                      <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.loading')}</div>
                    ) : searchPlaylistsList.length === 0 ? (
                      <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.no_playlists_found')}</div>
                    ) : (
                      searchPlaylistsList.map((playlist) => (
                        <div
                          key={playlist.id}
                          className="MusicCard"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(getPrefixedPath(`/playlists/${playlist.id}`))}
                        >
                          <div className="OverCover">
                            <TrackCover
                              src={playlist.coverImageUrl}
                              className="CoverImg"
                              alt={playlist.title}
                            />
                          </div>
                          <div className="ContMusicCardText">
                            <span className="HeadText">{playlist.title}</span>
                            <span className="StyleTrack">{t('library.album_track_count', { count: playlist.trackCount })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {searchPlaylistsTotal > 10 && (
                    <Pagination
                      currentPage={searchPlaylistsPage}
                      totalPages={Math.ceil(searchPlaylistsTotal / 10)}
                      onPageChange={(page) => loadSearchPlaylists(page)}
                      isLoading={isLoadingSearchPlaylists}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <img src={BackLogo} className="BackLogo" alt="Background decoration" />
              <div className="ContMainHello">
                <span className="MainHeaderText">{t(getGreetingKey())}</span>
                <div className="NameText">
                  <span className="ProfileText">{isGuest ? t('userMenu.guest') : profileName}</span>
                </div>
              </div>
              <div className="OpCont">
                <span className="OpText">{t('main.hello_sub')}</span>
              </div>
              <div className="MainLine"></div>

              <div className="TrendingNow">
                <div className="ContTextTrendingNow">
                  <span className="LisNowTrending">{t('main.trending_listening')}</span>
                  <span className="TrendNowText">{t('main.trending_now')}</span>
                </div>
                {popularList.length > 6 && (
                  <button className="ButtonViewAll" onClick={() => setShowAllTracks(!showAllTracks)}>
                    <span className="TextViewAll">{showAllTracks ? t('main.collapse') : t('main.view_all')}</span>
                    <img
                      src={Arrow}
                      className="ArrowViewAll"
                      style={{ transform: showAllTracks ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                      alt="Toggle"
                    />
                  </button>
                )}
              </div>

              <div className={`MusicCardCont ${showAllTracks ? 'show-all' : ''}`}>
                {isLoadingPopular ? (
                  <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('main.loading_tracks')}</div>
                ) : popularList.length === 0 ? (
                  <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('main.not_found_tracks')}</div>
                ) : (
                  homeTracks.map(track => (
                    <div
                      key={track.trackId}
                      className={`MusicCard ${currentTrack?.trackId === track.trackId ? 'active-track' : ''}`}
                      onClick={() => selectTrack(track)}
                      style={{ position: 'relative' }}
                    >
                      <div className="OverCover">
                        <TrackCover
                          src={track.coverImageUrl}
                          className="CoverImg"
                          alt={track.title}
                        />
                      </div>
                      <div className="ContMusicCardText">
                        <span className="HeadText">{track.title}</span>
                        <span className="AuthorText">{track.artistName}</span>
                        <span className="StyleTrack">{track.genre || 'POP'}</span>
                      </div>
                      <AddToPlaylistButton trackId={track.trackId} />
                    </div>
                  ))
                )}
              </div>

              <MoodRecommendationsPanel />

              <AiMixesPanel>
                <div className="MusicCardCont" style={{ border: 'none', padding: 0, background: 'transparent', margin: 0 }}>
                  {isLoadingTracks ? (
                    <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('main.loading_tracks')}</div>
                  ) : tracks.length === 0 ? (
                    <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('main.not_found_tracks')}</div>
                  ) : (
                    tracks.slice(0, 3).map(track => (
                      <div
                        key={track.trackId}
                        className={`MusicCard ${currentTrack?.trackId === track.trackId ? 'active-track' : ''}`}
                        onClick={() => selectTrack(track)}
                      >
                        <div className="OverCover">
                          <TrackCover
                            src={track.coverImageUrl}
                            className="CoverImg"
                            alt={track.title}
                          />
                        </div>
                        <div className="ContMusicCardText">
                          <span className="HeadText">{track.title}</span>
                          <span className="AuthorText">{track.artistName}</span>
                          <span className="StyleTrack">{track.genre || 'POP'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AiMixesPanel>
            </>
          )}
        </>
      )}

      {activeTab === 'Search' && (
        <div className="SearchTabContent">
          <div className="SearchHeader">
            <span className="SectionTitle">{t('search.title', 'Пошук музики')}</span>
          </div>

          {searchQuery.trim() === '' ? (
            <div className="GenreCategories">
              <span className="SubSectionTitle">{t('search.popular_genres', 'Популярні жанри')}</span>
              <div className="GenreGrid">
                {[
                  { name: 'Pop', color: 'linear-gradient(135deg, #a855f7, #ec4899)' },
                  { name: 'Rock', color: 'linear-gradient(135deg, #ef4444, #f97316)' },
                  { name: 'Hip-Hop', color: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
                  { name: 'Jazz', color: 'linear-gradient(135deg, #eab308, #ca8a04)' },
                  { name: 'Electronic', color: 'linear-gradient(135deg, #10b981, #14b8a6)' },
                  { name: 'Ambient', color: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
                  { name: 'Classical', color: 'linear-gradient(135deg, #64748b, #475569)' },
                  { name: 'Lo-Fi', color: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
                ].map(genre => (
                  <div
                    key={genre.name}
                    className="GenreCard"
                    style={{ background: genre.color }}
                    onClick={() => handleGenreClick(genre.name)}
                  >
                    <span className="GenreCardName">{genre.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="SearchResults" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <span className="SubSectionTitle">{t('search.results', { query: searchQuery })}</span>

              <div className="MusicCardCont">
                {isLoadingTracks && tracks.length === 0 ? (
                  <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>
                    {t('search.loading')}
                  </div>
                ) : tracks.length === 0 ? (
                  <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>
                    {t('search.not_found', { query: searchQuery })}
                  </div>
                ) : (
                  tracks.map(track => (
                    <div
                      key={track.trackId}
                      className={`MusicCard ${currentTrack?.trackId === track.trackId ? 'active-track' : ''}`}
                      onClick={() => selectTrack(track)}
                      style={{ position: 'relative' }}
                    >
                      <div className="OverCover">
                        <TrackCover
                          src={track.coverImageUrl}
                          className="CoverImg"
                          alt={track.title}
                        />
                      </div>
                      <div className="ContMusicCardText">
                        <span className="HeadText">{track.title}</span>
                        <span className="AuthorText">{track.artistName}</span>
                        <span className="StyleTrack">{track.genre || 'POP'}</span>
                      </div>
                      <AddToPlaylistButton trackId={track.trackId} />
                    </div>
                  ))
                )}
              </div>

              {tracks.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalTracksPages}
                  onPageChange={page => fetchTracks(searchQuery, page, false)}
                  isLoading={isLoadingTracks}
                />
              )}

              {!hasMoreTracks && tracks.length > 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#3f3f46',
                    paddingBottom: '8px',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    fontFamily: 'SUSE, sans-serif',
                  }}
                >
                  {t('search.all_loaded', 'Всі результати завантажено')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Library' && (
        <div className="LibraryTabContent">
          <span className="SectionTitle">{t('library.title')}</span>
          <div className="LibraryTrackList">
            <div className="LibraryTableHeader">
              <span className="ColHash">{t('library.hash')}</span>
              <span className="ColTitle">{t('library.song_title')}</span>
              <span className="ColGenre">{t('library.actions', 'Дії')}</span>
              <span className="ColDuration">{t('library.duration')}</span>
            </div>
            <div className="LibraryTableBody">
              {tracks.map((track, index) => (
                <div
                  key={track.trackId}
                  className={`LibraryRow ${currentTrack?.trackId === track.trackId ? 'active-row' : ''}`}
                  onClick={() => selectTrack(track)}
                  style={{ position: 'relative' }}
                >
                  <span className="ColHash">{index + 1}</span>
                  <div className="ColTitleDetail">
                    <TrackCover src={getPlaylistTrackCover(track)} className="LibraryRowCover" alt={track.title} />
                    <div className="LibraryRowInfo">
                      <span className="RowTitle">{track.title}</span>
                      <span className="RowArtist">{track.artistName}</span>
                    </div>
                  </div>
                  <span className="ColGenre">
                    <AddToPlaylistButton trackId={track.trackId} className="ActionBtn" />
                  </span>
                  <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '48px' }}>
            <div className="TrendingNow">
              <div className="ContTextTrendingNow">
                <span className="LisNowTrending">{t('history.title', 'Історія прослуховування')}</span>
                <span className="TrendNowText">{t('history.subtitle', 'Ваші нещодавно прослухані треки')}</span>
              </div>
              {historyItems.length > 6 && (
                <button className="ButtonViewAll" onClick={() => setShowAllHistory(!showAllHistory)}>
                  <span className="TextViewAll">{showAllHistory ? t('main.collapse') : t('main.view_all')}</span>
                  <img
                    src={Arrow}
                    className="ArrowViewAll"
                    style={{
                      transform: showAllHistory ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                    alt="Toggle"
                  />
                </button>
              )}
            </div>

            <div className={`MusicCardCont ${showAllHistory ? 'show-all' : ''}`}>
              {isLoadingHistory && historyItems.length === 0 ? (
                <Loader variant="section" text={t('history.loading', 'Завантаження історії')} />
              ) : historyItems.length === 0 ? (
                <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('history.empty', 'Історія порожня. Слухайте музику!')}</div>
              ) : (
                (showAllHistory ? historyItems : historyItems.slice(0, 6)).map(track => (
                  <div
                    key={track.trackId}
                    className={`MusicCard ${currentTrack?.trackId === track.trackId ? 'active-track' : ''}`}
                    onClick={() => selectTrack(track)}
                    style={{ position: 'relative' }}
                  >
                    <div className="OverCover">
                      <TrackCover
                        src={track.coverImageUrl}
                        className="CoverImg"
                        alt={track.title}
                      />
                    </div>
                    <div className="ContMusicCardText">
                      <span className="HeadText">{track.title}</span>
                      <span className="AuthorText">{track.artistName}</span>
                      <span className="StyleTrack">{track.genre || 'POP'}</span>
                    </div>
                    <AddToPlaylistButton trackId={track.trackId} />
                  </div>
                ))
              )}
            </div>

            {showAllHistory && hasMoreHistory && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  className="AiGenerateBtn"
                  style={{ width: 'auto', padding: '10px 24px' }}
                  onClick={loadMoreHistory}
                  disabled={isLoadingHistory}
                >
                  {isLoadingHistory ? <Loader variant="inline" text={t('common.loading', 'Завантаження')} /> : t('common.load_more', 'Завантажити ще')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Playlist' && (
        <div className="PlaylistTabContent">
          {!activePlaylistDetail ? (
            <>
              <div
                className="SearchHeader"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '24px' }}
              >
                <span className="SectionTitle" style={{ marginBottom: 0 }}>
                  {t('main.playlists_title')}
                </span>
                <button
                  className="AiGenerateBtn"
                  style={{ width: 'auto', padding: '10px 20px', marginTop: 0 }}
                  onClick={() => setIsCreatingPlaylist(true)}
                >
                  {t('playlists.create_btn', '+ Створити')}
                </button>
              </div>

              <CreatePlaylistModal
                isOpen={isCreatingPlaylist}
                onClose={() => setIsCreatingPlaylist(false)}
                onCreate={handleCreatePlaylist}
              />

              {isLoadingPlaylists ? (
                <Loader variant="section" text={t('playlists.loading', 'Завантаження плейлистів')} />
              ) : playlists.length === 0 ? (
                <div className="EmptyStateText">
                  {t('playlists.empty', 'У вас ще немає плейлистів. Створіть свій перший!')}
                </div>
              ) : (
                <div className="PlaylistGrid">
                  {playlists.map(playlist => {
                    const coverItems: (string | null)[] = [...playlist.collageCovers]
                    while (coverItems.length < 4) coverItems.push(null)
                    const hasAnyCover = coverItems.some(url => url !== null)

                    return (
                      <div
                        key={playlist.id}
                        className="PlaylistCard"
                        style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}
                        onClick={() => fetchPlaylistById(playlist.id)}
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
                          <span className="PlaylistCardDesc">
                            {playlist.description ||
                              (playlist.isPrivate
                                ? t('playlists.private', '🔒 Приватний')
                                : t('playlists.public', '🌍 Публічний'))}
                          </span>
                          <span className="PlaylistCardCount">
                            {t('tracks_count', { count: playlist.trackCount })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                    onClick={() => setActivePlaylistDetail(null)}
                  >
                    <img src={BackLogo} alt="Back" style={{ width: '24px', transform: 'rotate(180deg)' }} />
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="SectionTitle" style={{ marginBottom: 0 }}>
                      {activePlaylistDetail.title} {activePlaylistDetail.isPrivate ? '🔒' : '🌍'}
                    </span>
                    <span style={{ color: '#A1A1AA', fontSize: '14px', fontFamily: 'SUSE, sans-serif' }}>
                      {t('tracks_count', { count: activePlaylistDetail.trackCount })} •{' '}
                      {formatTime(activePlaylistDetail.totalDurationSeconds)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="ActionBtn"
                    onClick={() => handleTogglePrivacy(activePlaylistDetail.id, activePlaylistDetail.isPrivate)}
                  >
                    {activePlaylistDetail.isPrivate
                      ? t('playlists.make_public', 'Зробити Публічним')
                      : t('playlists.make_private', 'Зробити Приватним')}
                  </button>
                  <button
                    className="ActionBtn"
                    style={{ backgroundColor: '#ef4444', color: 'white' }}
                    onClick={() => promptDeletePlaylist(activePlaylistDetail.id, (activePlaylistDetail as any).name || activePlaylistDetail.title || '')}
                  >
                    {t('common.delete', 'Видалити')}
                  </button>
                </div>
              </div>

              {activePlaylistDetail.tracks.length === 0 ? (
                <div className="EmptyStateText">
                  {t('playlists.detail_empty', 'У цьому плейлисті поки немає треків.')}
                </div>
              ) : (
                <div className="LibraryTrackList">
                  <div className="LibraryTableHeader">
                    <span className="ColHash">#</span>
                    <span className="ColTitle">{t('library.song_title')}</span>
                    <span className="ColGenre">{t('library.actions', 'Дії')}</span>
                    <span className="ColDuration">{t('library.duration')}</span>
                  </div>
                  <div className="LibraryTableBody">
                    {activePlaylistDetail.tracks.map((track, index) => (
                      <div
                        key={track.trackId}
                        className={`LibraryRow ${currentTrack?.trackId === track.trackId ? 'active-row' : ''}`}
                        onClick={() => handlePlayPlaylistTrack(track, index)}
                      >
                        <span className="ColHash">{index + 1}</span>
                        <div className="ColTitleDetail">
                          <TrackCover src={track.coverUrl} className="LibraryRowCover" alt={track.title} />
                          <div className="LibraryRowInfo">
                            <span className="RowTitle">{track.title}</span>
                            <span className="RowArtist">{track.artistName}</span>
                          </div>
                        </div>
                        <span className="ColGenre">
                          <button
                            className="ActionBtn"
                            style={{ padding: '4px 8px', fontSize: '12px', background: '#3f3f46' }}
                            onClick={e => {
                              e.stopPropagation()
                              handleRemoveTrackFromPlaylist(activePlaylistDetail.id, track.trackId)
                            }}
                          >
                            {t('common.delete', 'Видалити')}
                          </button>
                        </span>
                        <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'Liked' && (
        <div className="LikedTabContent">
          <span className="SectionTitle">{t('liked.title')}</span>
          {isLoadingLiked ? (
            <Loader variant="section" text={t('common.loading', 'Завантаження')} />
          ) : likedTracks.length === 0 ? (
            <div className="EmptyStateText">
              {t('liked.empty')}
            </div>
          ) : (
            <div className="LibraryTrackList">
              <div className="LibraryTableHeader">
                <span className="ColHash">#</span>
                <span className="ColTitle">{t('library.song_title')}</span>
                <span className="ColGenre">{t('library.genre')}</span>
                <span className="ColDuration">{t('library.duration')}</span>
              </div>
              <div className="LibraryTableBody">
                {likedTracks.map((track, index) => (
                  <div
                    key={track.trackId}
                    className={`LibraryRow ${currentTrack?.trackId === track.trackId ? 'active-row' : ''}`}
                    onClick={() => handlePlayLikedTrack(track, index)}
                  >
                    <span className="ColHash">{index + 1}</span>
                    <div className="ColTitleDetail">
                      <TrackCover src={track.coverImageUrl} className="LibraryRowCover" alt={track.title} />
                      <div className="LibraryRowInfo">
                        <span className="RowTitle">{track.title}</span>
                        <span className="RowArtist">{track.artistName}</span>
                      </div>
                    </div>
                    <span className="ColGenre">{track.genre || 'POP'}</span>
                    <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'AI' && (
        <div className="AiTabContent">
          <span className="SectionTitle">{t('main.ai_tab_title')}</span>
          <div className="AiGeneratorCard">
            <div className="AiPulseCircle">
              <img src={AI} className="AiPulseIcon" alt="AI logo" />
            </div>
            <span className="AiTitle">{t('main.ai_tab_subtitle')}</span>
            <span className="AiDesc">
              {t('main.ai_tab_desc')}
            </span>
            <button className="AiGenerateBtn" onClick={handleAiMixLaunch}>
              {t('main.ai_tab_btn')}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Downloads' && (
        <div className="DownloadsTabContent">
          <span className="SectionTitle">{t('downloads.title')}</span>
          <div className="DownloadsContainer">
            <div className="DownloadsStatus">
              <span className="StatusTitle">{t('downloads.offline_ready', 'Офлайн режим готовий')}</span>
              <span className="StatusDesc">
                {t('downloads.offline_desc', 'Ви можете завантажити будь-який трек для прослуховування без інтернету.')}
              </span>
            </div>
            {tracks.slice(0, 3).map((track, index) => (
              <div key={track.trackId} className="DownloadRow">
                <span className="DownloadRowHash">{index + 1}</span>
                <div className="DownloadRowInfo">
                  <span className="DownloadRowTitle">{track.title}</span>
                  <span className="DownloadRowArtist">{track.artistName}</span>
                </div>
                <span className="DownloadRowStatus">
                  {t('downloads.downloaded')} ({(track.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Settings' && (
        <div className="SettingsTabContent">
          <span className="SectionTitle">{t('main.settings_title')}</span>
          <div className="SettingsForm">
            <div className="SettingsGroup">
              <label className="SettingsLabel" htmlFor="settings-profile-name">
                {t('main.settings_profile_name')}
              </label>
              <input
                id="settings-profile-name"
                name="profileName"
                type="text"
                className="SettingsInput"
                placeholder={t('main.settings_profile_placeholder')}
                defaultValue={profileName}
                onBlur={e => {
                  if (e.target.value.trim() !== '') {
                    handleProfileNameChange(e.target.value.trim())
                  }
                }}
              />
            </div>
            <div className="SettingsGroup">
              <label className="SettingsLabel" htmlFor="settings-audio-quality">
                {t('main.settings_audio_quality')}
              </label>
              <select id="settings-audio-quality" name="audioQuality" className="SettingsSelect" defaultValue="High (320 kbps)">
                <option value="Standard (128 kbps)">{t('main.quality_standard')}</option>
                <option value="High (320 kbps)">{t('main.quality_high')}</option>
                <option value="Ultra (FLAC / Lossless)">{t('main.quality_ultra')}</option>
              </select>
            </div>
            <button className="SettingsLogoutBtn" onClick={handleLogout}>
              {t('main.settings_logout')}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`ToastNotification ${toast.visible ? 'toast-show' : 'toast-hide'}`}>{toast.message}</div>
      )}

      <DeletePlaylistModal
        isOpen={Boolean(playlistToDelete)}
        playlistTitle={playlistToDelete?.title ?? ''}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={handleConfirmDeletePlaylist}
      />

      <FooterFromJson />
    </main>
  )
}