/**
 * 数据路由 - 历史记录 / 偏好 / 用户信息
 */
import { Router } from 'express'
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
router.get('/history', listHistory)           // 分页查询
router.post('/history', createHistory)        // 添加
router.put('/history/:id/favorite', favoriteHistory) // 切换收藏
router.delete('/history/:id', removeHistory)  // 删除单条
router.delete('/history', removeAllHistory)   // 清空所有

// ── 用户偏好 ──
router.get('/preferences', listPreferences)
router.put('/preferences', updatePreferences)

// ── 用户信息 ──
router.get('/profile', getProfile)
router.put('/profile', updateProfile)

export default router