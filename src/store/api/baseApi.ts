import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { getAccessToken, getOrCreateDeviceId, refreshSession } from '../../api/api-client'
import { GATEWAY_URL } from '../../api/api-client'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: GATEWAY_URL,
  prepareHeaders: (headers) => {
    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    const deviceId = getOrCreateDeviceId()
    headers.set('X-Device-Id', deviceId)
    return headers
  },
})

// Делегирует к refreshSession() из api-client.ts вместо повторной реализации refresh-логики
// здесь же — та версия уже правильно шлёт { email, deviceId } и читает data.token (не
// data.accessToken), и уже не редиректит из clearAuth() при неудаче.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    const newToken = await refreshSession()
    if (newToken) {
      result = await rawBaseQuery(args, api, extraOptions)
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth', 'Profile', 'Track', 'LikedTracks', 'Album', 'Playlist', 'Artist', 'Comment', 'Download',
    // Админка (adminApi / contentApi инжектят эндпоинты в этот же baseApi)
    'AdminUser', 'ArtistApplication', 'AdminRole', 'ContentTrack', 'LIST',
  ],
  endpoints: () => ({}),
})
