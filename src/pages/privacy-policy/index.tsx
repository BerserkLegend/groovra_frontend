import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FooterFromJson } from '../../components/footer-from-json'
import './style.css'

export const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main className="Main2 privacy-policy-page">
      <div className="privacy-policy-header">
        <h1 className="privacy-title">{t('privacy.title')}</h1>
        <p className="privacy-last-update">{t('privacy.last_updated')}</p>
      </div>

      <div className="privacy-content-card">
        <p className="privacy-welcome-text">
          {t('privacy.welcome')}
        </p>

        <div className="privacy-divider" />

        <div className="privacy-sections">
          <section className="privacy-section" aria-labelledby="sec-1">
            <h2 id="sec-1" className="privacy-section-title">
              {t('privacy.sections.s1_title')}
            </h2>
            <p className="privacy-section-desc">{t('privacy.sections.s1_desc')}</p>
            <ul className="privacy-list">
              <li>{t('privacy.sections.s1_list.name')}</li>
              <li>{t('privacy.sections.s1_list.email')}</li>
              <li>{t('privacy.sections.s1_list.ip')}</li>
              <li>{t('privacy.sections.s1_list.browser')}</li>
              <li>{t('privacy.sections.s1_list.usage')}</li>
            </ul>
          </section>

          <section className="privacy-section" aria-labelledby="sec-2">
            <h2 id="sec-2" className="privacy-section-title">
              {t('privacy.sections.s2_title')}
            </h2>
            <p className="privacy-section-desc">{t('privacy.sections.s2_desc')}</p>
            <ul className="privacy-list">
              <li>{t('privacy.sections.s2_list.work')}</li>
              <li>{t('privacy.sections.s2_list.quality')}</li>
              <li>{t('privacy.sections.s2_list.personalization')}</li>
              <li>{t('privacy.sections.s2_list.contact')}</li>
              <li>{t('privacy.sections.s2_list.stats')}</li>
              <li>{t('privacy.sections.s2_list.security')}</li>
            </ul>
          </section>

          <section className="privacy-section" aria-labelledby="sec-3">
            <h2 id="sec-3" className="privacy-section-title">
              {t('privacy.sections.s3_title')}
            </h2>
            <p className="privacy-text-block">
              {t('privacy.sections.s3_text1')}
            </p>
            <p className="privacy-text-block">
              {t('privacy.sections.s3_text2')}
            </p>
          </section>

          <section className="privacy-section" aria-labelledby="sec-4">
            <h2 id="sec-4" className="privacy-section-title">
              {t('privacy.sections.s4_title')}
            </h2>
            <p className="privacy-section-desc">{t('privacy.sections.s4_desc')}</p>
            <ul className="privacy-list">
              <li>{t('privacy.sections.s4_list.law')}</li>
              <li>{t('privacy.sections.s4_list.analytics')}</li>
              <li>{t('privacy.sections.s4_list.consent')}</li>
            </ul>
          </section>

          <section className="privacy-section" aria-labelledby="sec-5">
            <h2 id="sec-5" className="privacy-section-title">
              {t('privacy.sections.s5_title')}
            </h2>
            <p className="privacy-text-block">
              {t('privacy.sections.s5_text')}
            </p>
          </section>

          <section className="privacy-section" aria-labelledby="sec-6">
            <h2 id="sec-6" className="privacy-section-title">
              {t('privacy.sections.s6_title')}
            </h2>
            <p className="privacy-text-block">
              {t('privacy.sections.s6_text')}
            </p>
          </section>

          <section className="privacy-section" aria-labelledby="sec-7">
            <h2 id="sec-7" className="privacy-section-title">
              {t('privacy.sections.s7_title')}
            </h2>
            <p className="privacy-section-desc">{t('privacy.sections.s7_desc')}</p>
            <ul className="privacy-list">
              <li>{t('privacy.sections.s7_list.info')}</li>
              <li>{t('privacy.sections.s7_list.edit')}</li>
              <li>{t('privacy.sections.s7_list.revoke')}</li>
              <li>{t('privacy.sections.s7_list.complaint')}</li>
            </ul>
          </section>

          <section className="privacy-section" aria-labelledby="sec-8">
            <h2 id="sec-8" className="privacy-section-title">
              {t('privacy.sections.s8_title')}
            </h2>
            <p className="privacy-text-block">
              {t('privacy.sections.s8_text')}
            </p>
          </section>

          <section className="privacy-section" aria-labelledby="sec-9">
            <h2 id="sec-9" className="privacy-section-title">
              {t('privacy.sections.s9_title')}
            </h2>
            <p className="privacy-text-block">
              {t('privacy.sections.s9_text')}
            </p>
            <div className="privacy-contact-box">
              <p>Email: <a href="mailto:groovra.music@gmail.com" className="privacy-email-link">groovra.music@gmail.com</a></p>
            </div>
          </section>
        </div>
      </div>

      <FooterFromJson />
    </main>
  )
}
