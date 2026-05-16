/**
 * 数据路由 - 历史记录 / 偏好 / 用户信息
 * 写操作强制 authMiddleware，读操作允许 resolveUser 静默降级
 */
import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.js'
import {
  listHistory,
  createHistory,
  favoriteHistory,
  removeHistory,
  removeAllHistory,
  listPreferences,
  updatePreferences,
  getProfile,
  updateProfile,
} from '../controllers/dataController.js'

const router = Router()

// ── 历史记录 ──
router.get('/history', listHistory)                              // 分页查询（允许游客）
router.post('/history', authMiddleware, createHistory)           // 添加（必须登录）
router.put('/history/:id/favorite', authMiddleware, favoriteHistory) // 切换收藏（必须登录）
router.delete('/history/:id', authMiddleware, removeHistory)     // 删除单条（必须登录）
router.delete('/history', authMiddleware, removeAllHistory)      // 清空所有（必须登录）

// ── 用户偏好 ──
router.get('/preferences', listPreferences)                      // 允许游客
router.put('/preferences', authMiddleware, updatePreferences)    // 必须登录

// ── 用户信息 ──
router.get('/profile', getProfile)                               // 允许游客
router.put('/profile', authMiddleware, updateProfile)            // 必须登录

export default router