import { http } from '@/common/http.interceptor'

/**
 * 提交反馈建议
 * POST /api/feedback
 * { type: 'suggestion'|'bug_report', content: string, contact?: string }
 */
export async function submitFeedback(payload: {
  type?: string
  content: string
  contact?: string
}): Promise<{ message: string }> {
  return http.post('/api/feedback', payload)
}

/**
 * 查询我的反馈记录
 * GET /api/feedback/mine
 */
export async function getMyFeedback(): Promise<any[]> {
  return http.get('/api/feedback/mine')
}
