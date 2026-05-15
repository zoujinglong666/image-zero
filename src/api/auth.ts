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
 *  跨平台兼容：uni.request 替代 fetch
 * ══════════════════════════════════════════
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// ══════════════════════════════════════════
//  底层请求封装（uni.request 跨平台）
// ══════════════════════════════════════════

interface UniRequestResult {
  statusCode: number
  data: any
}

function uniRequest(options: UniApp.RequestOptions): Promise<UniRequestResult> {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      success: (res) => {
        resolve({
          statusCode: res.statusCode || 0,
          data: res.data,
        })
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

async function authRequest<T>(path: string, method: 'GET' | 'POST' = 'POST', body?: any): Promise<T> {
  const token = uni?.getStorageSync('token') || ''
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) header['Authorization'] = `Bearer ${token}`

  const res = await uniRequest({
    url: `${API_BASE}${path}`,
    method: method as any,
    data: body,
    header,
    timeout: 15_000,
  })

  const json = res.data

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw {
      status: res.statusCode,
      code: json?.code || res.statusCode,
      message: json?.error || json?.message || `请求失败 (${res.statusCode})`,
    }
  }

  return json as T
}

// ══════════════════════════════════════════
//  微信小程序登录
// ══════════════════════════════════════════

/**
 * 微信登录完整流程
 * 1. 调用 wx.login() 获取 code
 * 2. 将 code 发送到后端 /api/auth/wechat
 * 3. 后端 code2Session 换取 openid → JWT
 */
export async function wechatLogin(): Promise<WechatLoginResult> {
  // #ifdef MP-WEIXIN
  // 微信小程序环境：调用 uni.login 获取 code
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

  const result = await authRequest<WechatLoginResult>('/api/auth/wechat', 'POST', {
    code: loginRes.code,
  })

  return result
  // #endif

  // #ifndef MP-WEIXIN
  // 非微信环境：提示不支持
  throw new Error('当前环境不支持微信登录，请在微信小程序中使用')
  // #endif
}

/**
 * 手动传入 code 的微信登录（用于调试或其他场景）
 */
export async function wechatLoginWithCode(code: string): Promise<WechatLoginResult> {
  return authRequest<WechatLoginResult>('/api/auth/wechat', 'POST', { code })
}

// ══════════════════════════════════════════
//  匿名登录（仅开发环境）
// ══════════════════════════════════════════

/**
 * 匿名登录 - 生产环境会被后端拒绝
 */
export async function anonymousLogin(): Promise<AnonymousLoginResult> {
  return authRequest<AnonymousLoginResult>('/api/auth/token', 'POST')
}

// ══════════════════════════════════════════
//  Token 验证
// ══════════════════════════════════════════

/**
 * 验证当前 Token 是否有效
 */
export async function verifyToken(): Promise<VerifyTokenResult> {
  return authRequest<VerifyTokenResult>('/api/auth/verify', 'GET')
}

// ══════════════════════════════════════════
//  认证服务状态
// ══════════════════════════════════════════

/**
 * 查询认证服务状态（无需登录）
 */
export async function getAuthStatus(): Promise<AuthStatusResult> {
  const res = await uniRequest({
    url: `${API_BASE}/api/auth/status`,
    method: 'GET',
    timeout: 10_000,
  })
  return res.data as AuthStatusResult
}