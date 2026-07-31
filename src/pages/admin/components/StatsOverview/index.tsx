import React, { useEffect, useState } from "react"
import "./style.css"
import IconUsers from "./Users.svg"
import IconArrowUp from "./ArrowUp.svg"
import IconAlert from "./Alert.svg"
import IconChevronRight from "./ChevronRight.svg"
import { Loader } from "../../../../components/Loader"
import { getDashboardStats } from "../../../../api/admin"
import type { DashboardStatsDto } from "../../../../api/admin"

interface StatsOverviewProps {
  onViewReportsQueue?: () => void
}

export const StatsOverview = ({ onViewReportsQueue }: StatsOverviewProps): React.JSX.Element => {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getDashboardStats()
        setStats(data)
      } catch (err) {
        setError("Не вдалося завантажити статистику. Спробуйте оновити сторінку.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  if (isLoading) {
    return <Loader variant="section" text="Завантаження статистики..." />
  }

  if (error || !stats) {
    return <div className="StatsErrorMessage">{error || "Помилка завантаження"}</div>
  }

  return (
    <div className="AdminStatsOverview">
      <section className="StatsCard StatsCardLarge">
        <div className="StatsTopRow">
          <span className="StatsIconBox">
            <img src={IconUsers} />
          </span>
          <span className="StatsChange">
            <img src={IconArrowUp} />+{stats.totalUsers.changePercent}%
          </span>
        </div>
        <span className="StatsLabel">Загальна кількість користувачів</span>
        <span className="StatsValue">{stats.totalUsers.value}</span>
        <div className="StatsProgressBg">
          <div className="StatsProgressFill" style={{ width: `${stats.totalUsers.progressPercent}%` }} />
        </div>
        <span className="StatsCaption">{stats.totalUsers.targetLabel}</span>
      </section>

      <section className="StatsCard StatsCardWide">
        <div className="StatsRevenueTop">
          <div>
            <div className="StatsRevenueLabel">Щомісячний дохід</div>
            <div className="StatsRevenueValue">{stats.monthlyRevenue.value}</div>
          </div>
          <span className="StatsRevenueBadge">{stats.monthlyRevenue.periodLabel}</span>
        </div>

        <div className="StatsBarChart">
          {stats.monthlyRevenue.months.map((m) => (
            <div className="StatsBarCol" key={m.label}>
              <div
                className={`StatsBar${m.active ? " StatsBarActive" : ""}`}
                style={{ height: `${m.value}px` }}
              />
            </div>
          ))}
        </div>
        <div className="StatsBarLabels">
          {stats.monthlyRevenue.months.map((m) => (
            <span key={m.label} className={`StatsBarLabel${m.active ? " StatsBarLabelActive" : ""}`}>
              {m.label}
            </span>
          ))}
        </div>
      </section>

      <section className="StatsCard StatsCardItem">
        <span className="StatsLabel">Активні підписки</span>
        <div className="StatsMidRow">
          <span className="StatsMidValue">{stats.activeSubscriptions.value}</span>
          <span className="StatsMidSub">{stats.activeSubscriptions.ratioLabel}</span>
        </div>
        <p className="StatsMidCaption">{stats.activeSubscriptions.caption}</p>
      </section>

      <section className="StatsCard StatsCardItem">
        <span className="StatsLabel">Згенеровані ШІ треки</span>
        <div className="StatsMidRow">
          <span className="StatsMidValue">{stats.aiGeneratedTracks.value}</span>
        </div>
      </section>

      <section className="StatsCard StatsCardItem">
        <span className="StatsWatermark">
          <img src={IconAlert} />
        </span>
        <span className="StatsLabel">Звіти, що очікують розгляду</span>
        <div className="StatsMidRow">
          <span className="StatsMidValue">{stats.pendingReports.value}</span>
        </div>
        <p className="StatsMidCaption">{stats.pendingReports.caption}</p>
        <button type="button" className="StatsLink" onClick={onViewReportsQueue}>
          Переглянути чергу
          <img src={IconChevronRight} />
        </button>
      </section>

      <section className="StatsCard StatsCardItem">
        <span className="StatsLabel">Швидкість зростання</span>
        <div className="StatsGrowthChart">
          <svg viewBox="0 0 333 90" width="100%" height="90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="stoGrowthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(68,216,239,0.3)" />
                <stop offset="100%" stopColor="rgba(68,216,239,0)" />
              </linearGradient>
            </defs>
            <path
              d="M0,70 C40,20 70,85 110,45 C150,10 180,60 220,35 C260,15 300,55 333,20 L333,90 L0,90 Z"
              fill="url(#stoGrowthFill)"
            />
            <path
              d="M0,70 C40,20 70,85 110,45 C150,10 180,60 220,35 C260,15 300,55 333,20"
              fill="none"
              stroke="#44d8ef"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="StatsGSrowthStatsRow">
          <div className="StatsGrowthStatCol">
            <span className="StatsGrowthStatLabel">Середнє значення за день</span>
            <span className="StatsGrowthStatValue">{stats.growthRate.avgPerDayLabel}</span>
          </div>
          <div className="StatsGrowthStatCol">
            <span className="StatsGrowthStatLabel">Утримання</span>
            <span className="StatsGrowthStatValue">{stats.growthRate.retentionLabel}</span>
          </div>
        </div>
      </section>
    </div>
  )
}