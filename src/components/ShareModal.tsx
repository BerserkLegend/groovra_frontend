import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Copy, Check, X, Send, MessageCircle, Code, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TrackCover } from './common/TrackCover'

const TwitterIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  trackTitle?: string
  artistName?: string
  coverUrl?: string
  trackId?: string
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  trackTitle,
  artistName,
  coverUrl,
  trackId,
}) => {
  const { t } = useTranslation()
  const displayTitle = trackTitle || t('commentsModal.default_track')
  const displayArtist = artistName || t('commentsModal.default_artist')
  const [isCopied, setIsCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'link' | 'embed'>('link')

  const shareUrl = trackId
    ? `${window.location.origin}/track?trackId=${trackId}`
    : window.location.href

  const embedCode = `<iframe src="${shareUrl}" width="100%" height="150" frameborder="0" allow="autoplay"></iframe>`

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleCopyLink = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
      .catch((err) => console.error('Failed to copy link:', err))
  }

  const shareText = t('shareModal.share_text', { title: displayTitle, artist: displayArtist })

  const socialLinks = [
    {
      name: 'Telegram',
      icon: Send,
      color: '#0088cc',
      bg: 'rgba(0, 136, 204, 0.15)',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Twitter / X',
      icon: TwitterIcon,
      color: '#F1F5F9',
      bg: 'rgba(255, 255, 255, 0.12)',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      bg: 'rgba(37, 211, 102, 0.15)',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="ShareModalOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="ShareModalContainer"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
          >
            <div className="BottomSheetHandle" />

            <div className="ShareModalHeader">
              <div className="ShareModalTitleGroup">
                <div className="ShareModalIconBadge">
                  <Share2 size={20} />
                </div>
                <h3 id="share-modal-title" className="ShareModalTitle">
                  {t('shareModal.title')}
                </h3>
              </div>
              <button
                type="button"
                className="ShareModalCloseBtn"
                onClick={onClose}
                aria-label={t('shareModal.close')}
                title={t('shareModal.close')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ShareTrackCard">
              <TrackCover
                src={coverUrl}
                alt={displayTitle}
                className="ShareTrackCover"
              />
              <div className="ShareTrackDetails">
                <span className="ShareTrackTitle">{displayTitle}</span>
                <span className="ShareTrackArtist">{displayArtist}</span>
              </div>
            </div>

            <div className="ShareTabSelector">
              <button
                type="button"
                className={`ShareTabBtn ${activeTab === 'link' ? 'active' : ''}`}
                onClick={() => setActiveTab('link')}
              >
                <ExternalLink size={14} /> {t('shareModal.tab_link')}
              </button>
              <button
                type="button"
                className={`ShareTabBtn ${activeTab === 'embed' ? 'active' : ''}`}
                onClick={() => setActiveTab('embed')}
              >
                <Code size={14} /> {t('shareModal.tab_embed')}
              </button>
            </div>

            <div className="ShareCopyWrapper">
              <input
                id="share-copy-input"
                name="shareLink"
                type="text"
                readOnly
                value={activeTab === 'link' ? shareUrl : embedCode}
                className="ShareCopyInput"
              />
              <button
                type="button"
                className={`ShareCopyBtn ${isCopied ? 'copied' : ''}`}
                onClick={() => handleCopyLink(activeTab === 'link' ? shareUrl : embedCode)}
              >
                {isCopied ? (
                  <>
                    <Check size={16} /> {t('shareModal.copied')}
                  </>
                ) : (
                  <>
                    <Copy size={16} /> {t('shareModal.copy')}
                  </>
                )}
              </button>
            </div>

            <div className="ShareSocialSection">
              <span className="ShareSocialHeading">{t('shareModal.social_heading')}</span>
              <div className="ShareSocialGrid">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ShareSocialItem"
                  >
                    <div
                      className="ShareSocialIconBadge"
                      style={{ backgroundColor: social.bg, color: social.color }}
                    >
                      <social.icon size={20} />
                    </div>
                    <span className="ShareSocialName">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
