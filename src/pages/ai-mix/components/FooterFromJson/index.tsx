import React from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import "./style.css"

export const FooterFromJson = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="footer-from-json">
      <div className="ffj-margin">
        <div className="ffj-container">
          <div className="ffj-logo-wrapper">
            <div className="ffj-logo">Groovra</div>
          </div>
        </div>
      </div>

      <div className="ffj-links">
        <Link className="ffj-link" to="/privacy" tabIndex={0} aria-label={t("privacy.title", { defaultValue: "Політика конфіденційності" })}>
          <span className="ffj-link-text">{t("privacy.title", { defaultValue: "Політика конфіденційності" })}</span>
        </Link>
        <Link className="ffj-link" to="/cookies" tabIndex={0} aria-label={t("cookies.title", { defaultValue: "Cookies" })}>
          <span className="ffj-link-text">{t("cookies.title", { defaultValue: "Cookies" })}</span>
        </Link>
        <Link className="ffj-link" to="/about" tabIndex={0} aria-label={t("about.title", { defaultValue: "Про нас" })}>
          <span className="ffj-link-text ffj-link-text--light">{t("about.title", { defaultValue: "Про нас" })}</span>
        </Link>
      </div>

      <div className="ffj-copyright-wrapper">
        <div className="ffj-copyright-inner">
          <p className="ffj-copyright">© 2026 Groovra Premium Music</p>
        </div>
      </div>
    </div>
  )
}
