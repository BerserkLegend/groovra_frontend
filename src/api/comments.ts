import { apiFetch, GATEWAY_URL } from './api-client'

export interface TrackComment {
  id: string
  trackId: string
  authorName: string
  text: string
  likes: number
  isLiked: boolean
  isOwn: boolean
  createdAt: string
}

const normalizeComment = (raw: Record<string, unknown>): TrackComment => ({
  id: String(raw.id ?? raw.Id ?? ''),
  trackId: String(raw.trackId ?? raw.TrackId ?? ''),
  authorName: String(raw.authorName ?? raw.AuthorName ?? ''),
  text: String(raw.text ?? raw.Text ?? ''),
  likes: Number(raw.likes ?? raw.Likes ?? 0),
  isLiked: Boolean(raw.isLiked ?? raw.IsLiked ?? false),
  isOwn: Boolean(raw.isOwn ?? raw.IsOwn ?? false),
  createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
})

export const fetchComments = async (trackId: string): Promise<TrackComment[]> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}/comments`)
  if (!res.ok) throw new Error(`Не вдалося завантажити комментарі: ${res.status}`)
  const data = (await res.json()) as Record<string, unknown>[]
  return data.map(normalizeComment)
}

export const postComment = async (trackId: string, text: string): Promise<TrackComment> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.message || `Не вдалося надіслати комментар: ${res.status}`)
  }
  return normalizeComment(await res.json())
}

export const toggleCommentLike = async (commentId: string): Promise<number> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/comments/${commentId}/like`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`Не вдалося оцінити комментар: ${res.status}`)
  const data = await res.json()
  return Number(data.likes ?? 0)
}

export const deleteComment = async (commentId: string): Promise<void> => {
  const res = await apiFetch(`${GATEWAY_URL}/music/tracks/comments/${commentId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Не вдалося видалити комментар: ${res.status}`)
}
