import { GATEWAY_URL } from '../api/api-client'

export const useAudioStream = (trackId: string | null) => {
  const audioUrl = trackId ? `${GATEWAY_URL}/music/tracks/${trackId}/stream` : null
  return { audioUrl, isLoading: false, error: null }
}
