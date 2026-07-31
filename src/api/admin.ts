import { apiFetch } from './api-client'

export interface SecurityOverviewDto {
  loginsTotal24h: number
  loginsFailed24h: number
  failureRate24h: number
  threatsDetected24h: number
  threatAvgScore: number
  oauthRisksDetected24h: number
  oauthRiskAvgScore: number
  criticalThreatsCount: number
}

export interface SecurityStatsDto {
  totalLoginAttempts: number
  failedLoginAttempts: number
  totalThreats: number
  resolvedThreats: number
  totalOAuthRisks: number
  topThreatTypes: string[]
  topOAuthProviders: string[]
}

export const getSecurityOverview = async (): Promise<SecurityOverviewDto> => {
  const response = await apiFetch('/admin/security/overview')
  if (!response.ok) {
    throw new Error(`Failed to load security overview: ${response.status}`)
  }
  return response.json()
}

export const getSecurityStats = async (): Promise<SecurityStatsDto> => {
  const response = await apiFetch('/admin/security/stats')
  if (!response.ok) {
    throw new Error(`Failed to load security stats: ${response.status}`)
  }
  return response.json()
}

export interface RevenueMonth {
  label: string
  value: number
  active?: boolean
}

export interface DashboardStatsDto {
  totalUsers: {
    value: string
    changePercent: number
    progressPercent: number
    targetLabel: string
  }
  monthlyRevenue: {
    value: string
    periodLabel: string
    months: RevenueMonth[]
  }
  activeSubscriptions: {
    value: string
    ratioLabel: string
    caption: string
  }
  aiGeneratedTracks: {
    value: string
  }
  pendingReports: {
    value: string
    caption: string
  }
  growthRate: {
    avgPerDayLabel: string
    retentionLabel: string
  }
}

export interface ActivityFeedItemDto {
  id: string
  tone: string
  iconType: string
  title: string
  subtitle: string
  badge: string
  createdAt: string
}

export const getDashboardStats = async (): Promise<DashboardStatsDto> => {
  const response = await apiFetch('/admin/dashboard/stats')
  if (!response.ok) {
    throw new Error(`Failed to load dashboard stats: ${response.status}`)
  }
  return response.json()
}

export const getActivityFeed = async (): Promise<ActivityFeedItemDto[]> => {
  const response = await apiFetch('/admin/dashboard/activity')
  if (!response.ok) {
    throw new Error(`Failed to load activity feed: ${response.status}`)
  }
  return response.json()
}
