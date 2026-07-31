import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard, CheckCircle2, ShieldCheck, History } from 'lucide-react'
import { useSubscription } from '../context/subscription-context'
import type { PaymentRecord } from '../context/subscription-context'
import './StripeSandboxModal.css'

interface StripeSandboxModalProps {
  isOpen: boolean
  onClose: () => void
}

export const StripeSandboxModal: React.FC<StripeSandboxModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const { createStripeCheckout, confirmStripePayment, fetchPaymentHistory, paymentHistory, stripeModalTab } = useSubscription()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'checkout' | 'history'>('checkout')

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(stripeModalTab || 'checkout')
      if (stripeModalTab === 'history') {
        fetchPaymentHistory()
      }
    }
  }, [isOpen, stripeModalTab, fetchPaymentHistory])

  if (!isOpen) return null

  const handlePay = async () => {
    setIsProcessing(true)
    try {
      const session = await createStripeCheckout('monthly')
      if (session) {
        if (session.checkoutUrl && session.checkoutUrl.startsWith('http')) {
          window.location.href = session.checkoutUrl
          return
        }

        const success = await confirmStripePayment(session.sessionId)
        if (success) {
          setIsSuccess(true)
          setTimeout(() => {
            setIsSuccess(false)
            onClose()
          }, 2000)
        }
      }
    } catch (err) {
      console.error('Stripe payment error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTabHistory = async () => {
    setActiveTab('history')
    await fetchPaymentHistory()
  }

  return (
    <div className="stripe-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="stripe-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="stripe-modal-header">
          <div>
            <h3 className="stripe-title" style={{ marginTop: 0 }}>
              {activeTab === 'checkout' ? t('stripeModal.checkout_title') : t('stripeModal.history_title')}
            </h3>
          </div>
          <button className="stripe-modal-close" onClick={onClose} type="button" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="stripe-tabs-nav">
          <button
            type="button"
            className={`stripe-tab-btn ${activeTab === 'checkout' ? 'active' : ''}`}
            onClick={() => setActiveTab('checkout')}
          >
            <CreditCard size={14} />
            {t('stripeModal.tab_checkout')}
          </button>
          <button
            type="button"
            className={`stripe-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={handleTabHistory}
          >
            <History size={14} />
            {t('stripeModal.tab_history')}
          </button>
        </div>

        {activeTab === 'checkout' ? (
          <>
            <div className="stripe-plan-summary">
              <span className="stripe-plan-summary-title">{t('stripeModal.plan_title')}</span>
              <span className="stripe-plan-summary-price">{t('stripeModal.plan_price')}</span>
            </div>

            {isSuccess ? (
              <button className="stripe-pay-btn" style={{ background: '#00d4b1' }} disabled type="button">
                <CheckCircle2 size={18} /> {t('stripeModal.success')}
              </button>
            ) : (
              <button
                className="stripe-pay-btn"
                onClick={handlePay}
                disabled={isProcessing}
                type="button"
              >
                {isProcessing ? (
                  t('stripeModal.processing')
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    {t('stripeModal.pay_btn')}
                  </>
                )}
              </button>
            )}

            <div className="stripe-footer-note">
              {t('stripeModal.security_note')}
            </div>
          </>
        ) : (
          <div>
            {paymentHistory.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '16px 0' }}>
                {t('stripeModal.empty_history')}
              </p>
            ) : (
              <table className="stripe-history-table">
                <thead>
                  <tr>
                    <th>{t('stripeModal.date')}</th>
                    <th>{t('stripeModal.plan')}</th>
                    <th>{t('stripeModal.amount')}</th>
                    <th>{t('stripeModal.method')}</th>
                    <th>{t('stripeModal.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((item: PaymentRecord) => (
                    <tr key={item.id}>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>{item.planType}</td>
                      <td>₴{item.amount.toFixed(2)} {item.currency}</td>
                      <td>{item.paymentMethod}</td>
                      <td>
                        <span className={`stripe-status-tag ${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
