import AuthHeader from '../components/auth-header'
import MiddleLogo from '../assets/MiddleLogo.svg'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GATEWAY_URL } from '../api/api-client'
import { translateServerError } from '../api/error-translator'
import { Eye, EyeOff } from 'lucide-react'

export const Recovery = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const email = localStorage.getItem('RecoveryEmail')
    const token = localStorage.getItem('ResetToken')
    if (!email || !token) {
      navigate('/forgotpassword')
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
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

    const email = localStorage.getItem('RecoveryEmail')
    const token = localStorage.getItem('ResetToken')
    if (!email || !token) {
      setError(t('errors.recovery_data_missing'))
      navigate('/forgotpassword')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${GATEWAY_URL}/auth/confirmresetpassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword: password, token }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || data.Message || t('errors.recovery_failed'))
      }

      localStorage.removeItem('RecoveryEmail')
      localStorage.removeItem('ResetToken')
      navigate('/login')
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

  const isSubmitDisabled = isLoading || !password || !confirmPassword || password.length < 8 || password !== confirmPassword

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
              <label htmlFor="recovery-password" className='auth-label'>{t('auth.new_password_label')}</label>
              <div className='auth-input-wrapper'>
                <input
                  id="recovery-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.hint_chars')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
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
            </div>

            <div className='auth-form-group'>
              <label htmlFor="recovery-confirm-password" className='auth-label'>{t('auth.confirm_password')}</label>
              <div className='auth-input-wrapper'>
                <input
                  id="recovery-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('auth.confirm_password_placeholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
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
            </div>

            <button type="submit" className='auth-button' disabled={isSubmitDisabled}>
              {isLoading ? t('auth.wait') : t('auth.continue')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}