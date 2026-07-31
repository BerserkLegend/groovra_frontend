import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AuthHeader from '../components/auth-header'
import MiddleLogo from '../assets/MiddleLogo.svg'
import Google from '../assets/Google.svg'
import { Link, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useUsernameCheck } from '../hooks/use-username-check'

const statusColor: Record<string, string> = {
  idle:      'transparent',
  checking:  '#888',
  available: '#5ce07a',
  taken:     '#e05c5c',
  invalid:   '#e0a45c',
  error:     '#e0a45c',
}

export const Reg = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isLoading] = useState(false)

  const { status: unStatus, message: unMessage } = useUsernameCheck(username)

  const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

  const loginWithGoogle = useGoogleLogin({
    flow: 'auth-code',
    ux_mode: 'redirect',
    redirect_uri: `${window.location.origin}/auth/callback`,
    onError: () => {
      setError(t('errors.google_failed'))
    }
  })

  const handleGoogleClick = () => {
    if (!hasGoogleClientId) {
      setError(t('errors.google_not_configured'))
      return
    }
    loginWithGoogle()
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !username) {
      setError(t('errors.email_required'))
      return
    }
    if (unStatus === 'invalid' || unStatus === 'taken') {
      setError(t('errors.username_invalid'))
      return
    }
    if (unStatus === 'checking') {
      setError(t('auth.wait'))
      return
    }
    localStorage.setItem('RegistrationEmail', email)
    localStorage.setItem('RegistrationUsername', username)
    navigate('/create')
  }

  const isSubmitDisabled = isLoading || unStatus === 'taken' || unStatus === 'checking' || unStatus === 'invalid'

  return (
    <div className='auth-wrapper'>
      <AuthHeader />

      <div className='auth-content'>
        <div className='auth-container'>
          <img src={MiddleLogo} className='auth-middle-logo' alt='MiddleLogo' />
          <span className='auth-title'>{t('auth.title_reg')}</span>

          {error && <div className='auth-error' role="alert">{error}</div>}

          <form onSubmit={handleContinue} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className='auth-form-group'>
              <label htmlFor="reg-username" className='auth-label'>{t('auth.username_label')}</label>
              <div className='auth-input-wrapper' style={{ position: 'relative' }}>
                <input
                  id="reg-username"
                  name="username"
                  type="text"
                  placeholder={t('auth.username_placeholder')}
                  value={username}
                  onChange={(e) => { setError(''); setUsername(e.target.value) }}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  style={{ paddingRight: '2rem' }}
                />
                {unStatus !== 'idle' && (
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: statusColor[unStatus], fontWeight: 700, pointerEvents: 'none' }}>
                    {unStatus === 'checking'  && '⏳'}
                    {unStatus === 'available' && '✓'}
                    {unStatus === 'taken'     && '✗'}
                    {unStatus === 'invalid'   && '!'}
                    {unStatus === 'error'     && '?'}
                  </span>
                )}
              </div>

              {unMessage && (
                <span className='auth-hint' role="status" aria-live="polite" style={{ color: statusColor[unStatus], marginTop: '0.3rem' }}>
                  {unMessage}
                </span>
              )}
              {!unMessage && <span className='auth-hint'>{t('auth.username_hint')}</span>}
            </div>

            <div className='auth-form-group'>
              <label htmlFor="reg-email" className='auth-label'>{t('auth.email')}</label>
              <div className='auth-input-wrapper'>
                <input
                  id="reg-email"
                  name="email"
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
              {t('auth.continue')}
            </button>
          </form>

          <span className='auth-or-text'>{t('auth.or')}</span>

          <button className='auth-google-btn' onClick={handleGoogleClick} disabled={isLoading} type="button">
            <img src={Google} alt='Google' />
            <span>{t('auth.google_reg')}</span>
          </button>

          <div className='auth-footer'>
            <span className='auth-footer-text'>{t('auth.have_account')}</span>
            <Link to="/login" className="auth-footer-link">{t('auth.login_btn')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
