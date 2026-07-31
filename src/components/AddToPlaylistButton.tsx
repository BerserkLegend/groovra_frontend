import React from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePlaylistModal } from '../context/playlist-modal-context'

interface Props {
  trackId: string
  className?: string
  children?: React.ReactNode
}

export const AddToPlaylistButton: React.FC<Props> = ({ trackId, className, children }) => {
  const { t } = useTranslation()
  const { openModal } = usePlaylistModal()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    openModal(trackId)
  }

  return (
    <button
      className={className || 'AddToPlaylistBtn'}
      onClick={handleClick}
      title={t('playlistsExt.add_to')}
      aria-label={t('playlistsExt.add_to')}
      type="button"
    >
      <Plus size={16} className="AddToPlaylistIcon" />
      {children}
    </button>
  )
}