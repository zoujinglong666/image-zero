import { config, configUtils } from '@/config'
import { getFriendlyError } from '@/common/http.interceptor'

/**
 * 图灵绘境 - 统一请求工具
 * 基于uView Pro HTTP模块，支持微信小程序和H5环境
 * 提供跨平台兼容、错误处理、重试机制等功能
 */

// 请求选项
export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  params?: Record<string, any>
  headers?: Record<string, string>
  timeout?: number
  retryCount?: number
  showLoading?: boolean
  showToast?: boolean
  originalData?: boolean
}

// 响应数据
export interface ResponseData<T = any> {
  code: number
  message: string
  data: T
  success: boolean
}

// 请求实例
class RequestManager {
  private retryCount: number = 0
  private maxRetries: number = config.api.retryCount

  /**
   * 发送请求
   */
  async request<T = any>(options: RequestOptions): Promise<T> {
    const {
      url,
      method = 'GET',
      data,
      params,
      headers = {},
      timeout = config.api.timeout, // 默认使用配置的2分钟超时
      retryCount = this.maxRetries,
      showLoading = false,
      showToast = true,
      originalData = false
    } = options

    // 构建完整URL
    let fullUrl = configUtils.getFullApiUrl(url)
    
    // 处理查询参数
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString()
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString
    }

    // 显示加载提示
    if (showLoading) {
      uni.showLoading({
        title: '加载中...',
        mask: true
      })
    }

    try {
      // 根据平台选择请求方式
      let response: any
      
      // #ifdef MP-WEIXIN
      // 微信小程序使用uni.request
      response = await this.wxRequest({
        url: fullUrl,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout
      })
      // #endif
      
      // #ifdef H5
      // H5使用fetch
      response = await this.h5Request({
        url: fullUrl,
        method,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout
      })
      // #endif

      // 隐藏加载提示
      if (showLoading) {
        uni.hideLoading()
      }

      // 处理响应数据
      const result = await this.handleResponse(response, showToast)
      
      // 返回原始数据或业务数据
      return originalData ? result : result.data
    } catch (error) {
      // 隐藏加载提示
      if (showLoading) {
        uni.hideLoading()
      }

      // 处理错误
      const friendlyError = getFriendlyError(error)
      
      if (showToast) {
        uni.showToast({
          title: friendlyError,
          icon: 'none',
          duration: 2000
        })
      }

      // 重试机制
      if (this.retryCount < retryCount) {
        this.retryCount++
        console.log(`请求重试 ${this.retryCount}/${retryCount}`)
        await this.delay(1000 * this.retryCount) // 指数退避
        return this.request(options)
      }

      throw error
    } finally {
      this.retryCount = 0
    }
  }

  /**
   * 微信小程序请求
   */
  private wxRequest(options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      uni.request({
        ...options,
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      })
    })
  }

  /**
   * H5请求
   */
  private async h5Request(options: any): Promise<any> {
    const { url, method, data, headers, timeout } = options
    
    // 创建AbortController用于超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      
      return {
        statusCode: response.status,
        data: responseData,
        errMsg: response.ok ? 'request:ok' : 'request:fail'
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * 处理响应数据
   */
  private handleResponse(response: any, showToast: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      const { statusCode, data, errMsg } = response

      // 网络错误
      if (errMsg && errMsg.includes('request:fail')) {
        reject(new Error('网络连接失败'))
        return
      }

      // HTTP状态码错误
      if (!(statusCode >= 200 && statusCode < 300)) {
        reject(new Error(`HTTP ${statusCode}`))
        return
      }

      // 业务错误
      if (data && data.code !== undefined && data.code !== 0) {
        if (showToast) {
          uni.showToast({
            title: data.message || '操作失败',
            icon: 'none'
          })
        }
        reject(new Error(data.message || '业务处理失败'))
        return
      }

      // 成功
      resolve(data)
    })
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * GET请求
   */
  get<T = any>(url: string, params?: Record<string, any>, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<T> {
    return this.request<T>({
      url,
      method: 'GET',
      params,
      ...options
    })
  }

  /**
   * POST请求
   */
  post<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<T> {
    return this.request<T>({
      url,
      method: 'POST',
      data,
      ...options
    })
  }

  /**
   * PUT请求
   */
  put<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<T> {
    return this.request<T>({
      url,
      method: 'PUT',
      data,
      ...options
    })
  }

  /**
   * DELETE请求
   */
  delete<T = any>(url: string, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<T> {
    return this.request<T>({
      url,
      method: 'DELETE',
      ...options
    })
  }

  /**
   * 上传文件
   */
  async uploadFile(options: {
    url: string
    filePath: string
    name?: string
    formData?: Record<string, any>
    headers?: Record<string, string>
    showLoading?: boolean
    showToast?: boolean
  }): Promise<any> {
    const {
      url,
      filePath,
      name = 'file',
      formData = {},
      headers = {},
      showLoading = true,
      showToast = true
    } = options

    if (showLoading) {
      uni.showLoading({
        title: '上传中...',
        mask: true
      })
    }

    try {
      // 根据平台选择上传方式
      let result: any
      
      // #ifdef MP-WEIXIN
      result = await new Promise((resolve, reject) => {
        uni.uploadFile({
          url: configUtils.getFullApiUrl(url),
          filePath,
          name,
          formData,
          header: headers,
          success: (res) => {
            try {
              const data = JSON.parse(res.data)
              resolve(data)
            } catch {
              resolve(res.data)
            }
          },
          fail: reject
        })
      })
      // #endif
      
      // #ifdef H5
      const formDataObj = new FormData()
      formDataObj.append(name, filePath)
      Object.keys(formData).forEach(key => {
        formDataObj.append(key, formData[key])
      })
      
      const response = await fetch(configUtils.getFullApiUrl(url), {
        method: 'POST',
        body: formDataObj,
        headers
      })
      
      result = await response.json()
      // #endif

      if (showLoading) {
        uni.hideLoading()
      }

      if (result.code !== undefined && result.code !== 0) {
        if (showToast) {
          uni.showToast({
            title: result.message || '上传失败',
            icon: 'none'
          })
        }
        throw new Error(result.message || '上传失败')
      }

      return result.data || result
    } catch (error) {
      if (showLoading) {
        uni.hideLoading()
      }
      
      const friendlyError = getFriendlyError(error)
      if (showToast) {
        uni.showToast({
          title: friendlyError,
          icon: 'none'
        })
      }
      throw error
    }
  }
}

// 创建请求实例
const requestManager = new RequestManager()

// 导出请求方法
export const request = {
  get: requestManager.get.bind(requestManager),
  post: requestManager.post.bind(requestManager),
  put: requestManager.put.bind(requestManager),
  delete: requestManager.delete.bind(requestManager),
  upload: requestManager.uploadFile.bind(requestManager),
  request: requestManager.request.bind(requestManager)
}

// 默认导出
export default requestManager