import React, { createContext, useContext } from 'react'

export interface Track {
  trackId: string
  title: string
  artistName: string
  album?: string
  genre?: string
  durationSeconds: number
  fileSizeBytes: number
  contentType: string
  audioUrl: string         
  coverImageUrl?: string
  uploadedAt: string
  playCount: number
  isLiked?: boolean
  playedAt?: string
}

export interface PlayerContextType {
  tracks: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  volume: number
  isMuted: boolean
  currentTime: number
  duration: number
  isShuffle: boolean
  isRepeat: boolean
  isLoadingTracks: boolean
  searchQuery: string
  likedTrackIds: string[]
  /** Збільшується ПІСЛЯ підтвердження лайку/дизлайку сервером. Сторінки зі списком
   *  вподобаного мають перезавантажуватись саме по ньому, а не по likedTrackIds:
   *  останній змінюється оптимістично, до відповіді сервера, тому запит списку
   *  обганяв би сам мутуючий запит і повертав ще старі дані. */
  likedSyncVersion: number
  isLiked: boolean
  audioUrl: string | null
  audioRef: React.RefObject<HTMLAudioElement | null>
  activeTab: string
  setActiveTab: (tab: string) => void
  selectTrack: (track: Track) => void
  togglePlayPause: () => void
  playNext: () => void
  playPrevious: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  toggleMute: () => void
  applyVolume: (newVolume: number) => void
  seekTo: (percent: number) => void
  handleSearchChange: (query: string) => void
  toggleLiked: () => Promise<boolean>
  formatTime: (seconds: number) => string
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>
  setCurrentTrack: React.Dispatch<React.SetStateAction<Track | null>>
  fetchTracks: (search?: string, page?: number, append?: boolean, genre?: string, retryOnEmpty?: boolean) => Promise<void>
  popularTracks: Track[]
  isLoadingPopular: boolean
  fetchPopularTracks: () => Promise<void>
  currentPage: number
  hasMoreTracks: boolean
  totalTracksPages: number
  totalTracksCount: number
  libraryTracks: Track[]
  isLoadingLibrary: boolean
  fetchLibrary: () => Promise<void>
  equalizer: ReturnType<typeof import('../hooks/use-equalizer').useEqualizer>
}

export const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}

export const normalizeUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  if (url.startsWith('/')) return `https://localhost:7005${url}`;
  return `https://localhost:7005/${url}`;
};
