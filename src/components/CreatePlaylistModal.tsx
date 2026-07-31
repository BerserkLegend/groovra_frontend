import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: { title: string; description: string; isPrivate: boolean }) => Promise<void>
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ isOpen, onClose, onCreate }) => {
  const { t } = useTranslation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setTitle('')
    setDescription('')
    setIsPrivate(false)
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onCreate({ title: title.trim(), description: description.trim(), isPrivate })
      reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="ModalOverlay" onClick={handleClose}>
      <div className="PlaylistModal" onClick={e => e.stopPropagation()}>
        <div className="PlaylistModalHeader">
          <h3 className="PlaylistModalTitle">
            {t('createPlaylistModal.title')}
          </h3>
          <button type="button" className="PlaylistModalCloseBtn" onClick={handleClose} aria-label={t('commentsModal.close')}>
            ✕
          </button>
        </div>

        <div className="PlaylistModalBody">
          <div className="PlaylistInputGroup">
            <label className="PlaylistInputLabel" htmlFor="playlist-title-input">
              {t('createPlaylistModal.name_label')}
            </label>
            <input
              id="playlist-title-input"
              name="title"
              type="text"
              className="SettingsInput PlaylistInput"
              placeholder={t('createPlaylistModal.name_placeholder')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="PlaylistInputGroup">
            <label className="PlaylistInputLabel" htmlFor="playlist-desc-input">
              {t('createPlaylistModal.desc_label')}
            </label>
            <input
              id="playlist-desc-input"
              name="description"
              type="text"
              className="SettingsInput PlaylistInput"
              placeholder={t('createPlaylistModal.desc_placeholder')}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="PlaylistOptionGroup">
            <button
              type="button"
              className={`PlaylistOptionBtn ${!isPrivate ? 'active' : ''}`}
              onClick={() => setIsPrivate(false)}
            >
              <span className="PlaylistOptionBtnTitle">🌍 {t('createPlaylistModal.public')}</span>
              <span className="PlaylistOptionBtnDesc">
                {t('createPlaylistModal.public_desc')}
              </span>
            </button>
            <button
              type="button"
              className={`PlaylistOptionBtn ${isPrivate ? 'active' : ''}`}
              onClick={() => setIsPrivate(true)}
            >
              <span className="PlaylistOptionBtnTitle">🔒 {t('createPlaylistModal.private')}</span>
              <span className="PlaylistOptionBtnDesc">
                {t('createPlaylistModal.private_desc')}
              </span>
            </button>
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
            {isSubmitting ? t('createPlaylistModal.creating') : t('createPlaylistModal.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
