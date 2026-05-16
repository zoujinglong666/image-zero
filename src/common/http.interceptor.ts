import type { RequestConfig, RequestInterceptor, RequestMeta, RequestOptions } from 'uview-pro'

/**
 * ════════════════════════════════════════════════════
 *  图灵绘境 - 全局 HTTP 请求配置 & 拦截器
 *  基于 uView Pro http 模块 · 全平台统一
 *
 *  约定：
 *  - VITE_API_BASE_URL 包含 /api，如 https://api.your-domain.com/api
 *  - 请求路径不含 /api 前缀，如 /analyze, /auth/wechat
 *  - 后端统一响应格式: { code: number, data?: any, message: string }
 *    成功: { code: 0, data: {...}, message: '操作成功' }
 *    失败: { code: <HTTP状态码>, data: null, message: '错误描述' }
 * ════════════════════════════════════════════════════
 */

// ─── 错误码 → 友好中文映射 ────────────────────────
const ERROR_MAP: Record<number, string> = {
  400: '请求参数有误',
  401: '身份验证已过期，请重新登录',
  403: '没有操作权限',
  404: '接口不存在或已下线',
  408: '请求超时，请检查网络连接',
  413: '图片文件太大，请压缩后重试',
  422: '数据格式不正确',
  429: '⏰ 操作过于频繁，请稍后再试',
  500: '服务器内部错误，请稍后重试',
  502: '网关异常，服务暂时不可用',
  503: '🔧 服务繁忙中，请等待片刻后重试',
  504: '⏱️ 处理超时，可能是网络拥堵或图片过大',
}

/** 解析错误信息 → 返回用户友好的中文提示 */
export function getFriendlyError(err: any): string {
  // 1. 匹配数字错误码（HTTP 状态码）
  if (typeof err.code === 'number' && ERROR_MAP[err.code]) {
    return ERROR_MAP[err.code]
  }
  // 2. 匹配状态码
  if (err.status || err.statusCode) {
    const code = err.status || err.statusCode
    return ERROR_MAP[code] || `请求失败 (${code})`
  }
  // 3. 匹配消息关键词
  const msg = (err.message || err.msg || '').toLowerCase()
  if (msg.includes('timeout') || msg.includes('超时')) return ERROR_MAP[408]
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) return '网络连接失败，请检查网络后重试'
  if (msg.includes('429') || msg.includes('rate') || msg.includes('limit') || msg.includes('频繁')) return ERROR_MAP[429]
  if (msg.includes('busy') || msg.includes('繁忙')) return ERROR_MAP[503]
  // 4. 原始消息（截断，避免暴露技术细节）
  const raw = err.message || '操作失败，请重试'
  return raw.length > 40 ? raw.slice(0, 40) + '...' : raw
}

// ─── Token ──────────────────────────────────────────
const getToken = () => uni?.getStorageSync('token') || ''

// ─── 后端地址 ──────────────────────────────────────
// 生产环境必须通过 VITE_API_BASE_URL 配置域名，不再提供硬编码 fallback
const baseUrl = import.meta.env.VITE_API_BASE_URL || ''

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
      const tip = ERROR_MAP[408]
      meta.toast && showToast(tip, 'none')
      throw { code: 408, message: tip, status: 408 }
    }
    if (errMsg?.includes('request:fail')) {
      const tip = '网络连接失败，请检查网络后重试'
      meta.toast && showToast(tip, 'none')
      throw { code: 0, message: tip, status: 0 }
    }

    // ── HTTP 状态码错误 ──
    if (!(statusCode >= 200 && statusCode < 300)) {
      const json = rawData || {}
      const bizCode = json.code || statusCode
      const tip = ERROR_MAP[bizCode] || json.message || `请求失败 (${statusCode})`

      // 401 → 清除 Token
      if (statusCode === 401) {
        uni.removeStorageSync('token')
        meta.toast && showToast('登录已过期，请重新登录', 'none')
      } else {
        meta.toast && showToast(tip, 'none')
      }

      throw {
        status: statusCode,
        code: bizCode,
        message: tip,
      }
    }

    // ── 业务错误（code !== 0）──
    if (rawData && rawData.code !== undefined && rawData.code !== 0) {
      const bizCode = rawData.code
      const bizMsg = rawData.message || '操作失败'
      const tip = ERROR_MAP[bizCode] || bizMsg

      meta.toast && showToast(tip, 'none')
      throw {
        status: statusCode,
        code: bizCode,
        message: tip,
      }
    }

    // ── 成功：返回 data 字段 ──
    // 统一格式 { code: 0, data, message } → 返回 data
    if (rawData && rawData.code === 0) {
      return rawData.data !== undefined ? rawData.data : rawData
    }

    // 兼容无 code 字段的非标准接口
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
