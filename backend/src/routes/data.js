/**
 * 数据路由 - 历史记录 / 偏好 / 用户信息
 * 写操作强制 authMiddleware，读操作使用 optionalAuth 静默降级
 */
import { Router } from 'express'
import multer from 'multer'
import { authMiddleware, optionalAuth } from '../middlewares/auth.js'
import config from '../config/index.js'
import { sanitizeFilename } from '../utils/validator.js'
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
  uploadAvatar,
} from '../controllers/dataController.js'

const router = Router()

// Multer 头像上传配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.upload.dest),
  filename: (req, file, cb) => {
    const safeName = sanitizeFilename(file.originalname)
    const ext = safeName.includes('.') ? '.' + safeName.split('.').pop() : '.jpg'
    cb(null, `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`)
  },
})
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    file.originalname = sanitizeFilename(file.originalname)
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 JPG/PNG/WebP/GIF 格式'), false)
    }
  },
})

// ── 历史记录 ──
router.get('/history', optionalAuth, listHistory)                              // 分页查询（允许游客，但识别用户）
router.post('/history', authMiddleware, createHistory)           // 添加（必须登录）
router.put('/history/:id/favorite', authMiddleware, favoriteHistory) // 切换收藏（必须登录）
router.delete('/history/:id', authMiddleware, removeHistory)     // 删除单条（必须登录）
router.delete('/history', authMiddleware, removeAllHistory)      // 清空所有（必须登录）

// ── 用户偏好 ──
router.get('/preferences', optionalAuth, listPreferences)                      // 识别用户
router.put('/preferences', authMiddleware, updatePreferences)    // 必须登录

// ── 用户信息 ──
router.get('/profile', optionalAuth, getProfile)                               // 识别用户
router.put('/profile', authMiddleware, updateProfile)            // 必须登录
router.post('/avatar', authMiddleware, avatarUpload.single('avatar'), uploadAvatar) // 上传头像

export default router