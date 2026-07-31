import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Copy, Check, Download, AlertTriangle, KeyRound } from 'lucide-react'
import QRCode from 'qrcode'
import { setupTwoFactor, enableTwoFactor, disableTwoFactor } from '../api/two-factor'
import './TwoFactorModal.css'

interface TwoFactorModalProps {
  isOpen: boolean
  mode: 'setup' | 'disable'
  onClose: () => void
  onSuccess: () => void
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  mode,
  onClose,
  onSuccess
}) => {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [secretKey, setSecretKey] = useState('')
  const [otpAuthUri, setOtpAuthUri] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [password, setPassword] = useState('')
  const [disableCode, setDisableCode] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState(false)

  useEffect(() => {
    if (isOpen && mode === 'setup') {
      setStep(1)
      setTotpCode('')
      setError(null)
      setIsLoading(true)
      setupTwoFactor()
        .then((res) => {
          setSecretKey(res.secretKey)
          setOtpAuthUri(res.otpAuthUri)
        })
        .catch((err) => {
          setError(err.message || (isEn ? 'Failed to start 2FA setup' : 'Не вдалося розпочати налаштування 2FA'))
        })
        .finally(() => setIsLoading(false))
    } else if (isOpen && mode === 'disable') {
      setPassword('')
      setDisableCode('')
      setError(null)
    }
  }, [isOpen, mode, isEn])

  if (!isOpen) return null

  const handleCopyKey = () => {
    navigator.clipboard.writeText(secretKey)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setCopiedCodes(true)
    setTimeout(() => setCopiedCodes(false), 2000)
  }

  const handleDownloadCodes = () => {
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'groovra-2fa-recovery-codes.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleEnableSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!totpCode || totpCode.trim().length !== 6) {
      setError(isEn ? 'Enter valid 6-digit code' : 'Введіть коректний 6-значний код')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await enableTwoFactor(totpCode.trim())
      setRecoveryCodes(res.recoveryCodes)
      setStep(3)
    } catch (err: any) {
      setError(err.message || (isEn ? 'Failed to enable 2FA' : 'Не вдалося увімкнути 2FA'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() && !disableCode.trim()) {
      setError(
        isEn
          ? 'Enter password OR your 6-digit 2FA code / recovery code'
          : 'Введіть пароль АБО 6-значний код 2FA / код відновлення'
      )
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await disableTwoFactor(password, disableCode.trim() || undefined)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || (isEn ? 'Failed to disable 2FA' : 'Не вдалося вимкнути 2FA'))
    } finally {
      setIsLoading(false)
    }
  }

  // Генерируется целиком на клиенте (библиотека qrcode) - раньше otpauth:// URI с сырым
  // TOTP-секретом отправлялся на сторонний api.qrserver.com, что раскрывало секрет 2FA
  // ещё до того, как аккаунт был защищён.
  const [qrDataUrl, setQrDataUrl] = useState('')
  useEffect(() => {
    if (!otpAuthUri) {
      setQrDataUrl('')
      return
    }
    QRCode.toDataURL(otpAuthUri, { width: 200, margin: 1 })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to render 2FA QR code:', err))
  }, [otpAuthUri])

  return createPortal(
    <div className="TwoFaOverlay" onClick={onClose}>
      <div className="TwoFaModal" onClick={(e) => e.stopPropagation()}>
        <button className="TwoFaCloseBtn" onClick={onClose}>×</button>

        {mode === 'setup' && (
          <>
            <div className="TwoFaStepBadge">
              {isEn ? `Step ${step} of 3` : `Крок ${step} з 3`}
            </div>
            <h3 className="TwoFaTitle">
              <ShieldCheck style={{ color: 'var(--color-accent-blue)' }} size={24} />
              {isEn ? 'Configure Two-Factor Auth' : 'Налаштування 2FA'}
            </h3>

            {error && <div className="TwoFaAlertError">{error}</div>}

            {step === 1 && (
              <div>
                <p className="TwoFaSubtitle">
                  {isEn
                    ? 'Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password), or enter the secret key manually.'
                    : 'Відскануйте QR-код за допомогою програми авторизатора (Google Authenticator, Authy, 1Password) або введіть секретний ключ вручну.'}
                </p>

                <div className="TwoFaQrContainer">
                  {isLoading || !qrDataUrl ? (
                    <div style={{ padding: 40 }}>{isEn ? 'Generating QR code...' : 'Генерація QR-коду...'}</div>
                  ) : (
                    <img src={qrDataUrl} alt="2FA QR Code" className="TwoFaQrImage" />
                  )}
                  <div className="TwoFaSecretBox">
                    <span>{secretKey || '...'}</span>
                    <button type="button" className="TwoFaCopyBtn" onClick={handleCopyKey}>
                      {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="TwoFaBtnPrimary"
                  onClick={() => setStep(2)}
                  disabled={isLoading || !secretKey}
                >
                  {isEn ? 'Next' : 'Далі'}
                </button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleEnableSubmit}>
                <p className="TwoFaSubtitle">
                  {isEn
                    ? 'Enter the 6-digit verification code generated by your authenticator app.'
                    : 'Введіть 6-значний код підтвердження з вашої програми авторизатора.'}
                </p>

                <div className="TwoFaInputGroup">
                  <label className="TwoFaInputLabel">
                    {isEn ? 'Verification Code' : 'Код підтвердження'}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className="TwoFaCodeInput"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>

                <div className="TwoFaActions" style={{ marginTop: 24 }}>
                  <button
                    type="button"
                    className="TwoFaCopyBtn"
                    style={{ padding: '12px 20px' }}
                    onClick={() => setStep(1)}
                  >
                    {isEn ? 'Back' : 'Назад'}
                  </button>
                  <button
                    type="submit"
                    className="TwoFaBtnPrimary"
                    disabled={isLoading || totpCode.length !== 6}
                  >
                    {isLoading ? (isEn ? 'Verifying...' : 'Перевірка...') : (isEn ? 'Enable 2FA' : 'Увімкнути 2FA')}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div>
                <div className="TwoFaAlertWarning" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>{isEn ? 'Save your recovery codes!' : 'Збережіть ваші резервні коди!'}</strong>
                    <br />
                    {isEn
                      ? 'If you lose access to your authenticator app, these codes are the only way to recover access.'
                      : 'Якщо ви втратите доступ до програми авторизатора, ці коди — єдиний спосіб відновити доступ.'}
                  </div>
                </div>

                <div className="TwoFaRecoveryGrid">
                  {recoveryCodes.map((code, idx) => (
                    <div key={idx} className="TwoFaRecoveryCodeItem">
                      {code}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <button type="button" className="TwoFaCopyBtn" style={{ flex: 1, padding: 10 }} onClick={handleCopyCodes}>
                    {copiedCodes ? <Check size={16} /> : <Copy size={16} />} {isEn ? 'Copy' : 'Скопіювати'}
                  </button>
                  <button type="button" className="TwoFaCopyBtn" style={{ flex: 1, padding: 10 }} onClick={handleDownloadCodes}>
                    <Download size={16} /> {isEn ? 'Download' : 'Завантажити TXT'}
                  </button>
                </div>

                <button
                  type="button"
                  className="TwoFaBtnPrimary"
                  onClick={() => {
                    onSuccess()
                    onClose()
                  }}
                >
                  {isEn ? 'Done' : 'Завершити'}
                </button>
              </div>
            )}
          </>
        )}

        {mode === 'disable' && (
          <form onSubmit={handleDisableSubmit}>
            <h3 className="TwoFaTitle">
              <KeyRound style={{ color: '#ef4444' }} size={24} />
              {isEn ? 'Disable Two-Factor Auth' : 'Вимкнути 2FA'}
            </h3>
            <p className="TwoFaSubtitle">
              {isEn
                ? 'Enter your account password OR your 6-digit 2FA code / recovery code to disable two-factor authentication.'
                : 'Введіть пароль облікового запису АБО 6-значний код 2FA / код відновлення для вимкнення 2FA.'}
            </p>

            {error && <div className="TwoFaAlertError">{error}</div>}

            <div className="TwoFaInputGroup">
              <label className="TwoFaInputLabel">{isEn ? 'Current Password (if set)' : 'Поточний пароль (якщо є)'}</label>
              <input
                type="password"
                autoComplete="current-password"
                className="TwoFaCodeInput"
                style={{ textAlign: 'left', letterSpacing: 'normal', fontFamily: 'inherit' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </div>

            <div className="TwoFaInputGroup">
              <label className="TwoFaInputLabel">{isEn ? '2FA Code or Recovery Code' : 'Код 2FA або код відновлення'}</label>
              <input
                type="text"
                className="TwoFaCodeInput"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="123456"
              />
            </div>

            <div className="TwoFaActions" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="TwoFaCopyBtn"
                style={{ padding: '12px 20px' }}
                onClick={onClose}
              >
                {isEn ? 'Cancel' : 'Скасувати'}
              </button>
              <button type="submit" className="TwoFaBtnDanger" disabled={isLoading || (!password.trim() && !disableCode.trim())}>
                {isLoading ? (isEn ? 'Disabling...' : 'Вимкнення...') : (isEn ? 'Disable 2FA' : 'Вимкнути 2FA')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
