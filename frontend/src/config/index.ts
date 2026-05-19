 * 图灵绘境 - 前端配置中心
 * 统一管理平台配置，支持微信小程序和H5环境
 */

// 环境类型
export type Environment = 'development' | 'test' | 'production'

// 平台类型
export type Platform = 'wechat' | 'h5' | 'app'

// 配置接口
export interface AppConfig {
  // 基础配置
  name: string
  version: string
  environment: Environment
  platform: Platform
  
  // API配置
  api: {
    baseUrl: string
    timeout: number
    retryCount: number
    enableMock: boolean
  }
  
  // 微信小程序配置
  wechat: {
    appId: string
    enableWechatLogin: boolean
    enableWechatShare: boolean
  }
  
  // 存储配置
  storage: {
    prefix: string
    enableEncryption: boolean
  }
  
  // 功能开关
  features: {
    enableAnalytics: boolean
    enableErrorTracking: boolean
    enablePerformanceMonitoring: boolean
  }
  
  // 性能优化
  performance: {
    enableImageCompression: boolean
    enableLazyLoading: boolean
    enableCache: boolean
  }
}

// 获取当前环境
const getEnvironment = (): Environment => {
  // #ifdef H5
  const hostname = window.location.hostname
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development'
  }
  if (hostname.includes('test') || hostname.includes('staging')) {
    return 'test'
  }
  return 'production'
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序环境判断
  const accountInfo = uni.getAccountInfoSync()
  const envVersion = accountInfo.miniProgram.envVersion
  switch (envVersion) {
    case 'develop':
      return 'development'
    case 'trial':
      return 'test'
    default:
      return 'production'
  }
  // #endif
  
  // #ifdef APP-PLUS
  return 'production'
  // #endif
}

// 获取当前平台
const getPlatform = (): Platform => {
  // #ifdef MP-WEIXIN
  return 'wechat'
  // #endif
  
  // #ifdef H5
  return 'h5'
  // #endif
  
  // #ifdef APP-PLUS
  return 'app'
  // #endif
  
  return 'h5'
}

// 获取API基础URL
const getApiBaseUrl = (): string => {
  // 优先使用环境变量
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    return envUrl
  }
  
  // 根据环境自动判断
  const env = getEnvironment()
  const platform = getPlatform()
  
  // #ifdef MP-WEIXIN
  // 微信小程序必须使用HTTPS和备案域名
  switch (env) {
    case 'development':
      return 'https://dev-api.image-zero.art/api'
    case 'test':
      return 'https://test-api.image-zero.art/api'
    default:
      return 'https://api.image-zero.art/api'
  }
  // #endif
  
  // #ifdef H5
  // H5可以根据当前域名判断
  const hostname = window.location.hostname
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return '/api' // 开发环境使用代理
  }
  switch (env) {
    case 'development':
      return 'https://dev-api.image-zero.art/api'
    case 'test':
      return 'https://test-api.image-zero.art/api'
    default:
      return 'https://api.image-zero.art/api'
  }
  // #endif
  
  return 'https://api.image-zero.art/api'
}

// 获取微信小程序AppId
const getWechatAppId = (): string => {
  // #ifdef MP-WEIXIN
  const accountInfo = uni.getAccountInfoSync()
  return accountInfo.miniProgram.appId || ''
  // #endif
  return ''
}

// 创建配置
const createConfig = (): AppConfig => {
  const env = getEnvironment()
  const platform = getPlatform()
  
  return {
    // 基础配置
    name: import.meta.env.VITE_APP_NAME || '图灵绘境',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: env,
    platform,
    
    // API配置
    api: {
      baseUrl: getApiBaseUrl(),
      timeout: 120000, // 2分钟，适应图像生成等耗时操作
      retryCount: 3,
      enableMock: env === 'development' && platform === 'h5',
    },
    
    // 微信小程序配置
    wechat: {
      appId: getWechatAppId(),
      enableWechatLogin: true,
      enableWechatShare: true,
    },
    
    // 存储配置
    storage: {
      prefix: 'turing_drawing_',
      enableEncryption: env === 'production',
    },
    
    // 功能开关
    features: {
      enableAnalytics: env === 'production',
      enableErrorTracking: env === 'production',
      enablePerformanceMonitoring: env === 'production',
    },
    
    // 性能优化
    performance: {
      enableImageCompression: true,
      enableLazyLoading: true,
      enableCache: platform !== 'wechat', // 微信小程序有自己的缓存机制
    },
  }
}

// 全局配置实例
export const config = createConfig()

// 配置工具函数
export const configUtils = {
  // 判断是否为开发环境
  isDev: (): boolean => config.environment === 'development',
  
  // 判断是否为生产环境
  isProd: (): boolean => config.environment === 'production',
  
  // 判断是否为微信小程序
  isWechat: (): boolean => config.platform === 'wechat',
  
  // 判断是否为H5
  isH5: (): boolean => config.platform === 'h5',
  
  // 获取完整API URL
  getFullApiUrl: (path: string): string => {
    const baseUrl = config.api.baseUrl
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}${cleanPath}`
  },
  
  // 获取存储键名
  getStorageKey: (key: string): string => {
    return `${config.storage.prefix}${key}`
  },
  
  // 更新配置（主要用于动态调整）
  updateConfig: (updates: Partial<AppConfig>): void => {
    Object.assign(config, updates)
  },
}

export default config