/**
 * 提示词库路由 v2.0
 * 分类 / 列表 / 详情 / 互动 / 收藏 / 自创
 *
 * v2.0 新增: 社区分享 (UGC)
 */
import { Router } from 'express'
import multer from 'multer'
import {
  listCategories,
  listPrompts,
  getPromptDetail,
  toggleInteraction,
  toggleFavorite,
  listFavorites,
  createUserPrompt,
  updateUserPrompt,
  deleteUserPrompt,
  listUserPrompts,
  searchPrompts,
  // ── 社区 v2.0 ──
  uploadCommunityImage,
  createCommunityPost,
  listCommunityPosts,
  getCommunityPostDetail,
  toggleCommunityLike,
  reportCommunityPost,
  deleteCommunityPost,
} from '../controllers/promptController.js'
import { authMiddleware, optionalAuth } from '../middlewares/auth.js'
import { communityGuard } from '../middlewares/communityGuard.js'

const router = Router()

// ══════════════════════════════════════════
//  Multer 配置 (内存存储，用于图片上传)
// ══════════════════════════════════════════
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的格式: ${file.mimetype}`))
    }
  },
})

// ── 分类 ──
router.get('/categories', listCategories)

// ── 提示词列表/搜索 ──
router.get('/list', listPrompts)
router.get('/search', searchPrompts)

// ══════════════════════════════════════════
//  🆕 社区分享 v2.0（必须在 /:id 之前注册！）
// ══════════════════════════════════════════

// 图片上传 (需登录)
router.post('/upload', authMiddleware, upload.single('image'), uploadCommunityImage)

// 创建社区分享 (需登录 + 含安全审核)
router.post('/community', authMiddleware, communityGuard, createCommunityPost)

// 社区广场列表
router.get('/community', optionalAuth, listCommunityPosts)

// 社区帖子详情
router.get('/community/:id', optionalAuth, getCommunityPostDetail)

// 社区点赞 (需识别用户)
router.post('/community/:id/like', optionalAuth, toggleCommunityLike)

// 举报内容 (需识别用户)
router.post('/community/:id/report', optionalAuth, reportCommunityPost)

// 删除自己的分享 (需登录)
router.delete('/community/:id', authMiddleware, deleteCommunityPost)

// ── 提示词详情（放在最后，作为兜底）──
router.get('/:id', getPromptDetail)

// ── 互动 (点赞/复制) ──
router.post('/:id/interact', optionalAuth, toggleInteraction)

// ── 收藏 ──
router.post('/:id/favorite', authMiddleware, toggleFavorite)
router.get('/favorites/list', authMiddleware, listFavorites)

// ── 用户自创提示词 CRUD ──
router.post('/mine', authMiddleware, createUserPrompt)
router.put('/mine/:id', authMiddleware, updateUserPrompt)
router.delete('/mine/:id', authMiddleware, deleteUserPrompt)
router.get('/mine/list', authMiddleware, listUserPrompts)

export default router
