import { http } from 'uview-pro'

/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 社区/首页 API 层
 *  每日精选 / 热门排行 / 主题挑战 / 最新动态
 * ════════════════════════════════════════════
 */

// ─── 类型定义 ──────────────────────────────

/** 社区作品（来自 user_prompts 表） */
export interface CommunityWork {
  id: number
  user_id: number
  title: string
  prompt_text: string
  category_id: number
  image_url: string
  tags: string
  view_count: number
  like_count: number
  copy_count: number
  is_public: boolean
  status: string
  created_at: string
  updated_at: string
}

/** 主题挑战 */
export interface Challenge {
  id: number
  title: string
  description: string
  cover_image: string
  theme_tags: string
  prompt_hint: string
  start_at: string
  end_at: string
  status: 'upcoming' | 'active' | 'completed'
  sort_order: number
  participant_count: number
  created_at: string
}

/** 挑战投稿 */
export interface ChallengeSubmission {
  id: number
  challenge_id: number
  user_id: number
  title: string
  prompt_text: string
  image_url: string
  like_count: number
  created_at: string
}

/** 首页聚合数据 */
export interface HomeData {
  daily_picks: CommunityWork[]
  weekly_hot: CommunityWork[]
  active_challenge: Challenge | null
  latest_posts: {
    list: CommunityWork[]
    pagination: {
      page: number
      page_size: number
      total: number
      total_pages: number
    }
  }
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

// ══════════════════════════════════════════
//  首页聚合
// ══════════════════════════════════════════

/** 首页聚合数据（一次性返回所有模块） */
export function getHomeData(): Promise<HomeData> {
  return http.get<HomeData>('/community/home')
}

// ══════════════════════════════════════════
//  每日精选
// ══════════════════════════════════════════

/** 获取每日精选 */
export function getDailyPicks(limit: number = 5): Promise<CommunityWork[]> {
  return http.get<CommunityWork[]>(`/community/daily-picks?limit=${limit}`)
}

// ══════════════════════════════════════════
//  本周热门
// ══════════════════════════════════════════

/** 获取本周热门排行 */
export function getWeeklyHot(limit: number = 10): Promise<CommunityWork[]> {
  return http.get<CommunityWork[]>(`/community/weekly-hot?limit=${limit}`)
}

// ══════════════════════════════════════════
//  最新动态
// ══════════════════════════════════════════

/** 获取最新动态（分页） */
export function getLatestPosts(params: {
  page?: number
  page_size?: number
}): Promise<PageResult<CommunityWork>> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return http.get<PageResult<CommunityWork>>(`/community/latest${query ? `?${query}` : ''}`)
}

// ══════════════════════════════════════════
//  主题挑战
// ══════════════════════════════════════════

/** 获取当前活跃挑战 */
export function getActiveChallenge(): Promise<Challenge> {
  return http.get<Challenge>('/community/challenge/active')
}

/** 获取所有挑战列表 */
export function listChallenges(): Promise<Challenge[]> {
  return http.get<Challenge[]>('/community/challenges')
}

/** 获取挑战详情 */
export function getChallengeDetail(id: number): Promise<Challenge> {
  return http.get<Challenge>(`/community/challenges/${id}`)
}

/** 获取挑战投稿列表 */
export function listChallengeSubmissions(params: {
  id: number
  page?: number
  page_size?: number
}): Promise<PageResult<ChallengeSubmission>> {
  const query: string[] = []
  if (params.page) query.push(`page=${params.page}`)
  if (params.page_size) query.push(`page_size=${params.page_size}`)
  return http.get<PageResult<ChallengeSubmission>>(
    `/community/challenges/${params.id}/submissions${query.length ? `?${query.join('&')}` : ''}`
  )
}

/** 提交挑战作品 */
export function submitChallengeWork(params: {
  challenge_id: number
  title?: string
  prompt_text?: string
  image_url?: string
}): Promise<{ id: number }> {
  return http.post<{ id: number }>(`/community/challenges/${params.challenge_id}/submit`, {
    title: params.title || '',
    prompt_text: params.prompt_text || '',
    image_url: params.image_url || '',
  })
}

/** 为挑战作品点赞 */
export function likeSubmission(id: number): Promise<void> {
  return http.post<void>(`/community/submissions/${id}/like`)
}