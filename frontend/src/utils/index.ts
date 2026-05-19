// 工具函数集合

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

/**
 * 格式化时间戳为可读字符串
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await uni.setClipboardData({
      data: text,
      showToast: true
    })
    return true
  } catch (e) {
    console.error('复制失败:', e)
    return false
  }
}

/**
 * 保存图片到相册
 */
export async function saveToAlbum(imagePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.saveImageToPhotosAlbum({
      filePath: imagePath,
      success: () => {
        uni.showToast({ title: '已保存到相册', icon: 'success' })
        resolve(true)
      },
      fail: (err) => {
        console.error('保存失败:', err)
        if (err.errMsg?.includes('auth deny')) {
          uni.showModal({
            title: '需要相册权限',
            content: '请在设置中允许访问相册权限',
            showCancel: false
          })
        }
        resolve(false)
      }
    })
  })
}

/**
 * 选择图片（支持拍照或相册）
 */
export function chooseImage(options?: {
  count?: number
  sizeType?: ('compressed' | 'original')[]
  sourceType?: ('album' | 'camera')[]
}): Promise<string[]> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: options?.count || 9,
      sizeType: options?.sizeType || ['compressed'],
      sourceType: options?.sourceType || ['album', 'camera'],
      success: (res) => resolve(res.tempFilePaths),
      fail: (err) => reject(err)
    })
  })
}

/**
 * 压缩图片
 */
export function compressImage(src: string, quality?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src,
      quality: quality || 80,
      success: (res) => resolve(res.tempFilePath),
      fail: reject
    })
  })
}

/**
 * 获取图片信息
 */
export function getImageInfo(src: string): Promise<UniApp.GetImageInfoSuccessData> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 显示加载中
 */
export function showLoading(title: string = '处理中...') {
  uni.showLoading({ title, mask: true })
}

/**
 * 隐藏加载中
 */
export function hideLoading() {
  uni.hideLoading()
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * 将关键词权重格式化为提示词字符串
 */
export function formatKeywordsWithWeight(keywords: { keyword: string; weight: number }[]): string {
  return keywords
    .map(k => {
      if (k.weight === 1) return k.keyword
      return `(${k.keyword}:${k.weight.toFixed(1)})`
    })
    .join(', ')
}

/**
 * 解析颜色名称
 */
export function getColorName(hex: string): string {
  const colors: Record<string, string> = {
    '#ff0000': '红色', '#00ff00': '绿色', '#0000ff': '蓝色',
    '#ffff00': '黄色', '#ff00ff': '品红', '#00ffff': '青色',
    '#ffffff': '白色', '#000000': '黑色', '#808080': '灰色',
    '#ff6b6b': '珊瑚红', '#4ecdc4': '青碧色', '#45b7d1': '天空蓝',
    '#96ceb4': '薄荷绿', '#ffeaa7': '淡金黄', '#dfe6e9': '云雾灰',
    '#6366f1': '靛蓝紫', '#8b5cf6': '紫罗兰', '#ec4899': '玫红',
    '#f59e0b': '琥珀橙', '#10b981': '翡翠绿', '#ef4444': '警戒红'
  }
  const lower = hex.toLowerCase()
  return colors[lower] || hex
}

/**
 * 计算图片宽高比描述
 */
export function getAspectRatioDesc(width: number, height: number): string {
  const ratio = width / height
  if (Math.abs(ratio - 1) < 0.1) return '1:1 正方形'
  if (Math.abs(ratio - 16/9) < 0.2) return '16:9 宽屏'
  if (Math.abs(ratio - 4/3) < 0.15) return '4:3 标准屏'
  if (Math.abs(ratio - 9/16) < 0.15) return '9:16 竖屏'
  if (Math.abs(ratio - 3/4) < 0.15) return '3:4 竖版'
  if (ratio > 1) return `${Math.round(ratio)}:1 横向`
  return `1:${Math.round(1/ratio)} 纵向`
}
