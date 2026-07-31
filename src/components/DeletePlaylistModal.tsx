import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './DeletePlaylistModal.css'

interface DeletePlaylistModalProps {
  isOpen: boolean
  playlistTitle: string
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

const TrashIcon: React.FC = () => (
  <svg
    className="DeletePlaylistModalIcon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

export const DeletePlaylistModal: React.FC<DeletePlaylistModalProps> = ({
  isOpen,
  playlistTitle,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  const handleCancel = () => {
    if (isDeleting) return
    onClose()
  }

  const handleConfirm = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className="DeletePlaylistModalOverlay"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-playlist-title"
    >
      <div
        className="DeletePlaylistModalContent"
        onClick={e => e.stopPropagation()}
      >
        <div className="DeletePlaylistModalGlow" />

        <div className="DeletePlaylistModalIconWrapper">
          <TrashIcon />
        </div>

        <h3 id="delete-playlist-title" className="DeletePlaylistModalTitle">
          {t('deletePlaylistModal.title')}
        </h3>

        <p className="DeletePlaylistModalDescription">
          {t('deletePlaylistModal.description', {
            name: playlistTitle,
            defaultValue: `Плейлист «${playlistTitle}» буде назавжди вилучено з вашої медіатеки. Ця дія незворотна.`,
          })}
        </p>

        <div className="DeletePlaylistModalActions">
          <button
            type="button"
            className="DeletePlaylistModalBtn DeletePlaylistModalCancelBtn"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            {t('deletePlaylistModal.cancel')}
          </button>
          <button
            type="button"
            className="DeletePlaylistModalBtn DeletePlaylistModalConfirmBtn"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? t('deletePlaylistModal.deleting')
              : t('deletePlaylistModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
