 * 图灵绘境 - 工具函数集合
 * 提供常用工具函数，支持微信小程序和H5环境
 */

import { config, configUtils } from '@/config'
import { platformUtils, wechatUtils, h5Utils, storageUtils } from '@/utils/platform'

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function(this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func.apply(this, args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(later, wait)
    
    if (callNow) {
      func.apply(this, args)
    }
  }
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时间
export function formatTime(timestamp: number | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

// 深拷贝
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj) as any
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any
  if (typeof obj === 'object') {
    const clonedObj = {} as any
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

// 数组去重
export function uniqueArray<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

// 对象合并
export function mergeObjects<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = mergeObjects(result[key] || {}, source[key] as any)
      } else {
        result[key] = source[key] as any
      }
    }
  }
  return result
}

// 获取UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证手机号格式
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 验证URL格式
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 获取图片尺寸
export function getImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.getImageInfo({
      src: url,
      success: (res) => {
        resolve({
          width: res.width,
          height: res.height
        })
      },
      fail: reject
    })
    // #endif
    
    // #ifdef H5
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      })
    }
    img.onerror = reject
    img.src = url
    // #endif
    
    // #ifndef MP-WEIXIN
    // #ifndef H5
    reject(new Error('不支持的平台'))
    // #endif
    // #endif
  })
}

// 压缩图片
export function compressImage(filePath: string, quality: number = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.compressImage({
      src: filePath,
      quality: Math.round(quality * 100),
      success: (res) => resolve(res.tempFilePath),
      fail: reject
    })
    // #endif
    
    // #ifdef H5
    // H5环境使用Canvas压缩
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'))
        return
      }
      
      // 计算压缩后的尺寸
      const maxSize = 1920
      let { width, height } = img
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      ctx.drawImage(img, 0, 0, width, height)
      
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedDataUrl)
    }
    img.onerror = reject
    img.src = filePath
    // #endif
    
    // #ifndef MP-WEIXIN
    // #ifndef H5
    reject(new Error('不支持的平台'))
    // #endif
    // #endif
  })
}

// 下载文件
export function downloadFile(url: string, fileName?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          uni.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: resolve,
            fail: reject
          })
        } else {
          reject(new Error('下载失败'))
        }
      },
      fail: reject
    })
    // #endif
    
    // #ifdef H5
    const link = document.createElement('a')
    link.href = url
    link.download = fileName || url.split('/').pop() || 'download'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    resolve()
    // #endif
    
    // #ifndef MP-WEIXIN
    // #ifndef H5
    reject(new Error('不支持的平台'))
    // #endif
    // #endif
  })
}

// 导出所有工具
export {
  platformUtils,
  wechatUtils,
  h5Utils,
  storageUtils
}

export default {
  debounce,
  throttle,
  formatFileSize,
  formatTime,
  deepClone,
  uniqueArray,
  mergeObjects,
  generateUUID,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  getImageSize,
  compressImage,
  downloadFile,
  platformUtils,
  wechatUtils,
  h5Utils,
  storageUtils
}