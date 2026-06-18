import { http } from 'uview-pro'

/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 站内信通知 API 层
 *  收件箱 / 未读数 / 标记已读
 * ════════════════════════════════════════════
 */

/** 站内信通知项 */
export interface NotificationItem {
  id: number
  userId: number
  type: 'system' | 'ai_result' | 'challenge' | 'vip' | 'social'
  title: string
  content: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 获取站内信列表
 * GET /api/notification/inbox
 */
export function getInbox(limit = 20): Promise<NotificationItem[]> {
  return http.get<NotificationItem[]>('/notification/inbox', { limit })
}

/**
 * 获取未读通知数量
 * GET /api/notification/unread
 */
export function getUnreadCount(): Promise<{ count: number }> {
  return http.get<{ count: number }>('/notification/unread')
}

/**
 * 标记全部已读
 * POST /api/notification/read-all
 */
export function markAllRead(): Promise<void> {
  return http.post<void>('/notification/read-all')
}

/**
 * 标记单条已读
 * POST /api/notification/read/{id}
 */
export function markRead(id: number): Promise<void> {
  return http.post<void>(`/notification/read/${id}`)
}