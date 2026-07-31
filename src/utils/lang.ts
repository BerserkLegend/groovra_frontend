
export const getLangPrefix = (): string => {
  const saved = localStorage.getItem('lang') || 'uk'
  return saved === 'en' ? '/en' : ''
}
