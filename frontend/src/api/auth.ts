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
 *  微信登录 / H5网页授权 / 游客登录 / Token 验证
 * ════════════════════════════════════════════
 */

/**
 * 微信小程序登录
 * 1. 调用 wx.login() 获取 code
 * 2. 将 code + inviteCode 发送到后端 /auth/wechat
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

  // 携带邀请码（如果有）
  const inviteCode = uni.getStorageSync('pending_invite_code') || ''
  if (inviteCode) {
    uni.removeStorageSync('pending_invite_code')
  }

  return http.post<WechatLoginResult>('/auth/wechat', { code: loginRes.code, inviteCode })
  // #endif

  // #ifndef MP-WEIXIN
  throw new Error('当前环境不支持微信登录，请在微信小程序中使用')
  // #endif
}

/** 手动传入 code 的微信登录（调试用） */
export function wechatLoginWithCode(code: string): Promise<WechatLoginResult> {
  const inviteCode = uni.getStorageSync('pending_invite_code') || ''
  if (inviteCode) {
    uni.removeStorageSync('pending_invite_code')
  }
  return http.post<WechatLoginResult>('/auth/wechat', { code, inviteCode })
}

// ════════════════════════════════════════════
//  微信公众号H5网页授权登录
// ════════════════════════════════════════════

/**
 * 获取微信公众号H5网页授权URL
 * 前端获取此URL后，在微信浏览器中重定向过去
 * 用户同意后，微信回调到 redirectUri 并携带 code 和 state 参数
 *
 * @param redirectUri 授权后回调地址（前端页面URL）
 * @param scope snsapi_base（静默）或 snsapi_userinfo（需确认）
 * @param state 防CSRF参数（可选，自动生成）
 */
export async function getWechatH5AuthUrl(
  redirectUri: string,
  scope?: 'snsapi_base' | 'snsapi_userinfo',
  state?: string,
): Promise<{ url: string }> {
  return http.get<{ url: string }>('/auth/wechat-h5/url', {
    redirectUri,
    ...(scope && { scope }),
    ...(state && { state }),
  })
}

/**
 * 微信公众号H5网页授权登录
 * 微信回调后前端拿到code，发送到此接口换取JWT
 *
 * @param code 微信OAuth2回调返回的授权code
 */
export function wechatH5Login(code: string): Promise<WechatLoginResult> {
  return http.post<WechatLoginResult>('/auth/wechat-h5', { code })
}

// ════════════════════════════════════════════
//  游客登录（非微信环境）
// ════════════════════════════════════════════

/**
 * 游客登录 — 非微信环境（普通浏览器/PC）下使用
 * 功能受限：不能VIP支付，每日额度更少
 */
export function guestLogin(): Promise<AnonymousLoginResult> {
  return http.post<AnonymousLoginResult>('/auth/guest')
}

/** 匿名登录 - 向后兼容，已废弃，请使用 guestLogin */
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
