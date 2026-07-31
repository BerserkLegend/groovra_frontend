import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../app.css'
import './chat.css'
import { useChat } from '../context/chat-context'
import { usePlayer } from '../context/player-context'
import { useForwardModal } from '../context/forward-modal-context'
import { getCurrentUserId, onAccessTokenChange } from '../api/api-client'
import { searchUsers, type UserSearchResult } from '../api/auth'
import { resolveMediaUrl } from '../api/profile'
import {
  searchTracksToShare,
  searchMessages,
  blockUser,
  unblockUser,
  fetchBlockStatus,
  uploadMedia,
  type BlockStatusDto,
  type ChatMessageDto,
  type MediaMessageType,
  type ParticipantDto,
  type SharedTrackDto,
  type TrackSearchResultDto,
} from '../api/chat-client'
import { ChatMessageBubble } from '../components/ChatMessageBubble'
import { ImageLightbox } from '../components/ImageLightbox'
import { Avatar } from '../components/chat-avatar'
import { buildView, formatDateDivider, isSameCalendarDay, type ConversationView } from '../components/chat-view-helpers'

const PIN_STORAGE_KEY = 'chat_pinned_conversations'

const loadPinned = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

const SearchIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)
const BackIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
)
const InfoIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
const PlusIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const MusicIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
)
const AttachIcon: React.FC = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
)
const SendIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
)
const ProfileIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
const MuteIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
)
const LockIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)
const BlockIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
)
const PinIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>
)
const TrashIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
)
const ChevronUpIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
)
const ChevronDownIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
)
const CloseXIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
const KickIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>
)
const LeaveIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
)
const MicIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
)
const CheckIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)
const EditIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
)

const SWIPE_REVEAL = 136

