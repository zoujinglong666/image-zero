/**
 * 图灵绘境 - 提示词库控制器 v2.0
 * 分类浏览 / 列表搜索 / 详情 / 互动 / 收藏 / 自创
 *
 * v2.0 新增: 社区分享 (UGC)
 * - 图片上传 (腾讯云 COS)
 * - 社区广场列表 (公开提示词混入)
 * - 举报机制
 * - 社区点赞/浏览
 */
import jwt from 'jsonwebtoken'
import path from 'path'
import fs from 'fs'
import config from '../config/index.js'
import db from '../db/index.js'
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../middlewares/responseHandler.js'
import { findOrCreateUserFromToken } from '../services/dbService.js'
import { uploadToCos, validateImage } from '../services/cosService.js'
import { checkImageDuplicate } from '../middlewares/communityGuard.js'
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

// ══════════════════════════════════════════
//  🆕 社区分享功能 v2.0
// ══════════════════════════════════════════

/**
 * 上传社区图片
 * POST /api/prompts/upload
 * Content-Type: multipart/form-data
 * Body: image (file)
 */
export async function uploadCommunityImage(req, res, next) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录后上传图片')

    // 检查是否有上传的文件
    if (!req.file || !req.file.buffer) {
      throw new BadRequestError('请选择要上传的图片')
    }

    // 校验 + 上传到 COS (或本地回退)
    const result = await uploadToCos(req.file.buffer, req.file.mimetype)

    res.success({
      url: result.url,
      hash: result.hash,
    }, '图片上传成功')
  } catch (err) {
    next(err)
  }
}

/**
 * 创建社区分享（含图片）
 * POST /api/prompts/community
 * Body: { title, prompt_text, category_id, image_url, image_hash, tags }
 */
export function createCommunityPost(req, res, next) {
  try {
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录后分享')

    const { title, prompt_text, category_id = 0, image_url = '', image_hash = '', tags = '' } = req.body

    if (!title?.trim()) throw new BadRequestError('请输入标题')
    if (!prompt_text?.trim()) throw new BadRequestError('请输入提示词内容')

    // 图片去重检查
    if (image_hash) {
      const dup = checkImageDuplicate(image_hash, db)
      if (dup.isDuplicate) {
        logger.info(`[Community] 图片去重命中: hash=${image_hash} existingId=${dup.existingId}`)
        // 不拒绝，但记录
      }
    }

    const result = db.prepare(
      `INSERT INTO user_prompts (user_id, title, prompt_text, category_id, is_public, image_url, image_hash, status)
       VALUES (?, ?, ?, ?, 1, ?, ?, 'published')`
    ).run(
      user.id,
      title.trim(),
      prompt_text.trim(),
      +category_id,
      image_url,
      image_hash || ''
    )

    // 更新分类计数缓存
    if (+category_id > 0) {
      db.prepare('UPDATE prompt_categories SET prompt_count = prompt_count + 1 WHERE id = ?').run(+category_id)
    }

    logger.info(`[Community] 新分享: id=${result.lastInsertRowid} user=${user.uid} title="${title.substring(0, 20)}"`)

    res.success({ id: result.lastInsertRowid }, '发布成功！你的作品已出现在社区广场 🎉')
  } catch (err) {
    next(err)
  }
}

/**
 * 社区广场列表（公开 UGC + 官方推荐混合）
 * GET /api/prompts/community
 * Query: { sort, page, page_size, category_id }
 */
