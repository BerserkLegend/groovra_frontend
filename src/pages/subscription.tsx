import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, Sparkles, Sliders, Volume2, ShieldCheck, Zap, Lock, ArrowRight } from 'lucide-react'
import { useSubscription } from '../context/subscription-context'
import './subscription.css'

export const SubscriptionPage: React.FC = () => {
  const { t } = useTranslation()
  const { subscription, openStripeModal } = useSubscription()

  const handleSubscribe = () => {
    openStripeModal('checkout')
  }

  return (
    <div className="sub-page-container">
      <div className="sub-page-inner">
        <div className="sub-page-hero">
          <motion.div 
            className="sub-badge-top"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Sparkles size={14} className="sub-badge-icon" />
            <span>{t('subscriptionPage.badge')}</span>
          </motion.div>

          <motion.h1 
            className="sub-page-hero-title"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {t('subscriptionPage.hero_title')}
          </motion.h1>

          <motion.p 
            className="sub-page-hero-desc"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t('subscriptionPage.hero_desc')}
          </motion.p>
        </div>

        <div className="sub-plans-grid">
          <motion.div 
            className={`sub-plan-card ${!subscription.isActivePremium ? 'current-active' : ''}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div>
              <div className="sub-card-header">
                <h3 className="sub-plan-name">{t('subscription.free_title')}</h3>
                <span className="sub-plan-subtitle">{t('subscriptionPage.free_badge')}</span>
              </div>
              <div className="sub-plan-price">
                {t('subscriptionPage.free_price')}
              </div>
              <p className="sub-plan-card-desc">
                {t('subscriptionPage.free_desc')}
              </p>

              <ul className="sub-features-list">
                <li className="sub-feature-item">
                  <div className="sub-feature-icon-box">
                    <Check size={14} />
                  </div>
                  <span>{t('subscriptionPage.free_feat_1', { remaining: subscription.remainingAiMixes })}</span>
                </li>
                <li className="sub-feature-item">
                  <div className="sub-feature-icon-box">
                    <Check size={14} />
                  </div>
                  <span>{t('subscriptionPage.free_feat_2')}</span>
                </li>
                <li className="sub-feature-item">
                  <div className="sub-feature-icon-box">
                    <Check size={14} />
                  </div>
                  <span>{t('subscriptionPage.free_feat_3')}</span>
                </li>
                <li className="sub-feature-item">
                  <div className="sub-feature-icon-box">
                    <Check size={14} />
                  </div>
                  <span>{t('subscriptionPage.free_feat_4')}</span>
                </li>
              </ul>
            </div>

            <button className="btn-sub-action free" disabled type="button">
              {subscription.isActivePremium ? t('subscriptionPage.free_btn_active') : t('subscriptionPage.free_btn_current')}
            </button>
          </motion.div>

          <motion.div 
            className="sub-plan-card premium"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div>
              <div className="sub-card-header">
                <h3 className="sub-plan-name gradient-text">{t('subscription.premium_title')}</h3>
                <span className="sub-plan-subtitle">{t('subscriptionPage.prem_badge')}</span>
              </div>
              <div className="sub-plan-price">
                {t('subscriptionPage.prem_price')}
              </div>

              <p className="sub-plan-card-desc">
                {t('subscriptionPage.prem_desc')}
              </p>

              <ul className="sub-features-list">
                <li className="sub-feature-item highlight">
                  <div className="sub-feature-icon-box premium">
                    <Zap size={14} />
                  </div>
                  <span><strong>{t('subscriptionPage.prem_feat_1')}</strong></span>
                </li>
                <li className="sub-feature-item highlight">
                  <div className="sub-feature-icon-box premium">
                    <Sliders size={14} />
                  </div>
                  <span><strong>{t('subscriptionPage.prem_feat_2')}</strong></span>
                </li>
                <li className="sub-feature-item highlight">
                  <div className="sub-feature-icon-box premium">
                    <Volume2 size={14} />
                  </div>
                  <span><strong>{t('subscriptionPage.prem_feat_3')}</strong></span>
                </li>
                <li className="sub-feature-item highlight">
                  <div className="sub-feature-icon-box premium">
                    <ShieldCheck size={14} />
                  </div>
                  <span><strong>{t('subscriptionPage.prem_feat_4')}</strong></span>
                </li>
              </ul>
            </div>

            {subscription.isActivePremium ? (
              <button className="btn-sub-action active-prem" disabled type="button">
                <Check size={18} style={{ marginRight: 6 }} /> {t('subscriptionPage.prem_btn_active')}
              </button>
            ) : (
              <button className="btn-sub-action upgrade" onClick={handleSubscribe} type="button">
                <span>{t('subscriptionPage.prem_btn_action')}</span>
                <ArrowRight size={18} />
              </button>
            )}
          </motion.div>
        </div>

        <motion.div 
          className="sub-page-comparison"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="sub-comparison-header">
            <h2 className="sub-comparison-title">{t('subscriptionPage.comp_title')}</h2>
            <p className="sub-comparison-subtitle">{t('subscriptionPage.comp_subtitle')}</p>
          </div>

          <div className="sub-table-wrapper">
            <table className="sub-table">
              <thead>
                <tr>
                  <th>{t('subscriptionPage.table_col_feature')}</th>
                  <th>{t('subscriptionPage.table_col_free')}</th>
                  <th>{t('subscriptionPage.table_col_prem')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sub-feature-col">
                    <div className="sub-feature-content">
                      <Zap size={16} className="sub-table-icon" />
                      <span>{t('subscriptionPage.table_row_1')}</span>
                    </div>
                  </td>
                  <td>{t('subscriptionPage.table_row_1_free')}</td>
                  <td><span className="sub-check-pill"><Check size={13} /> {t('subscriptionPage.table_row_1_prem')}</span></td>
                </tr>
                <tr>
                  <td className="sub-feature-col">
                    <div className="sub-feature-content">
                      <Sliders size={16} className="sub-table-icon" />
                      <span>{t('subscriptionPage.table_row_2')}</span>
                    </div>
                  </td>
                  <td>{t('subscriptionPage.table_row_2_free')}</td>
                  <td><span className="sub-check-pill"><Check size={13} /> {t('subscriptionPage.table_row_2_prem')}</span></td>
                </tr>
                <tr>
                  <td className="sub-feature-col">
                    <div className="sub-feature-content">
                      <Sliders size={16} className="sub-table-icon" />
                      <span>{t('subscriptionPage.table_row_3')}</span>
                    </div>
                  </td>
                  <td><span className="sub-check-pill simple">{t('subscriptionPage.table_row_3_val')}</span></td>
                  <td><span className="sub-check-pill"><Check size={13} /> {t('subscriptionPage.table_row_3_val')}</span></td>
                </tr>
                <tr>
                  <td className="sub-feature-col">
                    <div className="sub-feature-content">
                      <Volume2 size={16} className="sub-table-icon" />
                      <span>{t('subscriptionPage.table_row_4')}</span>
                    </div>
                  </td>
                  <td><span className="sub-cross-pill"><Lock size={12} style={{ marginRight: 4 }} /> {t('subscriptionPage.table_row_4_free')}</span></td>
                  <td><span className="sub-check-pill"><Check size={13} /> {t('subscriptionPage.table_row_4_prem')}</span></td>
                </tr>
                <tr>
                  <td className="sub-feature-col">
                    <div className="sub-feature-content">
                      <ShieldCheck size={16} className="sub-table-icon" />
                      <span>{t('subscriptionPage.table_row_5')}</span>
                    </div>
                  </td>
                  <td>{t('subscriptionPage.table_row_5_free')}</td>
                  <td><span className="sub-check-pill"><Check size={13} /> {t('subscriptionPage.table_row_5_prem')}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default SubscriptionPage
