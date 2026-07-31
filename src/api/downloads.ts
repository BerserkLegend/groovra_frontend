import { apiFetch, GATEWAY_URL } from './api-client'

export type DownloadType = 'Track' | 'Playlist' | 'Album'

export interface DownloadItem {
  type: DownloadType
  itemId?: string
  title: string
  subTitle?: string
  coverImageUrl?: string
  trackCount: number
  totalDurationSeconds: number
  fileSizeBytes: number
  audioUrl?: string
  downloadedAt: string
}

const normalizeDownload = (raw: Record<string, unknown>): DownloadItem => ({
  type: (raw.type ?? raw.Type) as DownloadType,
  itemId: (raw.itemId ?? raw.ItemId) as string | undefined,
  title: String(raw.title ?? raw.Title ?? ''),
  subTitle: (raw.subTitle ?? raw.SubTitle) as string | undefined,
  coverImageUrl: (raw.coverImageUrl ?? raw.CoverImageUrl) as string | undefined,
  trackCount: Number(raw.trackCount ?? raw.TrackCount ?? 0),
  totalDurationSeconds: Number(raw.totalDurationSeconds ?? raw.TotalDurationSeconds ?? 0),
  fileSizeBytes: Number(raw.fileSizeBytes ?? raw.FileSizeBytes ?? 0),
  audioUrl: (raw.audioUrl ?? raw.AudioUrl) as string | undefined,
  downloadedAt: String(raw.downloadedAt ?? raw.DownloadedAt ?? ''),
})

export const fetchDownloads = async (type?: DownloadType): Promise<DownloadItem[]> => {
  const query = type ? `?type=${type}` : ''
  const res = await apiFetch(`${GATEWAY_URL}/music/downloads${query}`, { method: 'GET' })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося завантажити список завантажень: ${res.status}`)
  }

  const data = (await res.json()) as Record<string, unknown>[]
  return data.map(normalizeDownload)
}

export interface DownloadIdentity {
  type: DownloadType
  itemId?: string
  albumName?: string
  artistName?: string
}

export const addDownload = async (payload: DownloadIdentity): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/downloads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: payload.type,
      itemId: payload.itemId,
      albumName: payload.albumName,
      artistName: payload.artistName,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося зберегти завантаження: ${res.status}`)
  }
}

export const removeDownload = async (payload: DownloadIdentity): Promise<void> => {
  const query = new URLSearchParams()
  query.set('type', payload.type)
  if (payload.itemId) query.set('itemId', payload.itemId)
  if (payload.albumName) query.set('albumName', payload.albumName)
  if (payload.artistName) query.set('artistName', payload.artistName)

  const res = await apiFetch(`${GATEWAY_URL}/music/downloads?${query.toString()}`, { method: 'DELETE' })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Не вдалося видалити завантаження: ${res.status}`)
  }
}

export const trackDownloadFileUrl = (trackId: string): string => `${GATEWAY_URL}/music/tracks/${trackId}/download`

export const downloadTrackFile = async (trackId: string, _fileName?: string): Promise<Blob> => {
  let res = await apiFetch(trackDownloadFileUrl(trackId))

  if (!res.ok) {
    res = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}/stream`)
  }

  if (!res.ok) {
    throw new Error(`Не вдалося завантажити файл треку: ${res.status}`)
  }

  return await res.blob()
}

