import { http } from 'uview-pro'

/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 提示词库 API 层 v2.0
 *  分类 / 列表 / 搜索 / 详情 / 互动 / 收藏
 *
 *  v2.0 新增: 社区分享 (UGC)
 *  图片上传 / 社区列表 / 点赞 / 举报
 * ════════════════════════════════════════════

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

/** 🆕 社区分享帖子 */
export interface CommunityPost {
  id: number
  user_id: number
  title: string
  prompt_text: string
  category_id: number
  image_url: string
  view_count: number
  like_count: number
  created_at: number
  nickname?: string
  avatar_url?: string
  category_name?: string
  is_liked?: boolean
  pending_reports?: number
}

export interface PromptPageResult<T = PromptItem> {
  list: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

// ─── 官方提示词 API ────────────────────────

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

// ══════════════════════════════════════════
//  🆕 社区分享 API v2.0
// ══════════════════════════════════════════

/** 上传社区图片 → 返回 URL + hash */
export function uploadCommunityImage(filePath: string): Promise<{
  url: string
  hash: string
}> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${getApiBase()}/prompt/upload`,
      filePath,
      name: 'image',
      header: getAuthHeader(),
      success(res) {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 0) resolve(data.data)
            else reject(new Error(data.message || '上传失败'))
          } catch { reject(new Error('解析响应失败')) }
        } else {
          reject(new Error(`上传失败 HTTP ${res.statusCode}`))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

/** 创建社区分享 */
export function createCommunityPost(params: {
  title: string
  prompt_text: string
  category_id?: number
  image_url?: string
  image_hash?: string
  tags?: string
}): Promise<{ id: number }> {
  return http.post<{ id: number }>('/prompt/community', params)
}

/** 社区广场列表 */
export function getCommunityPosts(params: {
  sort?: 'latest' | 'popular' | 'most_viewed'
  page?: number
  page_size?: number
  category_id?: number
}): Promise<PromptPageResult<CommunityPost>> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return http.get<PromptPageResult<CommunityPost>>(`/prompt/community${query ? `?${query}` : ''}`)
}

/** 社区帖子详情 */
export function getCommunityPostDetail(id: number): Promise<CommunityPost> {
  return http.get<CommunityPost>(`/prompt/community/${id}`)
}

/** 社区点赞/取消 */
export function toggleCommunityLike(id: number): Promise<{ is_liked: boolean; like_count: number }> {
  return http.post<{ is_liked: boolean; like_count: number }>(`/prompt/community/${id}/like`)
}

/** 举报内容 */
export function reportCommunityPost(id: number, params: {
  reason: 'spam' | 'inappropriate' | 'copyright' | 'other'
  description?: string
}): Promise<void> {
  return http.post<void>(`/prompt/community/${id}/report`, params)
}

/** 删除自己的分享 */
export function deleteCommunityPost(id: number): Promise<void> {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/prompt/community/${id}`,
      method: 'DELETE',
      header: getAuthHeader(),
      success(res) {
        if (res.statusCode === 200 || res.statusCode === 204) resolve()
        else reject(new Error(`删除失败 HTTP ${res.statusCode}`))
      },
      fail(err) { reject(err) },
    })
  })
}

// ══════════════════════════════════════════
//  内部工具函数
// ══════════════════════════════════════════

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
}

function getAuthHeader(): Record<string, string> {
  try {
    const tokenStr = uni.getStorageSync('token') || ''
    if (tokenStr) {
      const { token } = JSON.parse(tokenStr)
      if (token) return { Authorization: `Bearer ${token}` }
    }
  } catch { /* ignore */ }
  return {}
}
