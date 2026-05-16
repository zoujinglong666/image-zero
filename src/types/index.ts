// 图片提示词反推相关类型定义

// 图片风格类型
export type ImageStyle = 'flat' | 'skeuomorphic' | 'tech' | 'minimal' | 'illustration' | '3d' | 'watercolor' | 'pixel' | 'other'

// 元素类型
export type ElementType = 'icon' | 'text' | 'shape' | 'image' | 'button' | 'card' | 'background'

// 布局类型
export type LayoutType = 'grid' | 'flex-row' | 'flex-column' | 'absolute' | 'masonry' | 'circular'

// 风格标签映射
export const StyleLabels: Record<ImageStyle, string> = {
  flat: '扁平风',
  skeuomorphic: '拟物风',
  tech: '科技风',
  minimal: '极简风',
  illustration: '插画风',
  '3d': '3D立体',
  watercolor: '水彩风',
  pixel: '像素风',
  other: '其他'
}

// 元素标签映射
export const ElementLabels: Record<ElementType, string> = {
  icon: '图标',
  text: '文字',
  shape: '形状',
  image: '图片',
  button: '按钮',
  card: '卡片',
  background: '背景'
}

// 布局标签映射
export const LayoutLabels: Record<LayoutType, string> = {
  grid: '网格布局',
  'flex-row': '水平弹性布局',
  'flex-column': '垂直弹性布局',
  absolute: '绝对定位布局',
  masonry: '瀑布流布局',
  circular: '环形布局'
}

// 反推结果
export interface PromptResult {
  id: string
  imageUrl: string
  // 风格分析
  style: ImageStyle
  styleConfidence: number // 0-1
  styleDescription: string
  // 元素构成
  elements: AnalyzedElement[]
  // 布局分析
  layout: LayoutType
  layoutDescription: string
  // 色彩方案
  colorScheme: ColorInfo[]
  primaryColor: string
  secondaryColor: string
  accentColor: string
  // 生成的提示词
  prompt: string
  promptEn: string
  // 关键词权重
  keywords: KeywordWeight[]
  // 细节参数
  parameters: ImageParams
  // 时间戳
  createdAt: number
}

// 分析的元素
export interface AnalyzedElement {
  type: ElementType
  label: string
  description: string
  position?: { x: number; y: number; width: number; height: number }
  confidence: number
}

// 颜色信息
export interface ColorInfo {
  hex: string
  name: string
  percentage: number
}

// 关键词权重
export interface KeywordWeight {
  keyword: string
  weight: number // 1-2, 格式如 1.2 表示 (keyword:1.2)
  category: 'style' | 'element' | 'color' | 'layout' | 'quality' | 'other'
}

// 图片参数
export interface ImageParams {
  aspectRatio: string // 如 "16:9", "1:1", "4:3"
  quality: 'standard' | 'hd' | 'ultra'
  styleStrength: number // 0-100
  negativePrompt?: string
}

// 编辑操作
export interface EditOperation {
  type: 'replace-color' | 'replace-icon' | 'modify-text' | 'adjust-layout' | 'change-font' | 'adjust-spacing'
  target: string
  oldValue: any
  newValue: any
  description: string
}

// 编辑会话
export interface EditSession {
  id: string
  sourceImage: string
  originalResult: PromptResult
  operations: EditOperation[]
  previewUrl?: string
  exportSettings: ExportSettings
  updatedAt: number
}

// 导出设置
export interface ExportSettings {
  format: 'png' | 'svg' | 'jpg' | 'webp'
  width: number
  height: number
  scale: 1 | 2 | 3 // 倍率
  quality: number // 1-100
}

// 历史记录项
export interface HistoryItem {
  id: string
  type: 'analyze' | 'edit'
  result: PromptResult | EditSession
  thumbnail: string
  title: string
  createdAt: number
}

// API 响应（后端统一格式）
export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

// ====== 图片生成参数 ======
export interface ImageGenerationParams {
  prompt: string
  width?: number
  height?: number
  model?: string
}

// ====== 图片编辑参数 ======
export interface EditParams {
  originalPrompt: string
  originalImage?: string
  colorScheme?: any
  elementStyle?: any
  layout?: any
  text?: string
  style?: string
}

// ====== 图片分析结果（页面直接使用） ======
export interface ImageAnalysisResult {
  style: string
  styleConfidence: number
  styleDescription: string
  elements: {
    type: string
    label: string
    description: string
    position?: { x: number; y: number; width?: number; height?: number }
    confidence: number
  }[]
  layout: string
  layoutDescription: string
  colorScheme: {
    hex: string
    name: string
    ratio: number
  }[]
  primaryColor: string
  prompt: {
    chinese: string
    english: string
    keywords: {
      keyword: string
      weight: number
      category: string
    }[]
  }
}

// 简化历史记录项（与 Store 一致）
export interface SimpleHistoryItem {
  id: string
  imageUrl: string
  prompt: string
  timestamp: number
  favorite: boolean
}

// ====== 认证相关类型 ======

/** 微信登录请求参数 */
export interface WechatLoginParams {
  code: string
}

/** 微信登录响应（拦截器已解包，直接是 data 字段） */
export interface WechatLoginResult {
  token: string
  expiresIn: string
  user: {
    type: 'wechat'
    uid: string
  }
}

/** 匿名登录响应 */
export interface AnonymousLoginResult {
  token: string
  expiresIn: string
}

/** Token 验证响应 */
export interface VerifyTokenResult {
  valid: boolean
  user?: {
    type: 'wechat' | 'anonymous'
    uid?: string
    openid?: string
    id?: string
  }
  error?: string
}

/** 认证服务状态 */
export interface AuthStatusResult {
  jwt: boolean
  wechat: boolean
  anonymousAllowed: boolean
}

/** 用户信息（Store 使用） */
export interface UserInfo {
  uid: string
  type: 'wechat' | 'anonymous' | 'guest'
  token: string
  loginAt: number
}
