import React from 'react'
import { useTranslation } from 'react-i18next'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}) => {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  const getPages = (): (number | '...')[] => {
    const pages: (number | '...')[] = []
    const delta = 2

    const left  = Math.max(2, currentPage - delta)
    const right = Math.min(totalPages - 1, currentPage + delta)

    pages.push(1)
    if (left > 2) pages.push('...')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('...')
    if (totalPages > 1) pages.push(totalPages)

    return pages
  }

  const pages = getPages()

  return (
    <div className="pagination-wrapper">
      <button
        className="pagination-arrow"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        aria-label={t('pagination.previous', 'Попередня сторінка')}
      >
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
          <path d="M7 1L1 6.5L7 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="pagination-pages">
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className="pagination-dots">···</span>
          ) : (
            <button
              key={page}
              className={`pagination-page ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page as number)}
              disabled={isLoading}
              aria-label={t('pagination.page', { page, defaultValue: `Сторінка ${page}` })}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        className="pagination-arrow"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        aria-label={t('pagination.next', 'Наступна сторінка')}
      >
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
          <path d="M1 1L7 6.5L1 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}