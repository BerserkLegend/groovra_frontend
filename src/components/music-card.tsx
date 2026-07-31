import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { Track } from '../context/player-context'
import { usePlaylistModal } from '../context/playlist-modal-context'
import { TrackCover } from './common/TrackCover'

interface MusicCardProps {
  track: Track
  isActive: boolean
  onSelect: () => void
  onAddToPlaylist?: (trackId: string) => void
}

export const MusicCard: React.FC<MusicCardProps> = React.memo(function MusicCard({
  track,
  isActive,
  onSelect,
  onAddToPlaylist,
}) {
  const { t } = useTranslation()
  const { openModal } = usePlaylistModal()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }

  const handleAddToPlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAddToPlaylist) {
      onAddToPlaylist(track.trackId)
    } else {
      openModal(track.trackId)
    }
  }

  return (
    <motion.div
      className={`MusicCard ${isActive ? 'active-track' : ''}`}
      onClick={onSelect}
      style={{ position: 'relative' }}
      tabIndex={0}
      role="button"
      aria-label={t('library.play_track', { title: track.title, artist: track.artistName })}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
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
      <button
        className="AddToPlaylistBtn"
        onClick={handleAddToPlaylistClick}
        title={t('playlistsExt.add_to')}
        aria-label={t('playlistsExt.add_to')}
        type="button"
      >
        <Plus size={16} className="AddToPlaylistIcon" />
      </button>
    </motion.div>
  )
})
