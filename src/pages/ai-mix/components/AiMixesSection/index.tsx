import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { usePlayer, type Track as PlayerTrack } from "../../../../context/player-context"
import { apiFetch, GATEWAY_URL, resolveMediaUrl } from "../../../../api/api-client"
import "./style.css"

const ASSETS = "/src/pages/ai-mix/components/AiMixesSection"

interface MixData {
  id: string
  title: string
  creator: string
  genre: string
  subtitle: string
  coverImage: string
  isReal?: boolean
}

interface RawPlaylist {
  id: string
  title: string
  trackCount: number
  collageCovers?: string[]
  coverImageUrl?: string
}

interface RawPlaylistTrack {
  trackId: string
  title: string
  artistName: string
  durationSeconds: number
  coverUrl?: string
}

interface MixCardProps {
  mix: MixData
  onPlay: (mix: MixData) => void
}

const MixCard = ({ mix, onPlay }: MixCardProps): React.JSX.Element => (
  <div
    className="ams-mix-card"
    role="button"
    tabIndex={0}
    aria-label={`Play ${mix.title}`}
    onClick={() => onPlay(mix)}
  >
    <div className="ams-cover-wrapper">
      <div
        className="ams-cover"
        style={{ backgroundImage: `url(${mix.coverImage})` }}
        aria-label={mix.title}
      />
      <div className="ams-overlay" aria-hidden="true" />
    </div>

    <div className="ams-info">
      <div className="ams-info-row">
        <div className="ams-title">{mix.title}</div>
      </div>
      <div className="ams-info-row">
        <div className="ams-artist">{mix.creator}</div>
      </div>
      <div className="ams-meta">
        <div className="ams-meta-row">
          <div className="ams-tracks">AI Mix</div>
          <div className="ams-genre-tag">{mix.genre}</div>
        </div>
      </div>
    </div>

    <img
      className="ams-mask-group"
      alt=""
      src={`${ASSETS}/mask-group.svg`}
      aria-hidden="true"
    />
  </div>
)

export const AiMixesSection = (): React.JSX.Element => {
  const { t } = useTranslation()
  const { selectTrack, setTracks } = usePlayer()
  const [mixes, setMixes] = useState<MixData[]>([])
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -180 : 180
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }

  useEffect(() => {
    let active = true
    const loadMixes = async () => {
      try {
        const response = await apiFetch(`${GATEWAY_URL}/music/playlists/ai-mixes`)
        if (response.ok && active) {
          const playlists = await response.json()
          if (playlists.length > 0) {
            const mapped = playlists.map((p: RawPlaylist) => ({
              id: p.id,
              title: p.title,
              creator: "Groovra AI",
              genre: t("tracks_count_many", { count: p.trackCount, defaultValue: `${p.trackCount} треків` }),
              subtitle: `Groovra AI • ${p.trackCount}`,
              coverImage: resolveMediaUrl(p.collageCovers?.[0] || p.coverImageUrl) || '',
              isReal: true,
            }))
            setMixes(mapped)
            return
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load recommended AI mixes:', err)
      }

      if (active) {
        setMixes([
          {
            id: "digital-pulse",
            title: "Digital Pulse",
            creator: "Groovra AI Core",
            genre: "Synthwave",
            subtitle: "Groovra AI Core • Synthwave",
            coverImage: `${ASSETS}/mix-cover-1.png`,
          },
          {
            id: "neural-flow",
            title: "Neural Flow",
            creator: "Groovra AI Core",
            genre: "Cyber Pop",
            subtitle: "Groovra AI Core • Cyber Pop",
            coverImage: `${ASSETS}/mix-cover-2.png`,
          },
          {
            id: "quantum-echo",
            title: "Quantum Echo",
            creator: "Neural Composer",
            genre: "Ambient",
            subtitle: "Neural Composer • Ambient",
            coverImage: `${ASSETS}/mix-cover-3.png`,
          },
          {
            id: "digital-echo",
            title: "Digital Echo",
            creator: "Neural Composer",
            genre: "Ambient",
            subtitle: "Neural Composer • Ambient",
            coverImage: `${ASSETS}/mix-cover-4.png`,
          },
          {
            id: "sound-pulse",
            title: "Sound Pulse",
            creator: "Groovra AI Core",
            genre: "Synthwave",
            subtitle: "Groovra AI Core • Synthwave",
            coverImage: `${ASSETS}/mix-cover-5.png`,
          },
        ])
      }
    }

    loadMixes()
    return () => {
      active = false
    }
  }, [t])

  const handlePlayMix = async (mix: MixData) => {
    if (mix.isReal) {
      try {
        const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${mix.id}`)
        if (response.ok) {
          const playlist = await response.json()
          if (playlist.tracks && playlist.tracks.length > 0) {
            const playerTracks: PlayerTrack[] = playlist.tracks.map((pt: RawPlaylistTrack) => ({
              trackId: pt.trackId,
              title: pt.title,
              artistName: pt.artistName,
              durationSeconds: pt.durationSeconds,
              coverImageUrl: resolveMediaUrl(pt.coverUrl) || undefined,
              audioUrl: `${GATEWAY_URL}/music/tracks/${pt.trackId}/stream`,
              fileSizeBytes: 0,
              contentType: "audio/mpeg",
              uploadedAt: new Date().toISOString(),
              playCount: 0,
            }))
            setTracks(playerTracks)
            selectTrack(playerTracks[0])
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load playlist details:', err)
      }
    } else {
      alert(`Playing mock playlist: ${mix.title}`)
    }
  }

  return (
    <div className="ai-mixes-section">
      <div className="ams-header">
        <div className="ams-heading">
          <div className="ams-heading-icon">
            <img className="ams-icon" loading="lazy" alt="AI Mixes icon" src={`${ASSETS}/icon.svg`} />
          </div>
          <div className="ams-heading-text">{t("aimix.rec_title", { defaultValue: "Рекомендовані ШІ Мікси" })}</div>
        </div>

        <div className="ams-controls">
          <button
            type="button"
            className="ams-scroll-btn"
            onClick={() => handleScroll("left")}
            aria-label={t("player.previous", { defaultValue: "Попередні" })}
          >
            ‹
          </button>
          <button
            type="button"
            className="ams-scroll-btn"
            onClick={() => handleScroll("right")}
            aria-label={t("player.next", { defaultValue: "Наступні" })}
          >
            ›
          </button>
        </div>
      </div>

      <div className="ams-cards" ref={scrollRef}>
        {mixes.map((mix) => (
          <MixCard key={mix.id} mix={mix} onPlay={handlePlayMix} />
        ))}
      </div>
    </div>
  )
}
