import { apiFetch, GATEWAY_URL } from './api-client'

export type ParticipantRole = 'Member' | 'Admin'

export interface ParticipantDto {
  userId: string
  userName: string
  role: ParticipantRole
}

export type ConversationStatus = 'Active' | 'Pending'

export interface MessageReplyPreviewDto {
  messageId: string
  senderId: string
  senderName: string
  type: ChatMessageType
  textSnippet: string | null
  mediaFileName: string | null
}

export interface ConversationSummaryDto {
  id: string
  isGroup: boolean
  title: string | null
  participants: ParticipantDto[]
  lastMessagePreview: string | null
  lastMessageAt: string | null
  createdAt: string
  pinnedMessageId: string | null
  avatarUrl: string | null
  status: ConversationStatus
  requestedByUserId: string | null
}

export interface ConversationDto {
  id: string
  isGroup: boolean
  title: string | null
  participants: ParticipantDto[]
  createdAt: string
  pinnedMessageId: string | null
  pinnedMessage: MessageReplyPreviewDto | null
  avatarUrl: string | null
  status: ConversationStatus
  requestedByUserId: string | null
}

export interface SharedTrackDto {
  trackId: string
  title: string
  artistName: string
  coverImageUrl: string | null
  audioUrl: string
  durationSeconds: number
}

export type ChatMessageType = 'Text' | 'TrackShare' | 'Image' | 'Voice' | 'File'

export interface ChatMessageDto {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  type: ChatMessageType
  text: string | null
  track: SharedTrackDto | null
  createdAt: string
  isEdited: boolean
  editedAt: string | null
  mediaUrl: string | null
  mediaFileName: string | null
  mediaFileSizeBytes: number | null
  replyTo: MessageReplyPreviewDto | null
  forwardedFromSenderName: string | null
}

export interface MessagesPageDto {
  items: ChatMessageDto[]
  totalCount: number
  page: number
  pageSize: number
}

export interface TrackSearchResultDto {
  trackId: string
  title: string
  artistName: string
  coverImageUrl: string | null
  durationSeconds: number
}

const CHAT_BASE = `${GATEWAY_URL}/chat/conversations`

const readJsonOrThrow = async (response: Response) => {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Запит завершився з кодом ${response.status}`)
  }
  if (response.status === 204) return null
  return response.json()
}

export const fetchConversations = async (): Promise<ConversationSummaryDto[]> => {
  const response = await apiFetch(CHAT_BASE)
  return readJsonOrThrow(response)
}

export const fetchConversation = async (id: string): Promise<ConversationDto> => {
  const response = await apiFetch(`${CHAT_BASE}/${id}`)
  return readJsonOrThrow(response)
}

export const createConversation = async (
  participantUserIds: string[],
  isGroup = false,
  title?: string,
  avatarUrl?: string
): Promise<ConversationDto> => {
  const response = await apiFetch(CHAT_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantUserIds, isGroup, title, avatarUrl }),
  })
  return readJsonOrThrow(response)
}

export const addParticipants = async (conversationId: string, userIds: string[]): Promise<ParticipantDto[]> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds }),
  })
  return readJsonOrThrow(response)
}

export const removeParticipant = async (conversationId: string, userId: string): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/participants/${userId}`, { method: 'DELETE' })
  await readJsonOrThrow(response)
}

export const updateGroupInfo = async (
  conversationId: string,
  title?: string,
  avatarUrl?: string
): Promise<ConversationDto> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/group`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, avatarUrl }),
  })
  return readJsonOrThrow(response)
}

export const acceptConversationRequest = async (conversationId: string): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/accept`, { method: 'POST' })
  await readJsonOrThrow(response)
}

export const declineConversationRequest = async (conversationId: string): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/decline`, { method: 'POST' })
  await readJsonOrThrow(response)
}

export const pinMessage = async (conversationId: string, messageId: string): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/messages/${messageId}/pin`, { method: 'POST' })
  await readJsonOrThrow(response)
}

export const unpinMessage = async (conversationId: string): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/pin`, { method: 'DELETE' })
  await readJsonOrThrow(response)
}

export const deleteConversation = async (id: string): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${id}`, { method: 'DELETE' })
  await readJsonOrThrow(response)
}

export const clearConversation = async (id: string, forBoth = false): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${id}/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forBoth }),
  })
  await readJsonOrThrow(response)
}

