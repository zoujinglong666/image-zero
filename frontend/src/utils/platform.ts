import { config, configUtils } from '@/config'

/**
 * 图灵绘境 - 平台工具
 * 提供微信小程序和H5环境的兼容性处理
 */

// 平台检测
export const platformUtils = {
  /**
   * 是否为微信小程序
   */
  isWechat: (): boolean => {
    // #ifdef MP-WEIXIN
    return true
    // #endif
    return false
  },

  /**
   * 是否为H5
   */
  isH5: (): boolean => {
    // #ifdef H5
    return true
    // #endif
    return false
  },

  /**
   * 是否为APP
   */
  isApp: (): boolean => {
    // #ifdef APP-PLUS
    return true
    // #endif
    return false
  },

  /**
   * 获取平台名称
   */
  getPlatformName: (): string => {
    if (platformUtils.isWechat()) return 'wechat'
    if (platformUtils.isH5()) return 'h5'
    if (platformUtils.isApp()) return 'app'
    return 'unknown'
  }
}

// 微信小程序专用工具
export const wechatUtils = {
  /**
   * 获取微信用户信息
   */
  getUserProfile: (): Promise<any> => {
    return new Promise((resolve, reject) => {
      // #ifdef MP-WEIXIN
      uni.getUserProfile({
        desc: '用于完善用户资料',
        success: resolve,
        fail: reject
      })
      // #endif
      
      // #ifndef MP-WEIXIN
      reject(new Error('非微信小程序环境'))
      // #endif
    })
  },

  /**
   * 微信登录
   */
  login: (): Promise<string> => {
    return new Promise((resolve, reject) => {
      // #ifdef MP-WEIXIN
      uni.login({
        provider: 'weixin',
        success: (res) => resolve(res.code),
        fail: reject
      })
      // #endif
      
      // #ifndef MP-WEIXIN
      reject(new Error('非微信小程序环境'))
      // #endif
    })
  },

  /**
   * 微信分享
   */
  share: (options: {
    title?: string
    path?: string
    imageUrl?: string
    query?: Record<string, any>
  } = {}): void => {
    // #ifdef MP-WEIXIN
    // 设置默认分享信息
    const defaultOptions = {
      title: config.name,
      path: '/pages/index/index',
      imageUrl: '/static/logo.png',
      ...options
    }
    
    // 处理查询参数
    if (options.query && Object.keys(options.query).length > 0) {
      const queryString = Object.entries(options.query)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')
      defaultOptions.path += (defaultOptions.path.includes('?') ? '&' : '?') + queryString
    }
    
    // 监听分享事件
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    // 设置分享内容
    uni.onShareAppMessage(() => defaultOptions)
    uni.onShareTimeline(() => defaultOptions)
    // #endif
  },

  /**
   * 检查微信会话是否有效
   */
  checkSession: (): Promise<boolean> => {
    return new Promise((resolve) => {
      // #ifdef MP-WEIXIN
      uni.checkSession({
        success: () => resolve(true),
        fail: () => resolve(false)
      })
      // #endif
      
      // #ifndef MP-WEIXIN
      resolve(false)
      // #endif
    })
  }
}

// H5专用工具
export const h5Utils = {
  /**
   * 检查是否为移动设备
   */
  isMobile: (): boolean => {
    // #ifdef H5
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    // #endif
    return false
  },

  /**
   * 检查是否为微信浏览器
   */
  isWechatBrowser: (): boolean => {
    // #ifdef H5
    return /MicroMessenger/i.test(navigator.userAgent)
    // #endif
    return false
  },

  /**
   * 复制到剪贴板
   */
  copyToClipboard: (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // #ifdef H5
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(resolve).catch(reject)
      } else {
        // 兼容旧版浏览器
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          resolve()
        } catch (err) {
          reject(err)
        } finally {
          document.body.removeChild(textarea)
        }
      }
      // #endif
      
      // #ifndef H5
      reject(new Error('非H5环境不支持剪贴板操作'))
      // #endif
    })
  },

  /**
   * 获取URL参数
   */
  getUrlParams: (): Record<string, string> => {
    // #ifdef H5
    const params: Record<string, string> = {}
    const searchParams = new URLSearchParams(window.location.search)
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    return params
    // #endif
    return {}
  },

  /**
   * 设置页面标题
   */
  setPageTitle: (title: string): void => {
    // #ifdef H5
    document.title = title
    // #endif
  }
}

// 存储工具（跨平台兼容）
export const storageUtils = {
  /**
   * 设置存储
   */
  set: (key: string, value: any, expires?: number): void => {
    try {
      const data = {
        value,
        expires: expires ? Date.now() + expires : null,
        timestamp: Date.now()
      }
      const storageKey = configUtils.getStorageKey(key)
      
      // #ifdef MP-WEIXIN
      uni.setStorageSync(storageKey, JSON.stringify(data))
      // #endif
      
      // #ifdef H5
      localStorage.setItem(storageKey, JSON.stringify(data))
      // #endif
    } catch (error) {
      console.error('存储失败:', error)
    }
  },

  /**
   * 获取存储
   */
  get: (key: string): any => {
    try {
      const storageKey = configUtils.getStorageKey(key)
      let dataStr: string | null = null
      
      // #ifdef MP-WEIXIN
      dataStr = uni.getStorageSync(storageKey)
      // #endif
      
      // #ifdef H5
      dataStr = localStorage.getItem(storageKey)
      // #endif
      
      if (!dataStr) return null
      
      const data = JSON.parse(dataStr)
      
      // 检查是否过期
      if (data.expires && Date.now() > data.expires) {
        storageUtils.remove(key)
        return null
      }
      
      return data.value
    } catch (error) {
      console.error('读取存储失败:', error)
      return null
    }
  },

  /**
   * 删除存储
   */
  remove: (key: string): void => {
    try {
      const storageKey = configUtils.getStorageKey(key)
      
      // #ifdef MP-WEIXIN
      uni.removeStorageSync(storageKey)
      // #endif
      
      // #ifdef H5
      localStorage.removeItem(storageKey)
      // #endif
    } catch (error) {
      console.error('删除存储失败:', error)
    }
  },

  /**
   * 清空存储
   */
  clear: (): void => {
    try {
      // #ifdef MP-WEIXIN
      uni.clearStorageSync()
      // #endif
      
      // #ifdef H5
      localStorage.clear()
      // #endif
    } catch (error) {
      console.error('清空存储失败:', error)
    }
  }
}

// 导出工具
export default {
  platformUtils,
  wechatUtils,
  h5Utils,
  storageUtils
}