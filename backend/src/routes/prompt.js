/**
 * 提示词库路由 - 分类 / 列表 / 详情 / 互动 / 收藏 / 自创
 */
import { Router } from 'express'
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
} from '../controllers/promptController.js'

const router = Router()

// ── 分类 ──
router.get('/categories', listCategories)                // 获取全部分类

// ── 提示词列表/搜索 ──
router.get('/list', listPrompts)                         // 分页列表 (支持 category_id / language / sort)
router.get('/search', searchPrompts)                     // 关键词搜索

// ── 提示词详情 ──
router.get('/:id', getPromptDetail)                      // 详情 (含浏览计数)

// ── 互动 (点赞/复制) ──
router.post('/:id/interact', toggleInteraction)           // view / like / copy

// ── 收藏 ──
router.post('/:id/favorite', toggleFavorite)              // 切换收藏
router.get('/favorites/list', listFavorites)              // 我的收藏列表

// ── 用户自创提示词 ──
router.post('/mine', createUserPrompt)                    // 创建
router.put('/mine/:id', updateUserPrompt)                 // 更新
router.delete('/mine/:id', deleteUserPrompt)              // 删除
router.get('/mine/list', listUserPrompts)                 // 我的提示词列表

export default router