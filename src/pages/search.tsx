import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/player-context'
import { useDebounce } from '../hooks/use-debounce'
import { AddToPlaylistButton } from '../components/AddToPlaylistButton'
import { Pagination } from '../components/pagination'
import { fetchAlbums, likeAlbum, unlikeAlbum, type AlbumListItem } from '../api/albums'
import { searchPlaylists, likePlaylist, unlikePlaylist, type PlaylistListItem } from '../api/playlists'
import { searchArtists, type ArtistListItem } from '../api/artists'
import { getProfileByName } from '../api/profile'
import { fetchGenres } from '../api/tracks'
import { TrackCover } from '../components/common/TrackCover'
import { FooterFromJson } from '../components/footer-from-json'
import { albumHasCustomCover } from '../utils/cover-utils'

import artistsImg from '../assets/search-artists.png'
import musicImg from '../assets/search-music.png'
import podcastsImg from '../assets/search-podcasts.png'
import playlistsImg from '../assets/search-playlists.png'
import albumsImg from '../assets/search-albums.png'
import popularImg from '../assets/search-popular.png'
import noResultsSvg from '../assets/no-results.svg'

type SearchType = 'tracks' | 'albums' | 'playlists' | 'artists'
type Category = SearchType | 'popular' | 'podcasts'

const PAGE_SIZE = 10

