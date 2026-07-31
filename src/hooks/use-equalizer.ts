import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch, GATEWAY_URL } from '../api/api-client'

export interface EqBand {
  id: string
  label: string
  freq: number
  type: BiquadFilterType
  gain: number 
}

export type EqPresetId =
  | 'flat'
  | 'bass'
  | 'superbass'
  | 'vocal'
  | 'pop'
  | 'rock'
  | 'edm'
  | 'acoustic'
  | 'jazz'
  | 'classical'
  | 'treble'
  | 'deep'
  | 'spatial'

export interface EqPreset {
  id: EqPresetId
  nameKey: string
  gains: number[] 
}

export const EQ_PRESETS: EqPreset[] = [
  { id: 'flat', nameKey: 'equalizer_preset_flat', gains: [0, 0, 0, 0, 0] },
  { id: 'bass', nameKey: 'equalizer_preset_bass', gains: [4.5, 2.5, 0.0, 0.5, 1.5] },
  { id: 'superbass', nameKey: 'equalizer_preset_superbass', gains: [7.0, 4.0, 0.5, -1.0, -2.0] },
  { id: 'vocal', nameKey: 'equalizer_preset_vocal', gains: [-2.5, -1.0, 3.5, 4.0, 2.0] },
  { id: 'pop', nameKey: 'equalizer_preset_pop', gains: [2.5, 1.0, 2.5, 2.0, 3.0] },
  { id: 'rock', nameKey: 'equalizer_preset_rock', gains: [4.5, 1.5, -1.5, 3.0, 4.5] },
  { id: 'edm', nameKey: 'equalizer_preset_edm', gains: [6.0, 3.0, -1.0, 3.5, 5.0] },
  { id: 'acoustic', nameKey: 'equalizer_preset_acoustic', gains: [1.0, 0.5, 2.0, 3.0, 4.0] },
  { id: 'jazz', nameKey: 'equalizer_preset_jazz', gains: [2.0, 2.5, 1.5, 2.5, 3.0] },
  { id: 'classical', nameKey: 'equalizer_preset_classical', gains: [1.5, 1.0, 1.0, 2.0, 3.5] },
  { id: 'treble', nameKey: 'equalizer_preset_treble', gains: [-3.0, -1.5, 1.0, 5.0, 7.5] },
  { id: 'deep', nameKey: 'equalizer_preset_deep', gains: [5.5, 3.5, 1.0, -1.5, -3.0] },
  { id: 'spatial', nameKey: 'equalizer_preset_spatial', gains: [3.5, 1.5, 0.5, 3.5, 5.5] },
]

export const DEFAULT_BANDS: EqBand[] = [
  { id: '60hz', label: '60 Гц', freq: 60, type: 'lowshelf', gain: 0 },
  { id: '230hz', label: '230 Гц', freq: 230, type: 'peaking', gain: 0 },
  { id: '910hz', label: '910 Гц', freq: 910, type: 'peaking', gain: 0 },
  { id: '4khz', label: '4 кГц', freq: 4000, type: 'peaking', gain: 0 },
  { id: '14khz', label: '14 кГц', freq: 14000, type: 'highshelf', gain: 0 },
]

const LOCAL_STORAGE_KEY_ENABLED = 'groovy_eq_enabled'
const LOCAL_STORAGE_KEY_PRESET = 'groovy_eq_preset'
const LOCAL_STORAGE_KEY_GAINS = 'groovy_eq_gains'

