import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './ConfirmModal.css'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

const WarningIcon: React.FC = () => (
  <svg
    className="ConfirmModalIcon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation()
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleCancel = () => {
    if (isProcessing) return
    onClose()
  }

  const handleConfirm = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await onConfirm()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div
      className="ConfirmModalOverlay"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="ConfirmModalContent" onClick={e => e.stopPropagation()}>
        <div className="ConfirmModalGlow" />

        <div className="ConfirmModalIconWrapper">
          <WarningIcon />
        </div>

        <h3 id="confirm-modal-title" className="ConfirmModalTitle">
          {title}
        </h3>

        <p className="ConfirmModalDescription">{message}</p>

        <div className="ConfirmModalActions">
          <button
            type="button"
            className="ConfirmModalBtn ConfirmModalCancelBtn"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            {cancelLabel ?? t('confirmModal.cancel', { defaultValue: 'Скасувати' })}
          </button>
          <button
            type="button"
            className="ConfirmModalBtn ConfirmModalConfirmBtn"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing
              ? t('confirmModal.processing', { defaultValue: 'Виконання…' })
              : confirmLabel ?? t('confirmModal.confirm', { defaultValue: 'Підтвердити' })}
          </button>
        </div>
      </div>
    </div>
  )
}
