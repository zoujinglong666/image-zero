/**
 * ══════════════════════════════════════════
 *  图灵绘境 - 社区安全中间件
 *
 *  1. 内容审核: 敏感词过滤 (标题/提示词)
 *  2. 频率限制: 防刷屏 (同一用户 N 分钟内最多 M 条)
 *  3. 图片去重: 相同图片指纹不重复发布
 * ══════════════════════════════════════════
 */

import {
  BadRequestError,
  RateLimitError,
  ConflictError,
} from './responseHandler.js'
import logger from '../utils/logger.js'

// ══════════════════════════════════════════
//  敏感词库（可扩展，后期接第三方审核 API）
// ══════════════════════════════════════════

/**
 * 敏感词列表 (分级)
 * Level 1: 轻微 → 替换为 ***
 * Level 2: 严重 → 直接拒绝
 */
const SENSITIVE_WORDS = {
  // ── Level 2: 直接拒绝 ──
  block: [
    // 涉政/违法
    '法轮功', '藏独', '台独', '疆独', '港独', '反党', '反共', '推翻', '颠覆',
    '恐怖主义', '炸弹', '炸药', '制造武器', '毒品', '吸毒', '贩毒',
    // 色情低俗
    '做爱', '性交', '淫乱', '裸体', '色情', '黄片', 'a片',
    // 暴力血腥
    '杀人', '砍死', '自杀方法', '如何自杀',
    // 诈骗相关
    '银行卡密码', '转账到', '刷单', '博彩', '赌博', '彩票内幕',
  ],
  // ── Level 1: 替换为 *** ──
  replace: [
    '傻逼', '傻b', 'sb', 'SB', '傻B', '脑残', '弱智', '白痴',
    '他妈的', 'tmd', 'TMD', '操你', 'fuck', 'FUCK', 'damn',
    '牛逼', 'nb', 'NB', '卧槽', 'woc', '我靠',
  ],
}

// ══════════════════════════════════════════
//  发布频率限制 (内存缓存)
// ══════════════════════════════════════════

const publishRateMap = new Map() // userId → { count, resetAt }
const PUBLISH_LIMIT = {
  windowMs:   60 * 60 * 1000,  // 时间窗口: 1 小时
  maxCount:   10,              // 窗口内最多发布 10 条
}

/**
 * 清理过期的频率记录 (每 5 分钟执行一次)
 */
let lastRateCleanup = Date.now()
function cleanupRateMap() {
  if (Date.now() - lastRateCleanup < 5 * 60 * 1000) return
  const now = Date.now()
  for (const [uid, data] of publishRateMap) {
    if (now > data.resetAt) publishRateMap.delete(uid)
  }
  lastRateCleanup = now
}

// ══════════════════════════════════════════
//  导出中间件函数
// ══════════════════════════════════════════

/**
 * 社区内容审核中间件
 * 检查: 敏感词 + 频率限制
 *
 * 使用方式:
 *   router.post('/publish', communityGuard, controller)
 */
export function communityGuard(req, res, next) {
  try {
    const { title = '', prompt_text = '' } = req.body || {}
    const user = req.user || {} // 由上游 auth 中间件注入

    // ── 1. 敏感词检测 ──
    const combinedText = `${title} ${prompt_text}`

    // Level 2: 严重违规 → 直接拒绝
    for (const word of SENSITIVE_WORDS.block) {
      if (combinedText.includes(word)) {
        logger.warn(`[Security] 内容违规拒绝: 用户${user.id || '?'} 包含敏感词 [${word}]`)
        throw new BadRequestError('内容包含违规信息，请修改后提交')
      }
    }

    // Level 1: 轻微 → 记录但不拦截 (可后续替换)
    let hasReplaceWord = false
    for (const word of SENSITIVE_WORDS.replace) {
      if (combinedText.toLowerCase().includes(word.toLowerCase())) {
        hasReplaceWord = true
        break
      }
    }
    if (hasReplaceWord) {
      logger.info(`[Security] 内容含轻微敏感词: 用户${user.id || '?'}`)
      // 不拦截，但标记
      req._hasMildContent = true
    }

    // ── 2. 频率限制 ──
    if (user.id > 0) {
      cleanupRateMap()
      const now = Date.now()
      const record = publishRateMap.get(user.id)

      if (!record || now > record.resetAt) {
        // 新窗口
        publishRateMap.set(user.id, { count: 1, resetAt: now + PUBLISH_LIMIT.windowMs })
      } else if (record.count >= PUBLISH_LIMIT.maxCount) {
        const remainingMin = Math.ceil((record.resetAt - now) / 60000)
        logger.warn(`[Security] 发布频率超限: 用户${user.id} (${record.count}/${PUBLISH_LIMIT.maxCount})`)
        throw new RateLimitError(`发布太频繁啦～${remainingMin}分钟后再试吧 🎨`)
      } else {
        record.count++
      }
    }

    next()
  } catch (err) {
    next(err)
  }
}

/**
 * 单独导出: 仅检查敏感词 (用于非发布场景)
 */
export function checkSensitiveText(text) {
  if (!text || typeof text !== 'string') return { safe: true }

  for (const word of SENSITIVE_WORDS.block) {
    if (text.includes(word)) {
      return { safe: false, reason: 'block', word }
    }
  }
  for (const word of SENSITIVE_WORDS.replace) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      return { safe: false, reason: 'replace', word }
    }
  }
  return { safe: true }
}

/**
 * 图片去重检查
 * @param {string} imageHash - 图片指纹
 * @param {*} db - 数据库实例
 * @returns {{ isDuplicate: boolean, existingId?: number }}
 */
export function checkImageDuplicate(imageHash, db) {
  if (!imageHash) return { isDuplicate: false }
  const existing = db.prepare(
    'SELECT id FROM user_prompts WHERE image_hash = ? AND status != "hidden" LIMIT 1'
  ).get(imageHash)
  if (existing) {
    return { isDuplicate: true, existingId: existing.id }
  }
  return { isDuplicate: false }
}
