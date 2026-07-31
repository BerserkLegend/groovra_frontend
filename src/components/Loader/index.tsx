import React from 'react'
import MiddleLogo from '../../assets/MiddleLogo.svg'
import './Loader.css'

export interface LoaderProps {
  variant?: 'fullscreen' | 'section' | 'inline'
  text?: string
  isEn?: boolean
  showEqualizer?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Loader: React.FC<LoaderProps> = ({
  variant = 'fullscreen',
  text,
  isEn,
  showEqualizer = true,
  size = 'md',
  className = ''
}) => {
  const langIsEnglish = isEn ?? (
    typeof window !== 'undefined' && (
      localStorage.getItem('lang') === 'en' || 
      (navigator.language ?? '').toLowerCase().startsWith('en')
    )
  )

  const defaultText = langIsEnglish ? 'Loading' : 'Завантаження'
  const displayText = text ?? defaultText

  if (variant === 'inline') {
    return (
      <div className={`groovra-loader-inline ${className}`} aria-live="polite" aria-busy="true">
        <div className="groovra-loader-spinner" />
        {displayText && <span>{displayText}</span>}
      </div>
    )
  }

  const wrapperClass = variant === 'fullscreen' 
    ? 'groovra-loader-fullscreen' 
    : 'groovra-loader-section'

  const logoSizeClass = size === 'sm' 
    ? 'groovra-loader-logo-sm' 
    : size === 'lg' 
    ? 'groovra-loader-logo-lg' 
    : ''

  return (
    <div
      className={`${wrapperClass} ${className}`}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="groovra-loader-card">
        <div className="groovra-loader-halo" />

        <div className="groovra-loader-logo-wrap">
          <img
            src={MiddleLogo}
            alt="Groovra"
            className={`groovra-loader-logo-img ${logoSizeClass}`}
          />
        </div>

        {showEqualizer && (
          <div className="groovra-loader-equalizer" aria-hidden="true">
            <div className="groovra-loader-eq-bar" />
            <div className="groovra-loader-eq-bar" />
            <div className="groovra-loader-eq-bar" />
            <div className="groovra-loader-eq-bar" />
            <div className="groovra-loader-eq-bar" />
          </div>
        )}

        <div className="groovra-loader-text-container">
          <div className="groovra-loader-text">
            <span>{displayText}</span>
            <span className="groovra-loader-dots">
              <span className="groovra-loader-dot">.</span>
              <span className="groovra-loader-dot">.</span>
              <span className="groovra-loader-dot">.</span>
            </span>
          </div>

          <div className="groovra-loader-progress-track">
            <div className="groovra-loader-progress-bar" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Loader
