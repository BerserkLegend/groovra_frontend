import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForwardModal } from '../context/forward-modal-context'
import { useChat } from '../context/chat-context'
import { getCurrentUserId } from '../api/api-client'
import { searchUsers, type UserSearchResult } from '../api/auth'
import { resolveMediaUrl } from '../api/profile'
import type { MediaMessageType } from '../api/chat-client'
import { Avatar } from './chat-avatar'
import { buildView } from './chat-view-helpers'

const SendIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
)

export const ForwardMessageModal: React.FC = () => {
  const { t } = useTranslation()
  const { isOpen, message, closeModal } = useForwardModal()
  const { conversations, createConversation, sendMessage, shareTrack, sendMediaMessage } = useChat()
  const currentUserId = getCurrentUserId()

  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<UserSearchResult[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)

  const resetLocalState = () => {
    setSentIds(new Set())
    setUserQuery('')
    setUserResults([])
  }

  const handleClose = () => {
    resetLocalState()
    closeModal()
  }

  if (!isOpen || !message) return null

  const views = conversations.map((c) => buildView(c, currentUserId))

  const forwardTo = async (conversationId: string) => {
    if (message.type === 'Text') {
      await sendMessage(conversationId, message.text ?? '', undefined, message.id)
    } else if (message.type === 'TrackShare' && message.track) {
      await shareTrack(conversationId, message.track.trackId, undefined, message.id)
    } else if (message.mediaUrl) {
      await sendMediaMessage(
        conversationId,
        message.mediaUrl,
        message.type as MediaMessageType,
        message.mediaFileName ?? undefined,
        message.mediaFileSizeBytes ?? undefined,
        undefined,
        message.id
      )
    }
  }

  const handleSendToConversation = async (conversationId: string) => {
    await forwardTo(conversationId)
    setSentIds((prev) => new Set(prev).add(conversationId))
  }

  const handleSendToUser = async (userId: string) => {
    const summary = await createConversation([userId])
    if (!summary) return
    await forwardTo(summary.id)
    setSentIds((prev) => new Set(prev).add(userId))
  }

  const runUserSearch = async (q: string) => {
    if (!q.trim()) {
      setUserResults([])
      return
    }
    setIsSearchingUsers(true)
    try {
      setUserResults(await searchUsers(q.trim()))
    } catch {
      setUserResults([])
    } finally {
      setIsSearchingUsers(false)
    }
  }

  return (
    <div className="ModalOverlay" onClick={handleClose}>
      <div className="PlaylistModal ShareTrackModal" onClick={(e) => e.stopPropagation()}>
        <h3 className="PlaylistModalTitle">{t('chat.forward_message_title')}</h3>

        <div className="ShareTrackSection">
          <div className="ShareTrackSectionHeader">{t('chat.recent_conversations')}</div>
          <div className="ShareTrackList">
            {views.length === 0 && <div className="ChatListEmpty">{t('chat.no_conversations_yet')}</div>}
            {views.map((v) => (
              <div className="ShareTrackRow" key={v.id}>
                <Avatar name={v.displayName} seed={v.colorSeed} isGroup={v.isGroup} />
                <span className="ShareTrackRowName">{v.displayName}</span>
                <button
                  type="button"
                  className="ShareTrackSendBtn"
                  disabled={sentIds.has(v.id)}
                  onClick={() => handleSendToConversation(v.id)}
                >
                  {sentIds.has(v.id) ? t('chat.sent') : (<><SendIcon /> {t('chat.send')}</>)}
                </button>
              </div>
            ))}
          </div>

          <div className="ShareTrackUserSearch">
            <input
              type="text"
              placeholder={t('chat.find_user_placeholder')}
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runUserSearch(userQuery) }}
            />
            <button type="button" onClick={() => runUserSearch(userQuery)}>{t('chat.find')}</button>
          </div>
          {isSearchingUsers && <div className="ChatListEmpty">{t('chat.searching')}</div>}
          {!isSearchingUsers && userQuery.trim() && userResults.length === 0 && (
            <div className="ChatListEmpty">{t('chat.no_users_found')}</div>
          )}
          <div className="ShareTrackList">
            {userResults.map((u) => (
              <div className="ShareTrackRow" key={u.userId}>
                {u.avatarUrl ? (
                  <img src={resolveMediaUrl(u.avatarUrl)} alt={u.username} className="ChatAvatar sm" />
                ) : (
                  <Avatar name={u.username} seed={u.userId} />
                )}
                <span className="ShareTrackRowName">{u.username}</span>
                <button
                  type="button"
                  className="ShareTrackSendBtn"
                  disabled={sentIds.has(u.userId)}
                  onClick={() => handleSendToUser(u.userId)}
                >
                  {sentIds.has(u.userId) ? t('chat.sent') : (<><SendIcon /> {t('chat.send')}</>)}
                </button>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className="PlaylistModalCancelBtn" onClick={handleClose}>
          {t('chat.close')}
        </button>
      </div>
    </div>
  )
}
