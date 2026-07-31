import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FooterFromJson } from '../../components/footer-from-json'
import './style.css'

export const CookiesPolicy: React.FC = () => {
  const { t } = useTranslation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main className="Main2 cookies-page">
      <div className="cookies-header">
        <h1 className="cookies-title">{t('cookies.title')}</h1>
        <p className="cookies-last-update">{t('cookies.last_updated')}</p>
      </div>

      <div className="cookies-content-card">
        <section className="cookies-introduction" aria-labelledby="cookies-what-is">
          <h2 id="cookies-what-is" className="cookies-section-title">{t('cookies.what_is')}</h2>
          <p className="cookies-text-block">
            {t('cookies.what_is_text')}
          </p>
        </section>

        <div className="cookies-divider" />

        <section className="cookies-types-section" aria-labelledby="cookies-types-title">
          <h2 id="cookies-types-title" className="cookies-section-title">{t('cookies.types_title')}</h2>

          <div className="cookies-subsections">
            <div className="cookies-subsection">
              <h3 className="cookies-subsection-title">{t('cookies.necessary_title')}</h3>
              <p className="cookies-subsection-desc">{t('cookies.necessary_desc')}</p>
              <p className="cookies-list-intro">{t('cookies.necessary_intro')}</p>
              <ul className="cookies-list">
                <li>{t('cookies.necessary_list.auth')}</li>
                <li>{t('cookies.necessary_list.security')}</li>
                <li>{t('cookies.necessary_list.session')}</li>
              </ul>
            </div>

            <div className="cookies-subsection">
              <h3 className="cookies-subsection-title">{t('cookies.analytic_title')}</h3>
              <p className="cookies-subsection-desc">{t('cookies.analytic_desc')}</p>
              <p className="cookies-list-intro">{t('cookies.analytic_intro')}</p>
              <ul className="cookies-list">
                <li>{t('cookies.analytic_list.visits')}</li>
                <li>{t('cookies.analytic_list.popular')}</li>
                <li>{t('cookies.analytic_list.sources')}</li>
                <li>{t('cookies.analytic_list.interaction')}</li>
              </ul>
            </div>

            <div className="cookies-subsection">
              <h3 className="cookies-subsection-title">{t('cookies.functional_title')}</h3>
              <p className="cookies-subsection-desc">{t('cookies.functional_desc')}</p>
              <p className="cookies-list-intro">{t('cookies.functional_intro')}</p>
              <ul className="cookies-list">
                <li>{t('cookies.functional_list.lang')}</li>
                <li>{t('cookies.functional_list.playback')}</li>
                <li>{t('cookies.functional_list.profile')}</li>
              </ul>
            </div>

            <div className="cookies-subsection">
              <h3 className="cookies-subsection-title">{t('cookies.marketing_title')}</h3>
              <p className="cookies-text-block">{t('cookies.marketing_text')}</p>
            </div>
          </div>
        </section>

        <div className="cookies-divider" />

        <section className="cookies-management" aria-labelledby="cookies-mgmt-title">
          <h2 id="cookies-mgmt-title" className="cookies-section-title">{t('cookies.management_title')}</h2>
          <p className="cookies-text-block">{t('cookies.management_text')}</p>
          <p className="cookies-warning-text">{t('cookies.management_warning')}</p>
        </section>

        <div className="cookies-divider" />

        <section className="cookies-third-party" aria-labelledby="cookies-third-party-title">
          <h2 id="cookies-third-party-title" className="cookies-section-title">{t('cookies.third_party_title')}</h2>
          <p className="cookies-text-block">{t('cookies.third_party_text')}</p>
        </section>

        <div className="cookies-divider" />

        <section className="cookies-changes" aria-labelledby="cookies-changes-title">
          <h2 id="cookies-changes-title" className="cookies-section-title">{t('cookies.changes_title')}</h2>
          <p className="cookies-text-block">{t('cookies.changes_text')}</p>
        </section>

        <div className="cookies-divider" />

        <section className="cookies-contact" aria-labelledby="cookies-contact-title">
          <h2 id="cookies-contact-title" className="cookies-section-title">{t('cookies.contact_title')}</h2>
          <p className="cookies-text-block">{t('cookies.contact_text')}</p>
          <div className="cookies-contact-box">
            <p>Email: <a href="mailto:groovra.music@gmail.com" className="cookies-email-link">groovra.music@gmail.com</a></p>
          </div>
        </section>
      </div>

      <FooterFromJson />
    </main>
  )
}
