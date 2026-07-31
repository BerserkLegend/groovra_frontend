import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { usePlayer, type Track } from "../../context/player-context"
import { apiFetch, GATEWAY_URL } from "../../api/api-client"
import { HeroSectionMargin } from "./components/HeroSectionMargin"
import { SectionStatistics } from "./components/SectionStatistics"
import { SectionRealTime } from "./components/SectionRealTime"
import { NewAiAlbums } from "./components/NewAiAlbums"
import { NewHowAiCreates } from "./components/NewHowAiCreates"
import { AiMixesSection } from "./components/AiMixesSection"
import { ContentGridAi } from "./components/ContentGridAi"
import { FooterFromJson } from "../ai-mix/components/FooterFromJson"
import { TrackCover } from "../../components/common/TrackCover"
import type { PlaylistDetail } from "../../types/playlist"
import { getPlaylistTrackCover } from "../../types/playlist"
import "./ai-mix.css"

export const AiMixPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const { selectTrack, setTracks, currentTrack, formatTime } = usePlayer()

  const [generatedPlaylist, setGeneratedPlaylist] = useState<PlaylistDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPlaylistLiked, setIsPlaylistLiked] = useState(false)

  const handleGenerate = async (promptText: string) => {
    if (!promptText.trim()) return

    setIsLoading(true)
    setError(null)
    setGeneratedPlaylist(null)
    setLoadingStep(t("aimix.loading_analysis", { defaultValue: "Аналізуємо настрій..." }))

    const timer1 = setTimeout(() => {
      setLoadingStep(t("aimix.loading_tracks", { defaultValue: "Підбираємо треки за допомогою ШІ..." }))
    }, 1800)

    const timer2 = setTimeout(() => {
      setLoadingStep(t("aimix.loading_compiling", { defaultValue: "Створюємо унікальний плейлист..." }))
    }, 3800)

    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/ai-mix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || t("aimix.error_failed", { defaultValue: "Не вдалося згенерувати ШІ мікс." }))
      }

      const data: PlaylistDetail = await response.json()
      setGeneratedPlaylist(data)
      setIsPlaylistLiked(!!data.isLiked)
    } catch (err: any) {
      console.error(err)
      setError(err.message || t("errors.unknown", { defaultValue: "Сталася помилка." }))
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setGeneratedPlaylist(null)
    setError(null)
  }

  const handlePlayPlaylist = () => {
    if (!generatedPlaylist || !generatedPlaylist.tracks.length) return

    const playerTracks: Track[] = generatedPlaylist.tracks.map((pt) => ({
      trackId: pt.trackId,
      title: pt.title,
      artistName: pt.artistName,
      durationSeconds: pt.durationSeconds,
      coverImageUrl: getPlaylistTrackCover(pt),
      audioUrl: `${GATEWAY_URL}/music/tracks/${pt.trackId}/stream`,
      fileSizeBytes: 0,
      contentType: "audio/mpeg",
      uploadedAt: new Date().toISOString(),
      playCount: 0,
      isLiked: false,
    }))

    setTracks(playerTracks)
    selectTrack(playerTracks[0])
  }

  const handleToggleLike = async () => {
    if (!generatedPlaylist) return

    const playlistId = generatedPlaylist.id
    const currentlyLiked = isPlaylistLiked

    setIsPlaylistLiked(!currentlyLiked)

    try {
      // Роут плейлистів у бекенді — /music/favorites/playlists (множина), як і всюди
      // в api/playlists.ts. Однина 404/405-ила, а apiFetch не кидає на не-2xx, тому
      // серце лишалося "залайканим", хоч лайк ніколи не зберігався.
      const response = currentlyLiked
        ? await apiFetch(`${GATEWAY_URL}/music/favorites/playlists/${playlistId}`, {
            method: "DELETE",
          })
        : await apiFetch(`${GATEWAY_URL}/music/favorites/playlists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playlistId }),
          })

      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    } catch (err) {
      console.error("Error toggling like for playlist:", err)
      setIsPlaylistLiked(currentlyLiked)
    }
  }

  return (
    <div className="ai-mix-page">
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />

      <HeroSectionMargin
        playlist={generatedPlaylist}
        isLoading={isLoading}
        loadingMessage={loadingStep}
        error={error}
        onGenerate={handleGenerate}
        onReset={handleReset}
        onPlayPlaylist={handlePlayPlaylist}
        isLiked={isPlaylistLiked}
        onToggleLike={handleToggleLike}
      />

      {generatedPlaylist ? (
        <div className="LibraryTrackList ai-mix-track-list" style={{ marginTop: "32px", width: "100%" }}>
          <h2 className="SectionTitle" style={{ fontSize: "24px", marginBottom: "20px" }}>
            {t("aimix.tracks_in_mix", { defaultValue: "Треки в міксі" })}
          </h2>
          <div className="LibraryTableHeader">
            <span className="ColHash">#</span>
            <span className="ColTitle">{t("library.song_title")}</span>
            <span className="ColGenre">{t("library.genre")}</span>
            <span className="ColDuration">{t("library.duration")}</span>
          </div>
          <div className="LibraryTableBody">
            {generatedPlaylist.tracks.map((track, index) => {
              const mappedTrack: Track = {
                trackId: track.trackId,
                title: track.title,
                artistName: track.artistName,
                durationSeconds: track.durationSeconds,
                coverImageUrl: getPlaylistTrackCover(track),
                audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
                fileSizeBytes: 0,
                contentType: "audio/mpeg",
                uploadedAt: new Date().toISOString(),
                playCount: 0,
              }

              return (
                <div
                  key={track.trackId}
                  className={`LibraryRow ${currentTrack?.trackId === track.trackId ? "active-row" : ""}`}
                  onClick={() => selectTrack(mappedTrack)}
                  tabIndex={0}
                  role="button"
                  aria-label={t("library.play_track", { title: track.title, artist: track.artistName })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") selectTrack(mappedTrack)
                  }}
                >
                  <span className="ColHash">{index + 1}</span>
                  <div className="ColTitleDetail">
                    <TrackCover src={getPlaylistTrackCover(track)} className="LibraryRowCover" alt={track.title} />
                    <div className="LibraryRowInfo">
                      <span className="RowTitle">{track.title}</span>
                      <span className="RowArtist">{track.artistName}</span>
                    </div>
                  </div>
                  <span className="ColGenre">AI</span>
                  <span className="ColDuration">{formatTime(track.durationSeconds)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <SectionStatistics />
          <SectionRealTime />
          <NewAiAlbums />
          <NewHowAiCreates />
          <AiMixesSection />
          <ContentGridAi />
        </>
      )}

      <FooterFromJson />
    </div>
  )
}
