/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 数据库服务层
 *  用户管理 / 历史记录 / 偏好设置 / VIP
 * ══════════════════════════════════════════
 */
import db from '../db/index.js'
import crypto from 'crypto'
import logger from '../utils/logger.js'

// ══════════════════════════════════════════
//  用户管理
// ══════════════════════════════════════════

/**
 * 根据微信 openid 查找或创建用户
 * @returns {object} 用户记录
 */
export function findOrCreateWechatUser(openid) {
  const openidHash = crypto.createHash('sha256').update(openid).digest('hex')
  const uid = openidHash.substring(0, 12)

  // 查找已有用户
  let user = db.prepare('SELECT * FROM users WHERE openid_hash = ?').get(openidHash)
  if (user) return user

  // 创建新用户
  const insert = db.prepare(`
    INSERT INTO users (uid, openid_hash, type, nickname)
    VALUES (?, ?, 'wechat', ?)
  `)
  const result = insert.run(uid, openidHash, `微信用户${uid.slice(0, 6)}`)
  user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
  logger.info(`[DB] 新用户注册: uid=${uid} type=wechat`)
  return user
}

/**
 * 根据 uid 查找用户
 */
export function findUserByUid(uid) {
  return db.prepare('SELECT * FROM users WHERE uid = ?').get(uid)
}

/**
 * 根据 JWT payload 获取或创建用户
 * 兼容: 已有 token 但数据库中无记录的情况
 */
export function findOrCreateUserFromToken(payload) {
  if (payload.type === 'wechat' && payload.openid) {
    return findOrCreateWechatUser(payload.openid)
  }

  // 兼容: JWT 中可能是 uid 或 id
  const uid = payload.uid || payload.id
  if (uid) {
    let user = findUserByUid(uid)
    if (user) return user
  }

  // 匿名/游客: 创建
  const newUid = uid || `anon_${Date.now()}`
  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (uid, type, nickname)
    VALUES (?, ?, ?)
  `)
  insert.run(newUid, payload.type || 'anonymous', payload.type === 'anonymous' ? '访客' : '游客')
  return findUserByUid(newUid) || { id: 0, uid: newUid, type: 'guest', vip_level: 0, daily_quota: 10 }
}

/**
 * 更新用户信息
 */
export function updateUser(uid, fields) {
  const allowed = ['nickname', 'avatar_url']
  const updates = []
  const values = []
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(fields[key])
    }
  }
  if (updates.length === 0) return null
  updates.push("updated_at = strftime('%s','now')")
  values.push(uid)

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`).run(...values)
  return findUserByUid(uid)
}

// ══════════════════════════════════════════
//  历史记录
// ══════════════════════════════════════════

/**
 * 分页查询历史记录
 * @param {number} userId - 用户 ID
 * @param {object} options - 分页/筛选参数
 */
