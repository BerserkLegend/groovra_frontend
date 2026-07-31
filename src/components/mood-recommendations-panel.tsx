import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../app.css'
import { usePlayer, type Track } from '../context/player-context'
import { fetchPersonalizedRecommendations } from '../api/tracks'
import { TrackCover } from './common/TrackCover'

export const MoodRecommendationsPanel: React.FC = () => {
  const { t } = useTranslation()
  const { currentTrack, selectTrack } = usePlayer()
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await fetchPersonalizedRecommendations(12)
        if (mounted) setTracks(result)
      } catch {
        if (mounted) setTracks([])
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (!isLoading && tracks.length === 0) return null

  return (
    <div className="MoodRecBlock">
      <span className="MoodRecTitle">{t('moodRecommendations.title')}</span>
      <div className="MoodRecTrackList">
        {isLoading ? (
          <div className="MoodRecLoading">{t('main.loading_tracks')}</div>
        ) : (
          tracks.map(track => (
            <div
              key={track.trackId}
              className={`MoodRecCard ${currentTrack?.trackId === track.trackId ? 'active-track' : ''}`}
              onClick={() => selectTrack(track)}
            >
              <div className="MoodRecCoverWrap">
                <TrackCover src={track.coverImageUrl} className="MoodRecCoverImg" alt={track.title} />
                <div className="MoodRecOverlay" />
              </div>
              <div className="MoodRecInfo">
                <span className="MoodRecCardTitle">{track.title}</span>
                <span className="MoodRecGenreTag">{track.genre || 'POP'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
