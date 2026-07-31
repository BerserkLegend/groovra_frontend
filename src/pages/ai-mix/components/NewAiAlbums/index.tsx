import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { apiFetch, GATEWAY_URL, resolveMediaUrl } from "../../../../api/api-client"
import "./style.css"

const ASSETS = "/src/pages/ai-mix/components/NewAiAlbums"

interface AlbumData {
  id: string
  title: string
  artist: string
  tracks: string
  genre: string
  coverImage: string
  maskGroup: string
}

interface RawAlbum {
  id: string
  title: string
  artistName: string
  coverImageUrl?: string
  trackCount: number
  releaseDate?: string
}

interface AlbumCardProps {
  album: AlbumData
}

const MASK_GROUPS = [
  `${ASSETS}/mask-group.svg`,
  `${ASSETS}/mask-group-2.svg`,
  `${ASSETS}/mask-group-3.svg`,
  `${ASSETS}/mask-group-4.svg`,
]

const FALLBACK_ALBUMS: AlbumData[] = [
  {
    id: "neural-odyssey",
    title: "Neural Odyssey",
    artist: "DeepAudio V5",
    tracks: "12 Треків • 2024",
    genre: "Electronic",
    coverImage: `${ASSETS}/AI-album-cover.png`,
    maskGroup: `${ASSETS}/mask-group.svg`,
  },
  {
    id: "silicon-soul",
    title: "Silicon Soul",
    artist: "Quantum Sound Engine",
    tracks: "8 Треків • 2024",
    genre: "Lo-Fi",
    coverImage: `${ASSETS}/image.png`,
    maskGroup: `${ASSETS}/mask-group-2.svg`,
  },
  {
    id: "echoes-of-void",
    title: "Echoes of Void",
    artist: "Ambient AI",
    tracks: "15 Треків • 2023",
    genre: "Ambient",
    coverImage: `${ASSETS}/AI-album-cover-2.png`,
    maskGroup: `${ASSETS}/mask-group-3.svg`,
  },
  {
    id: "cyber-synthesis",
    title: "Cyber Synthesis",
    artist: "Neural Composer",
    tracks: "10 Треків • 2024",
    genre: "Synthwave",
    coverImage: `${ASSETS}/AI-album-cover-3.png`,
    maskGroup: `${ASSETS}/mask-group-4.svg`,
  },
]

const AlbumCard = ({ album }: AlbumCardProps): React.JSX.Element => (
  <div className="naa-album-card">
    <div className="naa-cover-wrapper">
      <div
        className="naa-cover"
        style={{ backgroundImage: `url(${album.coverImage})` }}
        aria-label={album.title}
      />
    </div>
    <div className="naa-info">
      <div className="naa-info-row">
        <div className="naa-title">{album.title}</div>
      </div>
      <div className="naa-info-row">
        <div className="naa-artist">{album.artist}</div>
      </div>
      <div className="naa-meta">
        <div className="naa-meta-row">
          <div className="naa-tracks">{album.tracks}</div>
          <div className="naa-genre-tag">{album.genre}</div>
        </div>
      </div>
    </div>
    <img className="naa-mask-group" alt="" src={album.maskGroup} aria-hidden="true" />
  </div>
)

export const NewAiAlbums = (): React.JSX.Element => {
  const { t } = useTranslation()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [albums, setAlbums] = useState<AlbumData[]>(FALLBACK_ALBUMS)

  useEffect(() => {
    let active = true
    const loadAlbums = async () => {
      try {
        const response = await apiFetch(`${GATEWAY_URL}/music/albums?pageSize=4&pageNumber=1`)
        if (response.ok && active) {
          const result = await response.json()
          const raw: RawAlbum[] = result.items || []
          if (raw.length > 0) {
            const year = new Date().getFullYear()
            const mapped: AlbumData[] = raw.map((a, idx) => ({
              id: a.id,
              title: a.title,
              artist: a.artistName,
              tracks: t("aimix.albums_format", {
                count: a.trackCount,
                year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : year,
                defaultValue: `${a.trackCount} Треків • ${year}`,
              }),
              genre: "Album",
              coverImage: resolveMediaUrl(a.coverImageUrl) || `${ASSETS}/AI-album-cover.png`,
              maskGroup: MASK_GROUPS[idx % MASK_GROUPS.length],
            }))
            setAlbums(mapped)
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to load albums:", err)
      }
    }
    loadAlbums()
    return () => { active = false }
  }, [t])

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -180 : 180, behavior: "smooth" })
    }
  }

  return (
    <div className="new-ai-albums">
      <div className="naa-header">
        <div className="naa-heading">
          <div className="naa-heading-icon">
            <img className="naa-icon" alt="AI Albums icon" src={`${ASSETS}/icon.svg`} />
          </div>
          <div className="naa-heading-text">{t("aimix.stats_title", { defaultValue: "Трендові ШІ Альбоми" })}</div>
        </div>
        <div className="naa-controls">
          <button
            type="button"
            className="naa-scroll-btn"
            onClick={() => handleScroll("left")}
            aria-label={t("player.previous", { defaultValue: "Попередні" })}
          >
            ‹
          </button>
          <button
            type="button"
            className="naa-scroll-btn"
            onClick={() => handleScroll("right")}
            aria-label={t("player.next", { defaultValue: "Наступні" })}
          >
            ›
          </button>
        </div>
      </div>
      <div className="naa-grid" ref={scrollRef}>
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </div>
  )
}
