import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayer, type Track } from '../context/player-context'
import { apiFetch, GATEWAY_URL, trackStreamUrl } from '../api/api-client'
import { TrackCover } from '../components/common/TrackCover'
import { FooterFromJson } from '../components/footer-from-json'
import { AddToPlaylistButton } from '../components/AddToPlaylistButton'
import { Pagination } from '../components/pagination'
import Loader from '../components/Loader'
import type { PagedResult } from '../types/shared'
import '../app.css'

const PAGE_SIZE = 10

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

const withStreamUrls = (items: Track[]): Track[] =>
  items.map((t) => ({
    ...t,
    audioUrl: trackStreamUrl(t.trackId),
  }))

export const LikedPage: React.FC = () => {
  const { t } = useTranslation()
  const { currentTrack, selectTrack, likedTrackIds, likedSyncVersion } = usePlayer()
  const [currentPage, setCurrentPage] = useState(1)
  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Усі треки, які сторінка колись бачила. Потрібні, щоб повторний лайк показав рядок
  // миттєво: сам список уже не містить цього треку (його прибрав дизлайк), а чекати
  // мережу тільки заради вже відомих назви й обкладинки немає сенсу.
  const knownTracksRef = useRef<Map<string, Track>>(new Map())

  const loadPage = useCallback(async (page: number) => {
    setIsLoading(true)
    try {
      const res = await apiFetch(`${GATEWAY_URL}/music/favorites?pageNumber=${page}&pageSize=${PAGE_SIZE}`)
      if (res.ok) {
        const data = await res.json()
        const paged: PagedResult<Track> = {
          items: (data.items ?? []) as Track[],
          totalCount: Number(data.totalCount ?? 0),
          pageNumber: Number(data.pageNumber ?? page),
          pageSize: Number(data.pageSize ?? PAGE_SIZE),
        }
        const items = withStreamUrls(paged.items)
        items.forEach((t) => knownTracksRef.current.set(t.trackId, t))
        setLikedTracks(items)
        setTotalCount(paged.totalCount)
      }
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }, [])

  // Один ефект на обидва тригери: зміна сторінки і ПІДТВЕРДЖЕНА сервером зміна вподобаного.
  // Раніше тут було два окремі ефекти, і другий слухав likedTrackIds — той оновлюється
  // оптимістично, ще до відповіді сервера, тому GET /music/favorites обганяв POST/DELETE
  // і повертав список без щойно лайкнутого треку. Через це повторний лайк не з'являвся
  // до ручного перезавантаження сторінки. Плюс на монтуванні обидва ефекти стріляли разом,
  // даючи два однакові запити.
  useEffect(() => {
    loadPage(currentPage)
  }, [currentPage, loadPage, likedSyncVersion])

  // Фільтр лишається по likedTrackIds (оптимістичний) — щоб дизлайк ховав рядок миттєво,
  // не чекаючи мережі. А трек, повторно лайкнутий після дизлайку, дістаємо з кешу вже
  // баченого: у завантаженому списку його ще немає (його прибрав попередній ресинк),
  // і без цього рядок з'являвся б лише після відповіді сервера.
  const visibleLikedTracks = useMemo(() => {
    const shown = likedTracks.filter(t => likedTrackIds.includes(t.trackId))
    const shownIds = new Set(shown.map(t => t.trackId))

    const restored = likedTrackIds
      .filter(id => !shownIds.has(id))
      .map(id => knownTracksRef.current.get(id))
      .filter((t): t is Track => t !== undefined)

    return [...shown, ...restored]
  }, [likedTracks, likedTrackIds])
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Лоадер лише на першому завантаженні. Раніше він показувався і на фоновому ресинку
  // після кожного лайку — весь список зникав і блимав, що й сприймалось як "трек пропав".
  if (isLoading && !hasLoadedOnce) {
    return <Loader />
  }

  return (
    <div className="LikedTabContent">
      <span className="SectionTitle">{t('liked.title')}</span>
      {visibleLikedTracks.length === 0 ? (
        <div className="EmptyStateText">{t('liked.empty')}</div>
      ) : (
        <>
          <div className="LibraryTrackList">
            <div className="LibraryTableHeader">
              <span className="ColHash">#</span>
              <span className="ColTitle">{t('library.song_title')}</span>
              <span className="ColGenre">{t('library.actions')}</span>
              <span className="ColDuration">{t('library.duration')}</span>
            </div>
            <div className="LibraryTableBody">
              {visibleLikedTracks.map((track, index) => (
                <div
                  key={track.trackId}
                  className={`LibraryRow ${currentTrack?.trackId === track.trackId ? 'active-row' : ''}`}
                  onClick={() => selectTrack(track)}
                  tabIndex={0}
                  role="button"
                  aria-label={t('library.play_track', { title: track.title, artist: track.artistName })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') selectTrack(track)
                  }}
                >
                  <span className="ColHash">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
                  <div className="ColTitleDetail">
                    <TrackCover src={track.coverImageUrl} className="LibraryRowCover" alt={track.title} />
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
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </>
      )}
      <FooterFromJson />
    </div>
  )
}
