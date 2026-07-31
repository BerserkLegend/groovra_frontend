import React from "react"
import "./style.css"
import IconDownload from "./Download.svg"
import IconRefresh from "./Refresh.svg"

interface DashboardHeaderProps {
  isExporting: boolean
  isRealtime: boolean
  onExportPdf: () => void
  onToggleRealtime: () => void
}

export const DashboardHeader = ({
  isExporting,
  isRealtime,
  onExportPdf,
  onToggleRealtime,
}: DashboardHeaderProps): React.JSX.Element => {
  return (
    <div className="DashboardHeader">
      <div className="DashboardTitleBlock">
        <h1 className="DashboardTitle">Огляд Показників</h1>
        <p className="DashboardSubtitle">
          Аналіз продуктивності в режимі реального часу для Groovra Core Ecosystem.
        </p>
      </div>

      <div className="DashboardActions">
        <button type="button" className="DashboardBtn" onClick={onExportPdf} disabled={isExporting}>
          <img
            className={`DashboardBtnIcon${isExporting ? " DashboardBtnIconSpin" : ""}`}
            src={IconDownload}
          />
          {isExporting ? "Формування…" : "Експорт PDF-файлу"}
        </button>
        <button
          type="button"
          className={`DashboardBtn${isRealtime ? " DashboardBtnActive" : ""}`}
          onClick={onToggleRealtime}
          aria-pressed={isRealtime}
        >
          <img className="DashboardBtnIcon" src={IconRefresh} />
          {isRealtime ? "Оновлення в реальному часі" : "Оновлення призупинено"}
        </button>
      </div>
    </div>
  )
}