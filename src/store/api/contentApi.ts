import { baseApi } from './baseApi'

export interface AdminTrack {
  id: string
  code: string
  title: string
  artist: string
  genre: string
  plays: string
  playsValue: number
  status: 'active' | 'flagged'
  aiGen: boolean
  createdAt: string
  isDeleted: boolean
  coverUrl?: string
}

export interface TracksResponse {
  items: AdminTrack[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface GetTracksParams {
  pageNumber?: number
  pageSize?: number
  search?: string
  genre?: string
  status?: 'active' | 'flagged' | 'all'
  includeDeleted?: boolean
}

export const contentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTracks: builder.query<TracksResponse, GetTracksParams>({
      query: (params) => {
        const searchParams = new URLSearchParams()
        if (params.pageNumber) searchParams.set('pageNumber', String(params.pageNumber))
        if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
        if (params.search) searchParams.set('search', params.search)
        if (params.genre && params.genre !== 'all') searchParams.set('genre', params.genre)
        if (params.status && params.status !== 'all') searchParams.set('status', params.status)
        if (params.includeDeleted) searchParams.set('includeDeleted', 'true')
        const qs = searchParams.toString()
        return { url: `/admin/tracks${qs ? '?' + qs : ''}` }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((t) => ({ type: 'ContentTrack' as const, id: t.id })),
              { type: 'ContentTrack' as const, id: 'LIST' },
            ]
          : [{ type: 'ContentTrack' as const, id: 'LIST' }],
    }),

    getGenres: builder.query<string[], void>({
      query: () => '/admin/genres',
      providesTags: [{ type: 'ContentTrack' as const, id: 'GENRES' }],
    }),

    updateTrackStatus: builder.mutation<{ message: string }, { trackId: string; status: 'active' | 'flagged' }>({
      query: ({ trackId, status }) => ({
        url: `/admin/tracks/${trackId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { trackId }) => [
        { type: 'ContentTrack' as const, id: trackId },
        { type: 'ContentTrack' as const, id: 'LIST' },
      ],
    }),

    deleteTrack: builder.mutation<{ message: string }, string>({
      query: (trackId) => ({
        url: `/admin/tracks/${trackId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, trackId) => [
        { type: 'ContentTrack' as const, id: trackId },
        { type: 'ContentTrack' as const, id: 'LIST' },
      ],
    }),

    bulkDeleteTracks: builder.mutation<{ message: string }, string[]>({
      query: (trackIds) => ({
        url: '/admin/tracks/bulk-delete',
        method: 'POST',
        body: { trackIds },
      }),
      invalidatesTags: () => [
        { type: 'ContentTrack' as const, id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetTracksQuery,
  useGetGenresQuery,
  useUpdateTrackStatusMutation,
  useDeleteTrackMutation,
  useBulkDeleteTracksMutation,
} = contentApi
