import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from './api/baseApi'
import playerReducer from './slices/playerSlice'
import uiReducer from './slices/uiSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    player: playerReducer,
    ui: uiReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(baseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
