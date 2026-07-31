import { apiFetch, GATEWAY_URL } from './api-client'
import type { PagedResult } from '../types/shared'

export interface ArtistListItem {
  name: string
  trackCount: number
  albumCount: number
  avatarUrl?: string
  totalPlayCount: number
}

export interface SearchArtistsParams {
  search?: string
  pageNumber?: number
  pageSize?: number
}

export const searchArtists = async (params: SearchArtistsParams = {}): Promise<PagedResult<ArtistListItem>> => {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  query.set('pageNumber', String(params.pageNumber ?? 1))
  query.set('pageSize', String(params.pageSize ?? 10))

  const res = await apiFetch(`${GATEWAY_URL}/music/artists?${query.toString()}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.Message || data?.message || `Failed to search artists: ${res.status}`)
  }

  const data = await res.json()
  const items = (data.items ?? data.Items ?? []) as ArtistListItem[]
  return {
    items,
    totalCount: Number(data.totalCount ?? data.TotalCount ?? items.length),
    pageNumber: Number(data.pageNumber ?? data.PageNumber ?? params.pageNumber ?? 1),
    pageSize: Number(data.pageSize ?? data.PageSize ?? params.pageSize ?? 10),
  }
}
