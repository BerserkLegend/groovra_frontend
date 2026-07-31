import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch, GATEWAY_URL } from '../api/api-client'

export interface SubscriptionStatus {
  planType: 'Free' | 'Plus' | 'Premium'
  aiMixUsageCount: number
  aiMixLimit: number
  remainingAiMixes: number
  isActivePremium: boolean
  subscriptionExpiresAt: string | null
}

export interface PaymentRecord {
  id: string
  stripeSessionId: string
  planType: string
  amount: number
  currency: string
  status: string
  paymentMethod: string
  createdAt: string
  completedAt?: string | null
}

interface StripeCheckoutResult {
  sessionId: string
  checkoutUrl: string
  publishableKey: string
  isSandboxMode: boolean
  amount: number
  currency: string
  planType: string
  durationMonths: number
}

interface SubscriptionContextType {
  subscription: SubscriptionStatus
  paymentHistory: PaymentRecord[]
  isLoading: boolean
  isModalOpen: boolean
  isStripeModalOpen: boolean
  stripeModalTab: 'checkout' | 'history'
  audioQuality: 'standard' | 'high'
  spatialAudio: boolean
  openSubscriptionModal: () => void
  closeSubscriptionModal: () => void
  openStripeModal: (initialTab?: any) => void
  closeStripeModal: () => void
  fetchSubscriptionStatus: () => Promise<void>
  upgradeSubscription: (planType?: string, durationMonths?: number) => Promise<boolean>
  cancelSubscription: () => Promise<boolean>
  createStripeCheckout: (billingCycle?: 'monthly' | 'annual') => Promise<StripeCheckoutResult | null>
  confirmStripePayment: (sessionId: string) => Promise<boolean>
  fetchPaymentHistory: () => Promise<PaymentRecord[]>
  setAudioQuality: (quality: 'standard' | 'high') => void
  setSpatialAudio: (enabled: boolean) => void
}

const defaultSubscription: SubscriptionStatus = {
  planType: 'Free',
  aiMixUsageCount: 0,
  aiMixLimit: 3,
  remainingAiMixes: 3,
  isActivePremium: false,
  subscriptionExpiresAt: null,
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionStatus>(defaultSubscription)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>(() => {
    try {
      const cached = localStorage.getItem('groovra_payment_history')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isStripeModalOpen, setIsStripeModalOpen] = useState<boolean>(false)
  const [stripeModalTab, setStripeModalTab] = useState<'checkout' | 'history'>('checkout')
  const [audioQuality, setAudioQualityState] = useState<'standard' | 'high'>('standard')
  const [spatialAudio, setSpatialAudioState] = useState<boolean>(false)

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await apiFetch(`${GATEWAY_URL}/billing/subscription`)
      if (res.ok) {
        const data: SubscriptionStatus = await res.json()
        setSubscription(data)
      }
    } catch (err) {
      console.warn('Failed to fetch subscription status:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ВАЖНО: НЕ фабриковать успешную оплату/подписку локально, если реальный бэкенд-вызов
  // упал или вернул ошибку. Раньше все четыре функции ниже (upgradeSubscription,
  // createStripeCheckout, confirmStripePayment, fetchPaymentHistory) на любой ошибке молча
  // подставляли фейковый "Succeeded"-платёж и включали Premium локально - бесплатный Premium
  // для кого угодно без реальной оплаты. Теперь при ошибке возвращается false/null/[] и
  // локальный state не трогается - вызывающий код должен показать ошибку пользователю.
  const fetchPaymentHistory = useCallback(async (): Promise<PaymentRecord[]> => {
    try {
      const res = await apiFetch(`${GATEWAY_URL}/billing/payment/history`)
      if (res.ok) {
        const data: PaymentRecord[] = await res.json()
        if (Array.isArray(data)) {
          setPaymentHistory(data)
          localStorage.setItem('groovra_payment_history', JSON.stringify(data))
          return data
        }
      }
    } catch (err) {
      console.warn('Failed to fetch payment history:', err)
    }
    return paymentHistory
  }, [paymentHistory])

  useEffect(() => {
    fetchSubscriptionStatus()
    fetchPaymentHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSubscriptionStatus])

  const upgradeSubscription = async (planType: string = 'Premium', durationMonths: number = 1): Promise<boolean> => {
    try {
      setIsLoading(true)
      const res = await apiFetch(`${GATEWAY_URL}/billing/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType, durationMonths }),
      })
      if (res.ok) {
        const data: SubscriptionStatus = await res.json()
        setSubscription(data)
        setIsModalOpen(false)
        setIsStripeModalOpen(false)
        await fetchPaymentHistory()
        return true
      }
      console.error('Failed to upgrade subscription:', res.status)
      return false
    } catch (err) {
      console.error('Error upgrading subscription:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const cancelSubscription = async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      const res = await apiFetch(`${GATEWAY_URL}/billing/cancel-subscription`, {
        method: 'POST',
      })
      if (res.ok) {
        const data: SubscriptionStatus = await res.json()
        setSubscription(data)
        return true
      }
      return false
    } catch (err) {
      console.error('Error cancelling subscription:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const createStripeCheckout = async (billingCycle: 'monthly' | 'annual' = 'monthly'): Promise<StripeCheckoutResult | null> => {
    try {
      setIsLoading(true)
      const res = await apiFetch(`${GATEWAY_URL}/billing/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: 'Premium',
          billingCycle,
          durationMonths: billingCycle === 'annual' ? 12 : 1,
        }),
      })
      if (res.ok) {
        const data: StripeCheckoutResult = await res.json()
        return data
      }
      console.error('Failed to create Stripe checkout session:', res.status)
      return null
    } catch (err) {
      console.error('Error creating Stripe checkout session:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const confirmStripePayment = async (sessionId: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const res = await apiFetch(`${GATEWAY_URL}/billing/stripe/confirm-sandbox-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        const data: SubscriptionStatus = await res.json()
        setSubscription(data)
        await fetchPaymentHistory()
        setIsModalOpen(false)
        setIsStripeModalOpen(false)
        return true
      }
      console.error('Failed to confirm Stripe payment:', res.status)
      return false
    } catch (err) {
      console.error('Error confirming Stripe payment:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const setAudioQuality = (quality: 'standard' | 'high') => {
    if (quality === 'high' && !subscription.isActivePremium) {
      setIsModalOpen(true)
      return
    }
    setAudioQualityState(quality)
  }

  const setSpatialAudio = (enabled: boolean) => {
    if (enabled && !subscription.isActivePremium) {
      setIsModalOpen(true)
      return
    }
    setSpatialAudioState(enabled)
  }

  const openSubscriptionModal = () => setIsModalOpen(true)
  const closeSubscriptionModal = () => setIsModalOpen(false)
  const openStripeModal = (initialTab?: any) => {
    const tab = typeof initialTab === 'string' && initialTab === 'history' ? 'history' : 'checkout'
    setStripeModalTab(tab)
    setIsStripeModalOpen(true)
  }
  const closeStripeModal = () => setIsStripeModalOpen(false)

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        paymentHistory,
        isLoading,
        isModalOpen,
        isStripeModalOpen,
        stripeModalTab,
        audioQuality,
        spatialAudio,
        openSubscriptionModal,
        closeSubscriptionModal,
        openStripeModal,
        closeStripeModal,
        fetchSubscriptionStatus,
        upgradeSubscription,
        cancelSubscription,
        createStripeCheckout,
        confirmStripePayment,
        fetchPaymentHistory,
        setAudioQuality,
        setSpatialAudio,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
