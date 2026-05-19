import { request } from '@/utils/request'

/**
 * 图灵绘境 - API请求模块
 * 基于统一请求工具，提供业务API封装
 * 支持微信小程序和H5环境
 */

// 基础响应类型
export interface BaseResponse<T = any> {
  code: number
  message: string
  data: T
  success: boolean
  timestamp?: number
}

// 分页响应类型
export interface PageResponse<T = any> {
  list: T[]
  total: number
  page: number
  size: number
  pages: number
}

// 用户信息
export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

// 登录参数
export interface LoginParams {
  username?: string
  password?: string
  code?: string
  encryptedData?: string
  iv?: string
}

// 登录响应
export interface LoginResponse {
  token: string
  userInfo: UserInfo
  expiresIn: number
}

// 图像生成参数
export interface GenerateImageParams {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  steps?: number
  guidanceScale?: number
  sampler?: string
  seed?: number
  style?: string
}

// 图像信息
export interface ImageInfo {
  id: number
  url: string
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  steps: number
  guidanceScale: number
  sampler: string
  seed: number
  style?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

// 提示词信息
export interface PromptInfo {
  id: number
  content: string
  category?: string
  tags?: string[]
  usageCount: number
  createdAt: string
  updatedAt: string
}

// 社区作品
export interface CommunityWork {
  id: number
  imageUrl: string
  prompt: string
  author: UserInfo
  likes: number
  comments: number
  isLiked: boolean
  createdAt: string
}

// API客户端
class ApiClient {
  /**
   * 用户相关API
   */
  user = {
    /**
     * 用户登录
     */
    login: (params: LoginParams) => 
      request.post<LoginResponse>('/auth/login', params, { showLoading: true }),
    
    /**
     * 微信登录
     */
    wechatLogin: (code: string) => 
      request.post<LoginResponse>('/auth/wechat/login', { code }, { showLoading: true }),
    
    /**
     * 获取用户信息
     */
    getUserInfo: () => 
      request.get<UserInfo>('/user/info'),
    
    /**
     * 更新用户信息
     */
    updateUserInfo: (data: Partial<UserInfo>) => 
      request.put<UserInfo>('/user/info', data, { showLoading: true }),
    
    /**
     * 刷新Token
     */
    refreshToken: () => 
      request.post<LoginResponse>('/auth/refresh'),
    
    /**
     * 退出登录
     */
    logout: () => 
      request.post('/auth/logout')
  }

  /**
   * 图像相关API
   */
  image = {
    /**
     * 生成图像
     */
    generate: (params: GenerateImageParams) => 
      request.post<ImageInfo>('/image/generate', params, { 
        showLoading: true,
        timeout: 120000 // 使用配置的2分钟超时
      }),
    
    /**
     * 获取图像列表
     */
    getList: (params?: { page?: number; size?: number; status?: string }) => 
      request.get<PageResponse<ImageInfo>>('/image/list', params),
    
    /**
     * 获取图像详情
     */
    getDetail: (id: number) => 
      request.get<ImageInfo>(`/image/${id}`),
    
    /**
     * 删除图像
     */
    delete: (id: number) => 
      request.delete(`/image/${id}`, { showLoading: true }),
    
    /**
     * 上传图像
     */
    upload: (filePath: string, formData?: Record<string, any>) => 
      request.upload('/image/upload', {
        filePath,
        name: 'file',
        formData,
        showLoading: true
      })
  }

  /**
   * 提示词相关API
   */
  prompt = {
    /**
     * 获取提示词列表
     */
    getList: (params?: { page?: number; size?: number; category?: string }) => 
      request.get<PageResponse<PromptInfo>>('/prompt/list', params),
    
    /**
     * 获取推荐提示词
     */
    getRecommendations: () => 
      request.get<PromptInfo[]>('/prompt/recommendations'),
    
    /**
     * 搜索提示词
     */
    search: (keyword: string) => 
      request.get<PromptInfo[]>('/prompt/search', { keyword }),
    
    /**
     * 添加提示词
     */
    add: (content: string, category?: string, tags?: string[]) => 
      request.post<PromptInfo>('/prompt', { content, category, tags }, { showLoading: true }),
    
    /**
     * 更新提示词使用次数
     */
    incrementUsage: (id: number) => 
      request.put(`/prompt/${id}/usage`)
  }

  /**
   * 社区相关API
   */
  community = {
    /**
     * 获取社区作品列表
     */
    getWorks: (params?: { page?: number; size?: number; sort?: string }) => 
      request.get<PageResponse<CommunityWork>>('/community/works', params),
    
    /**
     * 发布作品
     */
    publish: (imageId: number, prompt?: string) => 
      request.post<CommunityWork>('/community/works', { imageId, prompt }, { showLoading: true }),
    
    /**
     * 点赞作品
     */
    like: (id: number) => 
      request.post(`/community/works/${id}/like`),
    
    /**
     * 取消点赞
     */
    unlike: (id: number) => 
      request.delete(`/community/works/${id}/like`),
    
    /**
     * 获取作品详情
     */
    getWorkDetail: (id: number) => 
      request.get<CommunityWork>(`/community/works/${id}`)
  }

  /**
   * 通知相关API
   */
  notification = {
    /**
     * 获取通知列表
     */
    getList: (params?: { page?: number; size?: number; type?: string }) => 
      request.get<PageResponse<any>>('/notification/list', params),
    
    /**
     * 标记通知为已读
     */
    markAsRead: (id: number) => 
      request.put(`/notification/${id}/read`),
    
    /**
     * 标记所有通知为已读
     */
    markAllAsRead: () => 
      request.put('/notification/read-all'),
    
    /**
     * 获取未读通知数量
     */
    getUnreadCount: () => 
      request.get<number>('/notification/unread-count')
  }

  /**
   * 系统相关API
   */
  system = {
    /**
     * 获取系统配置
     */
    getConfig: () => 
      request.get<any>('/system/config'),
    
    /**
     * 获取系统状态
     */
    getStatus: () => 
      request.get<any>('/system/status'),
    
    /**
     * 健康检查
     */
    healthCheck: () => 
      request.get<any>('/actuator/health')
  }
}

// 创建API客户端实例
const apiClient = new ApiClient()

// 导出API客户端
export default apiClient

// 导出类型定义
export type { 
  BaseResponse, 
  PageResponse, 
  UserInfo, 
  LoginParams, 
  LoginResponse,
  GenerateImageParams,
  ImageInfo,
  PromptInfo,
  CommunityWork
}