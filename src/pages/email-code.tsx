import AuthHeader from '../components/auth-header'
import MiddleLogo from '../assets/MiddleLogo.svg'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GATEWAY_URL } from '../api/api-client'
import { translateServerError } from '../api/error-translator'

export const Cod = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const email = localStorage.getItem('RecoveryEmail')
    if (!email) {
      navigate('/forgotpassword')
    }
  }, [navigate])

  const handleChange = (value: string, index: number) => {
    const sanitized = value.replace(/[^0-9a-zA-Z]/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = sanitized
    setCode(newCode)

    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length < 6) {
      setError(t('errors.code_length'))
      return
    }

    const email = localStorage.getItem('RecoveryEmail')
    if (!email) {
      setError(t('errors.email_not_found'))
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`${GATEWAY_URL}/auth/verifycodepasswordreset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || data.Message || t('errors.code_invalid'))
      }

      const resetToken = data.token || data.Token
      if (resetToken) {
        localStorage.setItem('ResetToken', resetToken)
      } else {
        throw new Error(t('errors.callback_token_missing'))
      }

      navigate('/passwordrecovery')
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

  return (
    <div className='auth-wrapper'>
      <AuthHeader />

      <div className='auth-content'>
        <div className='auth-container'>
          <img src={MiddleLogo} className='auth-middle-logo' alt="Logo" />
          <span className='auth-title'>{t('auth.recovery_title')}</span>
          <span className='auth-subtitle'>{t('auth.recovery_subtitle')}</span>

          {error && <div className='auth-error' role="alert">{error}</div>}

          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="auth-code-container">
              {code.map((symbol, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={symbol}
                  onChange={(e) => handleChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="auth-code-input"
                  disabled={isLoading}
                  aria-label={`${t('auth.enter_code_char')} ${index + 1}`}
                />
              ))}
            </div>
            <button type="submit" className='auth-button' disabled={isLoading || code.join('').length < 6}>
              {isLoading ? t('auth.wait') : t('auth.verify_btn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}