export const SearchPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    tracks,
    currentTrack,
    isLoadingTracks,
    searchQuery,
    selectTrack,
    currentPage,
    totalTracksPages,
    fetchTracks,
    popularTracks,
    handleSearchChange,
  } = usePlayer()

  const [genreFilter, setGenreFilter] = useState('')
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
  const [searchType, setSearchType] = useState<SearchType>('tracks')
  const [browseMode, setBrowseMode] = useState(false)
  const [showPopular, setShowPopular] = useState(false)
  const [unsupportedNotice, setUnsupportedNotice] = useState('')

  const [albums, setAlbums] = useState<AlbumListItem[]>([])
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false)
  const [albumsPage, setAlbumsPage] = useState(1)
  const [albumsTotal, setAlbumsTotal] = useState(0)

  const [playlists, setPlaylists] = useState<PlaylistListItem[]>([])
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)
  const [playlistsPage, setPlaylistsPage] = useState(1)
  const [playlistsTotal, setPlaylistsTotal] = useState(0)

  const [artists, setArtists] = useState<ArtistListItem[]>([])
  const [isLoadingArtists, setIsLoadingArtists] = useState(false)
  const [artistsPage, setArtistsPage] = useState(1)
  const [artistsTotal, setArtistsTotal] = useState(0)

  const debouncedQuery = useDebounce(searchQuery, 300)
  const isActive = searchQuery.trim() !== '' || browseMode

  const [genreOptions, setGenreOptions] = useState<string[]>([])

  useEffect(() => {
    fetchGenres()
      .then(setGenreOptions)
      .catch((err) => console.error('Failed to load genres:', err))
  }, [])

  const loadAlbums = useCallback(async (page: number) => {
    setIsLoadingAlbums(true)
    try {
      const result = await fetchAlbums({ search: debouncedQuery, genre: genreFilter, pageNumber: page, pageSize: PAGE_SIZE })
      setAlbums(result.items)
      setAlbumsTotal(result.totalCount)
      setAlbumsPage(page)
    } catch (err) {
      console.error('Failed to search albums:', err)
    } finally {
      setIsLoadingAlbums(false)
    }
  }, [debouncedQuery, genreFilter])

  const loadPlaylists = useCallback(async (page: number) => {
    setIsLoadingPlaylists(true)
    try {
      const result = await searchPlaylists({ search: debouncedQuery, pageNumber: page, pageSize: PAGE_SIZE })
      setPlaylists(result.items)
      setPlaylistsTotal(result.totalCount)
      setPlaylistsPage(page)
    } catch (err) {
      console.error('Failed to search playlists:', err)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }, [debouncedQuery])

  const loadArtists = useCallback(async (page: number) => {
    setIsLoadingArtists(true)
    try {
      const result = await searchArtists({ search: debouncedQuery, pageNumber: page, pageSize: PAGE_SIZE })
      setArtists(result.items)
      setArtistsTotal(result.totalCount)
      setArtistsPage(page)
    } catch (err) {
      console.error('Failed to search artists:', err)
    } finally {
      setIsLoadingArtists(false)
    }
  }, [debouncedQuery])

  const handleToggleLikePlaylist = async (playlistId: string, isLiked: boolean) => {
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, isLiked: !isLiked } : p)))
    try {
      if (isLiked) {
        await unlikePlaylist(playlistId)
      } else {
        await likePlaylist(playlistId)
      }
    } catch (err) {
      console.error('Failed to toggle playlist like:', err)
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, isLiked } : p)))
    }
  }

  const handleToggleLikeAlbum = async (albumId: string, isLiked: boolean) => {
    setAlbums((prev) => prev.map((a) => (a.id === albumId ? { ...a, isLiked: !isLiked } : a)))
    try {
      if (isLiked) {
        await unlikeAlbum(albumId)
      } else {
        await likeAlbum(albumId)
      }
    } catch (err) {
      console.error('Failed to toggle album like:', err)
      setAlbums((prev) => prev.map((a) => (a.id === albumId ? { ...a, isLiked } : a)))
    }
  }

  const getPrefixedPath = (path: string): string => {
    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''
    return `${prefix}${path}`
  }

  const openAlbum = (albumId: string) => navigate(getPrefixedPath(`/albums/${albumId}`))
  const openPlaylist = (playlistId: string) => navigate(getPrefixedPath(`/playlists/${playlistId}`))

  useEffect(() => {
    if (!isActive || showPopular) return
    if (searchType === 'tracks') {
      fetchTracks(debouncedQuery, 1, false, genreFilter)
    } else if (searchType === 'albums') {
      loadAlbums(1)
    } else if (searchType === 'playlists') {
      loadPlaylists(1)
    } else if (searchType === 'artists') {
      loadArtists(1)
    }
  }, [debouncedQuery, genreFilter, searchType, isActive, showPopular, fetchTracks, loadAlbums, loadPlaylists, loadArtists])

  const selectCategory = (category: Category) => {
    setUnsupportedNotice('')
    if (category === 'podcasts') {
      setUnsupportedNotice(t('search.category_not_supported'))
      return
    }
    setBrowseMode(true)
    if (category === 'popular') {
      setSearchType('tracks')
      setShowPopular(true)
      return
    }
    setShowPopular(false)
    setSearchType(category as SearchType)
  }

  const backToCategories = () => {
    setBrowseMode(false)
    setShowPopular(false)
    setUnsupportedNotice('')
    setGenreFilter('')
    handleSearchChange('')
  }

  const displayedTracks = showPopular ? popularTracks : tracks

  return (
    <div className="SearchTabContent">
      <div className="SearchSeparator" />
      {!isActive ? (
        <div className="GenreCategories" style={{ width: '100%' }}>
          <h1 className="CategoryLabel">{t('search.category_title')}</h1>
          {unsupportedNotice && (
            <div className="EmptyStateText" style={{ marginBottom: '16px' }}>{unsupportedNotice}</div>
          )}
          <div className="CategoryGrid">
            {[
              { key: 'artists' as Category, name: t('search.categories.artists'), image: artistsImg },
              { key: 'tracks' as Category, name: t('search.categories.music'), image: musicImg },
              { key: 'podcasts' as Category, name: t('search.categories.podcasts'), image: podcastsImg },
              { key: 'playlists' as Category, name: t('search.categories.playlists'), image: playlistsImg },
              { key: 'albums' as Category, name: t('search.categories.albums'), image: albumsImg },
              { key: 'popular' as Category, name: t('search.categories.popular'), image: popularImg }
            ].map(category => (
              <div
                key={category.key}
                className="CategoryCard"
                onClick={() => selectCategory(category.key)}
                tabIndex={0}
                role="button"
                aria-label={t('search.category_aria', { name: category.name })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectCategory(category.key) }}
              >
                <div className="image">
                  <img className="rectangle" alt="Rectangle" src={category.image} />
                </div>
                <span className="CategoryCardName">{category.name}</span>
                <div className="CategoryCardHighlight" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="SearchResults">
          <div className="SearchHeaderRow">
            <div className="SearchHeaderLeft">
              <button type="button" className="ActionBtn SearchBackBtn" onClick={backToCategories}>
                ← {t('search.back_to_categories')}
              </button>
              <span className="SubSectionTitle">
                {showPopular
                  ? t('search.categories.popular')
                  : searchQuery.trim()
                    ? t('search.results', { query: searchQuery })
                    : t(`search.categories.${searchType === 'tracks' ? 'music' : searchType}`)}
              </span>
            </div>

            <div className="SearchHeaderRight">
              {!showPopular && (
                <div className="LibraryTabsBar" role="tablist">
                  <button
                    role="tab"
                    aria-selected={searchType === 'tracks'}
                    className={`LibraryTabPill ${searchType === 'tracks' ? 'active' : ''}`}
                    onClick={() => setSearchType('tracks')}
                  >
                    {t('search.categories.music')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={searchType === 'artists'}
                    className={`LibraryTabPill ${searchType === 'artists' ? 'active' : ''}`}
                    onClick={() => setSearchType('artists')}
                  >
                    {t('search.categories.artists')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={searchType === 'albums'}
                    className={`LibraryTabPill ${searchType === 'albums' ? 'active' : ''}`}
                    onClick={() => setSearchType('albums')}
                  >
                    {t('search.categories.albums')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={searchType === 'playlists'}
                    className={`LibraryTabPill ${searchType === 'playlists' ? 'active' : ''}`}
                    onClick={() => setSearchType('playlists')}
                  >
                    {t('search.categories.playlists')}
                  </button>
                </div>
              )}
              {searchType === 'tracks' && !showPopular && (
                <select
                  className="GenreFilterSelect"
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  aria-label={t('search.genre_filter_label')}
                >
                  <option value="">{t('search.genre_filter_all')}</option>
                  {genreOptions.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {searchType === 'tracks' && (
            <>
              <div className="MusicCardCont">
                {isLoadingTracks && !showPopular ? (
                  <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.loading')}</div>
                ) : displayedTracks.length === 0 ? (
                  <div className="NoResultsLayout">
                    <div className="NoResultsTextSide">
                      <h1 className="NoResultsTitle">{t('search.no_results_title')}</h1>
                      <div className="NoResultsSubTexts">
                        <p className="NoResultsSubText">{t('search.no_results_check_query')}</p>
                        <p className="NoResultsSubText">{t('search.no_results_try_keywords')}</p>
                        <p className="NoResultsSubText">{t('search.no_results_forbidden_topic')}</p>
                      </div>
                    </div>
                    <div className="NoResultsImageSide">
                      <img className="NoResultsCloud" alt="No results cloud illustration" src={noResultsSvg} />
                    </div>
                  </div>
                ) : (
                  displayedTracks.map((track) => (
                    <div
                      key={track.trackId}
                      className={`MusicCard ${currentTrack?.trackId === track.trackId ? 'active-track' : ''}`}
                      onClick={() => selectTrack(track)}
                      tabIndex={0}
                      role="button"
                      aria-label={t('library.play_track', { title: track.title, artist: track.artistName })}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectTrack(track) }}
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
                        <span
                          className="AuthorText ClickableArtist"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArtistClick(track.artistName)
                          }}
                        >
                          {track.artistName}
                        </span>
                        <span className="StyleTrack">{track.genre || 'POP'}</span>
                      </div>
                      <AddToPlaylistButton trackId={track.trackId} />
                    </div>
                  ))
                )}
              </div>

              {!showPopular && tracks.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalTracksPages}
                  onPageChange={(page) => fetchTracks(searchQuery, page, false, genreFilter)}
                  isLoading={isLoadingTracks}
                />
              )}
            </>
          )}

          {searchType === 'albums' && (
            <>
              <div className="MusicCardCont">
                {isLoadingAlbums ? (
                  <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.loading')}</div>
                ) : albums.length === 0 ? (
                  <div className="EmptyStateText">{t('search.no_albums_found')}</div>
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
                          <div className="OverCover">
                            <TrackCover
                              src={album.coverImageUrl}
                              className="CoverImg"
                              alt={album.title}
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
                          <span
                            className="AuthorText ClickableArtist"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArtistClick(album.artistName)
                            }}
                          >
                            {album.artistName}
                          </span>
                          <span className="StyleTrack">{t('library.album_track_count', { count: album.trackCount })}</span>
                        </div>
                        <button
                          type="button"
                          className={`LikePlaylistBtn ${album.isLiked ? 'liked' : ''}`}
                          onClick={(e) => { e.stopPropagation(); handleToggleLikeAlbum(album.id, album.isLiked) }}
                          title={album.isLiked ? t('library.remove_saved_album') : t('library.save_album')}
                          aria-label={album.isLiked ? t('library.remove_saved_album') : t('library.save_album')}
                        >
                          {album.isLiked ? '♥' : '♡'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
              {albumsTotal > PAGE_SIZE && (
                <Pagination
                  currentPage={albumsPage}
                  totalPages={Math.ceil(albumsTotal / PAGE_SIZE)}
                  onPageChange={(page) => loadAlbums(page)}
                  isLoading={isLoadingAlbums}
                />
              )}
            </>
          )}

          {searchType === 'playlists' && (
            <>
              <div className="MusicCardCont">
                {isLoadingPlaylists ? (
                  <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.loading')}</div>
                ) : playlists.length === 0 ? (
                  <div className="EmptyStateText">{t('search.no_playlists_found')}</div>
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
                        </div>
                        {!playlist.isOwner && (
                          <button
                            type="button"
                            className={`LikePlaylistBtn ${playlist.isLiked ? 'liked' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleToggleLikePlaylist(playlist.id, playlist.isLiked) }}
                            title={playlist.isLiked ? t('library.remove_saved_playlist') : t('library.save_playlist')}
                            aria-label={playlist.isLiked ? t('library.remove_saved_playlist') : t('library.save_playlist')}
                          >
                            {playlist.isLiked ? '♥' : '♡'}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              {playlistsTotal > PAGE_SIZE && (
                <Pagination
                  currentPage={playlistsPage}
                  totalPages={Math.ceil(playlistsTotal / PAGE_SIZE)}
                  onPageChange={(page) => loadPlaylists(page)}
                  isLoading={isLoadingPlaylists}
                />
              )}
            </>
          )}

          {searchType === 'artists' && (
            <>
              <div className="MusicCardCont">
                {isLoadingArtists ? (
                  <div style={{ color: '#A1A1AA', fontFamily: 'SUSE, sans-serif' }}>{t('search.loading')}</div>
                ) : artists.length === 0 ? (
                  <div className="EmptyStateText">{t('search.no_artists_found', 'Артистів не знайдено')}</div>
                ) : (
                  artists.map((artist) => (
                    <div
                      key={artist.name}
                      className="MusicCard ArtistCard"
                      style={{ position: 'relative', cursor: 'pointer' }}
                      onClick={() => handleArtistClick(artist.name)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleArtistClick(artist.name)
                        }
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
              {artistsTotal > PAGE_SIZE && (
                <Pagination
                  currentPage={artistsPage}
                  totalPages={Math.ceil(artistsTotal / PAGE_SIZE)}
                  onPageChange={(page) => loadArtists(page)}
                  isLoading={isLoadingArtists}
                />
              )}
            </>
          )}
        </div>
      )}
      <FooterFromJson />
    </div>
  )
}
