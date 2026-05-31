import { http } from 'uview-pro'
import config from '@/config'

/**
 * VIP 套餐信息
 */
export interface VipPlan {
  id: string
  name: string
  priceCents: number
  durationDays: number
  level: number
  dailyQuota: number
}

/**
 * VIP 状态
 */
export interface VipStatus {
  vipLevel: number
  isVip: boolean
  expireAt: number
  dailyQuota: number
  nickname?: string
  avatarUrl?: string
}

/**
 * 订单结果
 */
export interface OrderResult {
  orderId: number
  mode: 'dev' | 'production'
  message?: string
  paymentParams?: {
    timeStamp: string
    nonceStr: string
    package: string
    signType: string
    paySign: string
  }
}

/**
 * 获取 VIP 套餐列表
 * GET /api/payment/plans
 * 拦截器已返回 data 字段，res 直接是 { basic: VipPlan, pro: VipPlan, ultimate: VipPlan }
 */
export async function getVipPlans(): Promise<Record<string, VipPlan>> {
  const res: any = await http.get('/payment/plans')
  return res || {}
}

/**
 * 创建 VIP 订阅订单
 * POST /api/payment/order
 * 拦截器已返回 data 字段，res 直接是 { orderId, mode, ... }
 */
export async function createVipOrder(plan: string): Promise<OrderResult> {
  const res: any = await http.post('/payment/order', { plan })
  return res
}

/**
 * 获取当前用户 VIP 状态
 * GET /api/vip/status
 * 拦截器已返回 data 字段，res 直接是 { vipLevel, isVip, ... }
 */
export async function getVipStatus(): Promise<VipStatus> {
  const res: any = await http.get('/vip/status')
  return res || { vipLevel: 0, isVip: false, expireAt: 0, dailyQuota: 10 }
}

/**
 * 格式化价格（分 → 元）
 */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * 格式化到期时间
 */
export function formatExpireAt(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return ''
  const date = new Date(timestamp * 1000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 计算剩余天数
 */
export function getRemainingDays(timestamp: number): number {
  if (!timestamp || timestamp <= 0) return 0
  const now = Math.floor(Date.now() / 1000)
  const diff = timestamp - now
  return diff > 0 ? Math.ceil(diff / 86400) : 0
}
