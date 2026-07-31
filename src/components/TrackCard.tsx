import React from 'react'
import type { Track } from '../context/player-context'
import { AddToPlaylistButton } from './AddToPlaylistButton'
import Cover from '../assets/Cover.svg'

interface TrackCardProps {
  track: Track
  isActive: boolean
  onSelect: (track: Track) => void
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, isActive, onSelect }) => (
  <div
    className={`MusicCard ${isActive ? 'active-track' : ''}`}
    onClick={() => onSelect(track)}
    style={{ position: 'relative' }}
  >
    <div className="OverCover">
      <img
        src={track.coverImageUrl || Cover}
        className="CoverImg"
        alt={track.title}
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = Cover
        }}
      />
    </div>
    <div className="ContMusicCardText">
      <span className="HeadText">{track.title}</span>
      <span className="AuthorText">{track.artistName}</span>
      <span className="StyleTrack">{track.genre || 'POP'}</span>
    </div>
    <AddToPlaylistButton trackId={track.trackId} />
  </div>
)
