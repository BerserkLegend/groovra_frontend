import React from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, CreditCard } from 'lucide-react'
import { useSubscription } from '../context/subscription-context'
import { StripeSandboxModal } from './StripeSandboxModal'
import './SubscriptionModal.css'

export const SubscriptionModal: React.FC = () => {
  const { t } = useTranslation()
  const {
    isModalOpen,
    closeSubscriptionModal,
    subscription,
    isStripeModalOpen,
    openStripeModal,
    closeStripeModal,
  } = useSubscription()

  return (
    <>
      {isModalOpen && (
        <div className="sub-modal-overlay" onClick={closeSubscriptionModal} role="dialog" aria-modal="true">
          <div className="sub-modal-content" onClick={e => e.stopPropagation()}>
            <div className="sub-modal-glow-top" />

            <button className="sub-modal-close" onClick={closeSubscriptionModal} type="button" aria-label="Close">
              ✕
            </button>

            <div className="sub-modal-header">
              <div className="sub-modal-badge">Groovra Premium</div>
              <h2 className="sub-modal-title">{t('subscription.title', { defaultValue: 'Розкрийте повний потенціал Groovra' })}</h2>
              <p className="sub-modal-subtitle">
                {t('subscription.subtitle', { defaultValue: 'Отримайте безлімітний AI-Mix, всі 10 пресетів еквалайзера, 3D Surround та HD якість.' })}
              </p>
            </div>

            <div className="sub-plans-grid">
              <div className="sub-plan-card">
                <div>
                  <h3 className="sub-plan-name">{t('subscription.free_title')}</h3>
                  <div className="sub-plan-price">{t('subscription.free_price')}</div>
                  <ul className="sub-features-list">
                    <li className="sub-feature-item">
                      <span className="sub-feature-icon check">✓</span>
                      <span>{t('subscription.free_feat_1')}</span>
                    </li>
                    <li className="sub-feature-item">
                      <span className="sub-feature-icon check">✓</span>
                      <span>{t('subscription.free_feat_2')}</span>
                    </li>
                    <li className="sub-feature-item">
                      <span className="sub-feature-icon check">✓</span>
                      <span>{t('subscription.free_feat_3')}</span>
                    </li>
                    <li className="sub-feature-item">
                      <span className="sub-feature-icon check">✓</span>
                      <span>{t('subscription.free_feat_4')}</span>
                    </li>
                    <li className="sub-feature-item muted">
                      <span className="sub-feature-icon lock"><Lock size={12} /></span>
                      <span>{t('subscription.free_feat_5')}</span>
                    </li>
                    <li className="sub-feature-item muted">
                      <span className="sub-feature-icon lock"><Lock size={12} /></span>
                      <span>{t('subscription.free_feat_6')}</span>
                    </li>
                  </ul>
                </div>
                <button className="btn-sub-action free" type="button" disabled>
                  {subscription.isActivePremium ? t('subscription.free_current_passed') : t('subscription.free_current')}
                </button>
              </div>

              <div className="sub-plan-card premium">
                <div>
                  <h3 className="sub-plan-name">{t('subscription.premium_title')}</h3>
                  <div className="sub-plan-price">{t('subscription.premium_price')}</div>
                  <ul className="sub-features-list">
                    <li className="sub-feature-item">
                      <span className="sub-feature-icon check">✓</span>
                      <span><strong>{t('subscription.prem_feat_1')}</strong></span>
                    </li>
                    <li className="sub-feature-item">
                      <span className="sub-feature-icon check">✓</span>
                      <span><strong>{t('subscription.prem_feat_2')}</strong></span>
                    </li>
                    <li className="sub-feature-item">
                      <span className="sub-feature-icon check">✓</span>
                      <span><strong>{t('subscription.prem_feat_3')}</strong></span>
                    </li>
                    <li className="sub-feature-item">
                      <span className="sub-feature-icon check">✓</span>
                      <span><strong>{t('subscription.prem_feat_4')}</strong></span>
                    </li>
                  </ul>
                </div>
                {subscription.isActivePremium ? (
                  <button className="btn-sub-action active-prem" type="button" disabled>
                    {t('subscription.premium_activated')}
                  </button>
                ) : (
                  <button
                    className="btn-sub-action upgrade"
                    onClick={() => {
                      closeSubscriptionModal()
                      openStripeModal()
                    }}
                    type="button"
                    style={{ background: 'linear-gradient(135deg, #635bff 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', padding: '12px' }}
                  >
                    <CreditCard size={18} /> {t('subscription.pay_stripe')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <StripeSandboxModal
        isOpen={isStripeModalOpen}
        onClose={closeStripeModal}
      />
    </>
  )
}

export default SubscriptionModal