const ChatListRow: React.FC<{
  view: ConversationView
  active: boolean
  pinned: boolean
  open: boolean
  onSwipeOpen: (id: string) => void
  onSwipeClose: () => void
  onSelect: (id: string) => void
  onPin: (id: string) => void
  onDelete: (id: string) => void
}> = ({ view, active, pinned, open, onSwipeOpen, onSwipeClose, onSelect, onPin, onDelete }) => {
  const { t } = useTranslation()
  const dragging = useRef(false)
  const moved = useRef(false)
  const startX = useRef(0)
  const baseX = useRef(0)
  const [dragX, setDragX] = useState(open ? -SWIPE_REVEAL : 0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!dragging.current) setDragX(open ? -SWIPE_REVEAL : 0)
  }, [open])

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragging.current = true
    moved.current = false
    startX.current = e.clientX
    baseX.current = open ? -SWIPE_REVEAL : 0
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return
    const delta = e.clientX - startX.current
    if (Math.abs(delta) > 4) moved.current = true
    setDragX(Math.max(-SWIPE_REVEAL, Math.min(0, baseX.current + delta)))
  }

  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = false
    setIsDragging(false)
    setDragX((current) => {
      const shouldOpen = current <= -SWIPE_REVEAL / 2
      if (shouldOpen) onSwipeOpen(view.id)
      else onSwipeClose()
      return shouldOpen ? -SWIPE_REVEAL : 0
    })
  }

  const handleClick = () => {
    if (moved.current) {
      moved.current = false
      return
    }
    if (open) {
      onSwipeClose()
      return
    }
    onSelect(view.id)
  }

  return (
    <div className="ChatListRowWrap">
      <div className="ChatListRowActions">
        <button type="button" className="ChatSwipeBtn pin" onClick={() => onPin(view.id)} aria-label={t('chat.pin_chat')}>
          <PinIcon />
        </button>
        <button type="button" className="ChatSwipeBtn delete" onClick={() => onDelete(view.id)} aria-label={t('chat.delete_chat')}>
          <TrashIcon />
        </button>
      </div>
      <button
        type="button"
        className={`ChatListItem ${active ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ transform: `translateX(${dragX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleClick}
      >
        <Avatar name={view.displayName} seed={view.colorSeed} isGroup={view.isGroup} avatarUrl={view.avatarUrl} />
        <span className="ChatListItemBody">
          <span className="ChatListItemTop">
            <span className="ChatListItemName">
              {view.displayName}{pinned ? ' 📌' : ''}
              {view.isPending && <span className="ChatRequestPendingBadge">{t('chat.request_badge')}</span>}
            </span>
            <span className="ChatListItemTime">{view.timeLabel}</span>
          </span>
          <span className="ChatListItemBottom">
            <span className="ChatListItemSubtitle">{view.subtitle}</span>
          </span>
        </span>
      </button>
    </div>
  )
}

export const ChatPage: React.FC = () => {
  const {
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
    clearConversation,
    deleteConversation,
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
  } = useChat()
  const { t } = useTranslation()
  const { selectTrack } = usePlayer()
  const { openModal: openForwardModal } = useForwardModal()
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => getCurrentUserId())
  useEffect(() => onAccessTokenChange(() => setCurrentUserId(getCurrentUserId())), [])

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadPinned())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'groups'>('all')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [encryptionOn, setEncryptionOn] = useState(true)
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const [trackQuery, setTrackQuery] = useState('')
  const [trackResults, setTrackResults] = useState<TrackSearchResultDto[]>([])
  const [isSearchingTracks, setIsSearchingTracks] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<UserSearchResult[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [clearTargetId, setClearTargetId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [blockStatus, setBlockStatus] = useState<BlockStatusDto | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyForBoth, setHistoryForBoth] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [msgSearchQuery, setMsgSearchQuery] = useState('')
  const [msgSearchResults, setMsgSearchResults] = useState<ChatMessageDto[]>([])
  const [msgSearchIndex, setMsgSearchIndex] = useState(0)
  const [isSearchingMessages, setIsSearchingMessages] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [viewingImage, setViewingImage] = useState<{ url: string; fileName: string | null } | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessageDto | null>(null)
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<{ id: string; mine: boolean } | null>(null)
  const [newChatMode, setNewChatMode] = useState<'single' | 'group'>('single')
  const [groupTitle, setGroupTitle] = useState('')
  const [groupParticipants, setGroupParticipants] = useState<UserSearchResult[]>([])
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | undefined>(undefined)
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false)
  const [addParticipantOpen, setAddParticipantOpen] = useState(false)
  const [addParticipantQuery, setAddParticipantQuery] = useState('')
  const [addParticipantResults, setAddParticipantResults] = useState<UserSearchResult[]>([])
  const [deleteGroupModalOpen, setDeleteGroupModalOpen] = useState(false)
  const [leaveGroupModalOpen, setLeaveGroupModalOpen] = useState(false)
  const [editingGroupInfo, setEditingGroupInfo] = useState(false)
  const [editGroupTitle, setEditGroupTitle] = useState('')
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const groupAvatarInputRef = useRef<HTMLInputElement>(null)
  const editGroupAvatarInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const micStreamRef = useRef<MediaStream | null>(null)
  const recordingIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(Array.from(pinnedIds)))
  }, [pinnedIds])

  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null
        if (mediaRecorderRef.current.state !== 'inactive') {
          try {
            mediaRecorderRef.current.stop()
          } catch {
          }
        }
        mediaRecorderRef.current = null
      }
      recordedChunksRef.current = []
      if (recordingIntervalRef.current !== null) {
        window.clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
      micStreamRef.current?.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
      setIsRecordingVoice(false)
      setRecordingSeconds(0)
    }
  }, [selectedId])

  useEffect(() => {
    if (searchOpen && msgSearchResults.length > 0) return
    requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
  }, [selectedId, messagesByConversation])

  const views = useMemo(() => conversations.map((c) => buildView(c, currentUserId)), [conversations, currentUserId])

  const filtered = useMemo(() => {
    return views.filter((v) => {
      if (query && !v.displayName.toLowerCase().includes(query.toLowerCase())) return false
      if (filter === 'groups' && !v.isGroup) return false
      return true
    })
  }, [views, query, filter])

  const pinned = filtered.filter((v) => pinnedIds.has(v.id))
  const rest = filtered.filter((v) => !pinnedIds.has(v.id))

  const selectedView = views.find((v) => v.id === selectedId) ?? null
  const selectedParticipants: ParticipantDto[] = selectedView?.raw.participants ?? []

  const clearTargetView = clearTargetId ? views.find((v) => v.id === clearTargetId) ?? null : null
  const clearTargetMyRole = clearTargetView?.raw.participants.find((p) => p.userId === currentUserId)?.role ?? null
  const messages: ChatMessageDto[] = selectedId ? messagesByConversation[selectedId] ?? [] : []
  const sharedTracks = messages.filter((m): m is ChatMessageDto & { track: SharedTrackDto } => m.type === 'TrackShare' && !!m.track)

  const otherUserId = selectedView && !selectedView.isGroup
    ? selectedParticipants.find((p) => p.userId !== currentUserId)?.userId ?? null
    : null

  const myRole = selectedParticipants.find((p) => p.userId === currentUserId)?.role ?? null

  useEffect(() => {
    if (!otherUserId) return
    let cancelled = false
    fetchBlockStatus(otherUserId)
      .then((status) => { if (!cancelled) setBlockStatus(status) })
      .catch(() => { if (!cancelled) setBlockStatus(null) })
    return () => { cancelled = true }
  }, [otherUserId])

  const openConversation = (id: string) => {
    setSelectedId(id)
    setMobileThreadOpen(true)
    setInfoOpen(false)
    setSharePanelOpen(false)
    setBlockStatus(null)
    setSearchOpen(false)
    setMsgSearchQuery('')
    setMsgSearchResults([])
    setMsgSearchIndex(0)
    setHasSearched(false)
  }

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setOpenSwipeId(null)
  }

  const openClearDialog = (id: string) => {
    setOpenSwipeId(null)
    setClearTargetId(id)
  }

  const handleClearForMe = async () => {
    if (!clearTargetId) return
    const id = clearTargetId
    setClearTargetId(null)
    await clearConversation(id)
  }

  const handleDeleteForBoth = async () => {
    if (!clearTargetId) return
    const id = clearTargetId
    setClearTargetId(null)
    await deleteConversationForBoth(id)
    if (selectedId === id) {
      setSelectedId(null)
      setMobileThreadOpen(false)
    }
  }

  const handleLeaveFromSwipe = async () => {
    if (!clearTargetId) return
    const id = clearTargetId
    setClearTargetId(null)
    await deleteConversation(id)
    if (selectedId === id) {
      setSelectedId(null)
      setMobileThreadOpen(false)
    }
  }

  const openHistoryModal = () => {
    setHistoryForBoth(false)
    setHistoryModalOpen(true)
  }

  const handleConfirmClearHistory = async () => {
    if (!selectedId) return
    const forBoth = historyForBoth
    setHistoryModalOpen(false)
    await clearConversation(selectedId, forBoth)
  }

  const handleToggleBlock = async () => {
    if (!otherUserId) return
    const wasBlocked = blockStatus?.blockedByMe ?? false
    setBlockStatus((prev) => ({ blockedByMe: !wasBlocked, blockedMe: prev?.blockedMe ?? false }))
    try {
      if (wasBlocked) await unblockUser(otherUserId)
      else await blockUser(otherUserId)
    } catch {
      setBlockStatus((prev) => ({ blockedByMe: wasBlocked, blockedMe: prev?.blockedMe ?? false }))
    }
  }

  const startEditMessage = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId)
    setEditingValue(currentText)
  }

  const cancelEditMessage = () => {
    setEditingMessageId(null)
    setEditingValue('')
  }

  const saveEditMessage = async () => {
    if (!selectedId || !editingMessageId) return
    const text = editingValue.trim()
    if (!text) return
    await editMessage(selectedId, editingMessageId, text)
    setEditingMessageId(null)
    setEditingValue('')
  }

  const handleRequestDeleteMessage = (messageId: string, mine: boolean) => {
    setDeleteMessageTarget({ id: messageId, mine })
  }

  const handleConfirmDeleteForMe = async () => {
    if (!selectedId || !deleteMessageTarget) return
    const { id } = deleteMessageTarget
    setDeleteMessageTarget(null)
    await deleteMessage(selectedId, id, false)
  }

  const handleConfirmDeleteForEveryone = async () => {
    if (!selectedId || !deleteMessageTarget) return
    const { id } = deleteMessageTarget
    setDeleteMessageTarget(null)
    await deleteMessage(selectedId, id, true)
  }

  const handleReplyToMessage = (message: ChatMessageDto) => {
    setReplyingTo(message)
  }

  const handleForwardMessage = (message: ChatMessageDto) => {
    openForwardModal(message)
  }

  const handleTogglePinMessage = async (messageId: string, isPinned: boolean) => {
    if (!selectedId) return
    if (isPinned) await unpinMessage(selectedId)
    else await pinMessage(selectedId, messageId)
  }

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || !selectedId) return
    setDraft('')
    const replyId = replyingTo?.id
    setReplyingTo(null)
    await sendMessage(selectedId, text, replyId)
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const formatRecordingTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const mediaTypeForFile = (file: File): MediaMessageType => {
    if (file.type.startsWith('image/')) return 'Image'
    if (file.type.startsWith('audio/')) return 'Voice'
    return 'File'
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' 
    if (!file || !selectedId) return
    setIsUploadingMedia(true)
    const replyId = replyingTo?.id
    try {
      const result = await uploadMedia(file)
      await sendMediaMessage(selectedId, result.url, mediaTypeForFile(file), result.fileName, result.fileSizeBytes, replyId)
      setReplyingTo(null)
    } catch (err) {
      console.error('[chat] Failed to upload media:', err)
      reportError(err instanceof Error ? err.message : t('chat.errors.upload_failed'))
    } finally {
      setIsUploadingMedia(false)
    }
  }

  const stopRecordingResources = () => {
    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
  }

  const handleStartVoiceRecording = async () => {
    if (!selectedId) return
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      recordedChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecordingSeconds(0)
      setIsRecordingVoice(true)
      recordingIntervalRef.current = window.setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    } catch (err) {
      console.error('[chat] Мікрофон недоступний:', err)
      setMicError(t('chat.errors.mic_access'))
    }
  }

  const handleCancelVoiceRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder) recorder.onstop = null
    stopRecordingResources()
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch (err) {
        console.warn('[chat] recorder.stop() failed on cancel:', err)
      }
    }
    mediaRecorderRef.current = null
    recordedChunksRef.current = []
    setIsRecordingVoice(false)
    setRecordingSeconds(0)
  }

  const handleConfirmVoiceRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || !selectedId) {
      handleCancelVoiceRecording()
      return
    }
    const conversationId = selectedId
    const replyId = replyingTo?.id
    const finalizeAndUpload = async () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null

      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      recordedChunksRef.current = []
      const extension = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm'
      const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: blob.type })
      setIsUploadingMedia(true)
      try {
        const result = await uploadMedia(file)
        await sendMediaMessage(conversationId, result.url, 'Voice', result.fileName, result.fileSizeBytes, replyId)
        setReplyingTo(null)
      } catch (err) {
        console.error('[chat] Failed to upload voice message:', err)
        reportError(err instanceof Error ? err.message : t('chat.errors.voice_send_failed'))
      } finally {
        setIsUploadingMedia(false)
      }
    }

    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }

    if (recorder.state !== 'inactive') {
      recorder.onstop = () => { void finalizeAndUpload() }
      try {
        recorder.stop()
      } catch (err) {
        console.warn('[chat] recorder.stop() failed on confirm:', err)
        void finalizeAndUpload()
      }
    } else {
      void finalizeAndUpload()
    }

    mediaRecorderRef.current = null
    setIsRecordingVoice(false)
    setRecordingSeconds(0)
  }

  const scrollToMessage = (messageId: string) => {
    requestAnimationFrame(() => {
      document.querySelector(`[data-message-id="${messageId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const runMessageSearch = async () => {
    if (!selectedId || !msgSearchQuery.trim()) return
    setIsSearchingMessages(true)
    setHasSearched(true)
    try {
      const results = await searchMessages(selectedId, msgSearchQuery.trim())
      setMsgSearchResults(results)
      const lastIndex = results.length - 1
      setMsgSearchIndex(lastIndex)
      if (results.length > 0) {
        mergeMessages(selectedId, results)
        scrollToMessage(results[lastIndex].id)
      }
    } catch {
      setMsgSearchResults([])
    } finally {
      setIsSearchingMessages(false)
    }
  }

  const goToMatch = (delta: number) => {
    if (msgSearchResults.length === 0) return
    const next = (msgSearchIndex + delta + msgSearchResults.length) % msgSearchResults.length
    setMsgSearchIndex(next)
    scrollToMessage(msgSearchResults[next].id)
  }

  const closeMessageSearch = () => {
    setSearchOpen(false)
    setMsgSearchQuery('')
    setMsgSearchResults([])
    setMsgSearchIndex(0)
    setHasSearched(false)
  }

  const runTrackSearch = async (q: string) => {
    setIsSearchingTracks(true)
    try {
      const results = await searchTracksToShare(q)
      setTrackResults(results)
    } catch {
      setTrackResults([])
    } finally {
      setIsSearchingTracks(false)
    }
  }

  const openSharePanel = () => {
    setSharePanelOpen((open) => {
      const next = !open
      if (next && trackResults.length === 0) runTrackSearch('')
      return next
    })
  }

  const handleShareTrack = async (trackId: string) => {
    if (!selectedId) return
    const replyId = replyingTo?.id
    await shareTrack(selectedId, trackId, replyId)
    setReplyingTo(null)
    setSharePanelOpen(false)
  }

  const runUserSearch = async (q: string) => {
    if (!q.trim()) {
      setUserResults([])
      return
    }
    setIsSearchingUsers(true)
    try {
      const results = await searchUsers(q.trim())
      setUserResults(results)
    } catch {
      setUserResults([])
    } finally {
      setIsSearchingUsers(false)
    }
  }

  const closeNewChatPanel = () => {
    setNewChatOpen(false)
    setNewChatMode('single')
    setUserQuery('')
    setUserResults([])
    setGroupTitle('')
    setGroupParticipants([])
    setGroupAvatarUrl(undefined)
  }

  const handleStartConversation = async (userId: string) => {
    if (newChatMode === 'group') {
      if (groupParticipants.some((p) => p.userId === userId)) return
      const user = userResults.find((u) => u.userId === userId)
      if (user) setGroupParticipants((prev) => [...prev, user])
      setUserQuery('')
      setUserResults([])
      return
    }
    const summary = await createConversation([userId])
    closeNewChatPanel()
    if (summary) openConversation(summary.id)
  }

  const handleRemoveGroupParticipant = (userId: string) => {
    setGroupParticipants((prev) => prev.filter((p) => p.userId !== userId))
  }

  const handleGroupAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsUploadingGroupAvatar(true)
    try {
      const result = await uploadMedia(file)
      setGroupAvatarUrl(result.url)
    } catch (err) {
      console.error('[chat] Failed to upload group avatar:', err)
      reportError(err instanceof Error ? err.message : t('chat.errors.group_avatar_failed'))
    } finally {
      setIsUploadingGroupAvatar(false)
    }
  }

  const openEditGroupInfo = () => {
    setEditGroupTitle(selectedView?.displayName ?? '')
    setEditingGroupInfo(true)
  }

  const handleSaveGroupTitle = async () => {
    if (!selectedId) return
    const trimmed = editGroupTitle.trim()
    if (!trimmed) return
    setIsSavingGroupInfo(true)
    try {
      await updateGroupInfo(selectedId, trimmed)
      setEditingGroupInfo(false)
    } finally {
      setIsSavingGroupInfo(false)
    }
  }

  const handleEditGroupAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedId) return
    setIsSavingGroupInfo(true)
    try {
      const result = await uploadMedia(file)
      await updateGroupInfo(selectedId, undefined, result.url)
    } catch (err) {
      console.error('[chat] Failed to upload new group avatar:', err)
      reportError(err instanceof Error ? err.message : t('chat.errors.group_avatar_failed'))
    } finally {
      setIsSavingGroupInfo(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupTitle.trim() || groupParticipants.length === 0) return
    const summary = await createConversation(
      groupParticipants.map((p) => p.userId),
      true,
      groupTitle.trim(),
      groupAvatarUrl
    )
    closeNewChatPanel()
    if (summary) openConversation(summary.id)
  }

  const runAddParticipantSearch = async (q: string) => {
    if (!q.trim()) {
      setAddParticipantResults([])
      return
    }
    try {
      const results = await searchUsers(q.trim())
      setAddParticipantResults(results)
    } catch {
      setAddParticipantResults([])
    }
  }

  const handleAddParticipant = async (userId: string) => {
    if (!selectedId) return
    await addParticipants(selectedId, [userId])
    setAddParticipantQuery('')
    setAddParticipantResults([])
  }

  const handleKickParticipant = async (userId: string) => {
    if (!selectedId) return
    await removeParticipant(selectedId, userId)
  }

  const handleConfirmDeleteGroup = async () => {
    if (!selectedId) return
    const id = selectedId
    setDeleteGroupModalOpen(false)
    setSelectedId(null)
    setMobileThreadOpen(false)
    await deleteConversationForBoth(id)
  }

  const handleConfirmLeaveGroup = async () => {
    if (!selectedId) return
    const id = selectedId
    setLeaveGroupModalOpen(false)
    setSelectedId(null)
    setMobileThreadOpen(false)
    await deleteConversation(id)
  }

  const handleAcceptRequest = async () => {
    if (!selectedId) return
    await acceptConversationRequest(selectedId)
  }

  const handleDeclineRequest = async () => {
    if (!selectedId) return
    const id = selectedId
    setSelectedId(null)
    setMobileThreadOpen(false)
    await declineConversationRequest(id)
  }

  const playSharedTrack = (track: SharedTrackDto, createdAt: string) => {
    selectTrack({
      trackId: track.trackId,
      title: track.title,
      artistName: track.artistName,
      durationSeconds: track.durationSeconds,
      fileSizeBytes: 0,
      contentType: 'audio/mpeg',
      audioUrl: track.audioUrl,
      coverImageUrl: track.coverImageUrl ?? undefined,
      uploadedAt: createdAt,
      playCount: 0,
    })
  }

  return (
    <div className={`ChatPage ${mobileThreadOpen ? 'has-selection' : ''} ${infoOpen ? 'info-open' : ''}`}>
      <section className="ChatList" aria-label={t('chat.aria_conversations')}>
        <div className="ChatListTop">
          <div className="ChatSearchBox">
            <SearchIcon />
            <input
              type="text"
              placeholder={t('chat.search_placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ChatFilterRow">
            <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t('chat.filter_all')}</button>
            <button type="button" className={filter === 'groups' ? 'active' : ''} onClick={() => setFilter('groups')}>{t('chat.filter_groups')}</button>
            <button
              type="button"
              className={`ChatNewChatBtn ${newChatOpen ? 'active' : ''}`}
              aria-label={t('chat.new_chat')}
              onClick={() => { if (newChatOpen) closeNewChatPanel(); else setNewChatOpen(true) }}
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        {newChatOpen && (
          <div className="ChatSharePanel">
            <div className="ChatGroupModeToggle">
              <button type="button" className={newChatMode === 'single' ? 'active' : ''} onClick={() => setNewChatMode('single')}>{t('chat.mode_single')}</button>
              <button type="button" className={newChatMode === 'group' ? 'active' : ''} onClick={() => setNewChatMode('group')}>{t('chat.mode_group')}</button>
            </div>

            {newChatMode === 'group' && (
              <>
                <input
                  type="text"
                  className="ChatGroupTitleInput"
                  placeholder={t('chat.group_name_placeholder')}
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                />
                <input
                  ref={groupAvatarInputRef}
                  type="file"
                  accept="image/*"
                  className="ChatFileInputHidden"
                  onChange={handleGroupAvatarSelected}
                />
                <button type="button" className="ChatGroupCreateBtn" style={{ marginBottom: '8px' }} disabled={isUploadingGroupAvatar} onClick={() => groupAvatarInputRef.current?.click()}>
                  {isUploadingGroupAvatar ? t('chat.uploading') : groupAvatarUrl ? t('chat.avatar_selected') : t('chat.choose_group_avatar')}
                </button>
                {groupParticipants.length > 0 && (
                  <div className="ChatGroupChips">
                    {groupParticipants.map((p) => (
                      <span className="ChatGroupChip" key={p.userId}>
                        {p.username}
                        <button type="button" onClick={() => handleRemoveGroupParticipant(p.userId)} aria-label={t('chat.remove')}><CloseXIcon /></button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="ChatSharePanelHeader">
              <input
                type="text"
                placeholder={t('chat.username_placeholder')}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runUserSearch(userQuery) }}
              />
              <button type="button" onClick={() => runUserSearch(userQuery)}>{t('chat.find')}</button>
            </div>
            <div className="ChatSharePanelList">
              {isSearchingUsers && <div className="ChatListEmpty">{t('chat.searching')}</div>}
              {!isSearchingUsers && userQuery.trim() && userResults.length === 0 && (
                <div className="ChatListEmpty">{t('chat.no_users_found')}</div>
              )}
              {userResults.map((u) => (
                <button type="button" key={u.userId} className="ChatSharePanelItem" onClick={() => handleStartConversation(u.userId)}>
                  {u.avatarUrl ? (
                    <img src={resolveMediaUrl(u.avatarUrl)} alt={u.username} />
                  ) : (
                    <Avatar name={u.username} seed={u.userId} />
                  )}
                  <span className="ChatSharePanelItemInfo">
                    <span className="ChatTrackTitle">{u.username}</span>
                  </span>
                </button>
              ))}
            </div>

            {newChatMode === 'group' && (
              <button
                type="button"
                className="ChatGroupCreateBtn"
                disabled={!groupTitle.trim() || groupParticipants.length === 0}
                onClick={handleCreateGroup}
              >
                {t('chat.create_group')}
              </button>
            )}
          </div>
        )}

        <div className="ChatListScroll">
          {isLoadingConversations && <div className="ChatListEmpty">{t('chat.loading_conversations')}</div>}

          {!isLoadingConversations && filtered.length === 0 && (
            <div className="ChatListEmpty">
              {conversations.length === 0 ? t('chat.no_conversations_yet') : t('chat.nothing_found')}
            </div>
          )}

          {pinned.length > 0 && <div className="ChatListSectionLabel">{t('chat.pinned_section')}</div>}
          {[...pinned, ...rest].map((v) => (
            <ChatListRow
              key={v.id}
              view={v}
              active={selectedId === v.id}
              pinned={pinnedIds.has(v.id)}
              open={openSwipeId === v.id}
              onSwipeOpen={setOpenSwipeId}
              onSwipeClose={() => setOpenSwipeId(null)}
              onSelect={openConversation}
              onPin={togglePin}
              onDelete={openClearDialog}
            />
          ))}
        </div>
      </section>

      {!selectedView && (
        <section className="ChatThread ChatThreadEmpty" aria-label={t('chat.aria_thread')}>
          <p>{t('chat.no_active_chat')}</p>
        </section>
      )}

      {selectedView && (
      <>
      <section className="ChatThread" aria-label={t('chat.aria_thread')}>
        <div className="ChatThreadHeader">
          <button type="button" className="ChatBackBtn" onClick={() => setMobileThreadOpen(false)} aria-label={t('chat.back_to_list')}>
            <BackIcon />
          </button>
          <Avatar name={selectedView.displayName} seed={selectedView.colorSeed} isGroup={selectedView.isGroup} avatarUrl={selectedView.avatarUrl} size="md" />
          <span className="ChatThreadHeaderInfo">
            <span className="ChatThreadName">{selectedView.displayName}</span>
            {selectedView.isGroup && (
              <span className="ChatThreadStatus">{t('chat.participants_count', { count: selectedParticipants.length })}</span>
            )}
          </span>
          <span className="ChatThreadActions">
            <button
              type="button"
              aria-label={t('chat.search_in_chat')}
              className={searchOpen ? 'active' : ''}
              onClick={() => setSearchOpen((o) => !o)}
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              aria-label={t('chat.aria_contact_info')}
              className={infoOpen ? 'active' : ''}
              onClick={() => setInfoOpen((o) => !o)}
            >
              <InfoIcon />
            </button>
          </span>
        </div>

        {searchOpen && (
          <div className="ChatSearchBar">
            <input
              type="text"
              placeholder={t('chat.search_in_chat_placeholder')}
              value={msgSearchQuery}
              autoFocus
              onChange={(e) => setMsgSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runMessageSearch() }}
            />
            {isSearchingMessages && <span className="ChatSearchCounter">{t('chat.searching')}</span>}
            {!isSearchingMessages && hasSearched && (
              <span className="ChatSearchCounter">
                {msgSearchResults.length > 0 ? t('chat.search_counter', { current: msgSearchIndex + 1, total: msgSearchResults.length }) : t('chat.search_counter_zero')}
              </span>
            )}
            <button type="button" disabled={msgSearchResults.length === 0} aria-label={t('chat.prev_match')} onClick={() => goToMatch(-1)}>
              <ChevronUpIcon />
            </button>
            <button type="button" disabled={msgSearchResults.length === 0} aria-label={t('chat.next_match')} onClick={() => goToMatch(1)}>
              <ChevronDownIcon />
            </button>
            <button type="button" aria-label={t('chat.close_search')} onClick={closeMessageSearch}>
              <CloseXIcon />
            </button>
          </div>
        )}

        {selectedView.raw.pinnedMessageId && (() => {
          const pinned = messages.find((m) => m.id === selectedView.raw.pinnedMessageId)
          return (
            <button type="button" className="ChatPinnedBanner" onClick={() => scrollToMessage(selectedView.raw.pinnedMessageId!)}>
              <span className="ChatPinnedBannerIcon"><PinIcon /></span>
              <span className="ChatPinnedBannerBody">
                <span className="ChatPinnedBannerLabel">{t('chat.pinned_message_label')}</span>
                <span className="ChatPinnedBannerText">
                  {pinned ? (pinned.type === 'Text' ? pinned.text : pinned.mediaFileName || pinned.type) : '...'}
                </span>
              </span>
              <span
                className="ChatPinnedBannerClose"
                role="button"
                aria-label={t('chat.unpin')}
                onClick={(e) => { e.stopPropagation(); handleTogglePinMessage(selectedView.raw.pinnedMessageId!, true) }}
              >
                <CloseXIcon />
              </span>
            </button>
          )
        })()}

        <div className="ChatMessages">
          {isLoadingMessages(selectedView.id) && <div className="ChatDateDivider"><span>{t('chat.loading')}</span></div>}
          {!isLoadingMessages(selectedView.id) && messages.length === 0 && (
            <div className="ChatDateDivider"><span>{t('chat.no_messages_yet')}</span></div>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const showDateDivider = !prev || !isSameCalendarDay(new Date(prev.createdAt), new Date(m.createdAt))
            return (
              <React.Fragment key={m.id}>
                {showDateDivider && (
                  <div className="ChatDateDivider"><span>{formatDateDivider(m.createdAt)}</span></div>
                )}
                <ChatMessageBubble
                  message={m}
                  mine={m.senderId === currentUserId}
                  isEditing={editingMessageId === m.id}
                  editValue={editingValue}
                  isPinned={selectedView.raw.pinnedMessageId === m.id}
                  highlightQuery={searchOpen ? msgSearchQuery : undefined}
                  isActiveMatch={searchOpen && msgSearchResults[msgSearchIndex]?.id === m.id}
                  onPlayTrack={playSharedTrack}
                  onStartEdit={startEditMessage}
                  onEditChange={setEditingValue}
                  onEditSave={saveEditMessage}
                  onEditCancel={cancelEditMessage}
                  onRequestDelete={handleRequestDeleteMessage}
                  onReply={handleReplyToMessage}
                  onForward={handleForwardMessage}
                  onTogglePin={handleTogglePinMessage}
                  onReplyPreviewClick={scrollToMessage}
                  onImageClick={(url, fileName) => setViewingImage({ url, fileName })}
                />
              </React.Fragment>
            )
          })}
          <div ref={listEndRef} />
        </div>

        {sharePanelOpen && (
          <div className="ChatSharePanel">
            <div className="ChatSharePanelHeader">
              <input
                type="text"
                placeholder={t('chat.search_track_placeholder')}
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runTrackSearch(trackQuery) }}
              />
              <button type="button" onClick={() => runTrackSearch(trackQuery)}>{t('chat.find')}</button>
            </div>
            <div className="ChatSharePanelList">
              {isSearchingTracks && <div className="ChatListEmpty">{t('chat.searching')}</div>}
              {!isSearchingTracks && trackResults.length === 0 && <div className="ChatListEmpty">{t('chat.nothing_found')}</div>}
              {trackResults.map((t) => (
                <button type="button" key={t.trackId} className="ChatSharePanelItem" onClick={() => handleShareTrack(t.trackId)}>
                  {t.coverImageUrl ? <img src={t.coverImageUrl} alt={t.title} /> : <span className="ChatTrackCoverFallback" />}
                  <span className="ChatSharePanelItemInfo">
                    <span className="ChatTrackTitle">{t.title}</span>
                    <span className="ChatTrackArtist">{t.artistName}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedView.isPending && (
          <div className="ChatRequestBar">
            <span>{t('chat.request_notice')}</span>
            <button type="button" className="ChatRequestDeclineBtn" onClick={handleDeclineRequest}>{t('chat.decline')}</button>
            <button type="button" className="ChatRequestAcceptBtn" onClick={handleAcceptRequest}>{t('chat.accept')}</button>
          </div>
        )}
        {!selectedView.isPending && blockStatus?.blockedByMe && (
          <div className="ChatBlockedBar">
            <span>{t('chat.you_blocked_user')}</span>
            <button type="button" onClick={handleToggleBlock}>{t('chat.unblock')}</button>
          </div>
        )}
        {!selectedView.isPending && !blockStatus?.blockedByMe && blockStatus?.blockedMe && (
          <div className="ChatBlockedBar">
            <span>{t('chat.user_restricted_you')}</span>
          </div>
        )}
        {!selectedView.isPending && !blockStatus?.blockedByMe && !blockStatus?.blockedMe && (
          <>
            {replyingTo && (
              <div className="ChatReplyPreviewBar">
                <span className="ChatReplyPreviewBody">
                  <span className="ChatReplyPreviewName">{t('chat.reply_to', { name: replyingTo.senderName })}</span>
                  <span className="ChatReplyPreviewText">
                    {replyingTo.type === 'Text' ? replyingTo.text : replyingTo.mediaFileName || replyingTo.type}
                  </span>
                </span>
                <button type="button" className="ChatReplyPreviewClose" aria-label={t('chat.cancel_reply')} onClick={() => setReplyingTo(null)}>
                  <CloseXIcon />
                </button>
              </div>
            )}
            {micError && (
              <div className="ChatMicErrorBar">
                <span>{micError}</span>
                <button type="button" aria-label={t('chat.close')} onClick={() => setMicError(null)}><CloseXIcon /></button>
              </div>
            )}
            {isRecordingVoice ? (
              <div className="ChatInputBar ChatRecordingBar">
                <span className="ChatRecordingDot" aria-hidden="true" />
                <span className="ChatRecordingTime">{formatRecordingTime(recordingSeconds)}</span>
                <span className="ChatRecordingHint">{t('chat.recording_in_progress')}</span>
                <button type="button" className="ChatRecordingCancelBtn" aria-label={t('chat.cancel_recording')} onClick={handleCancelVoiceRecording}>
                  <TrashIcon />
                </button>
                <button type="button" className="ChatSendBtn" aria-label={t('chat.send_voice')} onClick={handleConfirmVoiceRecording}>
                  <CheckIcon />
                </button>
              </div>
            ) : (
              <div className="ChatInputBar">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="ChatFileInputHidden"
                  onChange={handleFileSelected}
                />
                <button
                  type="button"
                  aria-label={t('chat.attach_file')}
                  disabled={isUploadingMedia}
                  onClick={handleAttachClick}
                >
                  <AttachIcon />
                </button>
                <button type="button" aria-label={t('chat.share_track')} className={sharePanelOpen ? 'active' : ''} onClick={openSharePanel}>
                  <MusicIcon />
                </button>
                <input
                  type="text"
                  placeholder={isUploadingMedia ? t('chat.uploading_file') : t('chat.type_message')}
                  value={draft}
                  disabled={isUploadingMedia}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                />
                {draft.trim() ? (
                  <button type="button" className="ChatSendBtn" aria-label={t('chat.send')} onClick={handleSend}><SendIcon /></button>
                ) : (
                  <button
                    type="button"
                    className="ChatSendBtn"
                    aria-label={t('chat.record_voice')}
                    disabled={isUploadingMedia}
                    onClick={handleStartVoiceRecording}
                  >
                    <MicIcon />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <aside className="ChatInfoPanel" aria-label={t('chat.aria_contact_info')}>
        <button type="button" className="ChatInfoCloseBtn" onClick={() => setInfoOpen(false)} aria-label={t('chat.close_panel')}>
          <BackIcon />
        </button>

        <div className="ChatInfoProfile">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Avatar name={selectedView.displayName} seed={selectedView.colorSeed} isGroup={selectedView.isGroup} avatarUrl={selectedView.avatarUrl} size="lg" />
            {selectedView.isGroup && myRole === 'Admin' && (
              <>
                <input
                  ref={editGroupAvatarInputRef}
                  type="file"
                  accept="image/*"
                  className="ChatFileInputHidden"
                  onChange={handleEditGroupAvatarSelected}
                />
                <button
                  type="button"
                  className="ChatAvatarEditBtn"
                  aria-label={t('chat.change_group_avatar')}
                  disabled={isSavingGroupInfo}
                  onClick={() => editGroupAvatarInputRef.current?.click()}
                >
                  <EditIcon />
                </button>
              </>
            )}
          </div>

          {editingGroupInfo ? (
            <div className="ChatGroupTitleEdit">
              <input
                type="text"
                className="ChatGroupTitleEditInput"
                value={editGroupTitle}
                autoFocus
                disabled={isSavingGroupInfo}
                onChange={(e) => setEditGroupTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveGroupTitle()
                  if (e.key === 'Escape') setEditingGroupInfo(false)
                }}
              />
              <button type="button" aria-label={t('chat.save_name')} disabled={isSavingGroupInfo || !editGroupTitle.trim()} onClick={handleSaveGroupTitle}>
                <CheckIcon />
              </button>
              <button type="button" aria-label={t('chat.cancel')} disabled={isSavingGroupInfo} onClick={() => setEditingGroupInfo(false)}>
                <CloseXIcon />
              </button>
            </div>
          ) : (
            <span className="ChatInfoName">
              {selectedView.displayName}
              {selectedView.isGroup && myRole === 'Admin' && (
                <button type="button" className="ChatInfoNameEditBtn" aria-label={t('chat.change_group_name')} onClick={openEditGroupInfo}>
                  <EditIcon />
                </button>
              )}
            </span>
          )}
          {selectedView.isGroup && <span className="ChatInfoRole">{t('chat.participants_count', { count: selectedParticipants.length })}</span>}
        </div>

        <div className="ChatInfoActions">
          <button type="button"><ProfileIcon /><span>{t('chat.profile')}</span></button>
          <button type="button"><MuteIcon /><span>{t('chat.mute')}</span></button>
          <button type="button" onClick={() => { setInfoOpen(false); setSearchOpen(true) }}><SearchIcon /><span>{t('chat.search')}</span></button>
        </div>

        {selectedView.isGroup && (
          <div className="ChatInfoSection">
            <div className="ChatInfoSectionHeader"><span>{t('chat.participants')}</span></div>
            {selectedParticipants.map((p) => (
              <div className="ChatParticipantRow" key={p.userId}>
                <Avatar name={p.userName} seed={p.userId} />
                <span className="ChatParticipantRowName">{p.userName}</span>
                {p.role === 'Admin' && <span className="ChatParticipantRoleBadge">{t('chat.admin')}</span>}
                {myRole === 'Admin' && p.userId !== currentUserId && (
                  <button type="button" className="ChatParticipantKickBtn" aria-label={t('chat.kick')} onClick={() => handleKickParticipant(p.userId)}>
                    <KickIcon />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="ChatSettingsRow" onClick={() => setAddParticipantOpen((o) => !o)}>
              <PlusIcon />
              <span>{t('chat.add_participant')}</span>
            </button>
            {addParticipantOpen && (
              <div className="ChatSharePanelHeader" style={{ padding: 0, marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder={t('chat.username_placeholder')}
                  value={addParticipantQuery}
                  onChange={(e) => setAddParticipantQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runAddParticipantSearch(addParticipantQuery) }}
                />
                <button type="button" onClick={() => runAddParticipantSearch(addParticipantQuery)}>{t('chat.find')}</button>
              </div>
            )}
            {addParticipantOpen && addParticipantResults.length > 0 && (
              <div className="ChatSharePanelList">
                {addParticipantResults
                  .filter((u) => !selectedParticipants.some((p) => p.userId === u.userId))
                  .map((u) => (
                    <button type="button" key={u.userId} className="ChatSharePanelItem" onClick={() => handleAddParticipant(u.userId)}>
                      <Avatar name={u.username} seed={u.userId} />
                      <span className="ChatSharePanelItemInfo">
                        <span className="ChatTrackTitle">{u.username}</span>
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="ChatInfoSection">
          <div className="ChatInfoSectionHeader"><span>{t('chat.shared_tracks')}</span></div>
          {sharedTracks.length === 0 && <div className="ChatListEmpty">{t('chat.no_shared_tracks')}</div>}
          <div className="ChatFileList">
            {sharedTracks.map((m) => (
              <button type="button" className="ChatFileCard" key={m.id} onClick={() => playSharedTrack(m.track, m.createdAt)}>
                {m.track.coverImageUrl ? <img src={m.track.coverImageUrl} alt={m.track.title} className="ChatTrackCover sm" /> : <span className="ChatTrackCover ChatTrackCoverFallback sm" />}
                <span className="ChatFileMeta">
                  <span className="ChatFileName">{m.track.title}</span>
                  <span className="ChatFileSize">{m.track.artistName}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ChatInfoSection">
          <div className="ChatInfoSectionHeader"><span>{t('chat.privacy_settings')}</span></div>
          <button type="button" className="ChatSettingsRow" onClick={() => setEncryptionOn((v) => !v)}>
            <LockIcon />
            <span>{t('chat.e2e_encryption')}</span>
            <span className={`ChatToggle ${encryptionOn ? 'on' : ''}`} />
          </button>
          {!selectedView.isGroup && (
            <button type="button" className="ChatSettingsRow danger" onClick={handleToggleBlock}>
              <BlockIcon />
              <span>
                {blockStatus?.blockedByMe ? t('chat.unblock') : t('chat.block')} {selectedView.displayName.split(' ')[0]}
              </span>
            </button>
          )}
          <button type="button" className="ChatSettingsRow danger" onClick={openHistoryModal}>
            <TrashIcon />
            <span>{t('chat.clear_history')}</span>
          </button>
          {selectedView.isGroup && (
            <button type="button" className="ChatSettingsRow danger" onClick={() => setLeaveGroupModalOpen(true)}>
              <LeaveIcon />
              <span>{t('chat.leave_group')}</span>
            </button>
          )}
          {selectedView.isGroup && myRole === 'Admin' && (
            <button type="button" className="ChatSettingsRow danger" onClick={() => setDeleteGroupModalOpen(true)}>
              <TrashIcon />
              <span>{t('chat.delete_group')}</span>
            </button>
          )}
        </div>
      </aside>
      </>
      )}

      {infoOpen && <div className="ChatInfoBackdrop" onClick={() => setInfoOpen(false)} />}

      {clearTargetId && (
        <div className="ModalOverlay" onClick={() => setClearTargetId(null)}>
          <div className="PlaylistModal" style={{ gap: '16px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="PlaylistModalTitle">{t('chat.clear_conversation_title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" className="PlaylistOptionBtn" onClick={handleClearForMe}>
                {t('chat.clear_for_me_only')}
              </button>
              {clearTargetView?.isGroup && clearTargetMyRole !== 'Admin' ? (
                <button type="button" className="PlaylistOptionBtn danger" onClick={handleLeaveFromSwipe}>
                  {t('chat.leave_group')}
                </button>
              ) : (
                <button type="button" className="PlaylistOptionBtn danger" onClick={handleDeleteForBoth}>
                  {t('chat.delete_for_everyone')}
                </button>
              )}
            </div>
            <button type="button" className="PlaylistModalCancelBtn" onClick={() => setClearTargetId(null)}>
              {t('chat.cancel')}
            </button>
          </div>
        </div>
      )}

      {deleteMessageTarget && (
        <div className="ModalOverlay" onClick={() => setDeleteMessageTarget(null)}>
          <div className="PlaylistModal" style={{ gap: '16px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="PlaylistModalTitle">{t('chat.delete_message_title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" className="PlaylistOptionBtn" onClick={handleConfirmDeleteForMe}>
                {t('chat.delete_for_me')}
              </button>
              {deleteMessageTarget.mine && (
                <button type="button" className="PlaylistOptionBtn danger" onClick={handleConfirmDeleteForEveryone}>
                  {t('chat.delete_for_everyone')}
                </button>
              )}
            </div>
            <button type="button" className="PlaylistModalCancelBtn" onClick={() => setDeleteMessageTarget(null)}>
              {t('chat.cancel')}
            </button>
          </div>
        </div>
      )}

      {deleteGroupModalOpen && selectedView && (
        <div className="ModalOverlay" onClick={() => setDeleteGroupModalOpen(false)}>
          <div className="PlaylistModal" style={{ gap: '16px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="PlaylistModalTitle">{t('chat.delete_group')}</h3>
            <p>{t('chat.delete_group_confirm_body')}</p>
            <button type="button" className="PlaylistOptionBtn danger" onClick={handleConfirmDeleteGroup}>
              {t('chat.delete_group')}
            </button>
            <button type="button" className="PlaylistModalCancelBtn" onClick={() => setDeleteGroupModalOpen(false)}>
              {t('chat.cancel')}
            </button>
          </div>
        </div>
      )}

      {leaveGroupModalOpen && selectedView && (
        <div className="ModalOverlay" onClick={() => setLeaveGroupModalOpen(false)}>
          <div className="PlaylistModal" style={{ gap: '16px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="PlaylistModalTitle">{t('chat.leave_group')}</h3>
            <p>
              {t('chat.leave_group_confirm_body')}
              {myRole === 'Admin' && t('chat.leave_group_admin_note')}
            </p>
            <button type="button" className="PlaylistOptionBtn danger" onClick={handleConfirmLeaveGroup}>
              {t('chat.leave_group')}
            </button>
            <button type="button" className="PlaylistModalCancelBtn" onClick={() => setLeaveGroupModalOpen(false)}>
              {t('chat.cancel')}
            </button>
          </div>
        </div>
      )}

      {historyModalOpen && selectedView && (
        <div className="ModalOverlay" onClick={() => setHistoryModalOpen(false)}>
          <div className="PlaylistModal" style={{ gap: '16px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="PlaylistModalTitle">{t('chat.clear_history')}</h3>
            {(!selectedView.isGroup || myRole === 'Admin') && (
              <label className="ChatClearHistoryCheckboxRow">
                <input
                  type="checkbox"
                  checked={historyForBoth}
                  onChange={(e) => setHistoryForBoth(e.target.checked)}
                />
                <span>{t('chat.delete_also_for', { name: selectedView.displayName.split(' ')[0] })}</span>
              </label>
            )}
            <button type="button" className="PlaylistOptionBtn danger" onClick={handleConfirmClearHistory}>
              {t('chat.clear')}
            </button>
            <button type="button" className="PlaylistModalCancelBtn" onClick={() => setHistoryModalOpen(false)}>
              {t('chat.cancel')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="ChatErrorToast" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label={t('chat.close')}>×</button>
        </div>
      )}

      {viewingImage && (
        <ImageLightbox
          url={viewingImage.url}
          fileName={viewingImage.fileName}
          onClose={() => setViewingImage(null)}
        />
      )}
    </div>
  )
}
