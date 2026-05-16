/**
 * ══════════════════════════════════════════
 *  图灵绘境 - 腾讯云 COS 对象存储服务 v2.0
 *
 *  使用官方 cos-js-sdk-v5 SDK（推荐方式）
 *  文档: https://cloud.tencent.com/document/product/436/64960
 *
 *  功能: 图片上传 / 校验 / 本地回退
 * ══════════════════════════════════════════
 */

import COS from 'cos-nodejs-sdk-v5'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import logger from '../utils/logger.js'

// ── 配置 ───────────────────────────────────

const COS_CONFIG = {
  SecretId:     process.env.COS_SECRET_ID     || '',
  SecretKey:    process.env.COS_SECRET_KEY    || '',
  Bucket:       process.env.COS_BUCKET        || '',   // 格式: xxx-1234567890
  Region:       process.env.COS_REGION        || 'ap-guangzhou',
  Domain:       process.env.COS_DOMAIN        || '',   // 自定义 CDN 域名(可选)
}

// 允许的图片格式
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

// 文件大小限制 (5MB)
const MAX_SIZE = 5 * 1024 * 1024

// 文件头魔数表（防伪装）
const MAGIC_HEADERS = {
  'ffd8':          'jpeg',
  '89504e47':      'png',
  '474946383961':  'gif',   // GIF89a
  '474946383761':  'gif',   // GIF87a
}

/**
 * 判断是否配置了 COS 凭证
 */
export function isCosConfigured() {
  return !!(COS_CONFIG.SecretId && COS_CONFIG.SecretKey && COS_CONFIG.Bucket)
}

// ══════════════════════════════════════════
//  工具函数
// ══════════════════════════════════════════

/** 获取文件扩展名 */
function getExt(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
  }
  return map[mimeType] || 'jpg'
}

/** 生成唯一文件路径: community/YYYY/MM/DD/{random32}.{ext} */
function generateKey(ext) {
  const now = new Date()
  const datePart = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
  const random = crypto.randomBytes(16).toString('hex')
  return `community/${datePart}/${random}.${ext}`
}

/** 计算图片指纹 (SHA256 前 32 位) */
function computeImageHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 32)
}

// ══════════════════════════════════════════
//  图片校验
// ══════════════════════════════════════════

/**
 * 校验图片文件
 * @param {Buffer} buffer - 文件内容
 * @param {string} mimeType - MIME 类型
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImage(buffer, mimeType) {
  // 格式校验
  if (!ALLOWED_MIMES.has(mimeType)) {
    return { valid: false, error: `不支持的图片格式: ${mimeType}，仅支持 JPG/PNG/WebP/GIF` }
  }

  // 大小校验
  if (buffer.length > MAX_SIZE) {
    return { valid: false, error: `图片太大(${(buffer.length / 1024 / 1024).toFixed(1)}MB)，限制 ${MAX_SIZE / 1024 / 1024}MB` }
  }

  // 魔数校验（防伪装）
  const hexHeader = buffer.slice(0, 8).toString('hex')
  const magicMatch =
    MAGIC_HEADERS[hexHeader.substring(0, 4)] ||
    MAGIC_HEADERS[hexHeader.substring(0, 16)]

  if (!magicMatch) {
    return { valid: false, error: '文件头异常，请上传真实图片文件' }
  }

  return { valid: true }
}

// ══════════════════════════════════════════
//  核心: 上传到腾讯云 COS (SDK 方式)
// ══════════════════════════════════════════

/**
 * 上传图片到腾讯云 COS
 *
 * 使用官方 cos-js-sdk-v5 的 putObject 方法
 * 参考: https://cloud.tencent.com/document/product/436/64960
 *
 * @param {Buffer} fileBuffer - 图片二进制数据
 * @param {string} mimeType - MIME 类型
 * @returns {Promise<{ url: string, key: string, hash: string }>}
 */
export async function uploadToCos(fileBuffer, mimeType) {
  // 1. 校验
  const validation = validateImage(fileBuffer, mimeType)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // 2. 计算指纹 + 生成路径
  const imageHash = computeImageHash(fileBuffer)
  const ext = getExt(mimeType)
  const cosKey = generateKey(ext)

  // 3. 检查 COS 配置 → 未配置则回退本地
  if (!isCosConfigured()) {
    logger.warn('[COS] 未配置 COS 凭证，回退到本地存储')
    return uploadToLocal(fileBuffer, ext, imageHash)
  }

  // 4. 创建 COS 实例（临时密钥模式 — 服务端直传用永久密钥即可）
  const cos = new COS({
    SecretId:  COS_CONFIG.SecretId,
    SecretKey: COS_CONFIG.SecretKey,
  })

  // 5. 用 SDK 的 putObject 上传（简单上传，适合 < 5MB 图片）
  try {
    const result = await new Promise((resolve, reject) => {
      cos.putObject(
        {
          Bucket: COS_CONFIG.Bucket,
          Region: COS_CONFIG.Region,
          Key: cosKey,
          Body: fileBuffer,           // Buffer 直接传入
          ContentType: mimeType,
          onProgress(progressData) {
            logger.debug(`[COS] 上传进度: ${(progressData.percent * 100).toFixed(1)}%`)
          },
        },
        (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        }
      )
    })

    // 6. 构建返回 URL
    const host = `${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com`
    const finalUrl = COS_CONFIG.Domain
      ? `https://${COS_CONFIG.Domain}/${cosKey}`
      : `https://${host}/${cosKey}`

    logger.info(`[COS] ✅ 上传成功: ${cosKey} (${(fileBuffer.length / 1024).toFixed(1)}KB)`)

    return { url: finalUrl, key: cosKey, hash: imageHash }
  } catch (err) {
    logger.error(`[COS] ❌ SDK 上传失败: ${err.message} (${err.code || err.statusCode})`)
    // 自动回退到本地存储
    logger.warn('[COS] 自动回退到本地存储')
    return uploadToLocal(fileBuffer, ext, imageHash)
  }
}

// ══════════════════════════════════════════
//  本地存储回退方案
// ══════════════════════════════════════════

/**
 * 回退到本地文件系统存储
 */
function uploadToLocal(fileBuffer, ext, imageHash) {
  const uploadDir = path.resolve(process.cwd(), 'uploads', 'community')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const fileName = `${imageHash}_${Date.now()}.${ext}`
  const filePath = path.join(uploadDir, fileName)
  fs.writeFileSync(filePath, fileBuffer)

  const url = `/uploads/community/${fileName}`
  logger.info(`[Local] 本地存储回退: ${url}`)
  return { url, key: fileName, hash: imageHash }
}
