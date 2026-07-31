import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, X, Heart, Trash2, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { apiFetch, GATEWAY_URL } from '../api/api-client'
import Loader from './Loader'

interface Comment {
  id: string
  trackId: string
  authorId?: string
  authorName: string
  text: string
  likes: number
  isLiked: boolean
  isOwn: boolean
  createdAt: string
  timestamp: string
}

interface CommentsModalProps {
  isOpen: boolean
  onClose: () => void
  trackId?: string
  trackTitle?: string
  artistName?: string
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  trackId,
  trackTitle,
  artistName,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const displayTitle = trackTitle || t('commentsModal.default_track')
  const displayArtist = artistName || t('commentsModal.default_artist')
  const [comments, setComments] = useState<Comment[]>([])
  const [newText, setNewText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAuthorClick = (authorId?: string) => {
    if (!authorId) return
    const savedLang = localStorage.getItem('lang') || 'uk'
    const prefix = savedLang === 'en' ? '/en' : ''
    onClose()
    navigate(`${prefix}/profile?userId=${authorId}`)
  }

  const fetchComments = useCallback(async () => {
    if (!trackId) {
      setComments([])
      return
    }

    setIsLoading(true)
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      } else {
        setComments([])
      }
    } catch (error) {
      console.error('Failed to fetch comments from backend:', error)
      setComments([])
    } finally {
      setIsLoading(false)
    }
  }, [trackId])

  useEffect(() => {
    if (isOpen) {
      fetchComments()
    }
  }, [isOpen, fetchComments])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim() || !trackId || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() }),
      })

      if (response.ok) {
        const createdComment: Comment = await response.json()
        setComments((prev) => [createdComment, ...prev])
        setNewText('')
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleLike = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c
        const isLiked = !c.isLiked
        return {
          ...c,
          isLiked,
          likes: isLiked ? c.likes + 1 : Math.max(0, c.likes - 1),
        }
      })
    )

    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/tracks/comments/${commentId}/like`, {
        method: 'POST',
      })
      if (!response.ok) {
        fetchComments()
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      fetchComments()
    }
  }

  const handleDelete = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))

    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/tracks/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        fetchComments()
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
      fetchComments()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="CommentsModalOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="CommentsModalContainer"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comments-modal-title"
          >
            <div className="BottomSheetHandle" />

            <div className="CommentsModalHeader">
              <div className="CommentsTitleGroup">
                <div className="CommentsIconBadge">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 id="comments-modal-title" className="CommentsModalTitle">
                    {t('commentsModal.title', { count: comments.length })}
                  </h3>
                  <span className="CommentsSubTitle">
                    {displayTitle} • {displayArtist}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="CommentsCloseBtn"
                onClick={onClose}
                aria-label={t('commentsModal.close')}
                title={t('commentsModal.close')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="CommentsInputForm">
              <div className="CommentsInputAvatar">
                <User size={18} />
              </div>
              <input
                id="comment-input"
                name="commentText"
                type="text"
                className="CommentsInputField"
                placeholder={t('commentsModal.placeholder')}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="CommentsSendBtn"
                disabled={!newText.trim() || isSubmitting}
                title={t('commentsModal.publish')}
              >
                <Send size={16} />
              </button>
            </form>

            <div className="CommentsList">
              {isLoading ? (
                <div style={{ padding: '20px 0' }}>
                  <Loader variant="section" size="sm" />
                </div>
              ) : comments.length === 0 ? (
                <div className="CommentsEmptyState">
                  <MessageSquare size={32} className="CommentsEmptyIcon" />
                  <p className="CommentsEmptyTitle">{t('commentsModal.empty_title')}</p>
                  <p className="CommentsEmptyDesc">{t('commentsModal.empty_desc')}</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="CommentItem">
                    <div
                      className="CommentAvatar"
                      onClick={() => handleAuthorClick(comment.authorId)}
                      style={{ cursor: comment.authorId ? 'pointer' : 'default' }}
                      tabIndex={comment.authorId ? 0 : -1}
                      role={comment.authorId ? "button" : "presentation"}
                      onKeyDown={(e) => {
                        if (comment.authorId && (e.key === 'Enter' || e.key === ' ')) {
                          handleAuthorClick(comment.authorId)
                        }
                      }}
                    >
                      {(comment.authorName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="CommentContent">
                      <div className="CommentMetaHeader">
                        <span
                          className={`CommentAuthor ${comment.authorId ? 'ClickableAuthor' : ''}`}
                          onClick={() => handleAuthorClick(comment.authorId)}
                          style={{ cursor: comment.authorId ? 'pointer' : 'default' }}
                        >
                          {comment.authorName}
                        </span>
                        <span className="CommentTime">{comment.timestamp}</span>
                      </div>
                      <p className="CommentText">{comment.text}</p>
                      <div className="CommentActions">
                        <button
                          type="button"
                          className={`CommentLikeBtn ${comment.isLiked ? 'liked' : ''}`}
                          onClick={() => handleToggleLike(comment.id)}
                        >
                          <Heart size={14} className="LikeIcon" fill={comment.isLiked ? 'currentColor' : 'none'} />
                          <span>{comment.likes}</span>
                        </button>
                        {comment.isOwn && (
                          <button
                            type="button"
                            className="CommentDeleteBtn"
                            onClick={() => handleDelete(comment.id)}
                            title={t('commentsModal.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
