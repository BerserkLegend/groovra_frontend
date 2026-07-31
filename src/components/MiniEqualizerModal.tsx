import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EQ_PRESETS, type EqPresetId } from '../hooks/use-equalizer'
import { useSubscription } from '../context/subscription-context'
import { useAuthModal } from '../context/auth-modal-context'
import './MiniEqualizerModal.css'

export interface MiniEqualizerModalProps {
  isOpen: boolean
  onClose: () => void
  isEnabled: boolean
  onToggleEnabled: () => void
  activePreset: EqPresetId
  onSelectPreset: (presetId: EqPresetId) => void
  gains: number[]
  onSetBandGain: (index: number, gain: number) => void
  onReset: () => void
  spectrum: number[]
  isPlaying: boolean
}

const EqualizerHeaderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <circle cx="18" cy="7" r="2" fill="#72DEEF" />
    <circle cx="12" cy="12" r="2" fill="#A98FDB" />
    <circle cx="6" cy="9" r="2" fill="#72DEEF" />
  </svg>
)

const FREE_PRESETS: EqPresetId[] = ['flat', 'bass', 'vocal']

export const MiniEqualizerModal: React.FC<MiniEqualizerModalProps> = ({
  isOpen,
  onClose,
  isEnabled,
  onToggleEnabled,
  activePreset,
  onSelectPreset,
  gains,
  onSetBandGain,
  onReset,
  spectrum,
  isPlaying
}) => {
  const { t } = useTranslation()
  const { subscription, openSubscriptionModal, spatialAudio, setSpatialAudio } = useSubscription()
  const { isGuest, openAuthModal } = useAuthModal()

  useEffect(() => {
    if (isOpen && isGuest) {
      onClose()
      openAuthModal(t('authModal.reasons.equalizer'))
    }
  }, [isOpen, isGuest, onClose, openAuthModal, t])

  if (!isOpen || isGuest) return null

  const BAND_LABELS = ['60 Hz', '230 Hz', '910 Hz', '4 kHz', '14 kHz']
  const BAND_SUBTEXT_KEYS = ['equalizer.bass', 'equalizer.low', 'equalizer.mid', 'equalizer.high', 'equalizer.treble']

  const handlePresetClick = (presetId: EqPresetId) => {
    if (!isEnabled) return
    const isFreePreset = FREE_PRESETS.includes(presetId)
    if (!isFreePreset && !subscription.isActivePremium) {
      openSubscriptionModal()
      return
    }
    if (presetId === 'spatial') {
      setSpatialAudio(true)
    }
    onSelectPreset(presetId)
  }

  const handleSpatialClick = () => {
    if (!isEnabled) return
    if (!subscription.isActivePremium) {
      openSubscriptionModal()
      return
    }
    const nextSpatial = !spatialAudio
    setSpatialAudio(nextSpatial)
    if (nextSpatial) {
      onSelectPreset('spatial')
    }
  }

  return (
    <div className="mini-eq-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('trackPage.equalizer')}>
      <div className="mini-eq-modal" onClick={e => e.stopPropagation()}>
        <div className="mini-eq-header">
          <div className="mini-eq-title-wrap">
            <div className="mini-eq-icon-halo">
              <EqualizerHeaderIcon />
            </div>
            <div>
              <h3 className="mini-eq-title">{t('trackPage.equalizer')}</h3>
              <p className="mini-eq-subtitle">{t('trackPage.equalizer_subtitle')}</p>
            </div>
          </div>

          <div className="mini-eq-toggle-wrap">
            <span className={`mini-eq-toggle-label ${isEnabled ? 'active' : ''}`}>
              {isEnabled ? t('trackPage.equalizer_on') : t('trackPage.equalizer_off')}
            </span>
            <button
              className={`mini-eq-switch ${isEnabled ? 'on' : ''}`}
              onClick={onToggleEnabled}
              type="button"
              aria-label="Toggle Equalizer"
            >
              <span className="mini-eq-switch-handle" />
            </button>
          </div>
        </div>

        <div className="mini-eq-spectrum-card">
          <div className="mini-eq-spectrum-bars">
            {spectrum.map((val, idx) => {
              const heightPct = isEnabled && isPlaying ? Math.max(12, val) : (isEnabled ? 18 + idx * 4 : 8)
              return (
                <div key={idx} className="mini-eq-spectrum-col">
                  <div
                    className={`mini-eq-spectrum-bar ${isPlaying && isEnabled ? 'animating' : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="mini-eq-spectrum-freq">{BAND_LABELS[idx]}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mini-eq-presets-section">
          <label className="mini-eq-section-label">
            {t('trackPage.equalizer_presets')} {!subscription.isActivePremium && ` ${t('trackPage.preset_locked_note')}`}
          </label>
          <div className="mini-eq-preset-chips">
            {EQ_PRESETS.map(preset => {
              const isActive = activePreset === preset.id || (preset.id === 'spatial' && spatialAudio && subscription.isActivePremium)
              const isLocked = !FREE_PRESETS.includes(preset.id) && !subscription.isActivePremium
              return (
                <button
                  key={preset.id}
                  className={`mini-eq-chip ${isActive ? 'active' : ''} ${!isEnabled ? 'disabled' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => preset.id === 'spatial' ? handleSpatialClick() : handlePresetClick(preset.id)}
                  disabled={!isEnabled}
                  type="button"
                  style={isLocked ? { opacity: 0.7, borderColor: 'rgba(255, 255, 255, 0.15)' } : undefined}
                >
                  {preset.id === 'spatial' ? '3D Spatial 🎧' : t(`trackPage.${preset.nameKey}`, { defaultValue: preset.id })} {isLocked && '🔒'}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mini-eq-bands-grid">
          {BAND_LABELS.map((label, idx) => {
            const currentGain = gains[idx] ?? 0
            const displayGain = currentGain > 0 ? `+${currentGain.toFixed(1)} dB` : `${currentGain.toFixed(1)} dB`
            return (
              <div key={label} className={`mini-eq-band-item ${!isEnabled ? 'disabled' : ''}`}>
                <div className="mini-eq-band-header">
                  <span className="mini-eq-band-label">{label}</span>
                  <span className="mini-eq-band-val">{displayGain}</span>
                </div>
                <div className="mini-eq-slider-container">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={currentGain}
                    onChange={e => isEnabled && onSetBandGain(idx, parseFloat(e.target.value))}
                    disabled={!isEnabled}
                    className="mini-eq-range-slider"
                  />
                </div>
                <span className="mini-eq-band-subtext">{t(BAND_SUBTEXT_KEYS[idx])}</span>
              </div>
            )
          })}
        </div>

        <div className="mini-eq-footer">
          <button
            className="mini-eq-btn-reset"
            onClick={onReset}
            disabled={!isEnabled}
            type="button"
          >
            {t('trackPage.equalizer_reset')}
          </button>

          <button className="mini-eq-btn-close" onClick={onClose} type="button">
            {t('equalizer.done')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MiniEqualizerModal
