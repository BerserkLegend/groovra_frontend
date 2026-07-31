import { apiFetch, GATEWAY_URL, resolveMediaUrl } from './api-client'
import type { TrackBaseItem } from '../types/shared'

export interface ProfileResponse {
  userId?: string
  username?: string
  displayName: string
  firstName: string
  lastName: string
  bio: string
  city: string
  country: string
  phone: string
  birthday: string
  gender: string
  avatarUrl: string
  bannerUrl: string
  linkUrl: string
  linkLabel: string
  supportLink: string
  settingsJson?: string
  createdAt?: string
  followersCount?: number
  followingCount?: number
}

export interface UpdateProfilePayload {
  displayName?: string
  firstName?: string
  lastName?: string
  bio?: string
  city?: string
  country?: string
  phone?: string
  birthday?: string
  gender?: string
  linkUrl?: string
  linkLabel?: string
  supportLink?: string
  settingsJson?: string
}

export { resolveMediaUrl }

export const getProfile = async (): Promise<ProfileResponse> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити профіль: ${res.status}`)
  }

  return res.json()
}

export const updateProfile = async (payload: UpdateProfilePayload): Promise<ProfileResponse> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося оновити профіль: ${res.status}`)
  }

  return res.json()
}

export const uploadAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await apiFetch(`${GATEWAY_URL}/profile/avatar`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити аватар: ${res.status}`)
  }

  const data = await res.json()
  return { avatarUrl: data.AvatarUrl || data.avatarUrl }
}

export const uploadBanner = async (file: File): Promise<{ bannerUrl: string }> => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await apiFetch(`${GATEWAY_URL}/profile/banner`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити банер: ${res.status}`)
  }

  const data = await res.json()
  return { bannerUrl: data.BannerUrl || data.bannerUrl }
}

export const deleteAvatar = async (): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile/avatar`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося видалити аватар: ${res.status}`)
  }
}

export const deleteBanner = async (): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile/banner`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося видалити банер: ${res.status}`)
  }
}

export interface HistoryTrackItem extends TrackBaseItem {
  playedAt: string
}

