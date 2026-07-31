import React, { useState, useEffect, useCallback } from 'react'
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
  const { currentTrack, selectTrack, likedTrackIds } = usePlayer()
  const [currentPage, setCurrentPage] = useState(1)
  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

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
        setLikedTracks(withStreamUrls(paged.items))
        setTotalCount(paged.totalCount)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPage(currentPage)
  }, [currentPage, loadPage])

  useEffect(() => {
    loadPage(currentPage)
  }, [likedTrackIds])

  const visibleLikedTracks = likedTracks.filter(t => likedTrackIds.includes(t.trackId))
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  if (isLoading) {
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
