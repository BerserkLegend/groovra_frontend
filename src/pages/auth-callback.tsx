import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loginWithGoogleApi } from '../api/auth'
import { setAccessToken, getOrCreateDeviceId, decodeTokenEmail } from '../api/api-client'
import { translateServerError } from '../api/error-translator'

import Loader from '../components/Loader'

export const AuthCallback = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (!code) {
        setError(t('errors.callback_code_missing'))
        return
      }

      try {
        const deviceId = getOrCreateDeviceId()
        const redirectUri = `${window.location.origin}/auth/callback`
        const result = await loginWithGoogleApi({ code, deviceId, redirectUri })
        const token = result?.token || result?.Token

        if (token) {
          const email = decodeTokenEmail(token)
          if (email) {
            localStorage.setItem('UserEmail', email)
          }
          setAccessToken(token)
          navigate('/main')
        } else {
          throw new Error(t('errors.callback_token_missing'))
        }
      } catch (err: unknown) {
        console.error("Google auth callback error:", err)
        if (err instanceof Error) {
          setError(translateServerError(err.message, t))
        } else {
          setError(t('errors.google_failed'))
        }
      }
    }

    handleCallback()
  }, [navigate, t])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121414' }}>
      {error ? (
        <div style={{ maxWidth: '500px', padding: '20px', textAlign: 'center', fontFamily: 'SUSE, sans-serif' }}>
          <div style={{ color: '#ef4444', marginBottom: '20px', fontSize: '18px' }}>{error}</div>
          <button onClick={() => navigate('/login')} style={{ backgroundColor: '#72DEEF', color: '#121414', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {t('auth.login_btn')}
          </button>
        </div>
      ) : (
        <Loader variant="fullscreen" text={t('auth.callback_loading')} />
      )}
    </div>
  )
}
