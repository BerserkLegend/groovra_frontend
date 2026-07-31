import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export type StrengthLevel = 'empty' | 'weak' | 'medium' | 'strong'

export interface PasswordRule {
  label: string
  passed: boolean
}

export interface PasswordStrength {
  level: StrengthLevel
  score: number        
  rules: PasswordRule[]
  color: string
  labelText: string
}

export function usePasswordStrength(password: string): PasswordStrength {
  const { t } = useTranslation()

  return useMemo(() => {
    const rules: PasswordRule[] = [
      { label: t('passwordStrength.rule_min_length'), passed: password.length >= 8 },
      { label: t('passwordStrength.rule_uppercase'),  passed: /[A-Z]/.test(password) },
      { label: t('passwordStrength.rule_lowercase'),  passed: /[a-z]/.test(password) },
      { label: t('passwordStrength.rule_digit'),      passed: /[0-9]/.test(password) },
      { label: t('passwordStrength.rule_special'),    passed: /[^A-Za-z0-9]/.test(password) },
    ]

    const score = rules.filter(r => r.passed).length

    if (!password) {
      return { level: 'empty', score: 0, rules, color: 'var(--strength-empty, #3a3a3a)', labelText: '' }
    }

    if (score <= 1) {
      return { level: 'weak',   score, rules, color: 'var(--strength-weak,   #e05c5c)', labelText: t('passwordStrength.level_weak') }
    }
    if (score <= 3) {
      return { level: 'medium', score, rules, color: 'var(--strength-medium, #e0a45c)', labelText: t('passwordStrength.level_medium') }
    }
    return   { level: 'strong', score, rules, color: 'var(--strength-strong, #5ce07a)', labelText: t('passwordStrength.level_strong') }
  }, [password, t])
}