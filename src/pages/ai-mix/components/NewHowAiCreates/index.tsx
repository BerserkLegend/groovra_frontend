import React from "react"
import { useTranslation } from "react-i18next"
import "./style.css"

const ASSETS = "/src/pages/ai-mix/components/NewHowAiCreates"

interface StepData {
  id: string
  iconSrc: string
  iconW: number
  iconH: number
  title: string
  description: string
  glowColor: string
}

interface AiStepProps {
  step: StepData
}

const AiStep = ({ step }: AiStepProps): React.JSX.Element => (
  <div className="nhac-step">
    <div
      className="nhac-icon-box"
      style={{ boxShadow: `0px 0px 20px ${step.glowColor}` }}
    >
      <div className="nhac-icon-wrapper">
        <img
          className="nhac-icon"
          alt={step.title}
          src={step.iconSrc}
          style={{ width: step.iconW, height: step.iconH }}
        />
      </div>
    </div>

    <div className="nhac-text">
      <div className="nhac-text-row">
        <div className="nhac-step-title">{step.title}</div>
      </div>
      <div className="nhac-text-row">
        <p className="nhac-step-desc">{step.description}</p>
      </div>
    </div>
  </div>
)

export const NewHowAiCreates = (): React.JSX.Element => {
  const { t } = useTranslation()

  const STEPS: StepData[] = [
    {
      id: "neural-analysis",
      iconSrc: `${ASSETS}/icon.svg`,
      iconW: 30,
      iconH: 30,
      title: t("aimix.steps.analysis_title", { defaultValue: "Нейронний аналіз" }),
      description: t("aimix.steps.analysis_desc", { defaultValue: "ШІ аналізує мільйони патернів для вибору емоційного тону." }),
      glowColor: "#59e8ff1a",
    },
    {
      id: "melody-harmony",
      iconSrc: `${ASSETS}/image.svg`,
      iconW: 30,
      iconH: 30,
      title: t("aimix.steps.melody_title", { defaultValue: "Мелодія та Гармонія" }),
      description: t("aimix.steps.melody_desc", { defaultValue: "Генерація унікальних музичних структур у реальному часі." }),
      glowColor: "#d0bcff1a",
    },
    {
      id: "arrangement",
      iconSrc: `${ASSETS}/icon-2.svg`,
      iconW: 30,
      iconH: 31.75,
      title: t("aimix.steps.arr_title", { defaultValue: "Аранжування" }),
      description: t("aimix.steps.arr_desc", { defaultValue: "Накладення інструментів та синтетичних звукових шарів." }),
      glowColor: "#f0f1fb1a",
    },
    {
      id: "mastering",
      iconSrc: `${ASSETS}/icon-3.svg`,
      iconW: 26.67,
      iconH: 26.67,
      title: t("aimix.steps.mast_title", { defaultValue: "Мастерінг" }),
      description: t("aimix.steps.mast_desc", { defaultValue: "Фінальна обробка звуку для кришталевої чіткості." }),
      glowColor: "#d7f8ff1a",
    },
  ]

  return (
    <div className="new-how-ai-creates">
      <div className="nhac-divider" aria-hidden="true" />

      <div className="nhac-header">
        <div className="nhac-title">{t("aimix.how_title", { defaultValue: "Як ШІ створює музику" })}</div>
        <div className="nhac-desc-wrapper">
          <p className="nhac-desc">
            {t("aimix.how_desc", { defaultValue: "Наш процес поєднує нейронні мережі з теорією класичної музики для досягнення ідеального звучання." })}
          </p>
        </div>
      </div>

      <div className="nhac-steps">
        {STEPS.map((step) => (
          <AiStep key={step.id} step={step} />
        ))}
      </div>
    </div>
  )
}
