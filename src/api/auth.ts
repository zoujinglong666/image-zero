import { http } from 'uview-pro'
import type {
  WechatLoginResult,
  AnonymousLoginResult,
  VerifyTokenResult,
  AuthStatusResult,
} from '@/types'

/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 认证 API 层
 *  微信登录 / 匿名登录 / Token 验证 / 状态查询
 * ════════════════════════════════════════════
 */

/**
 * 微信小程序登录
 * 1. 调用 wx.login() 获取 code
 * 2. 将 code 发送到后端 /auth/wechat
 * 3. 后端 code2Session 换取 openid → JWT
 */
export async function wechatLogin(): Promise<WechatLoginResult> {
  // #ifdef MP-WEIXIN
  const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject,
    })
  })

  if (!loginRes.code) {
    throw new Error('微信登录失败：未获取到 code')
  }

  return http.post<WechatLoginResult>('/auth/wechat', { code: loginRes.code })
  // #endif

  // #ifndef MP-WEIXIN
  throw new Error('当前环境不支持微信登录，请在微信小程序中使用')
  // #endif
}

/** 手动传入 code 的微信登录（调试用） */
export function wechatLoginWithCode(code: string): Promise<WechatLoginResult> {
  return http.post<WechatLoginResult>('/auth/wechat', { code })
}

/** 匿名登录 - 生产环境会被后端拒绝 */
export function anonymousLogin(): Promise<AnonymousLoginResult> {
  return http.post<AnonymousLoginResult>('/auth/token')
}

/** 验证当前 Token 是否有效 */
export function verifyToken(): Promise<VerifyTokenResult> {
  return http.get<VerifyTokenResult>('/auth/verify')
}

/** 查询认证服务状态（无需登录） */
export function getAuthStatus(): Promise<AuthStatusResult> {
  return http.get<AuthStatusResult>('/auth/status')
}
