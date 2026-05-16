import { http } from 'uview-pro'

/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 提示词库 API 层
 *  分类 / 列表 / 搜索 / 详情 / 互动 / 收藏
 * ════════════════════════════════════════════
 */

// ─── 类型定义 ──────────────────────────────

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

// ─── API 方法 ──────────────────────────────

/** 获取全部分类 */
export function getCategories(): Promise<PromptCategory[]> {
  return http.get<PromptCategory[]>('/prompt/categories')
}

/** 获取提示词列表 */
export function getPromptList(params: {
  category_id?: number
  language?: string
  sort?: string
  page?: number
  page_size?: number
}): Promise<PromptPageResult> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return http.get<PromptPageResult>(`/prompt/list${query ? `?${query}` : ''}`)
}

/** 搜索提示词 */
export function searchPrompts(params: {
  q: string
  category_id?: number
  page?: number
  page_size?: number
}): Promise<PromptPageResult> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return http.get<PromptPageResult>(`/prompt/search?${query}`)
}

/** 获取提示词详情 */
export function getPromptDetail(id: number): Promise<PromptItem> {
  return http.get<PromptItem>(`/prompt/${id}`)
}

/** 互动 (view / like / copy) */
export function interactPrompt(id: number, action: 'view' | 'like' | 'copy'): Promise<void> {
  return http.post<void>(`/prompt/${id}/interact`, { action })
}

/** 切换收藏 */
export function togglePromptFavorite(id: number): Promise<{ is_favorited: boolean }> {
  return http.post<{ is_favorited: boolean }>(`/prompt/${id}/favorite`)
}

/** 获取收藏列表 */
export function getFavoriteList(params: {
  page?: number
  page_size?: number
}): Promise<PromptPageResult> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return http.get<PromptPageResult>(`/prompt/favorites/list${query ? `?${query}` : ''}`)
}
