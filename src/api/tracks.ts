import { apiFetch, GATEWAY_URL } from './api-client'
import { normalizeUrl, type Track } from '../context/player-context'

export interface MoodRecommendation {
  mood: string
  tracks: Track[]
}

export const fetchGenres = async (): Promise<string[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/genres`, { method: 'GET' })
  if (!res.ok) {
    throw new Error(`Не вдалося завантажити список жанрів: ${res.status}`)
  }
  const data = await res.json()
  return (Array.isArray(data) ? data : []) as string[]
}

export const fetchMoodRecommendations = async (take = 8): Promise<MoodRecommendation[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/recommendations?take=${take}`)
  if (!res.ok) {
    throw new Error(`Не вдалося завантажити рекомендації: ${res.status}`)
  }
  const data = await res.json()
  const list: { mood: string; tracks: Track[] }[] = Array.isArray(data) ? data : []
  return list.map((entry) => ({
    mood: entry.mood,
    tracks: entry.tracks.map((track) => ({
      ...track,
      coverImageUrl: normalizeUrl(track.coverImageUrl),
      audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
    })),
  }))
}

export const fetchPersonalizedRecommendations = async (take = 12): Promise<Track[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/recommendations/personalized?take=${take}`)
  if (!res.ok) {
    throw new Error(`Не вдалося завантажити персональні рекомендації: ${res.status}`)
  }
  const data = await res.json()
  const items: Track[] = data.items ?? data.Items ?? (Array.isArray(data) ? data : [])
  return items.map((track) => ({
    ...track,
    coverImageUrl: normalizeUrl(track.coverImageUrl),
    audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
  }))
}

export const fetchTrackById = async (trackId: string): Promise<Track> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}`)
  if (!res.ok) {
    throw new Error(`Не вдалося завантажити трек: ${res.status}`)
  }
  const track = await res.json()
  return {
    ...track,
    coverImageUrl: normalizeUrl(track.coverImageUrl),
    audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
  }
}

export const getDeletedTracks = async (): Promise<Track[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/deleted`)
  if (!res.ok) {
    throw new Error(`Не вдалося завантажити кошик: ${res.status}`)
  }
  const tracks: Track[] = await res.json()
  return tracks.map((track) => ({
    ...track,
    coverImageUrl: normalizeUrl(track.coverImageUrl),
    audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
  }))
}

export const restoreTrack = async (trackId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}/restore`, { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Error || data?.error || `Не вдалося відновити трек: ${res.status}`)
  }
}

export const permanentlyDeleteTrack = async (trackId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}/permanent`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Error || data?.error || `Не вдалося остаточно видалити трек: ${res.status}`)
  }
}

export const renameTrack = async (trackId: string, title: string): Promise<Track> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Error || data?.error || `Не вдалося перейменувати трек: ${res.status}`)
  }
  const track = await res.json()
  return {
    ...track,
    coverImageUrl: normalizeUrl(track.coverImageUrl),
    audioUrl: `${GATEWAY_URL}/music/tracks/${track.trackId}/stream`,
  }
}
