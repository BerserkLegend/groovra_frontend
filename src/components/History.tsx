import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayer, type Track } from '../context/player-context'
import { apiFetch, GATEWAY_URL, trackStreamUrl } from '../api/api-client'
import { AddToPlaylistButton } from './AddToPlaylistButton'
import { Pagination } from './pagination'
import { TrackCover } from './common/TrackCover'

type HistoryTrack = Track & { playedAt: string }

interface HistoryApiItem {
  trackId: string
  title: string
  artistName: string
  durationSeconds?: number
  audioUrl?: string
  coverImageUrl?: string
  fileSizeBytes?: number
  contentType?: string
  uploadedAt?: string
  playCount?: number
  genre?: string
  playedAt?: string
}

const HISTORY_PAGE_SIZE = 10

const formatPlayedAt = (iso: string, lang: string): string => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const diffSec = Math.round((then - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 45) return lang === 'en' ? 'Just now' : 'Щойно'

  const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : 'uk', { numeric: 'auto' })
  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.34524, 'week'],
    [12, 'month'],
    [Infinity, 'year'],
  ]

  let duration = diffSec
  for (const [amount, unit] of divisions) {
    if (Math.abs(duration) < amount) return rtf.format(Math.round(duration), unit)
    duration /= amount
  }
  return ''
}

export const History: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { currentTrack, selectTrack, formatTime } = usePlayer()
  const [historyItems, setHistoryItems] = useState<HistoryTrack[]>([])
  const [historyTotalCount, setHistoryTotalCount] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState(false)

  const fetchHistory = useCallback(async (page: number = 1) => {
    setIsLoadingHistory(true)
    try {
      const url = `${GATEWAY_URL}/api/history?pageNumber=${page}&pageSize=${HISTORY_PAGE_SIZE}`
      const response = await apiFetch(url)
      if (!response.ok) {
        console.error(`[History] Fetch history failed: ${response.status}`)
        setHistoryError(true)
        return
      }

      const data = await response.json()
      const rawItems: HistoryApiItem[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : []

      const mappedTracks: HistoryTrack[] = rawItems.map((item) => ({
        trackId: item.trackId,
        title: item.title,
        artistName: item.artistName,
        durationSeconds: item.durationSeconds || 0,
        audioUrl: trackStreamUrl(item.trackId),
        coverImageUrl: item.coverImageUrl,
        fileSizeBytes: item.fileSizeBytes || 0,
        contentType: item.contentType || 'audio/mpeg',
        uploadedAt: item.uploadedAt || new Date().toISOString(),
        playCount: item.playCount || 0,
        genre: item.genre || 'POP',
        playedAt: item.playedAt || new Date().toISOString(),
      }))

      setHistoryItems(mappedTracks)
      setHistoryTotalCount(typeof data?.totalCount === 'number' ? data.totalCount : mappedTracks.length)
      setHistoryPage(page)
      setHistoryError(false)
    } catch (error) {
      console.error('[History] Failed to load history:', error)
      setHistoryError(true)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory(1)
  }, [])

  const totalPages = Math.max(1, Math.ceil(historyTotalCount / HISTORY_PAGE_SIZE))

  return (
    <div style={{ width: '100%' }}>
      <div className="ContTextTrendingNow" style={{ marginBottom: '16px' }}>
        <span className="LisNowTrending">{t('library.tab_history')}</span>
        <span className="TrendNowText">{t('history.subtitle')}</span>
      </div>

      <div className="LibraryTrackList">
        {isLoadingHistory && historyItems.length === 0 ? (
          <div className="EmptyStateText">{t('history.loading')}</div>
        ) : historyError ? (
          <div className="EmptyStateText" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <span>{t('history.error')}</span>
            <button className="ActionBtn" onClick={() => fetchHistory(historyPage)}>
              {t('history.retry')}
            </button>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="EmptyStateText">{t('history.empty')}</div>
        ) : (
          <>
            <div className="HistoryTableHeader">
              <span className="ColHash">#</span>
              <span className="ColTitle">{t('library.song_title')}</span>
              <span className="ColPlayedAt">{t('library.played_at')}</span>
              <span className="ColGenre">{t('library.actions')}</span>
              <span className="ColDuration">{t('library.duration')}</span>
            </div>
            <div className="LibraryTableBody">
              {historyItems.map((track, index) => (
                <div
                  key={`${track.trackId}-${track.playedAt}-${index}`}
                  className={`HistoryRow ${currentTrack?.trackId === track.trackId ? 'active-row' : ''}`}
                  onClick={() => selectTrack(track)}
                  tabIndex={0}
                  role="button"
                  aria-label={t('library.play_track', { title: track.title, artist: track.artistName })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectTrack(track) }}
                >
                  <span className="ColHash">{(historyPage - 1) * HISTORY_PAGE_SIZE + index + 1}</span>
                  <div className="ColTitleDetail">
                    <TrackCover
                      src={track.coverImageUrl}
                      className="LibraryRowCover"
                      alt={track.title}
                    />
                    <div className="LibraryRowInfo">
                      <span className="RowTitle">{track.title}</span>
                      <span className="RowArtist">{track.artistName}</span>
                    </div>
                  </div>
                  <span className="ColPlayedAt">{formatPlayedAt(track.playedAt, i18n.language)}</span>
                  <span className="ColGenre">
                    <AddToPlaylistButton trackId={track.trackId} className="ActionBtn" />
                  </span>
                  <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!historyError && historyItems.length > 0 && (
        <Pagination
          currentPage={historyPage}
          totalPages={totalPages}
          onPageChange={(page) => fetchHistory(page)}
          isLoading={isLoadingHistory}
        />
      )}
    </div>
  )
}
