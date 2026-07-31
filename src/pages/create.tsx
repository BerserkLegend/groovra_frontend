import AuthHeader from '../components/auth-header'
import MiddleLogo from '../assets/MiddleLogo.svg'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GATEWAY_URL, getOrCreateDeviceId, setAccessToken } from '../api/api-client'
import { translateServerError } from '../api/error-translator'
import { usePasswordStrength } from '../hooks/use-password-strength'
import { confirmRegister } from '../api/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Eye, EyeOff } from 'lucide-react'

export const Create = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const [showCodeModal, setShowCodeModal] = useState(false)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [codeError, setCodeError] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const strength = usePasswordStrength(password)

  const confirmFilled     = confirmPassword.length > 0
  const passwordsMatch    = confirmFilled && password === confirmPassword
  const passwordsMismatch = confirmFilled && password !== confirmPassword

  useEffect(() => {
    const email = localStorage.getItem('RegistrationEmail')
    const username = localStorage.getItem('RegistrationUsername')
    if (!email || !username) {
      navigate('/reg')
    }
  }, [navigate])

  const handleCodeChange = (value: string, index: number) => {
    const sanitized = value.replace(/[^0-9a-zA-Z]/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = sanitized
    setCode(newCode)

    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length < 6) {
      setCodeError(t('errors.code_length'))
      return
    }

    const email = localStorage.getItem('RegistrationEmail')
    if (!email) {
      setCodeError(t('errors.email_not_found'))
      navigate('/reg')
      return
    }

    setIsConfirming(true)
    setCodeError('')
    try {
      const deviceId = getOrCreateDeviceId()
      const data = await confirmRegister({ email, code: fullCode, deviceId } as any)

      if (data.Token || data.token) {
        localStorage.setItem('UserEmail', email)
        setAccessToken(data.Token || data.token)

        localStorage.removeItem('RegistrationEmail')
        localStorage.removeItem('RegistrationUsername')
        setShowCodeModal(false)
        navigate('/main')
      } else {
        throw new Error(t('errors.callback_token_missing'))
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCodeError(translateServerError(err.message, t))
      } else {
        setCodeError(t('errors.unknown'))
      }
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCloseModal = () => {
    setShowCodeModal(false)
    setCode(['', '', '', '', '', ''])
    setCodeError('')
  }

  useEffect(() => {
    if (!showCodeModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCodeModal])

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t('errors.password_length'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('errors.password_mismatch'))
      return
    }

    const email = localStorage.getItem('RegistrationEmail')
    const username = localStorage.getItem('RegistrationUsername')
    if (!email || !username) {
      setError(t('errors.email_not_found_reg'))
      navigate('/reg')
      return
    }

    setIsLoading(true)
    try {
      const deviceId = getOrCreateDeviceId()
      const response = await fetch(`${GATEWAY_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, username, password, deviceId }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || data.Message || t('errors.reg_failed'))
      }

      setShowCodeModal(true)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(translateServerError(err.message, t))
      } else {
        setError(t('errors.unknown'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isSubmitDisabled = isLoading || passwordsMismatch || strength.level === 'weak' || !password

  return (
    <div className='auth-wrapper'>
      <AuthHeader />

      <div className='auth-content'>
        <div className='auth-container'>
          <img src={MiddleLogo} className='auth-middle-logo' alt='Logo' />
          <span className='auth-title'>{t('auth.create_title')}</span>

          {error && <div className='auth-error' role="alert">{error}</div>}

          <form onSubmit={handleContinue} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className='auth-form-group'>
              <label htmlFor="create-password" className='auth-label'>{t('auth.password')}</label>
              <div className='auth-input-wrapper'>
                <input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setShowRules(true) }}
                  onFocus={() => setShowRules(true)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-password-btn"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? t('auth.hide_password', 'Сховати пароль') : t('auth.show_password', 'Показати пароль')}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {password.length > 0 && (
                <div style={{ marginTop: '0.5rem', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        style={{ flex: 1, borderRadius: '2px', backgroundColor: i < strength.score ? strength.color : '#3a3a3a', transition: 'background-color 0.25s ease' }} />
                    ))}
                  </div>

                  {strength.labelText && (
                    <span style={{ fontSize: '0.72rem', color: strength.color, marginTop: '3px', display: 'block' }}>
                      {strength.labelText}
                    </span>
                  )}

                  {showRules && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0.4rem 0 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {strength.rules.map(rule => (
                        <li
                          key={rule.label}
                          style={{ fontSize: '0.72rem', color: rule.passed ? '#5ce07a' : '#888', display: 'flex', alignItems: 'center', gap: '5px', transition: 'color 0.2s' }} >
                          <span style={{ fontWeight: 700 }}>{rule.passed ? '✓' : '○'}</span>
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {!password && <span className='auth-hint'>{t('auth.hint_chars')}</span>}
            </div>

            <div className='auth-form-group'>
              <label htmlFor="create-confirm-password" className='auth-label'>{t('auth.confirm_password')}</label>
              <div className='auth-input-wrapper' style={{ position: 'relative' }}>
                <input
                  id="create-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('auth.confirm_password_placeholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                  style={{ paddingRight: confirmFilled ? '3.5rem' : '0.5rem' }}
                />
                {confirmFilled && (
                  <span style={{ position: 'absolute', right: '2.5rem', top: '50%', transform: 'translateY(-50%)', color: passwordsMatch ? '#5ce07a' : '#e05c5c', fontWeight: 700, pointerEvents: 'none' }}>
                    {passwordsMatch ? '✓' : '✗'}
                  </span>
                )}
                <button
                  type="button"
                  className="auth-toggle-password-btn"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  aria-label={showConfirmPassword ? t('auth.hide_password', 'Сховати пароль') : t('auth.show_password', 'Показати пароль')}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmFilled && (
                <span
                  className='auth-hint'
                  role="status"
                  aria-live="polite"
                  style={{ color: passwordsMatch ? '#5ce07a' : '#e05c5c', marginTop: '0.3rem' }}
                >
                  {passwordsMatch ? t('errors.password_match') : t('errors.password_mismatch')}
                </span>
              )}
            </div>

            <button type="submit" className='auth-button' disabled={isSubmitDisabled}>
              {isLoading ? t('auth.wait') : t('auth.continue')}
            </button>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {showCodeModal && (
          <div className="AuthModalOverlay">
            <motion.div
              className="AuthModalBackdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
            />

            <motion.div
              className="AuthModalContainer"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              role="dialog"
              aria-modal="true"
              style={{ maxWidth: '480px', padding: '40px 24px' }}
            >
              <button
                className="AuthModalCloseBtn"
                onClick={handleCloseModal}
                aria-label="Close modal"
                type="button"
              >
                <X size={20} />
              </button>

              <div className="AuthModalIconBadge" style={{ background: 'linear-gradient(135deg, rgba(92, 224, 122, 0.15), rgba(169, 143, 219, 0.25))', borderColor: 'rgba(92, 224, 122, 0.4)' }}>
                <Mail size={32} style={{ color: '#5ce07a' }} />
              </div>

              <h2 className="AuthModalTitle" style={{ background: 'linear-gradient(135deg, #ffffff 30%, #5ce07a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('confirmReg.title')}
              </h2>

              <p className="AuthModalSubtitle">
                {t('confirmReg.subtitle')}
              </p>

              {codeError && <div className="auth-error" role="alert" style={{ marginBottom: '20px', width: '100%' }}>{codeError}</div>}

              <form onSubmit={handleConfirmSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="auth-code-container" style={{ gap: '8px', marginBottom: '30px' }}>
                  {code.map((symbol, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={symbol}
                      onChange={(e) => handleCodeChange(e.target.value, index)}
                      onKeyDown={(e) => handleCodeKeyDown(e, index)}
                      disabled={isConfirming}
                      className="auth-code-input"
                      style={{ 
                        width: '48px', 
                        height: '56px', 
                        fontSize: '24px', 
                        borderWidth: '3px', 
                        borderRadius: '12px',
                        margin: 0
                      }}
                      aria-label={t('confirmReg.symbol_aria', { index: index + 1 })}
                    />
                  ))}
                </div>

                <button type="submit" className="AuthModalRegisterBtn" disabled={isConfirming || code.join('').length < 6}>
                  {isConfirming ? t('auth.wait') : t('confirmReg.confirm_btn')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
