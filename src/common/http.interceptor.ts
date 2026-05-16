import type { RequestConfig, RequestInterceptor, RequestMeta, RequestOptions } from 'uview-pro'

/**
 * ════════════════════════════════════════════════════
 *  图灵绘境 - 全局 HTTP 请求配置 & 拦截器
 *  基于 uView Pro http 模块 · 全平台统一
 *
 *  约定：
 *  - VITE_API_BASE_URL 包含 /api，如 http://43.138.156.217/api
 *  - 请求路径不含 /api 前缀，如 /analyze, /auth/wechat
 *  - 后端响应格式: { success: boolean, data?: any, error?: string, code?: string }
 * ════════════════════════════════════════════════════
 */

// ─── 错误码 → 友好中文映射 ────────────────────────
const ERROR_MAP: Record<number | string, string> = {
  400: '请求参数有误',
  401: '身份验证已过期，请重新登录',
  403: '没有操作权限',
  404: '接口不存在或已下线',
  413: '图片文件太大，请压缩后重试',
  422: '数据格式不正确',
  429: '⏰ 操作过于频繁，请稍后再试',
  500: '服务器内部错误，请稍后重试',
  502: '网关异常，AI 服务暂时不可用',
  503: '🔧 服务繁忙中，请等待片刻后重试',
  504: '⏱️ 处理超时，可能是网络拥堵或图片过大',
  // 业务错误码
  REQUEST_TIMEOUT: '请求超时，请检查网络连接',
  RATE_LIMITED: '操作太频繁了，休息一下再来吧~',
  CIRCUIT_OPEN: 'AI 服务正在恢复中，请 45 秒后重试',
  QUOTA_EXCEEDED: '免费额度已用完，明天再试试吧',
  IMAGE_TOO_LARGE: '图片太大了，建议压缩到 5MB 以内',
  INVALID_IMAGE: '无法识别的图片格式，请使用 JPG/PNG/WebP',
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
}

/** 解析错误信息 → 返回用户友好的中文提示 */
export function getFriendlyError(err: any): string {
  // 1. 匹配状态码
  if (err.status || err.statusCode) {
    const code = err.status || err.statusCode
    return ERROR_MAP[code] || `请求失败 (${code})`
  }
  // 2. 匹配业务错误码
  if (err.code && ERROR_MAP[err.code]) {
    return ERROR_MAP[err.code]
  }
  // 3. 匹配消息关键词
  const msg = (err.message || err.msg || '').toLowerCase()
  if (msg.includes('timeout') || msg.includes('超时')) return ERROR_MAP.REQUEST_TIMEOUT
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) return ERROR_MAP.NETWORK_ERROR
  if (msg.includes('429') || msg.includes('rate') || msg.includes('limit')) return ERROR_MAP[429]
  if (msg.includes('quota') || msg.includes('insufficient')) return ERROR_MAP.QUOTA_EXCEEDED
  if (msg.includes('circuit') || msg.includes('熔断')) return ERROR_MAP.CIRCUIT_OPEN
  // 4. 原始消息
  const raw = err.message || err.error || '未知错误'
  return raw.length > 60 ? raw.slice(0, 60) + '...' : raw
}

// ─── Token ──────────────────────────────────────────
const getToken = () => uni?.getStorageSync('token') || ''

// ─── 后端地址 ──────────────────────────────────────
// Nginx 需配置: proxy_pass http://127.0.0.1:3000; (不带尾部斜杠)
// 这样 /api/xxx → 后端收到 /api/xxx，路径一一对应
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://43.138.156.217/api'

// ─── 全局配置 ──────────────────────────────────────
const httpRequestConfig: RequestConfig = {
  baseUrl,
  header: {
    'content-type': 'application/json',
  },
  timeout: 30_000, // 默认 30s，AI 接口可单次覆盖
  meta: {
    originalData: true, // 拦截器返回原始响应，自行解析
    toast: false,       // 默认不弹 toast，按需开启
    loading: false,     // 默认不弹 loading，按需开启
  },
}

// ─── 请求/响应拦截器 ───────────────────────────────
const httpInterceptor: RequestInterceptor = {
  request: (config: RequestOptions) => {
    const meta: RequestMeta = config.meta || {}

    // 注入 Token
    const token = getToken()
    if (token) {
      config.header.Authorization = `Bearer ${token}`
    }

    // Loading
    if (meta.loading) {
      uni.showLoading({ title: '加载中...', mask: true })
    }

    return config
  },

  response: async (response: any) => {
    const meta: RequestMeta = response.config?.meta || {}

    // 隐藏 Loading
    if (meta.loading) {
      uni.hideLoading()
    }

    const { statusCode, data: rawData, errMsg } = response as any

    // ── 网络层错误 ──
    if (errMsg?.includes('timeout') || errMsg?.includes('request:fail timeout')) {
      const tip = ERROR_MAP.REQUEST_TIMEOUT
      meta.toast && showToast(tip, 'none')
      throw { code: 'REQUEST_TIMEOUT', message: tip, status: 408 }
    }
    if (errMsg?.includes('request:fail')) {
      const tip = ERROR_MAP.NETWORK_ERROR
      meta.toast && showToast(tip, 'none')
      throw { code: 'NETWORK_ERROR', message: tip, status: 0 }
    }

    // ── HTTP 状态码错误 ──
    if (!(statusCode >= 200 && statusCode < 300)) {
      const json = rawData || {}
      const tip = ERROR_MAP[statusCode] || json.error || `请求失败 (${statusCode})`

      // 401 → 清除 Token
      if (statusCode === 401) {
        uni.removeStorageSync('token')
        meta.toast && showToast('登录已过期，请重新登录', 'none')
      } else {
        meta.toast && showToast(tip, 'none')
      }

      throw {
        status: statusCode,
        code: json.code || statusCode,
        message: tip,
        detail: json,
      }
    }

    // ── 业务错误（success: false）──
    if (rawData && typeof rawData.success === 'boolean' && !rawData.success) {
      const bizCode = rawData.code || 'BIZ_ERROR'
      const bizMsg = rawData.error || rawData.message || '操作失败'
      const tip = ERROR_MAP[bizCode] || bizMsg

      meta.toast && showToast(tip, 'none')
      throw {
        status: statusCode,
        code: bizCode,
        message: tip,
        detail: rawData,
      }
    }

    // ── 成功：返回 data 字段 ──
    // 如果响应有 success 字段，返回 data 属性（业务载荷）
    // 否则返回整个 rawData（兼容 /auth/status 等非标准接口）
    if (rawData && typeof rawData.success === 'boolean') {
      return rawData.data !== undefined ? rawData.data : rawData
    }
    return rawData
  },
}

// ─── Toast 工具 ─────────────────────────────────────
function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  if (!title) return
  uni.showToast({
    title,
    icon: title.length > 7 ? 'none' : icon,
    duration: 2000,
  })
}

// ─── 导出 ──────────────────────────────────────────
export { httpInterceptor, httpRequestConfig, ERROR_MAP }
