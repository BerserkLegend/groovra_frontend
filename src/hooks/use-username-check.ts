import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GATEWAY_URL } from '../api/api-client'

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'

export interface UsernameCheckResult {
  status: UsernameStatus
  message: string
}

const MIN_LENGTH = 3
const MAX_LENGTH = 30
const VALID_PATTERN = /^[a-zA-Z0-9_.-]+$/
const DEBOUNCE_MS = 500

export function useUsernameCheck(username: string): UsernameCheckResult {
  const { t } = useTranslation()
  const [status, setStatus]   = useState<UsernameStatus>('idle')
  const [message, setMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let active = true

    if (!username) {
      Promise.resolve().then(() => {
        if (active) {
          setStatus('idle')
          setMessage('')
        }
      })
      return
    }

    if (username.length < MIN_LENGTH) {
      Promise.resolve().then(() => {
        if (active) {
          setStatus('invalid')
          setMessage(t('usernameCheck.min_length', { count: MIN_LENGTH }))
        }
      })
      return
    }
    if (username.length > MAX_LENGTH) {
      Promise.resolve().then(() => {
        if (active) {
          setStatus('invalid')
          setMessage(t('usernameCheck.max_length', { count: MAX_LENGTH }))
        }
      })
      return
    }
    if (!VALID_PATTERN.test(username)) {
      Promise.resolve().then(() => {
        if (active) {
          setStatus('invalid')
          setMessage(t('usernameCheck.invalid_pattern'))
        }
      })
      return
    }

    Promise.resolve().then(() => {
      if (active) {
        setStatus('checking')
        setMessage('')
      }
    })

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch(
          `${GATEWAY_URL}/auth/checkusername?username=${encodeURIComponent(username)}`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error('server')
        }

        const data = await response.json()

        if (active) {
          if (data.available) {
            setStatus('available')
            setMessage(t('usernameCheck.available'))
          } else {
            setStatus('taken')
            setMessage(t('usernameCheck.taken'))
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return   
        if (active) {
          setStatus('error')
          setMessage(t('usernameCheck.error'))
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      active = false
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [username, t])

  return { status, message }
}