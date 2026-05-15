/**
 * 图灵绘境 - 数据控制器
 * 历史记录 / 用户偏好 / 用户信息
 */
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import {
  findOrCreateUserFromToken,
  findUserByUid,
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
 * 从请求中解析用户（可选认证）
 * 已登录 → 返回数据库用户；未登录 → 返回游客
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

// ══════════════════════════════════════════
//  历史记录 API
// ══════════════════════════════════════════

/** GET /api/data/history?page=1&pageSize=20&type=&favorite=&keyword= */
export function listHistory(req, res) {
  try {
    const user = resolveUser(req)
    const result = getHistory(user.id, {
      page: parseInt(req.query.page) || 1,
      pageSize: Math.min(parseInt(req.query.pageSize) || 20, 100),
      type: req.query.type || null,
      favorite: req.query.favorite === 'true' ? true : null,
      keyword: req.query.keyword || null,
    })
    res.json({ success: true, data: result })
  } catch (err) {
    logger.error(`查询历史失败: ${err.message}`)
    res.status(500).json({ error: '查询历史记录失败' })
  }
}

/** POST /api/data/history — 添加历史记录 */
export function createHistory(req, res) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) {
      return res.status(401).json({ error: '请登录后保存记录', code: 'LOGIN_REQUIRED' })
    }

    const { type, imageUrl, promptCn, promptEn, style, resultJson, generatedUrl } = req.body
    if (!imageUrl && !promptCn && !promptEn) {
      return res.status(400).json({ error: '至少提供 imageUrl、promptCn 或 promptEn 之一' })
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

    res.json({ success: true, data: { id: record.id } })
  } catch (err) {
    logger.error(`添加历史失败: ${err.message}`)
    res.status(500).json({ error: '添加记录失败' })
  }
}

/** PUT /api/data/history/:id/favorite — 切换收藏 */
export function favoriteHistory(req, res) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) {
      return res.status(401).json({ error: '请登录后操作', code: 'LOGIN_REQUIRED' })
    }

    const result = toggleFavorite(parseInt(req.params.id), user.id)
    if (!result) {
      return res.status(404).json({ error: '记录不存在' })
    }

    res.json({ success: true, data: result })
  } catch (err) {
    logger.error(`收藏操作失败: ${err.message}`)
    res.status(500).json({ error: '操作失败' })
  }
}

/** DELETE /api/data/history/:id — 删除单条 */
export function removeHistory(req, res) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) {
      return res.status(401).json({ error: '请登录后操作', code: 'LOGIN_REQUIRED' })
    }

    const deleted = deleteHistory(parseInt(req.params.id), user.id)
    if (!deleted) {
      return res.status(404).json({ error: '记录不存在' })
    }

    res.json({ success: true })
  } catch (err) {
    logger.error(`删除历史失败: ${err.message}`)
    res.status(500).json({ error: '删除失败' })
  }
}

/** DELETE /api/data/history — 清空所有 */
export function removeAllHistory(req, res) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) {
      return res.status(401).json({ error: '请登录后操作', code: 'LOGIN_REQUIRED' })
    }

    const count = clearHistory(user.id)
    res.json({ success: true, data: { deleted: count } })
  } catch (err) {
    logger.error(`清空历史失败: ${err.message}`)
    res.status(500).json({ error: '操作失败' })
  }
}

// ══════════════════════════════════════════
//  用户偏好 API
// ══════════════════════════════════════════

/** GET /api/data/preferences */
export function listPreferences(req, res) {
  try {
    const user = resolveUser(req)
    const prefs = getUserPreferences(user.id)
    res.json({ success: true, data: prefs })
  } catch (err) {
    logger.error(`获取偏好失败: ${err.message}`)
    res.status(500).json({ error: '获取偏好失败' })
  }
}

/** PUT /api/data/preferences — 批量设置 */
export function updatePreferences(req, res) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) {
      return res.status(401).json({ error: '请登录后保存偏好', code: 'LOGIN_REQUIRED' })
    }

    const prefs = req.body
    if (!prefs || typeof prefs !== 'object') {
      return res.status(400).json({ error: '偏好数据格式错误' })
    }

    const result = setUserPreferences(user.id, prefs)
    res.json({ success: true, data: result })
  } catch (err) {
    logger.error(`设置偏好失败: ${err.message}`)
    res.status(500).json({ error: '保存偏好失败' })
  }
}

// ══════════════════════════════════════════
//  用户信息 API
// ══════════════════════════════════════════

/** GET /api/data/profile */
export function getProfile(req, res) {
  try {
    const user = resolveUser(req)
    const vip = checkVipStatus(user.id)
    const quota = getDailyQuota(user.id)
    const prefs = getUserPreferences(user.id)

    res.json({
      success: true,
      data: {
        uid: user.uid,
        type: user.type,
        nickname: user.nickname || '',
        avatarUrl: user.avatar_url || '',
        vip,
        dailyQuota: quota,
        preferences: prefs,
      },
    })
  } catch (err) {
    logger.error(`获取用户信息失败: ${err.message}`)
    res.status(500).json({ error: '获取用户信息失败' })
  }
}

/** PUT /api/data/profile — 更新用户信息 */
export function updateProfile(req, res) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) {
      return res.status(401).json({ error: '请登录后修改', code: 'LOGIN_REQUIRED' })
    }

    const updated = updateUser(user.uid, req.body)
    res.json({ success: true, data: { uid: updated.uid, nickname: updated.nickname, avatarUrl: updated.avatar_url } })
  } catch (err) {
    logger.error(`更新用户信息失败: ${err.message}`)
    res.status(500).json({ error: '更新失败' })
  }
}