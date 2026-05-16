import { http } from 'uview-pro'

/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 数据 API 层
 *  历史记录 / 用户偏好 / 用户信息
 * ════════════════════════════════════════════
 */

// ─── 类型定义 ──────────────────────────────

export interface HistoryPageResult {
  list: HistoryItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface HistoryItem {
  id: number
  type: string
  imageUrl: string
  prompt: string
  promptEn: string
  style: string
  generatedUrl: string
  favorite: boolean
  timestamp: number
}

export interface UserProfile {
  uid: string
  type: string
  nickname: string
  avatarUrl: string
  vip: { level: number; active: boolean; expireAt: number }
  dailyQuota: number
  preferences: Record<string, string>
}

// ─── 历史记录 ──────────────────────────────

/** 分页查询历史记录 */
export function fetchHistory(params: {
  page?: number
  pageSize?: number
  type?: string
  favorite?: boolean
  keyword?: string
} = {}): Promise<HistoryPageResult> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.type) query.set('type', params.type)
  if (params.favorite) query.set('favorite', 'true')
  if (params.keyword) query.set('keyword', params.keyword)
  const qs = query.toString()
  return http.get<HistoryPageResult>(`/data/history${qs ? `?${qs}` : ''}`)
}

/** 添加历史记录 */
export function createHistory(record: {
  type?: string
  imageUrl?: string
  promptCn?: string
  promptEn?: string
  style?: string
  resultJson?: any
  generatedUrl?: string
}): Promise<{ id: number }> {
  return http.post<{ id: number }>('/data/history', record)
}

/** 切换收藏 */
export function toggleFavorite(id: number): Promise<{ id: number; favorite: boolean }> {
  return http.put<{ id: number; favorite: boolean }>(`/data/history/${id}/favorite`)
}

/** 删除单条记录 */
export function deleteHistory(id: number): Promise<void> {
  return http.delete<void>(`/data/history/${id}`)
}

/** 清空所有记录 */
export function clearAllHistory(): Promise<{ deleted: number }> {
  return http.delete<{ deleted: number }>('/data/history')
}

// ─── 用户偏好 ──────────────────────────────

/** 获取用户偏好 */
export function fetchPreferences(): Promise<Record<string, string>> {
  return http.get<Record<string, string>>('/data/preferences')
}

/** 保存用户偏好 */
export function savePreferences(prefs: Record<string, string>): Promise<Record<string, string>> {
  return http.put<Record<string, string>>('/data/preferences', prefs)
}

// ─── 用户信息 ──────────────────────────────

/** 获取用户信息 */
export function fetchProfile(): Promise<UserProfile> {
  return http.get<UserProfile>('/data/profile')
}

/** 更新用户信息 */
export function updateProfile(fields: { nickname?: string; avatarUrl?: string }): Promise<void> {
  return http.put<void>('/data/profile', fields)
}
