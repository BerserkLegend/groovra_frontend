import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import * as signalR from '@microsoft/signalr'
import { getAccessToken, onAccessTokenChange, getCurrentUserId, GATEWAY_URL } from '../api/api-client'
import {
  fetchConversations,
  fetchMessages,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  clearConversation as apiClearConversation,
  deleteConversationForBoth as apiDeleteConversationForBoth,
  sendTextMessage,
  shareTrackMessage,
  sendMediaMessage as apiSendMediaMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  pinMessage as apiPinMessage,
  unpinMessage as apiUnpinMessage,
  addParticipants as apiAddParticipants,
  removeParticipant as apiRemoveParticipant,
  updateGroupInfo as apiUpdateGroupInfo,
  acceptConversationRequest as apiAcceptConversationRequest,
  declineConversationRequest as apiDeclineConversationRequest,
  type ConversationSummaryDto,
  type ChatMessageDto,
  type MediaMessageType,
  type ParticipantDto,
} from '../api/chat-client'

interface ChatContextType {
  conversations: ConversationSummaryDto[]
  messagesByConversation: Record<string, ChatMessageDto[]>
  isLoadingConversations: boolean
  isLoadingMessages: (conversationId: string) => boolean
  error: string | null
  clearError: () => void
  reportError: (message: string) => void
  loadConversations: () => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  createConversation: (participantUserIds: string[], isGroup?: boolean, title?: string, avatarUrl?: string) => Promise<ConversationSummaryDto | null>
  deleteConversation: (conversationId: string) => Promise<void>
  clearConversation: (conversationId: string, forBoth?: boolean) => Promise<void>
  deleteConversationForBoth: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, text: string, replyToMessageId?: string, forwardedFromMessageId?: string) => Promise<void>
  shareTrack: (conversationId: string, trackId: string, replyToMessageId?: string, forwardedFromMessageId?: string) => Promise<void>
  sendMediaMessage: (
    conversationId: string,
    mediaUrl: string,
    mediaType: MediaMessageType,
    fileName?: string,
    fileSizeBytes?: number,
    replyToMessageId?: string,
    forwardedFromMessageId?: string
  ) => Promise<void>
  editMessage: (conversationId: string, messageId: string, text: string) => Promise<void>
  deleteMessage: (conversationId: string, messageId: string, forEveryone: boolean) => Promise<void>
  mergeMessages: (conversationId: string, messages: ChatMessageDto[]) => void
  pinMessage: (conversationId: string, messageId: string) => Promise<void>
  unpinMessage: (conversationId: string) => Promise<void>
  addParticipants: (conversationId: string, userIds: string[]) => Promise<void>
  removeParticipant: (conversationId: string, userId: string) => Promise<void>
  updateGroupInfo: (conversationId: string, title?: string, avatarUrl?: string) => Promise<void>
  acceptConversationRequest: (conversationId: string) => Promise<void>
  declineConversationRequest: (conversationId: string) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

const previewForMessage = (message: ChatMessageDto): string | null => {
  switch (message.type) {
    case 'TrackShare': return 'Поділився(-лась) треком'
    case 'Image': return 'Фото'
    case 'Voice': return 'Голосове повідомлення'
    case 'File': return message.mediaFileName ? `Файл: ${message.mediaFileName}` : 'Файл'
    default: return message.text
  }
}

