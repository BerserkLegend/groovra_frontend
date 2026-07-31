import React, { createContext, useContext, useCallback, useMemo, useState } from 'react'
import type { Track } from './player-context'

interface ShareModalContextType {
  isOpen: boolean
  track: Track | null
  openModal: (track: Track) => void
  closeModal: () => void
}

const ShareModalContext = createContext<ShareModalContextType | undefined>(undefined)

export const ShareModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [track, setTrack] = useState<Track | null>(null)

  const openModal = useCallback((t: Track) => {
    setTrack(t)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo<ShareModalContextType>(
    () => ({ isOpen, track, openModal, closeModal }),
    [isOpen, track, openModal, closeModal]
  )

  return <ShareModalContext.Provider value={value}>{children}</ShareModalContext.Provider>
}

export const useShareModal = () => {
  const context = useContext(ShareModalContext)
  if (!context) {
    throw new Error('useShareModal must be used within a ShareModalProvider')
  }
  return context
}
