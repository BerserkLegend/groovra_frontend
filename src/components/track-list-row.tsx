import React from 'react'
import { motion } from 'framer-motion'
import { formatTime } from '../utils/format-time'
import type { Track } from '../context/player-context'
import { TrackCover } from './common/TrackCover'

interface TrackListRowProps {
  track: Track
  index: number
  isActive: boolean
  onSelect: () => void
  actionSlot?: React.ReactNode
}

export const TrackListRow: React.FC<TrackListRowProps> = React.memo(function TrackListRow({
  track,
  index,
  isActive,
  onSelect,
  actionSlot,
}) {
  return (
    <motion.div
      className={`LibraryRow ${isActive ? 'active-row' : ''}`}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-label={`${track.title} — ${track.artistName}`}
      onKeyDown={(e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.005, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.15 }}
    >
      <span className="ColHash">{index + 1}</span>
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
      {actionSlot !== undefined && (
        <span className="ColGenre">{actionSlot}</span>
      )}
      <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
    </motion.div>
  )
})
