import React, { useEffect, useState } from "react"
import "./style.css"
import IconUserFlag from "./UserFlag.svg"
import IconAlert from "./Alert.svg"
import IconStar from "./Star.svg"
import IconCpu from "./Cpu.svg"
import IconDots from "./Dots.svg"
import { Loader } from "../../../../components/Loader"
import { getActivityFeed } from "../../../../api/admin"
import type { ActivityFeedItemDto } from "../../../../api/admin"

type ActivityTone = "neutral" | "warning" | "accent" | "muted"

interface ActivityItemData {
  id: string
  tone: ActivityTone
  iconSrc: string
  title: string
  subtitle: string
  badge: string
}

const toneClass: Record<ActivityTone, string> = {
  neutral: "",
  warning: "IconBoxActFeeWarning",
  accent: "IconBoxActFeeAccent",
  muted: "IconBoxActFeeMuted",
}

const iconMap: Record<string, string> = {
  UserFlag: IconUserFlag,
  Alert: IconAlert,
  Star: IconStar,
  Cpu: IconCpu,
}

export const ActivityFeed = (): React.JSX.Element => {
  const [items, setItems] = useState<ActivityItemData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadActivity = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getActivityFeed()
        const mapped = data.map((item: ActivityFeedItemDto) => ({
          id: item.id,
          tone: item.tone as ActivityTone,
          iconSrc: iconMap[item.iconType] || IconAlert,
          title: item.title,
          subtitle: item.subtitle,
          badge: item.badge,
        }))
        setItems(mapped)
      } catch (err) {
        setError("Не вдалося завантажити стрічку активності.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadActivity()
  }, [])

  const handleOpenItemMenu = (id: string) => {
    console.log("Меню дії для запису:", id)
  }

  return (
    <div className="AdminActFee">
      <div className="HeaderActFee">
        <span className="HeaderBarActFee" />
        <h2 className="HeaderTitleActFee">Стрічка останніх дій</h2>
      </div>

      {isLoading ? (
        <Loader variant="section" text="Завантаження активності..." />
      ) : error ? (
        <div className="ActFeeErrorMessage">{error}</div>
      ) : (
        <div className="CardActFee">
          {items.map((item) => (
            <div className="ItemActFee" key={item.id}>
              <div className="ItemLeftActFee">
                <span className={`IconBoxActFee ${toneClass[item.tone]}`}>
                  <img src={item.iconSrc} />
                </span>
                <div className="ActFeeTextBlock">
                  <span className="ActFeeItemTitle">{item.title}</span>
                  <span className="ActFeeItemSubtitle">{item.subtitle}</span>
                </div>
              </div>
              <div className="ActFeeItemRight">
                <span className="ActFeeBadge">{item.badge}</span>
                <button
                  type="button"
                  className="ActFeeMenuBtn"
                  aria-label="Додаткові дії"
                  onClick={() => handleOpenItemMenu(item.id)}
                >
                  <img src={IconDots} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}