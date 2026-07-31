import React, { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-context'
import { resolveCoverUrl, getFallbackCover, type ThemeMode } from '../../utils/cover-utils'

export interface TrackCoverProps {
  src?: string | null
  alt?: string
  className?: string
  size?: number | string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'auto' | 'sync'
  themeOverride?: ThemeMode
}

export const TrackCover: React.FC<TrackCoverProps> = React.memo(function TrackCover({
  src,
  alt = 'Track Cover',
  className = '',
  size,
  style,
  onClick,
  loading = 'lazy',
  decoding = 'async',
  themeOverride,
}) {
  let activeTheme: ThemeMode = 'dark'
  try {
    const context = useTheme()
    activeTheme = context.theme
  } catch {
    activeTheme = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark'
  }

  const theme = themeOverride || activeTheme
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src, theme])

  const resolvedSrc = hasError || !src || !src.trim()
    ? getFallbackCover(theme)
    : resolveCoverUrl(src, theme)

  const sizeStyle: React.CSSProperties = {}
  if (size !== undefined) {
    sizeStyle.width = typeof size === 'number' ? `${size}px` : size
    sizeStyle.height = typeof size === 'number' ? `${size}px` : size
  }

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
    }
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={{
        objectFit: 'cover',
        ...sizeStyle,
        ...style,
      }}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      onClick={onClick}
    />
  )
})