export function listCommunityPosts(req, res, next) {
  try {
    const {
      sort = 'latest',
      page = 1,
      page_size = 20,
      category_id = 0,
    } = req.query

    const offset = (Math.max(1, +page) - 1) * +page_size
    const limit = Math.min(Math.max(1, +page_size), 50)

    const sortMap = {
      latest:     'up.created_at DESC',
      popular:   'up.like_count DESC',
      most_viewed:'up.view_count DESC',
    }
    const orderBy = sortMap[sort] || sortMap.latest

    // 条件：仅公开 + 非隐藏状态
    const conditions = ["up.is_public = 1", "up.status = 'published'"]
    const params = []

    if (+category_id > 0) {
      conditions.push('(up.category_id = ? OR p.category_id = ?)')
      params.push(+category_id, +category_id)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    // 查总数
    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM user_prompts up ${where}`
    ).get(...params)

    // 查列表（关联用户信息 + 分类名）
    const list = db.prepare(
      `SELECT up.id, up.user_id, up.title, up.prompt_text, up.category_id,
              up.image_url, up.view_count, up.like_count, up.created_at,
              u.nickname, u.avatar_url,
              c.name as category_name,
              (SELECT COUNT(*) FROM community_reports cr WHERE cr.prompt_id = up.id AND cr.status = 'pending') as pending_reports
       FROM user_prompts up
       LEFT JOIN users u ON up.user_id = u.id
       LEFT JOIN prompt_categories c ON up.category_id = c.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset)

    // 标记当前用户是否已点赞
    const currentUser = resolveUser(req)
    if (currentUser.id > 0) {
      for (const item of list) {
        const liked = db.prepare(
          'SELECT id FROM prompt_interactions WHERE user_id = ? AND prompt_id = ? AND action = ?'
        ).get(currentUser.id, item.id, 'community_like')
        item.is_liked = !!liked
      }
    }

    res.successPage(list, {
      page: +page,
      pageSize: limit,
      total: countRow.total,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * 社区帖子详情
 * GET /api/prompts/community/:id
 */
export function getCommunityPostDetail(req, res, next) {
  try {
    const { id } = req.params
    const user = resolveUser(req)

    const post = db.prepare(
      `SELECT up.*, u.nickname, u.avatar_url, c.name as category_name
       FROM user_prompts up
       LEFT JOIN users u ON up.user_id = u.id
       LEFT JOIN prompt_categories c ON up.category_id = c.id
       WHERE up.id = ? AND up.is_public = 1`
    ).get(+id)

    if (!post) throw new NotFoundError('分享内容不存在或已下架')

    // 浏览 +1
    db.prepare('UPDATE user_prompts SET view_count = view_count + 1 WHERE id = ?').run(+id)

    // 当前用户是否已点赞
    let is_liked = false
    if (user.id > 0) {
      const liked = db.prepare(
        'SELECT id FROM prompt_interactions WHERE user_id = ? AND prompt_id = ? AND action = ?'
      ).get(user.id, +id, 'community_like')
      is_liked = !!liked
    }

    res.success({ ...post, view_count: post.view_count + 1, is_liked })
  } catch (err) {
    next(err)
  }
}

/**
 * 社区点赞/取消点赞
 * POST /api/prompts/community/:id/like
 */
export function toggleCommunityLike(req, res, next) {
  try {
    const { id } = req.params
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录')

    const post = db.prepare('SELECT id FROM user_prompts WHERE id = ? AND is_public = 1').get(+id)
    if (!post) throw new NotFoundError('内容不存在')

    const existing = db.prepare(
      "SELECT id FROM prompt_interactions WHERE user_id = ? AND prompt_id = ? AND action = 'community_like'"
    ).get(user.id, +id)

    if (existing) {
      db.prepare('DELETE FROM prompt_interactions WHERE id = ?').run(existing.id)
      db.prepare("UPDATE user_prompts SET like_count = MAX(0, like_count - 1) WHERE id = ?").run(+id)
      res.success({ is_liked: false, like_count: Math.max(0, post.like_count - 1) }, '已取消点赞')
    } else {
      db.prepare(
        "INSERT INTO prompt_interactions (user_id, prompt_id, action) VALUES (?, ?, 'community_like')"
      ).run(user.id, +id)
      db.prepare('UPDATE user_prompts SET like_count = like_count + 1 WHERE id = ?').run(+id)
      res.success({ is_liked: true, like_count: (post.like_count || 0) + 1 }, '点赞成功 👍')
    }
  } catch (err) {
    next(err)
  }
}

/**
 * 举报内容
 * POST /api/prompts/community/:id/report
 * Body: { reason, description }
 */
export function reportCommunityPost(req, res, next) {
  try {
    const { id } = req.params
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录后举报')

    const { reason = 'other', description = '' } = req.body
    if (!['spam', 'inappropriate', 'copyright', 'other'].includes(reason)) {
      throw new BadRequestError('举报原因无效')
    }

    // 检查是否已举报过
    const existing = db.prepare(
      'SELECT id FROM community_reports WHERE reporter_id = ? AND prompt_id = ?'
    ).get(user.id, +id)
    if (existing) throw new ConflictError('你已经举报过了，我们会尽快处理')

    // 插入举报记录
    db.prepare(
      'INSERT INTO community_reports (prompt_id, reporter_id, reason, description) VALUES (?, ?, ?, ?)'
    ).run(+id, user.id, reason, description?.trim() || '')

    // 更新举报计数
    db.prepare('UPDATE user_prompts SET report_count = report_count + 1 WHERE id = ?').run(+id)

    // 举报达到阈值自动隐藏 (3 个不同用户举报)
    const reportCount = db.prepare(
      'SELECT COUNT(DISTINCT reporter_id) as cnt FROM community_reports WHERE prompt_id = ? AND status = "pending"'
    ).get(+id)
    if (reportCount.cnt >= 3) {
      db.prepare("UPDATE user_prompts SET status = 'reported' WHERE id = ?").run(+id)
      logger.warn(`[Community] 内容自动隐藏: id=${id} 举报数=${reportCount.cnt}`)
    }

    logger.info(`[Community] 收到举报: prompt=${id} reporter=${user.uid} reason=${reason}`)
    res.success(null, '举报成功，感谢反馈 🙏')
  } catch (err) {
    next(err)
  }
}

/**
 * 删除自己的社区分享
 * DELETE /api/prompts/community/:id
 */
export function deleteCommunityPost(req, res, next) {
  try {
    const { id } = req.params
    const user = resolveUser(req)
    if (user.id === 0) throw new UnauthorizedError('请先登录')

    const result = db.prepare(
      'DELETE FROM user_prompts WHERE id = ? AND user_id = ?'
    ).run(+id, user.id)

    if (result.changes === 0) throw new NotFoundError('内容不存在或无权限删除')

    res.success(null, '删除成功')
  } catch (err) {
    next(err)
  }
}