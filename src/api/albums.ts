import { apiFetch, GATEWAY_URL } from './api-client'
import type { PagedResult } from '../types/shared'

export interface AlbumListItem {
  id: string
  title: string
  artistName: string
  coverImageUrl?: string
  trackCount: number
  totalDurationSeconds: number
  releaseDate?: string
  isLiked: boolean
  collageCovers: string[]
}

export interface AlbumTrackItem {
  trackId: string
  title: string
  artistName: string
  durationSeconds: number
  audioUrl: string
  coverImageUrl?: string
}

export interface Album extends AlbumListItem {
  userId: string
  description?: string
  createdAt: string
  tracks: AlbumTrackItem[]
}

export type { PagedResult } from '../types/shared'

const normalizeAlbumListItem = (raw: Record<string, unknown>): AlbumListItem => ({
  id: String(raw.id ?? raw.Id ?? ''),
  title: String(raw.title ?? raw.Title ?? ''),
  artistName: String(raw.artistName ?? raw.ArtistName ?? ''),
  coverImageUrl: (raw.coverImageUrl ?? raw.CoverImageUrl) as string | undefined,
  trackCount: Number(raw.trackCount ?? raw.TrackCount ?? 0),
  totalDurationSeconds: Number(raw.totalDurationSeconds ?? raw.TotalDurationSeconds ?? 0),
  releaseDate: (raw.releaseDate ?? raw.ReleaseDate) as string | undefined,
  isLiked: Boolean(raw.isLiked ?? raw.IsLiked ?? false),
  collageCovers: (raw.collageCovers ?? raw.CollageCovers ?? []) as string[],
})

const normalizeAlbum = (raw: Record<string, unknown>): Album => ({
  ...normalizeAlbumListItem(raw),
  userId: String(raw.userId ?? raw.UserId ?? ''),
  description: (raw.description ?? raw.Description) as string | undefined,
  createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  tracks: ((raw.tracks ?? raw.Tracks ?? []) as Record<string, unknown>[]).map((t) => ({
    trackId: String(t.trackId ?? t.TrackId ?? ''),
    title: String(t.title ?? t.Title ?? ''),
    artistName: String(t.artistName ?? t.ArtistName ?? ''),
    durationSeconds: Number(t.durationSeconds ?? t.DurationSeconds ?? 0),
    audioUrl: String(t.audioUrl ?? t.AudioUrl ?? ''),
    coverImageUrl: (t.coverImageUrl ?? t.CoverImageUrl) as string | undefined,
  })),
})

export interface FetchAlbumsParams {
  search?: string
  genre?: string
  userId?: string
  pageNumber?: number
  pageSize?: number
}

const buildAlbumsQuery = (params: FetchAlbumsParams): string => {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.genre) query.set('genre', params.genre)
  if (params.userId) query.set('userId', params.userId)
  query.set('pageNumber', String(params.pageNumber ?? 1))
  query.set('pageSize', String(params.pageSize ?? 20))
  return query.toString()
}

export const fetchAlbums = async (params: FetchAlbumsParams = {}): Promise<PagedResult<AlbumListItem>> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/albums?${buildAlbumsQuery(params)}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити альбоми: ${res.status}`)
  }

  const data = await res.json()
  const items = (data.items ?? data.Items ?? []) as Record<string, unknown>[]
  return {
    items: items.map(normalizeAlbumListItem),
    totalCount: Number(data.totalCount ?? data.TotalCount ?? items.length),
    pageNumber: Number(data.pageNumber ?? data.PageNumber ?? params.pageNumber ?? 1),
    pageSize: Number(data.pageSize ?? data.PageSize ?? params.pageSize ?? 20),
  }
}

export const fetchAlbumById = async (id: string): Promise<Album> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/albums/${id}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити альбом: ${res.status}`)
  }

  return normalizeAlbum(await res.json())
}

export const fetchLikedAlbums = async (): Promise<AlbumListItem[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/favorites/albums`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити збережені альбоми: ${res.status}`)
  }

  const data = (await res.json()) as Record<string, unknown>[]
  return data.map(normalizeAlbumListItem)
}

export const likeAlbum = async (albumId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/favorites/albums`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ albumId }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося зберегти альбом: ${res.status}`)
  }
}

export const unlikeAlbum = async (albumId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/favorites/albums/${albumId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося видалити альбом зі збережених: ${res.status}`)
  }
}

export const deleteAlbum = async (albumId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/albums/${albumId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося видалити альбом: ${res.status}`)
  }
}

export interface FetchMyAlbumsParams {
  search?: string
  genre?: string
  pageNumber?: number
  pageSize?: number
}

