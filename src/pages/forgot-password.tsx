import AuthHeader from '../components/auth-header'
import MiddleLogo from '../assets/MiddleLogo.svg'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GATEWAY_URL } from '../api/api-client'
import { translateServerError } from '../api/error-translator'

export const Forgot = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError(t('errors.email_required'))
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${GATEWAY_URL}/auth/requestresetpassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || t('errors.connection'))
      }

      localStorage.setItem('RecoveryEmail', email)
      navigate('/emailcod')
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

  const isSubmitDisabled = isLoading || !email.trim()

  return (
    <div className='auth-wrapper'>
      <AuthHeader />

      <div className='auth-content'>
        <div className='auth-container'>
          <img src={MiddleLogo} className='auth-middle-logo' alt="Logo" />
          <span className='auth-title'>{t('auth.recovery_title')}</span>

          {error && <div className='auth-error' role="alert">{error}</div>}

          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className='auth-form-group'>
              <label htmlFor="forgot-email" className='auth-label'>{t('auth.email')}</label>
              <div className='auth-input-wrapper'>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder={t('auth.enter_email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>
            <button type="submit" className='auth-button' disabled={isSubmitDisabled}>
              {isLoading ? t('auth.wait') : t('auth.continue')}
            </button>
          </form>

          <div className='auth-footer'>
            <Link to="/reg" className='auth-footer-link'>{t('auth.back_to_reg')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}