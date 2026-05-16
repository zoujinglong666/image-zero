/**
 * ════════════════════════════════════════════
 *  图灵绘境 - API 统一出口
 *  所有 API 从这里导入，按模块组织
 * ════════════════════════════════════════════
 */

// ─── 图片 AI ──────────────────────────────
export {
  analyzeImage,
  generateImage,
  editImage,
  compressImage,
  checkNetwork,
  isOnlineSync,
  watchNetworkChange,
} from './image'

// ─── 认证 ──────────────────────────────────
export {
  wechatLogin,
  wechatLoginWithCode,
  anonymousLogin,
  verifyToken,
  getAuthStatus,
} from './auth'

// ─── 提示词库 ──────────────────────────────
export {
  getCategories,
  getPromptList,
  searchPrompts,
  getPromptDetail,
  interactPrompt,
  togglePromptFavorite,
  getFavoriteList,
} from './prompt'

// 类型也一并导出
export type { PromptCategory, PromptItem, PromptPageResult } from './prompt'

// ─── 数据（历史/偏好/用户）───────────────────
export {
  fetchHistory,
  createHistory,
  toggleFavorite,
  deleteHistory,
  clearAllHistory,
  fetchPreferences,
  savePreferences,
  fetchProfile,
  updateProfile,
} from './data'

export type { HistoryPageResult, HistoryItem, UserProfile } from './data'

// ─── 错误处理 ──────────────────────────────
export { getFriendlyError, ERROR_MAP } from '@/common/http.interceptor'
