import { http } from 'uview-pro'

/**
 * 邀请信息
 */
export interface InviteInfo {
  inviteCode: string
  totalInvites: number
  completedInvites: number
  totalReward: number
}

/**
 * 获取用户邀请信息（邀请码 + 统计）
 * GET /api/invite/info
 * 拦截器已返回 data 字段，res 直接是 { inviteCode, totalInvites, ... }
 */
export async function getInviteInfo(): Promise<InviteInfo> {
  const res: any = await http.get('/invite/info')
  return res || { inviteCode: '', totalInvites: 0, completedInvites: 0, totalReward: 0 }
}

/**
 * 通过邀请码查询邀请人信息
 * GET /api/invite/code/{code}
 * 拦截器已返回 data 字段，res 直接是 { nickname, avatarUrl }
 */
export async function getInviterByCode(code: string): Promise<{ nickname: string; avatarUrl: string }> {
  const res: any = await http.get(`/invite/code/${code}`)
  return res || { nickname: '', avatarUrl: '' }
}
