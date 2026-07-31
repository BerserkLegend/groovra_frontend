export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning'

export const triggerHaptic = (pattern: HapticPattern = 'light') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return

  try {
    switch (pattern) {
      case 'light':
        navigator.vibrate(10)
        break
      case 'medium':
        navigator.vibrate(20)
        break
      case 'heavy':
        navigator.vibrate(40)
        break
      case 'success':
        navigator.vibrate([10, 30, 20])
        break
      case 'warning':
        navigator.vibrate([30, 50, 30])
        break
    }
  } catch {
  }
}

export const useHaptic = () => {
  return { triggerHaptic }
}
