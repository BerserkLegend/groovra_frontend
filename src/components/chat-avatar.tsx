import React from 'react'
import { colorForSeed, initialsFor } from './chat-view-helpers'

const GroupIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
)

export const Avatar: React.FC<{ name: string; seed: string; isGroup?: boolean; avatarUrl?: string | null; size?: 'sm' | 'md' | 'lg' }> = ({ name, seed, isGroup, avatarUrl, size = 'sm' }) => {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`ChatAvatar ${size}`} style={{ objectFit: 'cover' }} />
  }
  return (
    <span className={`ChatAvatar ${size}`} style={{ background: colorForSeed(seed) }}>
      {isGroup ? <GroupIcon /> : initialsFor(name)}
    </span>
  )
}