const dtoToSummary = (dto: {
  id: string
  isGroup: boolean
  title: string | null
  participants: ConversationSummaryDto['participants']
  createdAt: string
  pinnedMessageId: string | null
  avatarUrl: string | null
  status: ConversationSummaryDto['status']
  requestedByUserId: string | null
}): ConversationSummaryDto => ({
  id: dto.id,
  isGroup: dto.isGroup,
  title: dto.title,
  participants: dto.participants,
  lastMessagePreview: null,
  lastMessageAt: null,
  createdAt: dto.createdAt,
  pinnedMessageId: dto.pinnedMessageId,
  avatarUrl: dto.avatarUrl,
  status: dto.status,
  requestedByUserId: dto.requestedByUserId,
})

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<ConversationSummaryDto[]>([])
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessageDto[]>>({})
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const joinedGroupsRef = useRef<Set<string>>(new Set())

  const isConnected = () => connectionRef.current?.state === signalR.HubConnectionState.Connected

  const ensureConnection = useCallback(async (): Promise<signalR.HubConnection | null> => {
    const token = getAccessToken()
    if (!token) return null

    if (!connectionRef.current) {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${GATEWAY_URL}/chat/hub`, {
          accessTokenFactory: () => getAccessToken() || '',
        })
        .withAutomaticReconnect()
        .build()

      connection.on('ReceiveMessage', (message: ChatMessageDto) => {
        setMessagesByConversation((prev) => ({
          ...prev,
          [message.conversationId]: [...(prev[message.conversationId] ?? []), message],
        }))
        setConversations((prev) => {
          const preview = previewForMessage(message)
          const next = prev.map((c) =>
            c.id === message.conversationId
              ? { ...c, lastMessagePreview: preview, lastMessageAt: message.createdAt }
              : c
          )
          return next.sort(
            (a, b) =>
              new Date(b.lastMessageAt ?? b.createdAt).getTime() -
              new Date(a.lastMessageAt ?? a.createdAt).getTime()
          )
        })
      })

      connection.on('ConversationDeleted', (payload: { conversationId: string }) => {
        setConversations((prev) => prev.filter((c) => c.id !== payload.conversationId))
        setMessagesByConversation((prev) => {
          const next = { ...prev }
          delete next[payload.conversationId]
          return next
        })
        joinedGroupsRef.current.delete(payload.conversationId)
      })

      connection.on('ConversationDeletedForBoth', (payload: { conversationId: string }) => {
        setConversations((prev) => prev.filter((c) => c.id !== payload.conversationId))
        setMessagesByConversation((prev) => {
          const next = { ...prev }
          delete next[payload.conversationId]
          return next
        })
        joinedGroupsRef.current.delete(payload.conversationId)
      })

      connection.on('MessageEdited', (payload: { conversationId: string; messageId: string; text: string; editedAt: string }) => {
        setMessagesByConversation((prev) => {
          const list = prev[payload.conversationId]
          if (!list) return prev
          return {
            ...prev,
            [payload.conversationId]: list.map((m) =>
              m.id === payload.messageId ? { ...m, text: payload.text, isEdited: true, editedAt: payload.editedAt } : m
            ),
          }
        })
      })

      connection.on('MessageDeleted', (payload: { conversationId: string; messageId: string }) => {
        setMessagesByConversation((prev) => {
          const list = prev[payload.conversationId]
          if (!list) return prev
          return { ...prev, [payload.conversationId]: list.filter((m) => m.id !== payload.messageId) }
        })
      })

      connection.on('ConversationCleared', (payload: { conversationId: string }) => {
        setMessagesByConversation((prev) => ({ ...prev, [payload.conversationId]: [] }))
      })

      connection.on('MessagePinned', (payload: { conversationId: string; messageId: string }) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === payload.conversationId ? { ...c, pinnedMessageId: payload.messageId } : c))
        )
      })

      connection.on('MessageUnpinned', (payload: { conversationId: string }) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === payload.conversationId ? { ...c, pinnedMessageId: null } : c))
        )
      })

      connection.on('ParticipantsAdded', (payload: { conversationId: string; participants: ParticipantDto[] }) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === payload.conversationId
              ? { ...c, participants: [...c.participants, ...payload.participants] }
              : c
          )
        )
      })

      connection.on('ParticipantRemoved', (payload: { conversationId: string; userId: string }) => {
        const currentUserId = getCurrentUserId()
        if (payload.userId === currentUserId) {
          setConversations((prev) => prev.filter((c) => c.id !== payload.conversationId))
          setMessagesByConversation((prev) => {
            const next = { ...prev }
            delete next[payload.conversationId]
            return next
          })
          joinedGroupsRef.current.delete(payload.conversationId)
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === payload.conversationId
                ? { ...c, participants: c.participants.filter((p) => p.userId !== payload.userId) }
                : c
            )
          )
        }
      })

      connection.on('GroupInfoUpdated', (payload: { conversationId: string; title: string | null; avatarUrl: string | null }) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === payload.conversationId ? { ...c, title: payload.title, avatarUrl: payload.avatarUrl } : c
          )
        )
      })

      connection.on('ConversationRequestAccepted', (payload: { conversationId: string }) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === payload.conversationId ? { ...c, status: 'Active' } : c))
        )
      })

      connection.on('GroupDeleted', (payload: { conversationId: string }) => {
        setConversations((prev) => prev.filter((c) => c.id !== payload.conversationId))
        setMessagesByConversation((prev) => {
          const next = { ...prev }
          delete next[payload.conversationId]
          return next
        })
        joinedGroupsRef.current.delete(payload.conversationId)
      })

      connection.on('UserLeftGroup', (payload: { conversationId: string; userId: string }) => {
        const currentUserId = getCurrentUserId()
        if (payload.userId === currentUserId) {
          setConversations((prev) => prev.filter((c) => c.id !== payload.conversationId))
          setMessagesByConversation((prev) => {
            const next = { ...prev }
            delete next[payload.conversationId]
            return next
          })
          joinedGroupsRef.current.delete(payload.conversationId)
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === payload.conversationId
                ? { ...c, participants: c.participants.filter((p) => p.userId !== payload.userId) }
                : c
            )
          )
        }
      })

      connection.on('GroupAdminChanged', (payload: { conversationId: string; newAdminUserId: string }) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === payload.conversationId
              ? {
                  ...c,
                  participants: c.participants.map((p) => ({
                    ...p,
                    role: p.userId === payload.newAdminUserId ? 'Admin' : p.role === 'Admin' ? 'Member' : p.role,
                  })),
                }
              : c
          )
        )
      })

      connection.onreconnected(() => {
        joinedGroupsRef.current.clear()
      })

      connectionRef.current = connection
    }

    const connection = connectionRef.current
    if (connection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await connection.start()
      } catch (err) {
        console.error('[chat] SignalR connection failed:', err)
        return null
      }
    }

    return connection
  }, [])

  const joinGroup = useCallback(
    async (conversationId: string) => {
      if (joinedGroupsRef.current.has(conversationId)) return
      const connection = await ensureConnection()
      if (!connection) return
      try {
        await connection.invoke('JoinConversation', conversationId)
        joinedGroupsRef.current.add(conversationId)
      } catch (err) {
        console.error('[chat] Failed to join conversation group:', err)
      }
    },
    [ensureConnection]
  )

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    setError(null)
    try {
      const data = await fetchConversations()
      setConversations(data)
      await ensureConnection()
      await Promise.all(data.map((c) => joinGroup(c.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити бесіди')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [ensureConnection, joinGroup])

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setLoadingIds((prev) => new Set(prev).add(conversationId))
      setError(null)
      try {
        const page = await fetchMessages(conversationId)
        setMessagesByConversation((prev) => ({ ...prev, [conversationId]: page.items }))
        await joinGroup(conversationId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити повідомлення')
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev)
          next.delete(conversationId)
          return next
        })
      }
    },
    [joinGroup]
  )

  const createConversation = useCallback(
    async (participantUserIds: string[], isGroup = false, title?: string, avatarUrl?: string) => {
      setError(null)
      try {
        const dto = await apiCreateConversation(participantUserIds, isGroup, title, avatarUrl)
        const summary = dtoToSummary(dto)
        setConversations((prev) => [summary, ...prev.filter((c) => c.id !== summary.id)])
        await joinGroup(summary.id)
        return summary
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося створити бесіду')
        return null
      }
    },
    [joinGroup]
  )

  const deleteConversation = useCallback(async (conversationId: string) => {
    setError(null)
    try {
      await apiDeleteConversation(conversationId)
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      setMessagesByConversation((prev) => {
        const next = { ...prev }
        delete next[conversationId]
        return next
      })
      joinedGroupsRef.current.delete(conversationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити бесіду')
    }
  }, [])

  const clearConversation = useCallback(async (conversationId: string, forBoth = false) => {
    setError(null)
    try {
      await apiClearConversation(conversationId, forBoth)
      setMessagesByConversation((prev) => ({ ...prev, [conversationId]: [] }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося очистити переписку')
    }
  }, [])

  const deleteConversationForBoth = useCallback(async (conversationId: string) => {
    setError(null)
    try {
      await apiDeleteConversationForBoth(conversationId)
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      setMessagesByConversation((prev) => {
        const next = { ...prev }
        delete next[conversationId]
        return next
      })
      joinedGroupsRef.current.delete(conversationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити бесіду')
    }
  }, [])

  const sendMessage = useCallback(async (
    conversationId: string, text: string, replyToMessageId?: string, forwardedFromMessageId?: string
  ) => {
    setError(null)
    try {
      const message = await sendTextMessage(conversationId, text, replyToMessageId, forwardedFromMessageId)
      if (!isConnected()) {
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []), message],
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося надіслати повідомлення')
    }
  }, [])

  const shareTrack = useCallback(async (
    conversationId: string, trackId: string, replyToMessageId?: string, forwardedFromMessageId?: string
  ) => {
    setError(null)
    try {
      const message = await shareTrackMessage(conversationId, trackId, replyToMessageId, forwardedFromMessageId)
      if (!isConnected()) {
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []), message],
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося поділитися треком')
    }
  }, [])

  const sendMediaMessage = useCallback(async (
    conversationId: string,
    mediaUrl: string,
    mediaType: MediaMessageType,
    fileName?: string,
    fileSizeBytes?: number,
    replyToMessageId?: string,
    forwardedFromMessageId?: string
  ) => {
    setError(null)
    try {
      const message = await apiSendMediaMessage(
        conversationId, mediaUrl, mediaType, fileName, fileSizeBytes, replyToMessageId, forwardedFromMessageId
      )
      if (!isConnected()) {
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []), message],
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося надіслати файл')
    }
  }, [])

  const editMessage = useCallback(async (conversationId: string, messageId: string, text: string) => {
    setError(null)
    try {
      const message = await apiEditMessage(conversationId, messageId, text)
      if (!isConnected()) {
        setMessagesByConversation((prev) => {
          const list = prev[conversationId]
          if (!list) return prev
          return { ...prev, [conversationId]: list.map((m) => (m.id === messageId ? message : m)) }
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося відредагувати повідомлення')
    }
  }, [])

  const deleteMessage = useCallback(async (conversationId: string, messageId: string, forEveryone: boolean) => {
    setError(null)
    try {
      await apiDeleteMessage(conversationId, messageId, forEveryone)
      setMessagesByConversation((prev) => {
        const list = prev[conversationId]
        if (!list) return prev
        return { ...prev, [conversationId]: list.filter((m) => m.id !== messageId) }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити повідомлення')
    }
  }, [])

  const mergeMessages = useCallback((conversationId: string, incoming: ChatMessageDto[]) => {
    if (incoming.length === 0) return
    setMessagesByConversation((prev) => {
      const existing = prev[conversationId] ?? []
      const byId = new Map(existing.map((m) => [m.id, m]))
      for (const m of incoming) byId.set(m.id, m)
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      return { ...prev, [conversationId]: merged }
    })
  }, [])

  const pinMessage = useCallback(async (conversationId: string, messageId: string) => {
    setError(null)
    try {
      await apiPinMessage(conversationId, messageId)
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, pinnedMessageId: messageId } : c)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося закріпити повідомлення')
    }
  }, [])

  const unpinMessage = useCallback(async (conversationId: string) => {
    setError(null)
    try {
      await apiUnpinMessage(conversationId)
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, pinnedMessageId: null } : c)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося відкріпити повідомлення')
    }
  }, [])

  const addParticipants = useCallback(async (conversationId: string, userIds: string[]) => {
    setError(null)
    try {
      const added = await apiAddParticipants(conversationId, userIds)
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, participants: [...c.participants, ...added] } : c))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати учасників')
    }
  }, [])

  const removeParticipant = useCallback(async (conversationId: string, userId: string) => {
    setError(null)
    try {
      await apiRemoveParticipant(conversationId, userId)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, participants: c.participants.filter((p) => p.userId !== userId) } : c
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося виключити учасника')
    }
  }, [])

  const updateGroupInfo = useCallback(async (conversationId: string, title?: string, avatarUrl?: string) => {
    setError(null)
    try {
      const updated = await apiUpdateGroupInfo(conversationId, title, avatarUrl)
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, title: updated.title, avatarUrl: updated.avatarUrl } : c))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося оновити дані групи')
    }
  }, [])

  const acceptConversationRequest = useCallback(async (conversationId: string) => {
    setError(null)
    try {
      await apiAcceptConversationRequest(conversationId)
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, status: 'Active' } : c)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося прийняти запит')
    }
  }, [])

  const declineConversationRequest = useCallback(async (conversationId: string) => {
    setError(null)
    try {
      await apiDeclineConversationRequest(conversationId)
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      setMessagesByConversation((prev) => {
        const next = { ...prev }
        delete next[conversationId]
        return next
      })
      joinedGroupsRef.current.delete(conversationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося відхилити запит')
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAccessTokenChange((token) => {
      if (!token) {
        connectionRef.current?.stop()
        connectionRef.current = null
        joinedGroupsRef.current.clear()
        setConversations([])
        setMessagesByConversation({})
      }
    })
    return () => {
      unsubscribe()
      connectionRef.current?.stop()
    }
  }, [])

  const isLoadingMessages = useCallback((conversationId: string) => loadingIds.has(conversationId), [loadingIds])
  const clearError = useCallback(() => setError(null), [])
  const reportError = useCallback((message: string) => setError(message), [])

  return (
    <ChatContext.Provider
      value={{
        conversations,
        messagesByConversation,
        isLoadingConversations,
        isLoadingMessages,
        error,
        clearError,
        reportError,
        loadConversations,
        loadMessages,
        createConversation,
        deleteConversation,
        clearConversation,
        deleteConversationForBoth,
        sendMessage,
        shareTrack,
        sendMediaMessage,
        editMessage,
        deleteMessage,
        mergeMessages,
        pinMessage,
        unpinMessage,
        addParticipants,
        removeParticipant,
        updateGroupInfo,
        acceptConversationRequest,
        declineConversationRequest,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
