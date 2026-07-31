export interface PlaylistListItem {
  id: string
  title: string
  description?: string
  isPrivate: boolean
  isLiked?: boolean
  isOwner?: boolean
  slug: string
  trackCount: number
  totalDurationSeconds: number
  coverImageUrl?: string
  collageCovers: string[]
  updatedAt: string
}

export interface PlaylistTrackDto {
  trackId: string
  title: string
  artistName: string
  position?: number
  coverUrl?: string
  coverImageUrl?: string
  CoverImageUrl?: string
  CoverUrl?: string
  durationSeconds: number
}

export const getPlaylistTrackCover = (t?: PlaylistTrackDto | null): string | undefined => {
  if (!t) return undefined
  return t.coverImageUrl || t.coverUrl || t.CoverImageUrl || t.CoverUrl || undefined
}

export interface PlaylistDetail {
  id: string
  userId: string
  title: string
  description?: string
  slug: string
  coverImageUrl?: string
  trackCount: number
  totalDurationSeconds: number
  isPrivate: boolean
  isLiked?: boolean
  createdAt: string
  tracks: PlaylistTrackDto[]
}
