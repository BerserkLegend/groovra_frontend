import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { downloadFile } from '../utils/download'

const CloseIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
const DownloadIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
)

interface ImageLightboxProps {
  url: string
  fileName?: string | null
  onClose: () => void
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ url, fileName, onClose }) => {
  const { t } = useTranslation()
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadFile(url, fileName)
    } catch (err) {
      console.error('[ImageLightbox] Failed to download image:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="ModalOverlay ImageLightboxOverlay" onClick={onClose}>
      <div className="ImageLightboxToolbar" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="ImageLightboxBtn"
          aria-label={t('chat.download_image')}
          disabled={isDownloading}
          onClick={handleDownload}
        >
          <DownloadIcon />
        </button>
        <button type="button" className="ImageLightboxBtn" aria-label={t('chat.close')} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <img
        src={url}
        alt={fileName ?? t('chat.image')}
        className="ImageLightboxImg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
