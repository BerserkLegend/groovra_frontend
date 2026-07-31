import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { usePlayer, type Track as PlayerTrack } from "../../../../context/player-context"
import { apiFetch, GATEWAY_URL, resolveMediaUrl } from "../../../../api/api-client"
import "./style.css"

const ASSETS = "/src/pages/ai-mix/components/ContentGridAi"

interface TrackData {
  id: string
  title: string
  artist: string
  genre: string
  duration: string
  cover: string
  isPlaying?: boolean
  rawTrack?: PlayerTrack
}

interface GenreData {
  id: string
  label: string
  active?: boolean
}

const GENRES: GenreData[] = [
  { id: "synthwave", label: "Synthwave" },
  { id: "cyber-pop", label: "Cyber Pop" },
  { id: "electronic", label: "Electronic", active: true },
  { id: "ambient", label: "Ambient" },
]

interface AiModelData {
  id: string
  name: string
  descKey: string
  defaultDesc: string
  accuracy: string
  badge: string
  badgeBg: string
  iconSrc: string
  iconW: number
  iconH: number
  maskSrc: string
}

interface TrackRowProps {
  track: TrackData
  onPlay: (track: TrackData) => void
}

const TrackRow = ({ track, onPlay }: TrackRowProps): React.JSX.Element => {
  const { t } = useTranslation()
  return (
    <div
      className={`cga-track-row${track.isPlaying ? " cga-track-row--playing" : ""}`}
      onClick={() => onPlay(track)}
      style={{ cursor: "pointer" }}
    >
      <div className="cga-track-bg">
        <div
          className="cga-track-cover"
          style={{ backgroundImage: `url(${track.cover})` }}
          aria-hidden="true"
        />
        <div className={`cga-track-overlay${track.isPlaying ? " cga-track-overlay--visible" : ""}`}>
          <div className="cga-track-play-icon">
            <img
              className="cga-play-icon"
              alt="Play"
              src={track.isPlaying ? `${ASSETS}/icon-2.svg` : `${ASSETS}/icon.svg`}
            />
          </div>
        </div>
      </div>

      <div className="cga-track-info">
        <div className="cga-track-title">{track.title}</div>
        <div className="cga-track-artist">{track.artist}</div>
      </div>

      <div className="cga-track-genre">{track.genre}</div>

      <div className="cga-track-duration">{track.duration}</div>

      <button
        className="cga-track-btn"
        type="button"
        aria-label={track.isPlaying ? t("player.pause", { defaultValue: "Пауза" }) : t("player.play", { defaultValue: "Грати" })}
        onClick={(e) => {
          e.stopPropagation()
          onPlay(track)
        }}
      >
        <img
          className="cga-track-btn-icon"
          alt=""
          src={track.isPlaying ? `${ASSETS}/icon-2.svg` : `${ASSETS}/icon.svg`}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

const AiModelCard = ({ model }: { model: AiModelData }): React.JSX.Element => {
  const { t } = useTranslation()
  const accuracyNum = parseFloat(model.accuracy.replace(/[^0-9.]/g, "")) || 95

  return (
    <div className="cga-model-card">
      <img className="cga-model-mask" alt="" src={model.maskSrc} aria-hidden="true" />

      <div className="cga-model-header">
        <div className="cga-model-title-group">
          <div className="cga-model-icon-box">
            <img
              className="cga-model-icon"
              alt={model.name}
              src={model.iconSrc}
              style={{ width: model.iconW, height: model.iconH }}
            />
          </div>
          <div className="cga-model-name">{model.name}</div>
        </div>

        <div
          className="cga-model-badge"
          style={{ backgroundColor: model.badgeBg }}
        >
          {model.badge}
        </div>
      </div>

      <p className="cga-model-desc">{t(model.descKey, { defaultValue: model.defaultDesc })}</p>

      <div className="cga-model-footer">
        <div className="cga-model-progress-bar">
          <div className="cga-model-progress-fill" style={{ width: `${accuracyNum}%` }} />
        </div>
        <div className="cga-model-accuracy">
          <span className="cga-acc-label">{t("aimix.models.accuracy", { defaultValue: "Успішність:" })} </span>
          <span className="cga-acc-val">{model.accuracy}</span>
        </div>
      </div>
    </div>
  )
}

export const ContentGridAi = (): React.JSX.Element => {
  const { t } = useTranslation()
  const { currentTrack, isPlaying, selectTrack, setTracks } = usePlayer()
  const [tracks, setTracksState] = useState<TrackData[]>([])
  const [mobileTab, setMobileTab] = useState<"tracks" | "models">("tracks")

  const aiModels: AiModelData[] = [
    {
      id: "groovra-ai-core",
      name: "Groovra AI Core",
      descKey: "aimix.models.core_desc",
      defaultDesc: "Ритмічні патерни та базові мелодії.",
      accuracy: "98.4%",
      badge: "Rhythm Expert",
      badgeBg: "#d7f8ff1a",
      iconSrc: `${ASSETS}/model-icon-1.svg`,
      iconW: 18,
      iconH: 18,
      maskSrc: `${ASSETS}/mask-group.svg`,
    },
    {
      id: "quantum-sound",
      name: "Quantum Sound Engine",
      descKey: "aimix.models.quantum_desc",
      defaultDesc: "Надскладні текстури та атмосферні ефекти.",
      accuracy: "96.7%",
      badge: "Ambient King",
      badgeBg: "#d0bcff1a",
      iconSrc: `${ASSETS}/model-icon-2.svg`,
      iconW: 19.01,
      iconH: 20,
      maskSrc: `${ASSETS}/mask-group-2.svg`,
    },
    {
      id: "deep-audio",
      name: "DeepAudio V5",
      descKey: "aimix.models.deep_desc",
      defaultDesc: "Професійне зведення та вокальний синтез.",
      accuracy: "99.1%",
      badge: "Vocal Synthesis",
      badgeBg: "#f0f1fb1a",
      iconSrc: `${ASSETS}/model-icon-3.svg`,
      iconW: 20,
      iconH: 16,
      maskSrc: `${ASSETS}/mask-group-3.svg`,
    },
  ]

  useEffect(() => {
    let active = true
    const loadTracks = async () => {
      try {
        const response = await apiFetch(`${GATEWAY_URL}/music/tracks?pageSize=50`)
        if (response.ok && active) {
          const result = await response.json()
          const dbTracks: PlayerTrack[] = result.items || []

          const aiFiltered = dbTracks.filter((t) => {
            const g = (t.genre || "").toLowerCase()
            const title = (t.title || "").toLowerCase()
            const artist = (t.artistName || "").toLowerCase()
            return (
              g.includes("ai") ||
              g.includes("cyber") ||
              g.includes("synthwave") ||
              g.includes("electronic") ||
              g.includes("ambient") ||
              title.includes("ai") ||
              title.includes("ші") ||
              artist.includes("ai") ||
              artist.includes("neural") ||
              artist.includes("groovra ai")
            )
          })

          if (aiFiltered.length > 0) {
            const mapped = aiFiltered.slice(0, 5).map((t) => {
              const mins = Math.floor(t.durationSeconds / 60)
              const secs = Math.floor(t.durationSeconds % 60).toString().padStart(2, "0")
              return {
                id: t.trackId,
                title: t.title,
                artist: t.artistName,
                genre: t.genre || "AI Pop",
                duration: `${mins}:${secs}`,
                cover: resolveMediaUrl(t.coverImageUrl) || '',
                rawTrack: t,
              }
            })
            setTracksState(mapped)
            return
          }
        }
      } catch (err) {
        console.error("Failed to load real AI tracks:", err)
      }

      if (active) {
        setTracksState([])
      }
    }

    loadTracks()
    return () => {
      active = false
    }
  }, [])

  const handlePlayTrack = (track: TrackData) => {
    if (track.rawTrack) {
      if (currentTrack?.trackId === track.rawTrack.trackId) {
        const playerBtn = document.querySelector(".PlayerPlayBtn") as HTMLButtonElement | null
        if (playerBtn) playerBtn.click()
      } else {
        const contextTracks = tracks
          .filter(t => t.rawTrack)
          .map(t => t.rawTrack!)
        setTracks(contextTracks)
        selectTrack(track.rawTrack)
      }
    }
  }

  const tracksWithPlayingState = tracks.map((t) => {
    const isCurrent = currentTrack?.trackId === t.id
    return {
      ...t,
      isPlaying: isCurrent && isPlaying,
    }
  })

  return (
    <div className="content-grid-ai">
      <div className="cga-mobile-tabs">
        <button
          type="button"
          className={`cga-mobile-tab${mobileTab === "tracks" ? " cga-mobile-tab--active" : ""}`}
          onClick={() => setMobileTab("tracks")}
        >
          {t("aimix.mobile_tabs.tracks_genres", { defaultValue: "🔥 Треки & Жанри" })}
        </button>
        <button
          type="button"
          className={`cga-mobile-tab${mobileTab === "models" ? " cga-mobile-tab--active" : ""}`}
          onClick={() => setMobileTab("models")}
        >
          {t("aimix.mobile_tabs.ai_models", { defaultValue: "🤖 ШІ Моделі" })}
        </button>
      </div>

      <div className={`cga-left${mobileTab === "tracks" ? " cga-column--mobile-active" : ""}`}>
        <div className="cga-section-heading">{t("aimix.popular_title", { defaultValue: "Популярні ШІ Треки" })}</div>
        <div className="cga-tracks-card">
          {tracksWithPlayingState.length > 0 ? (
            tracksWithPlayingState.map((track) => (
              <TrackRow key={track.id} track={track} onPlay={handlePlayTrack} />
            ))
          ) : (
            <div className="cga-empty-tracks">
              <span>{t("aimix.no_ai_tracks", { defaultValue: "ШІ-треки поки відсутні" })}</span>
            </div>
          )}
        </div>

        <div className="cga-genres-section">
          <div className="cga-section-heading">{t("aimix.trending_genres", { defaultValue: "Трендові Жанри" })}</div>
          <div className="cga-genres">
            {GENRES.map((genre) => (
              <button
                key={genre.id}
                type="button"
                className={`cga-genre-btn${genre.active ? " cga-genre-btn--active" : ""}`}
                aria-pressed={genre.active}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`cga-right${mobileTab === "models" ? " cga-column--mobile-active" : ""}`}>
        <div className="cga-models-section">
          <div className="cga-section-heading">{t("aimix.our_models", { defaultValue: "Наші ШІ Моделі" })}</div>
          <div className="cga-models">
            {aiModels.map((model) => (
              <AiModelCard key={model.id} model={model} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
