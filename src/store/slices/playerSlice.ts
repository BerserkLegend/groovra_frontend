import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Track } from '../../context/player-context'

export interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  isPlaying: boolean
  volume: number
  isMuted: boolean
  currentTime: number
  duration: number
  isShuffle: boolean
  isRepeat: boolean
  likedTrackIds: string[]
}

const initialVolume = parseFloat(localStorage.getItem('groovy_volume') || '0.7')

const initialState: PlayerState = {
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: isNaN(initialVolume) ? 0.7 : initialVolume,
  isMuted: false,
  currentTime: 0,
  duration: 0,
  isShuffle: false,
  isRepeat: false,
  likedTrackIds: [],
}

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setCurrentTrack: (state, action: PayloadAction<Track | null>) => {
      state.currentTrack = action.payload
    },
    setQueue: (state, action: PayloadAction<Track[]>) => {
      state.queue = action.payload
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload
    },
    togglePlayPause: (state) => {
      state.isPlaying = !state.isPlaying
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload
      localStorage.setItem('groovy_volume', action.payload.toString())
    },
    setIsMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload
    },
    toggleShuffle: (state) => {
      state.isShuffle = !state.isShuffle
    },
    toggleRepeat: (state) => {
      state.isRepeat = !state.isRepeat
    },
    setLikedTrackIds: (state, action: PayloadAction<string[]>) => {
      state.likedTrackIds = action.payload
    },
    toggleLikedTrackId: (state, action: PayloadAction<string>) => {
      const trackId = action.payload
      const index = state.likedTrackIds.indexOf(trackId)
      if (index >= 0) {
        state.likedTrackIds.splice(index, 1)
      } else {
        state.likedTrackIds.push(trackId)
      }
    },
  },
})

export const {
  setCurrentTrack,
  setQueue,
  setIsPlaying,
  togglePlayPause,
  setVolume,
  setIsMuted,
  toggleMute,
  setCurrentTime,
  setDuration,
  toggleShuffle,
  toggleRepeat,
  setLikedTrackIds,
  toggleLikedTrackId,
} = playerSlice.actions

export default playerSlice.reducer
