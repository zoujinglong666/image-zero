/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 数据 API 层
 *  历史记录 / 用户偏好 / 用户信息
 *  跨平台: uni.request
 * ══════════════════════════════════════════
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// ══════════════════════════════════════════
//  底层请求封装
// ══════════════════════════════════════════

function uniRequest(options: UniApp.RequestOptions): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      success: (res) => resolve({ statusCode: res.statusCode || 0, data: res.data }),
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败')),
    })
  })
}

function getHeaders(): Record<string, string> {
  const token = uni?.getStorageSync('token') || ''
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) header['Authorization'] = `Bearer ${token}`
  return header
}

// ══════════════════════════════════════════
//  历史记录
// ══════════════════════════════════════════

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

/** 分页查询历史记录 */
export async function fetchHistory(params: {
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

  const res = await uniRequest({
    url: `${API_BASE}/api/data/history?${query.toString()}`,
    method: 'GET',
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) {
    return res.data.data
  }
  throw new Error(res.data?.error || '查询历史失败')
}

/** 添加历史记录 */
export async function createHistory(record: {
  type?: string
  imageUrl?: string
  promptCn?: string
  promptEn?: string
  style?: string
  resultJson?: any
  generatedUrl?: string
}): Promise<{ id: number }> {
  const res = await uniRequest({
    url: `${API_BASE}/api/data/history`,
    method: 'POST',
    data: record,
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) {
    return res.data.data
  }
  throw new Error(res.data?.error || '添加记录失败')
}

/** 切换收藏 */
export async function toggleFavorite(id: number): Promise<{ id: number; favorite: boolean }> {
  const res = await uniRequest({
    url: `${API_BASE}/api/data/history/${id}/favorite`,
    method: 'PUT',
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) {
    return res.data.data
  }
  throw new Error(res.data?.error || '操作失败')
}

/** 删除单条记录 */
export async function deleteHistory(id: number): Promise<void> {
  const res = await uniRequest({
    url: `${API_BASE}/api/data/history/${id}`,
    method: 'DELETE',
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) return
  throw new Error(res.data?.error || '删除失败')
}

/** 清空所有记录 */
export async function clearAllHistory(): Promise<{ deleted: number }> {
  const res = await uniRequest({
    url: `${API_BASE}/api/data/history`,
    method: 'DELETE',
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) {
    return res.data.data
  }
  throw new Error(res.data?.error || '清空失败')
}

// ══════════════════════════════════════════
//  用户偏好
// ══════════════════════════════════════════

/** 获取用户偏好 */
export async function fetchPreferences(): Promise<Record<string, string>> {
  const res = await uniRequest({
    url: `${API_BASE}/api/data/preferences`,
    method: 'GET',
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) {
    return res.data.data
  }
  return {}
}

/** 保存用户偏好 */
export async function savePreferences(prefs: Record<string, string>): Promise<Record<string, string>> {
  const res = await uniRequest({
    url: `${API_BASE}/api/data/preferences`,
    method: 'PUT',
    data: prefs,
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) {
    return res.data.data
  }
  throw new Error(res.data?.error || '保存偏好失败')
}

// ══════════════════════════════════════════
//  用户信息
// ══════════════════════════════════════════

export interface UserProfile {
  uid: string
  type: string
  nickname: string
  avatarUrl: string
  vip: { level: number; active: boolean; expireAt: number }
  dailyQuota: number
  preferences: Record<string, string>
}

/** 获取用户信息 */
export async function fetchProfile(): Promise<UserProfile> {
  const res = await uniRequest({
    url: `${API_BASE}/api/data/profile`,
    method: 'GET',
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) {
    return res.data.data
  }
  throw new Error(res.data?.error || '获取用户信息失败')
}

/** 更新用户信息 */
export async function updateProfile(fields: { nickname?: string; avatarUrl?: string }): Promise<void> {
  const res = await uniRequest({
    url: `${API_BASE}/api/data/profile`,
    method: 'PUT',
    data: fields,
    header: getHeaders(),
    timeout: 10_000,
  })

  if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) return
  throw new Error(res.data?.error || '更新失败')
}