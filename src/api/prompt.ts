/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 提示词库 API 层
 *  分类 / 列表 / 搜索 / 详情 / 互动 / 收藏 / 自创
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
//  类型定义
// ══════════════════════════════════════════

export interface PromptCategory {
  id: number
  name: string
  name_en: string
  icon: string
  sort_order: number
  prompt_count: number
}

export interface PromptItem {
  id: number
  category_id: number
  title: string
  prompt_text: string
  source: string
  source_url: string
  author: string
  language: string
  tags: string
  view_count: number
  like_count: number
  copy_count: number
  favorite_count: number
  created_at: number
  category_name?: string
  is_favorited?: boolean
}

export interface PromptPageResult {
  list: PromptItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

// ══════════════════════════════════════════
//  API 方法
// ══════════════════════════════════════════

/** 获取全部分类 */
export async function getCategories(): Promise<PromptCategory[]> {
  const { data } = await uniRequest({
    url: `${API_BASE}/api/prompt/categories`,
    method: 'GET',
    header: getHeaders(),
  })
  if (data.success) return data.data
  throw new Error(data.error || '获取分类失败')
}

/** 获取提示词列表 */
export async function getPromptList(params: {
  category_id?: number
  language?: string
  sort?: string
  page?: number
  page_size?: number
}): Promise<PromptPageResult> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const { data } = await uniRequest({
    url: `${API_BASE}/api/prompt/list?${query}`,
    method: 'GET',
    header: getHeaders(),
  })
  if (data.success) return data.data
  throw new Error(data.error || '获取列表失败')
}

/** 搜索提示词 */
export async function searchPrompts(params: {
  q: string
  category_id?: number
  page?: number
  page_size?: number
}): Promise<PromptPageResult> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  const { data } = await uniRequest({
    url: `${API_BASE}/api/prompt/search?${query}`,
    method: 'GET',
    header: getHeaders(),
  })
  if (data.success) return data.data
  throw new Error(data.error || '搜索失败')
}

/** 获取提示词详情 */
export async function getPromptDetail(id: number): Promise<PromptItem> {
  const { data } = await uniRequest({
    url: `${API_BASE}/api/prompt/${id}`,
    method: 'GET',
    header: getHeaders(),
  })
  if (data.success) return data.data
  throw new Error(data.error || '获取详情失败')
}

/** 互动 (view / like / copy) */
export async function interactPrompt(id: number, action: 'view' | 'like' | 'copy'): Promise<void> {
  const { data } = await uniRequest({
    url: `${API_BASE}/api/prompt/${id}/interact`,
    method: 'POST',
    header: getHeaders(),
    data: { action },
  })
  if (!data.success) throw new Error(data.error || '操作失败')
}

/** 切换收藏 */
export async function toggleFavorite(id: number): Promise<{ is_favorited: boolean }> {
  const { data } = await uniRequest({
    url: `${API_BASE}/api/prompt/${id}/favorite`,
    method: 'POST',
    header: getHeaders(),
  })
  if (data.success) return data.data
  throw new Error(data.error || '收藏操作失败')
}

/** 获取收藏列表 */
export async function getFavoriteList(params: {
  page?: number
  page_size?: number
}): Promise<PromptPageResult> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const { data } = await uniRequest({
    url: `${API_BASE}/api/prompt/favorites/list?${query}`,
    method: 'GET',
    header: getHeaders(),
  })
  if (data.success) return data.data
  throw new Error(data.error || '获取收藏失败')
}