export const getUserHistory = async (pageNumber = 1, pageSize = 20): Promise<{ items: HistoryTrackItem[]; totalCount: number }> => {
  try {
    const res = await apiFetch(`${GATEWAY_URL}/api/history?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
      method: 'GET',
    })

    if (!res.ok) return { items: [], totalCount: 0 }

    const data = await res.json()
    const rawItems = (data.items ?? data.Items ?? []) as Record<string, unknown>[]
    const items: HistoryTrackItem[] = rawItems.map((item) => {
      const trackId = String(item.trackId ?? item.TrackId ?? '')
      const rawAudio = (item.audioUrl ?? item.AudioUrl) as string | undefined
      const rawCover = (item.coverImageUrl ?? item.CoverImageUrl) as string | undefined

      const audioUrl = rawAudio
        ? (rawAudio.startsWith('http') ? rawAudio.replace(/^https?:\/\/localhost:\d+/, GATEWAY_URL) : `${GATEWAY_URL}${rawAudio.startsWith('/') ? '' : '/'}${rawAudio}`)
        : `${GATEWAY_URL}/music/tracks/${trackId}/stream`

      const coverImageUrl = rawCover
        ? (rawCover.startsWith('http') ? rawCover.replace(/^https?:\/\/localhost:\d+/, GATEWAY_URL) : `${GATEWAY_URL}${rawCover.startsWith('/') ? '' : '/'}${rawCover}`)
        : undefined

      return {
        trackId,
        title: String(item.title ?? item.Title ?? 'Unknown'),
        artistName: String(item.artistName ?? item.ArtistName ?? 'Unknown'),
        audioUrl,
        coverImageUrl,
        durationSeconds: Number(item.durationSeconds ?? item.DurationSeconds ?? 0),
        playedAt: String(item.playedAt ?? item.PlayedAt ?? ''),
      }
    })

    return { items, totalCount: Number(data.totalCount ?? data.TotalCount ?? items.length) }
  } catch {
    return { items: [], totalCount: 0 }
  }
}

export type FavoriteTrackItem = TrackBaseItem

export const getFavoriteTracks = async (pageNumber = 1, pageSize = 50): Promise<{ items: FavoriteTrackItem[]; totalCount: number }> => {
  try {
    const res = await apiFetch(`${GATEWAY_URL}/music/favorites?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
      method: 'GET',
    })

    if (!res.ok) return { items: [], totalCount: 0 }

    const data = await res.json()
    const rawItems = Array.isArray(data) ? data : (data.items ?? data.Items ?? [])
    const items: FavoriteTrackItem[] = rawItems.map((item: Record<string, unknown>) => {
      const trackId = String(item.trackId ?? item.TrackId ?? item.id ?? '')
      const rawAudio = (item.audioUrl ?? item.AudioUrl) as string | undefined
      const rawCover = (item.coverImageUrl ?? item.CoverImageUrl) as string | undefined

      const audioUrl = rawAudio
        ? (rawAudio.startsWith('http') ? rawAudio.replace(/^https?:\/\/localhost:\d+/, GATEWAY_URL) : `${GATEWAY_URL}${rawAudio.startsWith('/') ? '' : '/'}${rawAudio}`)
        : `${GATEWAY_URL}/music/tracks/${trackId}/stream`

      const coverImageUrl = rawCover
        ? (rawCover.startsWith('http') ? rawCover.replace(/^https?:\/\/localhost:\d+/, GATEWAY_URL) : `${GATEWAY_URL}${rawCover.startsWith('/') ? '' : '/'}${rawCover}`)
        : undefined

      return {
        trackId,
        title: String(item.title ?? item.Title ?? 'Unknown'),
        artistName: String(item.artistName ?? item.ArtistName ?? 'Unknown'),
        audioUrl,
        coverImageUrl,
        durationSeconds: Number(item.durationSeconds ?? item.DurationSeconds ?? 0),
      }
    })

    return { items, totalCount: Number(data.totalCount ?? data.TotalCount ?? items.length) }
  } catch {
    return { items: [], totalCount: 0 }
  }
}

export interface ApplyArtistPayload {
  artistName: string
  genre: string
  country?: string
  platform?: string
}

