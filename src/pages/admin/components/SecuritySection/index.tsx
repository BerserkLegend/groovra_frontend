import React, { useEffect, useState } from "react"
import "./style.css"
import IconShieldCheck from "./ShieldCheck.svg"
import { Loader } from "../../../../components/Loader"
import { getSecurityOverview, getSecurityStats } from "../../../../api/admin"
import type { SecurityOverviewDto, SecurityStatsDto } from "../../../../api/admin"

interface StatMetric {
  id: string
  label: string
  value: string
}

const mapOverview = (overview: SecurityOverviewDto): StatMetric[] => [
  { id: "logins-total", label: "Усього входів (24 години)", value: overview.loginsTotal24h.toString() },
  { id: "logins-failed", label: "Хибних входів (24 години)", value: overview.loginsFailed24h.toString() },
  { id: "threats-detected", label: "Загроз виявлено", value: overview.threatsDetected24h.toString() },
  { id: "threat-avg-score", label: "Середній бал загрози", value: overview.threatAvgScore.toString() },
]

const mapStatus = (stats: SecurityStatsDto): StatMetric[] => [
  { id: "mfa-compliance", label: "Загальні вхідні спроби", value: stats.totalLoginAttempts.toString() },
  { id: "oauth-risk", label: "Хибні входи", value: stats.failedLoginAttempts.toString() },
  { id: "threats-total", label: "Всього загроз", value: stats.totalThreats.toString() },
  { id: "resolved-threats", label: "Вирішених загроз", value: stats.resolvedThreats.toString() },
]

export const SecuritySection = (): React.JSX.Element => {
  const [overviewStats, setOverviewStats] = useState<StatMetric[]>([])
  const [statusStats, setStatusStats] = useState<StatMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSecurityData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [overview, stats] = await Promise.all([getSecurityOverview(), getSecurityStats()])
        setOverviewStats(mapOverview(overview))
        setStatusStats(mapStatus(stats))
      } catch (err) {
        setError("Не вдалося завантажити дані безпеки. Спробуйте оновити сторінку.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSecurityData()
  }, [])

  return (
    <div className="AdminSecSection">
      <span className="SecGlow SecGlowTop" />
      <span className="SecGlow SecGlowBottom" />
      <div className="SecPageHeader">
        <div className="SecHeaderText">
          <h1 className="SecTitle">Безпека</h1>
          <p className="SecSubtitle">Огляд стану безпеки системи та активності за останній час</p>
        </div>
      </div>

      {isLoading ? (
        <Loader variant="section" text="Завантаження даних безпеки..." />
      ) : error ? (
        <div className="SecErrorMessage">{error}</div>
      ) : (
        <>
          <div className="SecStatsRow">
            {overviewStats.map((stat) => (
              <div key={stat.id} className="SecStatCard">
                <span className="SecStatLabel">{stat.label}</span>
                <span className="SecStatValue">{stat.value}</span>
              </div>
            ))}
          </div>

          <div className="SecSectionHeading">
            <img src={IconShieldCheck} />
            Стан безпеки
          </div>

          <div className="SecStatsRow">
            {statusStats.map((stat) => (
              <div key={stat.id} className="SecStatCard">
                <span className="SecStatLabel">{stat.label}</span>
                <span className="SecStatValue">{stat.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