export function getHistory(userId, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    type = null,         // analyze / edit / generate
    favorite = null,     // true=仅收藏
    keyword = null,      // 搜索提示词
  } = options

  const offset = (page - 1) * pageSize
  const conditions = ['h.user_id = ?']
  const params = [userId]

  if (type) {
    conditions.push('h.type = ?')
    params.push(type)
  }
  if (favorite === true) {
    conditions.push('h.favorite = 1')
  }
  if (keyword) {
    conditions.push('(h.prompt_cn LIKE ? OR h.prompt_en LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  const where = conditions.join(' AND ')

  // 查总数
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM history h WHERE ${where}`).get(...params)
  const total = countRow.total

  // 查数据
  const rows = db.prepare(`
    SELECT h.id, h.type, h.image_url, h.prompt_cn, h.prompt_en, h.style,
           h.generated_url, h.favorite, h.created_at
    FROM history h
    WHERE ${where}
    ORDER BY h.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset)

  return {
    list: rows.map(row => ({
      ...row,
      favorite: !!row.favorite,
      imageUrl: row.image_url,
      prompt: row.prompt_cn,
      promptEn: row.prompt_en,
      generatedUrl: row.generated_url,
      timestamp: row.created_at * 1000, // 转 ms 兼容前端
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * 添加历史记录
 * @returns {object} 新记录
 */
export function addHistory(userId, record) {
  const {
    type = 'analyze',
    imageUrl = '',
    promptCn = '',
    promptEn = '',
    style = '',
    resultJson = '',
    generatedUrl = '',
  } = record

  const insert = db.prepare(`
    INSERT INTO history (user_id, type, image_url, prompt_cn, prompt_en, style, result_json, generated_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = insert.run(userId, type, imageUrl, promptCn, promptEn, style, resultJson, generatedUrl)

  return db.prepare('SELECT * FROM history WHERE id = ?').get(result.lastInsertRowid)
}

/**
 * 切换收藏状态
 */
export function toggleFavorite(historyId, userId) {
  const row = db.prepare('SELECT favorite FROM history WHERE id = ? AND user_id = ?').get(historyId, userId)
  if (!row) return null

  const newFav = row.favorite ? 0 : 1
  db.prepare('UPDATE history SET favorite = ? WHERE id = ?').run(newFav, historyId)
  return { id: historyId, favorite: !!newFav }
}

/**
 * 删除历史记录
 */
export function deleteHistory(historyId, userId) {
  const result = db.prepare('DELETE FROM history WHERE id = ? AND user_id = ?').run(historyId, userId)
  return result.changes > 0
}

/**
 * 清空历史记录
 */
export function clearHistory(userId) {
  const result = db.prepare('DELETE FROM history WHERE user_id = ?').run(userId)
  return result.changes
}

// ══════════════════════════════════════════
//  用户偏好
// ══════════════════════════════════════════

/**
 * 获取用户所有偏好
 */
export function getUserPreferences(userId) {
  const rows = db.prepare('SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?').all(userId)
  const prefs = {}
  for (const row of rows) {
    prefs[row.pref_key] = row.pref_value
  }
  return prefs
}

/**
 * 设置用户偏好 (upsert)
 */
export function setUserPreference(userId, key, value) {
  db.prepare(`
    INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
    VALUES (?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id, pref_key) DO UPDATE SET
      pref_value = excluded.pref_value,
      updated_at = strftime('%s','now')
  `).run(userId, key, String(value))
  return { key, value }
}

/**
 * 批量设置偏好
 */
export function setUserPreferences(userId, prefs) {
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(prefs)) {
      setUserPreference(userId, key, value)
    }
  })
  transaction()
  return getUserPreferences(userId)
}

// ══════════════════════════════════════════
//  VIP 相关 (预留)
// ══════════════════════════════════════════

/**
 * 检查用户 VIP 状态，自动过期处理
 */
export function checkVipStatus(userId) {
  const user = db.prepare('SELECT vip_level, vip_expire_at FROM users WHERE id = ?').get(userId)
  if (!user) return { level: 0, active: false }

  const now = Math.floor(Date.now() / 1000)
  if (user.vip_level > 0 && user.vip_expire_at > 0 && user.vip_expire_at < now) {
    // VIP 已过期，降级
    db.prepare('UPDATE users SET vip_level = 0, updated_at = strftime("%s","now") WHERE id = ?').run(userId)
    return { level: 0, active: false, expired: true }
  }

  return {
    level: user.vip_level,
    active: user.vip_level > 0,
    expireAt: user.vip_expire_at || 0,
  }
}

/**
 * 获取用户每日剩余额度
 */
export function getDailyQuota(userId) {
  const user = db.prepare('SELECT daily_quota, vip_level FROM users WHERE id = ?').get(userId)
  if (!user) return 0

  // VIP 用户无限制
  if (user.vip_level > 0) return -1

  // 今日已使用次数
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  const usedRow = db.prepare(
    'SELECT COUNT(*) as count FROM history WHERE user_id = ? AND created_at >= ?'
  ).get(userId, todayStart)

  return Math.max(0, user.daily_quota - usedRow.count)
}