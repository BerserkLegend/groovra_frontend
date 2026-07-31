import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface UiState {
  isAuthModalOpen: boolean
  isPlaylistModalOpen: boolean
  isShareModalOpen: boolean
  isForwardModalOpen: boolean
  isSubscriptionModalOpen: boolean
  isTwoFactorModalOpen: boolean
  shareData: { title?: string; url?: string; trackId?: string } | null
  forwardMessageData: { messageId?: string; content?: string } | null
}

const initialState: UiState = {
  isAuthModalOpen: false,
  isPlaylistModalOpen: false,
  isShareModalOpen: false,
  isForwardModalOpen: false,
  isSubscriptionModalOpen: false,
  isTwoFactorModalOpen: false,
  shareData: null,
  forwardMessageData: null,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAuthModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isAuthModalOpen = action.payload
    },
    setPlaylistModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPlaylistModalOpen = action.payload
    },
    setShareModalOpen: (state, action: PayloadAction<{ open: boolean; data?: UiState['shareData'] }>) => {
      state.isShareModalOpen = action.payload.open
      if (action.payload.data !== undefined) {
        state.shareData = action.payload.data
      }
    },
    setForwardModalOpen: (state, action: PayloadAction<{ open: boolean; data?: UiState['forwardMessageData'] }>) => {
      state.isForwardModalOpen = action.payload.open
      if (action.payload.data !== undefined) {
        state.forwardMessageData = action.payload.data
      }
    },
    setSubscriptionModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isSubscriptionModalOpen = action.payload
    },
    setTwoFactorModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isTwoFactorModalOpen = action.payload
    },
  },
})

export const {
  setAuthModalOpen,
  setPlaylistModalOpen,
  setShareModalOpen,
  setForwardModalOpen,
  setSubscriptionModalOpen,
  setTwoFactorModalOpen,
} = uiSlice.actions

export default uiSlice.reducer
