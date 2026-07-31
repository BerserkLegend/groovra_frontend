import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getAccessToken, getCurrentUserId } from '../../api/token-store'

export interface AuthState {
  isAuthenticated: boolean
  userEmail: string | null
  userId: string | null
}

const token = getAccessToken()
const userId = getCurrentUserId()
const userEmail = localStorage.getItem('UserEmail')

const initialState: AuthState = {
  isAuthenticated: !!token,
  userEmail: userEmail || null,
  userId: userId || null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ token: string; email?: string; userId?: string }>) => {
      state.isAuthenticated = true
      if (action.payload.email) state.userEmail = action.payload.email
      if (action.payload.userId) state.userId = action.payload.userId
    },
    clearAuth: (state) => {
      state.isAuthenticated = false
      state.userEmail = null
      state.userId = null
    },
  },
})

export const { setAuth, clearAuth } = authSlice.actions
export default authSlice.reducer
