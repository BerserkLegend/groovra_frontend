import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch, GATEWAY_URL } from "../../../../api/api-client"
import "./style.css"

const ASSETS = "/src/pages/ai-mix/components/SectionRealTime"

interface StatBadgeProps {
  value: string
  label: string
}

const StatBadge = ({ value, label }: StatBadgeProps): React.JSX.Element => (
  <div className="srt-badge">
    <div className="srt-badge-value">{value}</div>
    <div className="srt-badge-label">{label}</div>
  </div>
)

export const SectionRealTime = (): React.JSX.Element => {
  const { t } = useTranslation()
  const [stats, setStats] = useState<StatBadgeProps[]>([
    { value: "...", label: t("aimix.realtime_labels.new_songs", { defaultValue: "нові пісні" }) },
    { value: "...", label: t("aimix.realtime_labels.new_albums", { defaultValue: "нові альбоми" }) },
    { value: "...", label: t("aimix.realtime_labels.new_mixes", { defaultValue: "нові мікси" }) },
  ])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await apiFetch(`${GATEWAY_URL}/music/stats/global`)
        if (response.ok && active) {
          const data = await response.json()
          setStats([
            {
              value: data.songsCount?.toLocaleString() ?? "0",
              label: t("aimix.realtime_labels.new_songs", { defaultValue: "пісні" }),
            },
            {
              value: data.albumsCount?.toLocaleString() ?? "0",
              label: t("aimix.realtime_labels.new_albums", { defaultValue: "альбоми" }),
            },
            {
              value: data.aiMixesCount?.toLocaleString() ?? "0",
              label: t("aimix.realtime_labels.new_mixes", { defaultValue: "ШІ міксів" }),
            },
          ])
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to load realtime stats:", err)
      }
    }
    load()
    return () => { active = false }
  }, [t])

  return (
    <div className="section-real-time">
      <div className="srt-gradient" />

      <div className="srt-left">
        <div className="srt-icon-circle" aria-hidden="true">
          <img
            className="srt-icon"
            alt="AI real-time icon"
            src={`${ASSETS}/icon.svg`}
          />
          <div className="srt-icon-border" />
        </div>

        <div className="srt-text-block">
          <div className="srt-heading">{t("aimix.real_time_created", { defaultValue: "Статистика платформи" })}</div>
          <p className="srt-subheading">{t("aimix.real_time_desc", { defaultValue: "Дані оновлюються в реальному часі" })}</p>
        </div>
      </div>

      <div className="srt-badges">
        {stats.map((s) => (
          <StatBadge key={s.label} {...s} />
        ))}
      </div>
    </div>
  )
}