export function useEqualizer(
  audioRefOrElement?: React.RefObject<HTMLAudioElement | null> | HTMLAudioElement | null,
  spatialAudioEnabled: boolean = false
) {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ENABLED)
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  const [activePreset, setActivePreset] = useState<EqPresetId>(() => {
    try {
      return (localStorage.getItem(LOCAL_STORAGE_KEY_PRESET) as EqPresetId) || 'flat'
    } catch {
      return 'flat'
    }
  })

  const [gains, setGains] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_GAINS)
      if (saved) return JSON.parse(saved)
    } catch {
    }
    const preset = EQ_PRESETS.find(p => p.id === activePreset)
    return preset ? [...preset.gains] : [0, 0, 0, 0, 0]
  })

  const [spectrum, setSpectrum] = useState<number[]>([15, 35, 60, 40, 20])

  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const filterNodesRef = useRef<BiquadFilterNode[]>([])
  const spatialDelayNodeRef = useRef<DelayNode | null>(null)
  const spatialGainNodeRef = useRef<GainNode | null>(null)
  const spatialFilterNodeRef = useRef<BiquadFilterNode | null>(null)
  const spatialPannerNodeRef = useRef<StereoPannerNode | PannerNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const mediaSourceCreatedRef = useRef<boolean>(false)

  const getAudioElement = useCallback((): HTMLAudioElement | null => {
    if (!audioRefOrElement) return null
    if ('current' in audioRefOrElement) return audioRefOrElement.current
    return audioRefOrElement
  }, [audioRefOrElement])

  useEffect(() => {
    let cancelled = false
    const fetchBackendSettings = async () => {
      try {
        const response = await apiFetch(`${GATEWAY_URL}/profile/equalizer`)
        if (response.ok) {
          const data = await response.json()
          if (cancelled) return
          if (typeof data.isEnabled === 'boolean') {
            setIsEnabled(data.isEnabled)
          }
          if (data.activePreset) {
            setActivePreset(data.activePreset as EqPresetId)
          }
          if (Array.isArray(data.gains) && data.gains.length === 5) {
            setGains(data.gains)
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Failed to fetch equalizer settings from backend:', err)
      }
    }

    fetchBackendSettings()
    return () => { cancelled = true }
  }, [])

  const isInitialMount = useRef(true)
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ENABLED, JSON.stringify(isEnabled))
      localStorage.setItem(LOCAL_STORAGE_KEY_PRESET, activePreset)
      localStorage.setItem(LOCAL_STORAGE_KEY_GAINS, JSON.stringify(gains))
    } catch {
    }

    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timer = setTimeout(async () => {
      try {
        await apiFetch(`${GATEWAY_URL}/profile/equalizer`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isEnabled, activePreset, gains })
        })
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Failed to sync equalizer to backend:', err)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [isEnabled, activePreset, gains])

  const initAudioGraph = useCallback(() => {
    const el = getAudioElement()
    if (!el || mediaSourceCreatedRef.current) return false

    const isMobile = typeof navigator !== 'undefined' && (
      /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && navigator.maxTouchPoints > 0)
    )
    if (isMobile) return false

    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioContextClass()
        audioCtxRef.current = ctx

        const source = ctx.createMediaElementSource(el)
        sourceNodeRef.current = source
        mediaSourceCreatedRef.current = true

        const filters = DEFAULT_BANDS.map((band, idx) => {
          const filter = ctx.createBiquadFilter()
          filter.type = band.type
          filter.frequency.value = band.freq
          filter.Q.value = band.type === 'peaking' ? 1.4 : 1
          filter.gain.value = isEnabled ? (gains[idx] ?? 0) : 0
          return filter
        })
        filterNodesRef.current = filters

        const delay = ctx.createDelay()
        delay.delayTime.value = 0.018 
        spatialDelayNodeRef.current = delay

        const spatialFilter = ctx.createBiquadFilter()
        spatialFilter.type = 'highpass'
        spatialFilter.frequency.value = 800
        spatialFilterNodeRef.current = spatialFilter

        const spatialGain = ctx.createGain()
        spatialGain.gain.value = isEnabled && spatialAudioEnabled ? 0.45 : 0
        spatialGainNodeRef.current = spatialGain

        let panner: StereoPannerNode | PannerNode | null = null
        if (typeof ctx.createStereoPanner === 'function') {
          panner = ctx.createStereoPanner()
          ;(panner as StereoPannerNode).pan.value = 0.25
        }
        spatialPannerNodeRef.current = panner

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        analyserRef.current = analyser

        let current: AudioNode = source
        filters.forEach(filter => {
          current.connect(filter)
          current = filter
        })
        current.connect(analyser)

        current.connect(spatialFilter)
        spatialFilter.connect(delay)
        if (panner) {
          delay.connect(panner)
          panner.connect(spatialGain)
        } else {
          delay.connect(spatialGain)
        }
        spatialGain.connect(analyser)

        analyser.connect(ctx.destination)

        return true
      }
    } catch {
    }
    return false
  }, [getAudioElement, gains, isEnabled, spatialAudioEnabled])

  useEffect(() => {
    const el = getAudioElement()
    if (!el) return

    const handleGestureOrPlay = () => {
      initAudioGraph()
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        if (el && !el.paused) {
          audioCtxRef.current.resume().catch(() => {})
        }
      }
    }

    el.addEventListener('play', handleGestureOrPlay)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pointerdown', handleGestureOrPlay, { once: true })
    window.addEventListener('keydown', handleGestureOrPlay, { once: true })

    return () => {
      el.removeEventListener('play', handleGestureOrPlay)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pointerdown', handleGestureOrPlay)
      window.removeEventListener('keydown', handleGestureOrPlay)
    }
  }, [getAudioElement, initAudioGraph])

  useEffect(() => {
    if (!audioCtxRef.current || filterNodesRef.current.length === 0) return

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }

    const now = audioCtxRef.current.currentTime
    filterNodesRef.current.forEach((filter, index) => {
      const targetGain = isEnabled ? (gains[index] ?? 0) : 0
      filter.gain.cancelScheduledValues(now)
      filter.gain.setValueAtTime(targetGain, now)
    })
  }, [gains, isEnabled])

  useEffect(() => {
    if (!audioCtxRef.current || !spatialGainNodeRef.current) return

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }

    const now = audioCtxRef.current.currentTime
    const targetSpatialGain = isEnabled && spatialAudioEnabled ? 0.45 : 0
    spatialGainNodeRef.current.gain.cancelScheduledValues(now)
    spatialGainNodeRef.current.gain.setValueAtTime(targetSpatialGain, now)
  }, [spatialAudioEnabled, isEnabled])

  useEffect(() => {
    let active = true

    const updateSpectrum = () => {
      if (!active) return

      const el = getAudioElement()
      if (analyserRef.current && el && !el.paused) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)

        if (dataArray.length >= 5) {
          const step = Math.floor(dataArray.length / 5)
          const newSpectrum = [
            Math.round((dataArray[step * 0] / 255) * 100),
            Math.round((dataArray[step * 1] / 255) * 100),
            Math.round((dataArray[step * 2] / 255) * 100),
            Math.round((dataArray[step * 3] / 255) * 100),
            Math.round((dataArray[step * 4] / 255) * 100),
          ]
          setSpectrum(newSpectrum)
        }
      } else if (el && !el.paused) {
        const now = Date.now() / 200
        setSpectrum([
          Math.round(25 + Math.sin(now + 1) * 20 + Math.random() * 15),
          Math.round(40 + Math.cos(now + 2) * 25 + Math.random() * 15),
          Math.round(60 + Math.sin(now + 3) * 30 + Math.random() * 10),
          Math.round(35 + Math.cos(now + 4) * 20 + Math.random() * 15),
          Math.round(20 + Math.sin(now + 5) * 15 + Math.random() * 10),
        ])
      }

      animFrameRef.current = requestAnimationFrame(updateSpectrum)
    }

    updateSpectrum()

    return () => {
      active = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [getAudioElement])

  const setBandGain = useCallback((index: number, newGain: number) => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }

    setGains(prev => {
      const next = [...prev]
      next[index] = Math.min(12, Math.max(-12, newGain))
      return next
    })
    setActivePreset('flat')
  }, [])

  const selectPreset = useCallback((presetId: EqPresetId) => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }

    const preset = EQ_PRESETS.find(p => p.id === presetId)
    if (preset) {
      setActivePreset(presetId)
      setGains([...preset.gains])
    }
  }, [])

  const resetEq = useCallback(() => {
    selectPreset('flat')
  }, [selectPreset])

  const toggleEnabled = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    setIsEnabled(prev => !prev)
  }, [])

  return {
    isEnabled,
    toggleEnabled,
    activePreset,
    selectPreset,
    gains,
    setBandGain,
    resetEq,
    spectrum,
    presets: EQ_PRESETS,
    bands: DEFAULT_BANDS.map((b, i) => ({ ...b, gain: gains[i] ?? 0 }))
  }
}
