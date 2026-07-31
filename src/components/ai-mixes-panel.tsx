import React from 'react'
import { useTranslation } from 'react-i18next'
import '../app.css'
import AiIcon from '../assets/AI.svg'

interface AiMixesPanelProps {
  children?: React.ReactNode
}

export const AiMixesPanel: React.FC<AiMixesPanelProps> = ({ children }) => {
  const { t } = useTranslation()

  return (
    <div className='AiMixesBlock'>
      <div className='AiHeaderTop'>
        <img src={AiIcon} className='AiCardIcon' alt="AI-Icon" />
        <div className='AiHeaderTexts'>
          <span className='LisNowTrending'>{t('aiMixesPanel.header_title')}</span>
          <span className='TrendNowText'>{t('aiMixesPanel.header_subtitle')}</span>
        </div>
      </div>

      <div className='AiCardContentPlaceholder'>
        {children || (
          <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'SUSE, sans-serif' }}>
            {t('aiMixesPanel.placeholder')}
          </span>
        )}
      </div>
    </div>
  )
}
