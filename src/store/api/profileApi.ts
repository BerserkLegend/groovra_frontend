import { baseApi } from './baseApi'
import type { ProfileResponse, UpdateProfilePayload } from '../../api/profile'

export interface UserStatsResponse {
  tracksCount: number
  playlistsCount: number
  likedCount: number
}

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<ProfileResponse, void>({
      query: () => '/profile',
      providesTags: ['Profile'],
    }),

    getProfileStats: builder.query<UserStatsResponse, void>({
      query: () => '/profile/stats',
      providesTags: ['Profile', 'Track', 'Playlist', 'LikedTracks'],
    }),

    updateProfile: builder.mutation<ProfileResponse, UpdateProfilePayload>({
      query: (payload) => ({
        url: '/profile',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Profile'],
    }),

    uploadAvatar: builder.mutation<{ avatarUrl: string }, FormData>({
      query: (formData) => ({
        url: '/profile/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Profile'],
    }),
  }),
})

export const {
  useGetProfileQuery,
  useGetProfileStatsQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} = profileApi
