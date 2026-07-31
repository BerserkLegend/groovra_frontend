import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListMusic, Plus, X, Lock, Music, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePlaylistModal } from '../context/playlist-modal-context'
import Loader from './Loader'

export const PlaylistModal: React.FC = () => {
  const { t } = useTranslation()
  const { isOpen, closeModal, playlists, addToPlaylist, isLoading, toastMessage } = usePlaylistModal()

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="PlaylistModalOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="PlaylistModalContainer"
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="playlist-modal-title"
            >
              <div className="BottomSheetHandle" />

              <div className="PlaylistModalHeader">
                <div className="PlaylistModalTitleGroup">
                  <div className="PlaylistModalIconBadge">
                    <ListMusic size={20} className="PlaylistModalHeaderIcon" />
                  </div>
                  <h3 id="playlist-modal-title" className="PlaylistModalTitle">
                    {t('playlistModal.title')}
                  </h3>
                </div>
                <button
                  type="button"
                  className="PlaylistModalCloseBtn"
                  onClick={closeModal}
                  aria-label={t('playlistModal.close')}
                  title={t('playlistModal.close')}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="PlaylistModalBody">
                {isLoading ? (
                  <div className="PlaylistModalLoader">
                    <Loader variant="section" size="sm" />
                  </div>
                ) : playlists.length === 0 ? (
                  <div className="PlaylistModalEmpty">
                    <div className="PlaylistEmptyIconWrapper">
                      <ListMusic size={32} />
                    </div>
                    <p className="PlaylistEmptyTitle">{t('playlistModal.empty_title')}</p>
                    <p className="PlaylistEmptyDesc">{t('playlistModal.empty_desc')}</p>
                  </div>
                ) : (
                  <div className="PlaylistOptionsList">
                    {playlists.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="PlaylistOptionItem"
                        onClick={() => addToPlaylist(p.id)}
                      >
                        <div className="PlaylistOptionIcon">
                          <Music size={18} />
                        </div>
                        <div className="PlaylistOptionInfo">
                          <span className="PlaylistOptionTitle">{p.title}</span>
                          <span className="PlaylistOptionMeta">
                            {t('library.album_track_count', { count: p.trackCount ?? 0 })} {p.isPrivate && <Lock size={12} className="LockIcon" />}
                          </span>
                        </div>
                        <div className="PlaylistOptionAction">
                          <Plus size={18} className="ActionPlusIcon" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="PlaylistModalFooter">
                <button
                  type="button"
                  className="PlaylistModalCancelBtn"
                  onClick={closeModal}
                >
                  {t('createPlaylistModal.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="ToastNotification"
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
          >
            <Check size={16} className="ToastCheckIcon" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}