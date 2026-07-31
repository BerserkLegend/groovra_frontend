import React, { createContext, useContext, useCallback, useMemo, useState } from 'react'
import type { ChatMessageDto } from '../api/chat-client'

interface ForwardModalContextType {
  isOpen: boolean
  message: ChatMessageDto | null
  openModal: (message: ChatMessageDto) => void
  closeModal: () => void
}

const ForwardModalContext = createContext<ForwardModalContextType | undefined>(undefined)

export const ForwardModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState<ChatMessageDto | null>(null)

  const openModal = useCallback((m: ChatMessageDto) => {
    setMessage(m)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo<ForwardModalContextType>(
    () => ({ isOpen, message, openModal, closeModal }),
    [isOpen, message, openModal, closeModal]
  )

  return <ForwardModalContext.Provider value={value}>{children}</ForwardModalContext.Provider>
}

export const useForwardModal = () => {
  const context = useContext(ForwardModalContext)
  if (!context) {
    throw new Error('useForwardModal must be used within a ForwardModalProvider')
  }
  return context
}
