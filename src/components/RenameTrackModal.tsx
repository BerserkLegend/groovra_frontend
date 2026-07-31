import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface RenameTrackModalProps {
  isOpen: boolean
  currentTitle: string
  errorMessage?: string | null
  onClose: () => void
  onRename: (newTitle: string) => Promise<void>
}

export const RenameTrackModal: React.FC<RenameTrackModalProps> = ({ isOpen, currentTitle, errorMessage, onClose, onRename }) => {
  const { t } = useTranslation()
  const [title, setTitle] = useState(currentTitle)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onRename(title.trim())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="ModalOverlay" onClick={handleClose}>
      <div className="PlaylistModal" onClick={e => e.stopPropagation()}>
        <div className="PlaylistModalHeader">
          <h3 className="PlaylistModalTitle">
            {t('renameTrackModal.title', { defaultValue: 'Перейменувати трек' })}
          </h3>
          <button type="button" className="PlaylistModalCloseBtn" onClick={handleClose} aria-label={t('commentsModal.close')}>
            ✕
          </button>
        </div>

        <div className="PlaylistModalBody">
          {errorMessage && <div className="TwoFaAlertError">{errorMessage}</div>}
          <div className="PlaylistInputGroup">
            <label className="PlaylistInputLabel" htmlFor="rename-track-input">
              {t('renameTrackModal.name_label', { defaultValue: 'Назва треку' })}
            </label>
            <input
              id="rename-track-input"
              name="title"
              type="text"
              className="SettingsInput PlaylistInput"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              maxLength={256}
            />
          </div>
        </div>

        <div className="PlaylistModalActions">
          <button
            type="button"
            className="PlaylistModalCancelBtn"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('createPlaylistModal.cancel')}
          </button>
          <button
            type="button"
            className="PlaylistModalSubmitBtn"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting
              ? t('renameTrackModal.saving', { defaultValue: 'Збереження…' })
              : t('renameTrackModal.save', { defaultValue: 'Зберегти' })}
          </button>
        </div>
      </div>
    </div>
  )
}
