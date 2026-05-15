/**
 * 输入验证工具
 */
import logger from './logger.js'
import fs from 'fs'
import path from 'path'

/**
 * 验证图片 URL（data URI 或 http(s) URL）
 */
export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') return false

  // data:image/*;base64,... 格式
  if (url.startsWith('data:image/')) {
    const headerMatch = url.match(/^data:image\/([^;]+);base64,/)
    if (!headerMatch) return false
    const mime = headerMatch[1]
    if (!['jpeg', 'png', 'gif', 'webp', 'bmp'].includes(mime)) return false
    const commaIdx = url.indexOf(',')
    if (commaIdx < 0 || url.length <= commaIdx + 10) return false
    return true
  }

  // http(s) URL 格式
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * 验证提示词
 */
export function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return false
  const trimmed = prompt.trim()
  return trimmed.length >= 1 && trimmed.length <= 5000
}

/**
 * 验证上传文件的魔术字节（Magic Bytes）
 * 防止伪装文件扩展名的恶意文件
 */
const MAGIC_BYTES = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (need to check WEBP further)
  'image/bmp': [[0x42, 0x4D]],
}

export function validateMagicBytes(buffer, declaredMime) {
  const signatures = MAGIC_BYTES[declaredMime]
  if (!signatures) {
    logger.warn(`未知的 MIME 类型，无法校验魔术字节: ${declaredMime}`)
    return false
  }

  return signatures.some(sig => {
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false
    }
    return true
  })
}

/**
 * 清理文件路径 — 防止路径穿越攻击
 * 去除 ../、..\\、null 字节等危险字符
 * @param {string} filename - 原始文件名
 * @returns {string} 安全的文件名
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return `upload_${Date.now()}`

  return filename
    // 去除路径分隔符和目录遍历
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // 去除 null 字节
    .replace(/\0/g, '')
    // 仅保留安全字符：字母、数字、点、横线、下划线
    .replace(/[^a-zA-Z0-9.\-_\u4e00-\u9fff]/g, '_')
    // 限制长度
    .substring(0, 128)
    || `upload_${Date.now()}`
}

/**
 * 验证上传路径安全性
 * 确保文件操作不会逃逸到 uploads 目录之外
 * @param {string} filePath - 待验证的文件路径
 * @param {string} baseDir - 允许的基础目录
 * @returns {boolean} 是否安全
 */
export function isPathSafe(filePath, baseDir) {
  const resolved = path.resolve(filePath)
  const base = path.resolve(baseDir)
  return resolved.startsWith(base + path.sep) || resolved === base
}

/**
 * 安全删除上传文件（忽略文件不存在的错误）
 */
export function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    logger.warn(`删除临时文件失败: ${filePath} - ${err.message}`)
  }
}