export const deleteConversationForBoth = async (id: string): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${id}/all`, { method: 'DELETE' })
  await readJsonOrThrow(response)
}

export const fetchMessages = async (id: string, page = 1, pageSize = 30): Promise<MessagesPageDto> => {
  const response = await apiFetch(`${CHAT_BASE}/${id}/messages?page=${page}&pageSize=${pageSize}`)
  return readJsonOrThrow(response)
}

export const sendTextMessage = async (
  id: string,
  text: string,
  replyToMessageId?: string,
  forwardedFromMessageId?: string
): Promise<ChatMessageDto> => {
  const response = await apiFetch(`${CHAT_BASE}/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, replyToMessageId, forwardedFromMessageId }),
  })
  return readJsonOrThrow(response)
}

export const shareTrackMessage = async (
  id: string,
  trackId: string,
  replyToMessageId?: string,
  forwardedFromMessageId?: string
): Promise<ChatMessageDto> => {
  const response = await apiFetch(`${CHAT_BASE}/${id}/messages/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackId, replyToMessageId, forwardedFromMessageId }),
  })
  return readJsonOrThrow(response)
}

export type MediaMessageType = 'Image' | 'Voice' | 'File'

export interface UploadMediaResultDto {
  url: string
  fileName: string
  fileSizeBytes: number
}

export const uploadMedia = async (file: File): Promise<UploadMediaResultDto> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiFetch(`${GATEWAY_URL}/api/media/upload`, {
    method: 'POST',
    body: formData,
  })
  return readJsonOrThrow(response)
}

export const sendMediaMessage = async (
  conversationId: string,
  mediaUrl: string,
  mediaType: MediaMessageType,
  fileName?: string,
  fileSizeBytes?: number,
  replyToMessageId?: string,
  forwardedFromMessageId?: string
): Promise<ChatMessageDto> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/messages/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaUrl, mediaType, fileName, fileSizeBytes, replyToMessageId, forwardedFromMessageId }),
  })
  return readJsonOrThrow(response)
}

export const editMessage = async (conversationId: string, messageId: string, text: string): Promise<ChatMessageDto> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/messages/${messageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return readJsonOrThrow(response)
}

export const deleteMessage = async (conversationId: string, messageId: string, forEveryone: boolean): Promise<void> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/messages/${messageId}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forEveryone }),
  })
  await readJsonOrThrow(response)
}

export const searchMessages = async (conversationId: string, query: string): Promise<ChatMessageDto[]> => {
  const response = await apiFetch(`${CHAT_BASE}/${conversationId}/messages/search?query=${encodeURIComponent(query)}`)
  return readJsonOrThrow(response)
}

export const searchTracksToShare = async (query: string): Promise<TrackSearchResultDto[]> => {
  const params = new URLSearchParams()
  if (query) params.set('search', query)
  params.set('pageNumber', '1')
  params.set('pageSize', '8')

  const response = await apiFetch(`${GATEWAY_URL}/music/tracks?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Не вдалося знайти треки (код ${response.status})`)
  }
  const result = await response.json()
  const items = result.items || result.data || result.Items || result.Tracks || []
  return items.map((t: { trackId: string; title: string; artistName: string; coverImageUrl?: string | null; durationSeconds: number }) => ({
    trackId: t.trackId,
    title: t.title,
    artistName: t.artistName,
    coverImageUrl: t.coverImageUrl ?? null,
    durationSeconds: t.durationSeconds,
  }))
}

export interface BlockStatusDto {
  blockedByMe: boolean
  blockedMe: boolean
}

const BLOCKS_BASE = `${GATEWAY_URL}/chat/blocks`

export const blockUser = async (userId: string): Promise<void> => {
  const response = await apiFetch(`${BLOCKS_BASE}/${userId}`, { method: 'POST' })
  await readJsonOrThrow(response)
}

export const unblockUser = async (userId: string): Promise<void> => {
  const response = await apiFetch(`${BLOCKS_BASE}/${userId}`, { method: 'DELETE' })
  await readJsonOrThrow(response)
}

export const fetchBlockStatus = async (userId: string): Promise<BlockStatusDto> => {
  const response = await apiFetch(`${BLOCKS_BASE}/${userId}/status`)
  return readJsonOrThrow(response)
}

export const getBlockedUserIds = async (): Promise<string[]> => {
  const response = await apiFetch(BLOCKS_BASE)
  return readJsonOrThrow(response)
}
