import Cover from '../assets/Cover.svg'
import CoverLight from '../assets/CoverLight.svg'
import { GATEWAY_URL, resolveMediaUrl } from '../api/api-client'

export type ThemeMode = 'light' | 'dark'

export const getFallbackCover = (theme: ThemeMode = 'dark'): string => {
  return theme === 'light' ? CoverLight : Cover
}

/** Бекенд для альбомів без обкладинки завжди повертає цей хардкод-плейсхолдер
 *  замість null (на відміну від плейлистів) — тому наявність реальної обкладинки
 *  перевіряємо порівнянням з ним, а не просто truthy-перевіркою. */
export const ALBUM_DEFAULT_COVER_URL = 'https://img.jamendo.com/albums/default.png'

export const albumHasCustomCover = (coverImageUrl?: string | null): boolean =>
  !!coverImageUrl && coverImageUrl !== ALBUM_DEFAULT_COVER_URL

export const resolveCoverUrl = (
  rawUrl?: string | null,
  theme: ThemeMode = 'dark'
): string => {
  if (!rawUrl || !rawUrl.trim()) {
    return getFallbackCover(theme)
  }

  const trimmed = rawUrl.trim()

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return resolveMediaUrl(trimmed) || trimmed
  }

  if (trimmed.startsWith('/src/') || trimmed.startsWith('src/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  const cleanPath = trimmed.replace(/\\/g, '/').replace(/^\/+/, '')

  if (cleanPath.startsWith('music/files/')) {
    return `${GATEWAY_URL}/${cleanPath}`
  }

  return `${GATEWAY_URL}/music/files/${cleanPath}`
}
