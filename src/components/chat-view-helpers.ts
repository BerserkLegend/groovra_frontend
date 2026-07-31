import type { ConversationSummaryDto } from '../api/chat-client'
import i18n from '../i18n/config'

const dateLocale = (): string => (i18n.language === 'en' ? 'en-US' : 'uk-UA')

const AVATAR_COLORS = [
  'linear-gradient(135deg, #72DEEF 0%, #3E8FA8 100%)',
  'linear-gradient(135deg, #A98FDB 0%, #6C4FBF 100%)',
  'linear-gradient(135deg, #FFB347 0%, #C77B26 100%)',
  'linear-gradient(135deg, #7BC67E 0%, #3F8C46 100%)',
  'linear-gradient(135deg, #F291C9 0%, #B14E90 100%)',
]

export const colorForSeed = (seed: string): string => {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export const initialsFor = (name: string): string => {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : trimmed.slice(0, 2).toUpperCase()
}

export const isSameCalendarDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

export const formatConversationTime = (iso: string): string => {
  const date = new Date(iso)
  return isSameCalendarDay(date, new Date())
    ? date.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit' })
}

export const formatDateDivider = (iso: string): string => {
  const date = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameCalendarDay(date, now)) return i18n.t('chat.today')
  if (isSameCalendarDay(date, yesterday)) return i18n.t('chat.yesterday')
  return date.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' })
}

export interface ConversationView {
  id: string
  isGroup: boolean
  displayName: string
  subtitle: string
  timeLabel: string
  colorSeed: string
  avatarUrl: string | null
  isPending: boolean
  raw: ConversationSummaryDto
}

export const buildView = (c: ConversationSummaryDto, currentUserId: string | null): ConversationView => {
  let displayName: string
  let colorSeed: string
  if (c.isGroup) {
    displayName = c.title || i18n.t('chat.group_chat_fallback')
    colorSeed = c.id
  } else {
    const other = c.participants.find((p) => p.userId !== currentUserId)
    displayName = other?.userName || i18n.t('chat.user_fallback')
    colorSeed = other?.userId || c.id
  }
  return {
    id: c.id,
    isGroup: c.isGroup,
    displayName,
    subtitle: c.status === 'Pending' ? i18n.t('chat.pending_request_subtitle') : (c.lastMessagePreview || i18n.t('chat.no_messages_subtitle')),
    timeLabel: formatConversationTime(c.lastMessageAt || c.createdAt),
    colorSeed,
    avatarUrl: c.avatarUrl,
    isPending: c.status === 'Pending' && c.requestedByUserId !== currentUserId,
    raw: c,
  }
}
