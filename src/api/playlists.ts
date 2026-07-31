import { apiFetch, GATEWAY_URL } from './api-client'
import type { PagedResult } from '../types/shared'

export interface PlaylistListItem {
  id: string
  title: string
  description?: string
  isPrivate: boolean
  isLiked: boolean
  isOwner: boolean
  slug: string
  trackCount: number
  totalDurationSeconds: number
  coverImageUrl?: string
  collageCovers: string[]
  updatedAt: string
}

export type { PagedResult } from '../types/shared'

const normalizePlaylistListItem = (raw: Record<string, unknown>): PlaylistListItem => ({
  id: String(raw.id ?? raw.Id ?? ''),
  title: String(raw.title ?? raw.Title ?? ''),
  description: (raw.description ?? raw.Description) as string | undefined,
  isPrivate: Boolean(raw.isPrivate ?? raw.IsPrivate ?? false),
  isLiked: Boolean(raw.isLiked ?? raw.IsLiked ?? false),
  isOwner: Boolean(raw.isOwner ?? raw.IsOwner ?? false),
  slug: String(raw.slug ?? raw.Slug ?? ''),
  trackCount: Number(raw.trackCount ?? raw.TrackCount ?? 0),
  totalDurationSeconds: Number(raw.totalDurationSeconds ?? raw.TotalDurationSeconds ?? 0),
  coverImageUrl: (raw.coverImageUrl ?? raw.CoverImageUrl) as string | undefined,
  collageCovers: (raw.collageCovers ?? raw.CollageCovers ?? []) as string[],
  updatedAt: String(raw.updatedAt ?? raw.UpdatedAt ?? ''),
})

export interface SearchPlaylistsParams {
  search?: string
  pageNumber?: number
  pageSize?: number
}

export const searchPlaylists = async (params: SearchPlaylistsParams = {}): Promise<PagedResult<PlaylistListItem>> => {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  query.set('pageNumber', String(params.pageNumber ?? 1))
  query.set('pageSize', String(params.pageSize ?? 20))

  const res = await apiFetch(`${GATEWAY_URL}/music/playlists/search?${query.toString()}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося знайти плейлисти: ${res.status}`)
  }

  const data = await res.json()
  const items = (data.items ?? data.Items ?? []) as Record<string, unknown>[]
  return {
    items: items.map(normalizePlaylistListItem),
    totalCount: Number(data.totalCount ?? data.TotalCount ?? items.length),
    pageNumber: Number(data.pageNumber ?? data.PageNumber ?? params.pageNumber ?? 1),
    pageSize: Number(data.pageSize ?? data.PageSize ?? params.pageSize ?? 20),
  }
}

export const likePlaylist = async (playlistId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/favorites/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlistId }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося зберегти плейлист: ${res.status}`)
  }
}

export const unlikePlaylist = async (playlistId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/favorites/playlists/${playlistId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося видалити плейлист зі збережених: ${res.status}`)
  }
}

export const getDeletedPlaylists = async (): Promise<PlaylistListItem[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/playlists/deleted`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити видалені плейлисти: ${res.status}`)
  }

  const data = (await res.json()) as Record<string, unknown>[]
  return data.map(normalizePlaylistListItem)
}

export const restorePlaylist = async (playlistId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}/restore`, {
    method: 'POST',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося відновити плейлист: ${res.status}`)
  }
}

export const permanentlyDeletePlaylist = async (playlistId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}/permanent`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося остаточно видалити плейлист: ${res.status}`)
  }
}

export const reorderPlaylistTracks = async (playlistId: string, orderedTrackIds: string[]): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}/tracks/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedTrackIds }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося змінити порядок треків: ${res.status}`)
  }
}

export const deletePlaylist = async (playlistId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося видалити плейлист: ${res.status}`)
  }
}
