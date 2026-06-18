/**
 * 智谱 GLM-Image 生图服务
 * 文档: https://docs.bigmodel.cn/cn/guide/models/image-generation/glm-image
 * 调用方式: OpenAI SDK 兼容接口
 */
import OpenAI from 'openai'
import config from '../config/index.js'
import logger from '../utils/logger.js'
import { CircuitBreaker } from '../middlewares/circuitBreaker.js'

const generateCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 60_000,
  timeoutMs: 120_000, // 生图耗时约 5-20s，给足超时
})

// 单例 OpenAI 客户端（智谱兼容接口）
let zhipuClient = null

export function initZhipuClient() {
  const apiKey = config.zhipu?.apiKey || process.env.ZHIPU_API_KEY || ''
  if (!apiKey) {
    logger.warn('[智谱] ZHIPU_API_KEY 未配置，GLM-Image 生图不可用')
    return false
  }
  zhipuClient = new OpenAI({
    apiKey,
    baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
    timeout: 120_000,
  })
  logger.info(`[智谱] GLM-Image 客户端已初始化 | model: ${config.zhipu?.model || 'glm-image'}`)
  return true
}

/**
 * 调用智谱 GLM-Image 生成图片
 * @param {string} prompt      - 提示词（中文/英文均可）
 * @param {object} options
 * @param {'glm-image'|'cogview-4'|'cogview-3-flash'} options.model  - 模型
 * @param {string}  options.size    - 图片尺寸，默认 1280x1280
 * @param {'hd'|'standard'} options.quality - 质量，glm-image 仅支持 hd
 * @param {boolean} options.watermark_enabled - 是否加水印，默认 true
 * @param {string} options.user_id  - 终端用户 ID（安全审计用）
 * @returns {Promise<{url: string, revised_prompt: string}>}
 */
export async function generateWithZhipu(prompt, options = {}) {
  if (!zhipuClient) {
    throw new Error('智谱客户端未初始化，请检查 ZHIPU_API_KEY')
  }

  const {
    model = config.zhipu?.model || 'glm-image',
    size = '1280x1280',
    quality = 'hd',
    watermark_enabled = true,
    user_id = '',
  } = options

  return await generateCircuitBreaker.execute(async () => {
    logger.info(`[智谱生图] model=${model} size=${size} quality=${quality} prompt="${prompt.slice(0, 80)}..."`)

    const startTime = Date.now()

    const params = {
      model,
      prompt,
      size,
      quality,
      watermark_enabled,
    }
    if (user_id) params.user_id = String(user_id).slice(0, 128)

    const response = await zhipuClient.images.generate(params)

    const elapsed = Date.now() - startTime
    const imageUrl = response?.data?.[0]?.url || ''

    if (!imageUrl) {
      logger.error(`[智谱生图] 响应异常: ${JSON.stringify(response).slice(0, 300)}`)
      throw new Error('生图响应异常，未获取到图片地址')
    }

    logger.info(`[智谱生图] 成功! 耗时 ${elapsed}ms | URL有效期30天`)

    return {
      url: imageUrl,
      revised_prompt: prompt,
      model,
      size,
      elapsed,
    }
  }, 'Zhipu-Generate')
}

/**
 * 获取智谱服务状态
 */
export function getZhipuServiceStatus() {
  return {
    configured: !!zhipuClient,
    model: config.zhipu?.model || 'glm-image',
    circuitBreaker: generateCircuitBreaker.getStatus(),
  }
}
