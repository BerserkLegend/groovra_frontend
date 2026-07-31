import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch, GATEWAY_URL } from "../../../../api/api-client"
import "./style.css"

const ASSETS = "/src/pages/ai-mix/components/SectionStatistics"

interface StatCardProps {
  iconSrc: string
  iconClass: string
  iconAlt: string
  label: string
  value: string
  maskSrc: string
}

const StatCard = ({
  iconSrc,
  iconClass,
  iconAlt,
  label,
  value,
  maskSrc,
}: StatCardProps): React.JSX.Element => (
  <div className="ss-overlay-border">
    <div className="ss-header">
      <div className="ss-margin">
        <img className={`ss-${iconClass}`} alt={iconAlt} src={iconSrc} />
      </div>
      <div className="ss-text-wrapper">{label}</div>
    </div>
    <div className="ss-div">{value}</div>
    <img className="ss-mask-group" alt="" aria-hidden="true" src={maskSrc} />
    <div className="ss-overlay-blur" />
  </div>
)

export const SectionStatistics = (): React.JSX.Element => {
  const { t } = useTranslation()
  const [statsData, setStatsData] = useState<{
    aiMixesCount: number
    songsCount: number
    albumsCount: number
    hoursListened: number
  }>({
    aiMixesCount: 12450,
    songsCount: 87320,
    albumsCount: 4210,
    hoursListened: 2800000,
  })

  useEffect(() => {
    let active = true
    const loadStats = async () => {
      try {
        const response = await apiFetch(`${GATEWAY_URL}/music/stats/global`)
        if (response.ok && active) {
          const data = await response.json()
          setStatsData(data)
        }
      } catch (err) {
        console.error("Failed to load global statistics:", err)
      }
    }
    loadStats()
    return () => {
      active = false
    }
  }, [])

  const formatNumber = (num: number, isHours = false): string => {
    if (isHours && num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    return num.toLocaleString()
  }

  const stats: StatCardProps[] = [
    {
      iconSrc: `${ASSETS}/icon.svg`,
      iconClass: "icon",
      iconAlt: "AI Mixes icon",
      label: t("aimix.stats_labels.ai_mixes", { defaultValue: "ШІ МІКСИ" }),
      value: formatNumber(statsData.aiMixesCount),
      maskSrc: `${ASSETS}/mask-group.svg`,
    },
    {
      iconSrc: `${ASSETS}/image.svg`,
      iconClass: "img",
      iconAlt: "Songs icon",
      label: t("aimix.stats_labels.songs", { defaultValue: "ПІСНІ" }),
      value: formatNumber(statsData.songsCount),
      maskSrc: `${ASSETS}/mask-group-2.svg`,
    },
    {
      iconSrc: `${ASSETS}/icon-2.svg`,
      iconClass: "icon",
      iconAlt: "Albums icon",
      label: t("aimix.stats_labels.albums", { defaultValue: "АЛЬБОМИ" }),
      value: formatNumber(statsData.albumsCount),
      maskSrc: `${ASSETS}/mask-group-3.svg`,
    },
    {
      iconSrc: `${ASSETS}/icon-3.svg`,
      iconClass: "icon-2",
      iconAlt: "Hours icon",
      label: t("aimix.stats_labels.hours", { defaultValue: "ГОДИНИ" }),
      value: formatNumber(statsData.hoursListened, true),
      maskSrc: `${ASSETS}/mask-group-4.svg`,
    },
  ]

  return (
    <div className="section-statistics">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