export const fetchMyAlbums = async (params: FetchMyAlbumsParams = {}): Promise<PagedResult<AlbumListItem>> => {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.genre) query.set('genre', params.genre)
  query.set('pageNumber', String(params.pageNumber ?? 1))
  query.set('pageSize', String(params.pageSize ?? 20))

  const res = await apiFetch(`${GATEWAY_URL}/music/albums/me?${query.toString()}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити ваші альбоми: ${res.status}`)
  }

  const data = await res.json()
  const items = (data.items ?? data.Items ?? []) as Record<string, unknown>[]
  return {
    items: items.map(normalizeAlbumListItem),
    totalCount: Number(data.totalCount ?? data.TotalCount ?? items.length),
    pageNumber: Number(data.pageNumber ?? data.PageNumber ?? params.pageNumber ?? 1),
    pageSize: Number(data.pageSize ?? data.PageSize ?? params.pageSize ?? 20),
  }
}

export const fetchDeletedAlbums = async (): Promise<AlbumListItem[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/albums/deleted`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити видалені альбоми: ${res.status}`)
  }

  const data = (await res.json()) as Record<string, unknown>[]
  return data.map(normalizeAlbumListItem)
}

export const restoreAlbum = async (albumId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/albums/${albumId}/restore`, {
    method: 'POST',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося відновити альбом: ${res.status}`)
  }
}

export const permanentlyDeleteAlbum = async (albumId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/albums/${albumId}/permanent`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося остаточно видалити альбом: ${res.status}`)
  }
}

/** Результат масового призначення треків: бекенд мовчки пропускає треки, які вже
 *  належать іншому альбому або не знайдені, тому UI має показати це користувачу. */
export interface BulkTrackOperationResult {
  addedIds: string[]
  alreadyInAlbumIds: string[]
  belongsToAnotherAlbumIds: string[]
  /** Трек належить альбому, який лежить у кошику — його не видно в списках,
   *  тому користувачу треба окремо пояснити, як звільнити трек. */
  belongsToTrashedAlbumIds: string[]
  notFoundIds: string[]
}

const toIdList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((id) => String(id)) : []

const normalizeBulkTrackResult = (raw: Record<string, unknown> | null | undefined): BulkTrackOperationResult => ({
  addedIds: toIdList(raw?.addedIds ?? raw?.AddedIds),
  alreadyInAlbumIds: toIdList(raw?.alreadyInAlbumIds ?? raw?.AlreadyInAlbumIds),
  belongsToAnotherAlbumIds: toIdList(raw?.belongsToAnotherAlbumIds ?? raw?.BelongsToAnotherAlbumIds),
  belongsToTrashedAlbumIds: toIdList(raw?.belongsToTrashedAlbumIds ?? raw?.BelongsToTrashedAlbumIds),
  notFoundIds: toIdList(raw?.notFoundIds ?? raw?.NotFoundIds),
})

export interface CreateAlbumPayload {
  title: string
  description?: string
  releaseDate?: string
  trackIds?: string[]
  coverFile?: File | null
}

export const createAlbum = async (
  payload: CreateAlbumPayload
): Promise<{ album: Album; trackImport: BulkTrackOperationResult }> => {
  const formData = new FormData()
  formData.append('Title', payload.title)
  if (payload.description) formData.append('Description', payload.description)
  if (payload.releaseDate) formData.append('ReleaseDate', payload.releaseDate)
  for (const trackId of payload.trackIds ?? []) {
    formData.append('TrackIds', trackId)
  }
  if (payload.coverFile) formData.append('CoverFile', payload.coverFile)

  const res = await apiFetch(`${GATEWAY_URL}/music/albums`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося створити альбом: ${res.status}`)
  }

  const data = await res.json()
  return {
    album: normalizeAlbum((data.Album ?? data.album ?? data) as Record<string, unknown>),
    trackImport: normalizeBulkTrackResult(
      (data.TrackImportDetails ?? data.trackImportDetails) as Record<string, unknown> | undefined
    ),
  }
}

export interface UpdateAlbumPayload {
  title?: string
  description?: string
  releaseDate?: string
  coverFile?: File | null
  /** Прибрати поточну обкладинку. Ігнорується, якщо передано coverFile. */
  removeCover?: boolean
}

export const updateAlbum = async (albumId: string, payload: UpdateAlbumPayload): Promise<void> => {
  const formData = new FormData()
  if (payload.title !== undefined) formData.append('Title', payload.title)
  if (payload.description !== undefined) formData.append('Description', payload.description)
  if (payload.releaseDate !== undefined) formData.append('ReleaseDate', payload.releaseDate)
  if (payload.coverFile) {
    formData.append('CoverFile', payload.coverFile)
  } else if (payload.removeCover) {
    formData.append('RemoveCover', 'true')
  }

  const res = await apiFetch(`${GATEWAY_URL}/music/albums/${albumId}`, {
    method: 'PATCH',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося оновити альбом: ${res.status}`)
  }
}

export const addAlbumTracks = async (albumId: string, trackIds: string[]): Promise<BulkTrackOperationResult> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/albums/${albumId}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackIds }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.Message || data?.message || `Не вдалося додати треки до альбому: ${res.status}`)
  }

  return normalizeBulkTrackResult((data?.details ?? data?.Details) as Record<string, unknown> | undefined)
}

export const removeAlbumTrack = async (albumId: string, trackId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/albums/${albumId}/tracks/${trackId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося видалити трек з альбому: ${res.status}`)
  }
}