export const applyArtist = async (payload: ApplyArtistPayload): Promise<{ message: string; isArtist: boolean }> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile/artist/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося подати заявку: ${res.status}`)
  }

  return res.json()
}

export const getArtistStatus = async (): Promise<{ isArtist: boolean; bio?: string }> => {
  try {
    const res = await apiFetch(`${GATEWAY_URL}/profile/artist/status`, {
      method: 'GET',
    })

    if (!res.ok) return { isArtist: false }
    const data = await res.json()
    return {
      isArtist: !!(data.isArtist || data.IsArtist),
      bio: (data.bio || data.Bio) as string | undefined,
    }
  } catch {
    return { isArtist: false }
  }
}

export interface UploadTrackPayload {
  title: string
  artistName?: string
  album?: string
  genre?: string
  file: File
  coverImage?: File | null
}

export const uploadArtistTrack = async (payload: UploadTrackPayload): Promise<{ trackId: string; title: string; audioUrl: string; coverImageUrl?: string }> => {
  const formData = new FormData()
  formData.append('Title', payload.title)
  if (payload.artistName) formData.append('ArtistName', payload.artistName)
  if (payload.album) formData.append('Album', payload.album)
  if (payload.genre) formData.append('Genre', payload.genre)
  formData.append('File', payload.file)
  if (payload.coverImage) {
    formData.append('CoverImage', payload.coverImage)
  }

  const res = await apiFetch(`${GATEWAY_URL}/music/upload/track`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Error || data?.error || data?.Message || data?.message || `Помилка завантаження треку: HTTP ${res.status}`)
  }

  const result = await res.json()
  return {
    trackId: result.trackId || result.TrackId,
    title: result.title || result.Title,
    audioUrl: result.audioUrl || result.AudioUrl,
    coverImageUrl: result.coverImageUrl || result.CoverImageUrl,
  }
}

export interface ArtistTrackItem {
  id: string
  title: string
  artistName: string
  album?: string
  genre: string
  audioUrl: string
  coverImageUrl?: string
  playCount: number
  uploadedAt: string
  durationSeconds?: number
}

export const getMyArtistTracks = async (): Promise<{ items: ArtistTrackItem[]; totalCount: number }> => {
  try {
    const res = await apiFetch(`${GATEWAY_URL}/music/tracks/me`, { method: 'GET' })
    if (!res.ok) return { items: [], totalCount: 0 }
    const data = await res.json().catch(() => null)
    if (!data) return { items: [], totalCount: 0 }

    const rawItems = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.Items)
        ? data.Items
        : Array.isArray(data)
          ? data
          : []

    const items: ArtistTrackItem[] = rawItems.map((t: any) => ({
      id: String(t.trackId || t.TrackId || t.id || ''),
      title: String(t.title || t.Title || ''),
      artistName: String(t.artistName || t.ArtistName || ''),
      album: t.album || t.Album ? String(t.album || t.Album) : undefined,
      genre: String(t.genre || t.Genre || '—'),
      audioUrl: String(t.audioUrl || t.AudioUrl || ''),
      coverImageUrl: t.coverImageUrl || t.CoverImageUrl ? String(t.coverImageUrl || t.CoverImageUrl) : undefined,
      playCount: Number(t.playCount || t.PlayCount || 0),
      uploadedAt: String(t.uploadedAt || t.UploadedAt || ''),
      durationSeconds: Number(t.durationSeconds || t.DurationSeconds || 0),
    }))
    return { items, totalCount: Number(data?.totalCount || data?.TotalCount || items.length) }
  } catch {
    return { items: [], totalCount: 0 }
  }
}

export const deleteArtistTrack = async (trackId: string): Promise<boolean> => {
  try {
    const res = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface ArtistTopTrackItem {
  trackId: string
  title: string
  playCount: number
  coverImageUrl?: string
}

export interface ArtistStats {
  totalPlayCount: number
  totalAlbumLikes: number
  topTracks: ArtistTopTrackItem[]
}

export const getArtistStats = async (): Promise<ArtistStats> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/stats/me`, { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.message || data?.Message || `Не вдалося завантажити статистику: ${res.status}`)
  }

  const data = await res.json()
  const rawTop = Array.isArray(data.topTracks) ? data.topTracks : Array.isArray(data.TopTracks) ? data.TopTracks : []

  return {
    totalPlayCount: Number(data.totalPlayCount ?? data.TotalPlayCount ?? 0),
    totalAlbumLikes: Number(data.totalAlbumLikes ?? data.TotalAlbumLikes ?? 0),
    topTracks: rawTop.map((t: Record<string, unknown>) => ({
      trackId: String(t.trackId ?? t.TrackId ?? ''),
      title: String(t.title ?? t.Title ?? ''),
      playCount: Number(t.playCount ?? t.PlayCount ?? 0),
      coverImageUrl: (t.coverImageUrl ?? t.CoverImageUrl) as string | undefined,
    })),
  }
}

export const getProfileById = async (userId: string): Promise<ProfileResponse> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile/${userId}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити профіль: ${res.status}`)
  }

  return res.json()
}

export const getProfileByName = async (name: string): Promise<ProfileResponse & { userId: string }> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile/by-name/${encodeURIComponent(name)}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Профіль не знайдено: ${res.status}`)
  }

  return res.json()
}

export const followProfile = async (userId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile/follow/${userId}`, {
    method: 'POST',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося підписатися: ${res.status}`)
  }
}

export const unfollowProfile = async (userId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/profile/follow/${userId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося відписатися: ${res.status}`)
  }
}

export const getFollowStatus = async (userId: string): Promise<{ isFollowing: boolean }> => {
  try {
    const res = await apiFetch(`${GATEWAY_URL}/profile/follow/status/${userId}`, {
      method: 'GET',
    })
    if (!res.ok) return { isFollowing: false }
    return res.json()
  } catch {
    return { isFollowing: false }
  }
}

export const getFollowingList = async (): Promise<ProfileResponse[]> => {
  try {
    const res = await apiFetch(`${GATEWAY_URL}/profile/following`, {
      method: 'GET',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}
