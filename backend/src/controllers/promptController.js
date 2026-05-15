/**
 * 图灵绘境 - 提示词库控制器
 * 分类浏览 / 列表搜索 / 详情 / 互动 / 收藏 / 自创
 */
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import db from '../db/index.js'
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '../middlewares/responseHandler.js'
import { findOrCreateUserFromToken } from '../services/dbService.js'
import logger from '../utils/logger.js'

// ══════════════════════════════════════════
//  辅助: 解析用户
// ══════════════════════════════════════════
function resolveUser(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { id: 0, uid: 'guest', type: 'guest' }
  }
  try {
    const payload = jwt.verify(authHeader.substring(7), config.jwt.secret)
    return findOrCreateUserFromToken(payload)
  } catch {
    return { id: 0, uid: 'guest', type: 'guest' }
  }
}

// ══════════════════════════════════════════
//  分类
// ══════════════════════════════════════════
export function listCategories(req, res, next) {
  try {
    const categories = db.prepare(
      'SELECT * FROM prompt_categories ORDER BY sort_order ASC, id ASC'
    ).all()
    res.success(categories)
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════
//  提示词列表 (分页)
// ══════════════════════════════════════════
export function listPrompts(req, res, next) {
  try {
    const {
      category_id = 0,
      language = '',
      sort = 'latest',
      page = 1,
      page_size = 20,
    } = req.query

    const offset = (Math.max(1, +page) - 1) * +page_size
    const limit = Math.min(Math.max(1, +page_size), 50)

    // 排序映射
    const sortMap = {
      latest: 'p.created_at DESC',
      popular: 'p.view_count DESC',
      most_liked: 'p.like_count DESC',
      most_copied: 'p.copy_count DESC',
    }
    const orderBy = sortMap[sort] || sortMap.latest

    // 条件构建
    const conditions = []
    const params = []

    if (+category_id > 0) {
      conditions.push('p.category_id = ?')
      params.push(+category_id)
    }
    if (language) {
      conditions.push('p.language = ?')
      params.push(language)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // 查总数
    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM prompt_library p ${where}`
    ).get(...params)

    // 查列表
    const list = db.prepare(
      `SELECT p.id, p.category_id, p.title, p.prompt_text, p.source, p.author,
              p.language, p.tags, p.view_count, p.like_count, p.copy_count,
              p.favorite_count, p.created_at,
              c.name as category_name
       FROM prompt_library p
       LEFT JOIN prompt_categories c ON p.category_id = c.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset)

    res.successPage(list, {
      page: +page,
      pageSize: limit,
      total: countRow.total,
    })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════
//  搜索提示词
// ══════════════════════════════════════════
export function searchPrompts(req, res, next) {
  try {
    const {
      q = '',
      category_id = 0,
      page = 1,
      page_size = 20,
    } = req.query

    if (!q.trim()) throw new BadRequestError('搜索关键词不能为空')

    const offset = (Math.max(1, +page) - 1) * +page_size
    const limit = Math.min(Math.max(1, +page_size), 50)
    const keyword = `%${q.trim()}%`

    const conditions = ['(p.title LIKE ? OR p.prompt_text LIKE ? OR p.tags LIKE ?)']
    const params = [keyword, keyword, keyword]

    if (+category_id > 0) {
      conditions.push('p.category_id = ?')
      params.push(+category_id)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM prompt_library p ${where}`
    ).get(...params)

    const list = db.prepare(
      `SELECT p.id, p.category_id, p.title, p.prompt_text, p.source, p.author,
              p.language, p.tags, p.view_count, p.like_count, p.copy_count,
              p.favorite_count, p.created_at,
              c.name as category_name
       FROM prompt_library p
       LEFT JOIN prompt_categories c ON p.category_id = c.id
       ${where}
       ORDER BY p.like_count DESC, p.view_count DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset)

    res.successPage(list, {
      page: +page,
      pageSize: limit,
      total: countRow.total,
    })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════
//  提示词详情 (浏览计数+1)
// ══════════════════════════════════════════
export function getPromptDetail(req, res, next) {
  try {
    const { id } = req.params
    const prompt = db.prepare(
      `SELECT p.*, c.name as category_name
       FROM prompt_library p
       LEFT JOIN prompt_categories c ON p.category_id = c.id
       WHERE p.id = ?`
    ).get(+id)

    if (!prompt) throw new NotFoundError('提示词不存在')

    // 浏览计数 +1
    db.prepare('UPDATE prompt_library SET view_count = view_count + 1 WHERE id = ?').run(+id)

    // 查用户是否已收藏
    const user = resolveUser(req)
    let is_favorited = false
    if (user.id > 0) {
      const fav = db.prepare(
        'SELECT id FROM prompt_favorites WHERE user_id = ? AND prompt_id = ?'
      ).get(user.id, +id)
      is_favorited = !!fav
    }

    res.success({ ...prompt, view_count: prompt.view_count + 1, is_favorited })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════
//  互动 (view / like / copy)
// ══════════════════════════════════════════
export function toggleInteraction(req, res, next) {
  try {
    const { id } = req.params
    const { action } = req.body // 'view' | 'like' | 'copy'

    if (!['view', 'like', 'copy'].includes(action)) {
      throw new BadRequestError('action 必须为 view / like / copy')
    }

    const prompt = db.prepare('SELECT id FROM prompt_library WHERE id = ?').get(+id)
    if (!prompt) throw new NotFoundError('提示词不存在')

    const user = resolveUser(req)

    // 插入互动记录 (UNIQUE 约束去重)
    try {
      db.prepare(
        'INSERT INTO prompt_interactions (user_id, prompt_id, action) VALUES (?, ?, ?)'
      ).run(user.id, +id, action)
    } catch {
      // 已存在则忽略
    }

    // 更新计数
    const countField = `${action}_count`
    db.prepare(`UPDATE prompt_library SET ${countField} = ${countField} + 1 WHERE id = ?`).run(+id)

    res.success(null, '操作成功')
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════
//  收藏 / 取消收藏
// ══════════════════════════════════════════
export function toggleFavorite(req, res, next) {
  try {
    const { id } = req.params
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录')

    const prompt = db.prepare('SELECT id FROM prompt_library WHERE id = ?').get(+id)
    if (!prompt) throw new NotFoundError('提示词不存在')

    const existing = db.prepare(
      'SELECT id FROM prompt_favorites WHERE user_id = ? AND prompt_id = ?'
    ).get(user.id, +id)

    if (existing) {
      db.prepare('DELETE FROM prompt_favorites WHERE id = ?').run(existing.id)
      db.prepare('UPDATE prompt_library SET favorite_count = MAX(0, favorite_count - 1) WHERE id = ?').run(+id)
      res.success({ is_favorited: false }, '已取消收藏')
    } else {
      db.prepare(
        'INSERT INTO prompt_favorites (user_id, prompt_id) VALUES (?, ?)'
      ).run(user.id, +id)
      db.prepare('UPDATE prompt_library SET favorite_count = favorite_count + 1 WHERE id = ?').run(+id)
      res.success({ is_favorited: true }, '已收藏')
    }
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════
//  我的收藏列表
// ══════════════════════════════════════════
export function listFavorites(req, res, next) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录')

    const { page = 1, page_size = 20 } = req.query
    const offset = (Math.max(1, +page) - 1) * +page_size
    const limit = Math.min(Math.max(1, +page_size), 50)

    const countRow = db.prepare(
      'SELECT COUNT(*) as total FROM prompt_favorites WHERE user_id = ?'
    ).get(user.id)

    const list = db.prepare(
      `SELECT p.id, p.category_id, p.title, p.prompt_text, p.source, p.author,
              p.language, p.tags, p.view_count, p.like_count, p.copy_count,
              p.favorite_count, f.created_at as favorited_at,
              c.name as category_name
       FROM prompt_favorites f
       JOIN prompt_library p ON f.prompt_id = p.id
       LEFT JOIN prompt_categories c ON p.category_id = c.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(user.id, limit, offset)

    res.successPage(list, {
      page: +page,
      pageSize: limit,
      total: countRow.total,
    })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════
//  用户自创提示词 CRUD
// ══════════════════════════════════════════
export function createUserPrompt(req, res, next) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录')

    const { title, prompt_text, category_id = 0, is_public = 0 } = req.body
    if (!title?.trim() || !prompt_text?.trim()) {
      throw new BadRequestError('标题和提示词内容不能为空')
    }

    const result = db.prepare(
      `INSERT INTO user_prompts (user_id, title, prompt_text, category_id, is_public)
       VALUES (?, ?, ?, ?, ?)`
    ).run(user.id, title.trim(), prompt_text.trim(), +category_id, +is_public)

    res.success({ id: result.lastInsertRowid }, '创建成功')
  } catch (err) {
    next(err)
  }
}

export function updateUserPrompt(req, res, next) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录')

    const { id } = req.params
    const { title, prompt_text, category_id, is_public } = req.body

    const existing = db.prepare(
      'SELECT id FROM user_prompts WHERE id = ? AND user_id = ?'
    ).get(+id, user.id)
    if (!existing) throw new NotFoundError('提示词不存在或无权限')

    db.prepare(
      `UPDATE user_prompts SET
         title = COALESCE(?, title),
         prompt_text = COALESCE(?, prompt_text),
         category_id = COALESCE(?, category_id),
         is_public = COALESCE(?, is_public),
         updated_at = strftime('%s','now')
       WHERE id = ?`
    ).run(
      title?.trim() || null,
      prompt_text?.trim() || null,
      category_id != null ? +category_id : null,
      is_public != null ? +is_public : null,
      +id
    )

    res.success(null, '更新成功')
  } catch (err) {
    next(err)
  }
}

export function deleteUserPrompt(req, res, next) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录')

    const { id } = req.params
    const result = db.prepare(
      'DELETE FROM user_prompts WHERE id = ? AND user_id = ?'
    ).run(+id, user.id)

    if (result.changes === 0) throw new NotFoundError('提示词不存在或无权限')
    res.success(null, '删除成功')
  } catch (err) {
    next(err)
  }
}

export function listUserPrompts(req, res, next) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录')

    const { page = 1, page_size = 20 } = req.query
    const offset = (Math.max(1, +page) - 1) * +page_size
    const limit = Math.min(Math.max(1, +page_size), 50)

    const countRow = db.prepare(
      'SELECT COUNT(*) as total FROM user_prompts WHERE user_id = ?'
    ).get(user.id)

    const list = db.prepare(
      `SELECT * FROM user_prompts WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    ).all(user.id, limit, offset)

    res.successPage(list, {
      page: +page,
      pageSize: limit,
      total: countRow.total,
    })
  } catch (err) {
    next(err)
  }
}