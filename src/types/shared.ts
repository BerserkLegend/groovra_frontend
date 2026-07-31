
export interface PagedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface TrackBaseItem {
  trackId: string
  title: string
  artistName: string
  audioUrl?: string
  coverImageUrl?: string
  durationSeconds: number
}
