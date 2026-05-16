/**
 * 图灵绘境 - 数据控制器
 * 历史记录 / 用户偏好 / 用户信息
 * 使用统一结果返回器 + AppError
 *
 * 写操作由 authMiddleware 在路由层保护，handler 从 req.user 获取用户
 * 读操作允许未认证访问，通过 resolveUser 静默降级为 guest
 */
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '../middlewares/responseHandler.js'
import {
  findOrCreateUserFromToken,
  updateUser,
  getHistory,
  addHistory,
  toggleFavorite,
  deleteHistory,
  clearHistory,
  getUserPreferences,
  setUserPreferences,
  checkVipStatus,
  getDailyQuota,
} from '../services/dbService.js'
import logger from '../utils/logger.js'

/**
 * 从请求中解析用户（可选认证，仅用于读操作）
 * 写操作应使用 authMiddleware，从 req.user 获取已认证用户
 */
function resolveUser(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { id: 0, uid: 'guest', type: 'guest', vip_level: 0, daily_quota: 10 }
  }
  try {
    const payload = jwt.verify(authHeader.substring(7), config.jwt.secret)
    return findOrCreateUserFromToken(payload)
  } catch {
    return { id: 0, uid: 'guest', type: 'guest', vip_level: 0, daily_quota: 10 }
  }
}

/**
 * 获取已认证用户（写操作专用）
 * 从 authMiddleware 设置的 req.user 解析出完整用户对象
 */
function getAuthenticatedUser(req) {
  return findOrCreateUserFromToken(req.user)
}

// ══════════════════════════════════════════
//  历史记录 API
// ══════════════════════════════════════════

/** GET /api/data/history */
export function listHistory(req, res) {
  const user = resolveUser(req)
  const result = getHistory(user.id, {
    page: parseInt(req.query.page) || 1,
    pageSize: Math.min(parseInt(req.query.pageSize) || 20, 100),
    type: req.query.type || null,
    favorite: req.query.favorite === 'true' ? true : null,
    keyword: req.query.keyword || null,
  })
  res.successPage(result.list, result.pagination)
}

/** POST /api/data/history */
export function createHistory(req, res) {
  const user = getAuthenticatedUser(req)

  const { type, imageUrl, promptCn, promptEn, style, resultJson, generatedUrl } = req.body
  if (!imageUrl && !promptCn && !promptEn) {
    throw new BadRequestError('至少提供 imageUrl、promptCn 或 promptEn 之一')
  }

  const record = addHistory(user.id, {
    type: type || 'analyze',
    imageUrl: imageUrl || '',
    promptCn: promptCn || '',
    promptEn: promptEn || '',
    style: style || '',
    resultJson: resultJson ? JSON.stringify(resultJson) : '',
    generatedUrl: generatedUrl || '',
  })

  res.success({ id: record.id }, '记录已保存')
}

/** PUT /api/data/history/:id/favorite */
export function favoriteHistory(req, res) {
  const user = getAuthenticatedUser(req)

  const result = toggleFavorite(parseInt(req.params.id), user.id)
  if (!result) throw new NotFoundError('记录不存在')

  res.success(result, result.favorite ? '已收藏' : '已取消收藏')
}

/** DELETE /api/data/history/:id */
export function removeHistory(req, res) {
  const user = getAuthenticatedUser(req)

  const deleted = deleteHistory(parseInt(req.params.id), user.id)
  if (!deleted) throw new NotFoundError('记录不存在')

  res.success(null, '删除成功')
}

/** DELETE /api/data/history */
export function removeAllHistory(req, res) {
  const user = getAuthenticatedUser(req)

  const count = clearHistory(user.id)
  res.success({ deleted: count }, `已清空 ${count} 条记录`)
}

// ══════════════════════════════════════════
//  用户偏好 API
// ══════════════════════════════════════════

/** GET /api/data/preferences */
export function listPreferences(req, res) {
  const user = resolveUser(req)
  const prefs = getUserPreferences(user.id)
  res.success(prefs)
}

/** PUT /api/data/preferences */
export function updatePreferences(req, res) {
  const user = getAuthenticatedUser(req)

  const prefs = req.body
  if (!prefs || typeof prefs !== 'object') throw new BadRequestError('偏好数据格式错误')

  const result = setUserPreferences(user.id, prefs)
  res.success(result, '偏好已保存')
}

// ══════════════════════════════════════════
//  用户信息 API
// ══════════════════════════════════════════

/** GET /api/data/profile */
export function getProfile(req, res) {
  const user = resolveUser(req)
  const vip = checkVipStatus(user.id)
  const quota = getDailyQuota(user.id)
  const prefs = getUserPreferences(user.id)

  res.success({
    uid: user.uid,
    type: user.type,
    nickname: user.nickname || '',
    avatarUrl: user.avatar_url || '',
    vip,
    dailyQuota: quota,
    preferences: prefs,
  })
}

/** PUT /api/data/profile */
export function updateProfile(req, res) {
  const user = getAuthenticatedUser(req)

  const updated = updateUser(user.uid, req.body)
  res.success({ uid: updated.uid, nickname: updated.nickname, avatarUrl: updated.avatar_url }, '信息已更新')
}