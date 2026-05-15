/**
 * ════════════════════════════════════════════
 *  提示词多模型适配器
 *  借鉴 ImagePrompt.org: 同一分析结果可输出多种模型格式
 *  支持: 通用描述 / Flux / Midjourney / Stable Diffusion
 * ══════════════════════════════════════════
 */

/**
 * 将分析结果转换为指定模型的提示词格式
 * @param {object} analysis - AI 分析结果
 * @param {string} model - 目标模型: general | flux | midjourney | sd
 * @param {string} lang - 输出语言: en | zh
 * @returns {object} { prompt, negativePrompt, params }
 */
export function adaptPrompt(analysis, model = 'general', lang = 'en') {
  const basePrompt = analysis.prompt?.english || analysis.prompt || ''
  const style = analysis.style || ''
  const styleDesc = analysis.styleDescription || ''
  const colors = analysis.colorScheme || []
  const elements = analysis.elements || []

  // 基础元素提取
  const colorStr = colors.slice(0, 5).map(c => c.hex || c.name).join(', ')
  const elementStr = elements.slice(0, 5).map(e => e.label || e.description).join(', ')

  // 根据模型格式化
  const adapters = {
    general: () => ({
      prompt: basePrompt,
      negativePrompt: '',
      params: {},
    }),

    flux: () => ({
      prompt: buildFluxPrompt(basePrompt, style, colorStr, elementStr),
      negativePrompt: '',
      params: { guidance: 3.5, steps: 28 },
    }),

    midjourney: () => ({
      prompt: buildMidjourneyPrompt(basePrompt, style, colorStr, elementStr),
      negativePrompt: '',
      params: { ar: '1:1', q: 1, s: 750 },
    }),

    sd: () => ({
      prompt: buildSDPrompt(basePrompt, style, colorStr, elementStr),
      negativePrompt: buildSDNegative(),
      params: { steps: 30, cfg_scale: 7, sampler: 'DPM++ 2M Karras' },
    }),
  }

  const adapter = adapters[model] || adapters.general
  const result = adapter()

  // 语言处理
  if (lang === 'zh' && analysis.prompt?.chinese) {
    result.promptZh = analysis.prompt.chinese
  }

  return result
}

// ══════════════════════════════════════════
//  Flux 提示词格式
// ══════════════════════════════════════════
function buildFluxPrompt(base, style, colors, elements) {
  const parts = [base]
  if (style) parts.push(`${style} style`)
  if (colors) parts.push(`color palette of ${colors}`)
  if (elements) parts.push(`featuring ${elements}`)
  return parts.join(', ')
}

// ══════════════════════════════════════════
//  Midjourney 提示词格式
// ══════════════════════════════════════════
function buildMidjourneyPrompt(base, style, colors, elements) {
  const parts = [base]
  if (style) parts.push(`--style ${style}`)
  if (colors) parts.push(`--colors ${colors}`)
  // MJ 特有参数
  parts.push('--v 6.1')
  return parts.join(' ')
}

// ══════════════════════════════════════════
//  Stable Diffusion 提示词格式
// ══════════════════════════════════════════
function buildSDPrompt(base, style, colors, elements) {
  const parts = []
  // SD 喜欢权重语法
  if (style) parts.push(`(${style}:1.3)`)
  parts.push(base)
  if (colors) parts.push(`(${colors}:1.1)`)
  if (elements) parts.push(elements)
  // 质量标签
  parts.push('(best quality:1.2), (masterpiece:1.1), ultra detailed')
  return parts.join(', ')
}

function buildSDNegative() {
  return [
    '(worst quality:1.4), (low quality:1.4), (normal quality:1.4)',
    'blurry, deformed, ugly, bad anatomy, bad hands',
    'extra fingers, missing fingers, extra limbs',
    'cropped, watermark, text, signature',
    'nsfw, nude, naked',
  ].join(', ')
}

// ══════════════════════════════════════════
//  提示词增强器
//  借鉴 ImagePrompt.org: 简短想法 → 详细专业提示词
// ══════════════════════════════════════════

/**
 * 增强简短提示词为详细专业提示词
 * @param {string} simplePrompt - 用户输入的简短描述
 * @param {object} options - 增强选项
 * @returns {string} 增强后的提示词
 */
export function enhancePrompt(simplePrompt, options = {}) {
  const {
    style = '',          // 期望风格
    quality = 'high',    // 质量等级
    model = 'general',   // 目标模型
  } = options

  if (!simplePrompt || simplePrompt.length < 2) return simplePrompt

  // 如果已经足够详细（>100字符），只做微调
  if (simplePrompt.length > 100) {
    return addQualityBoost(simplePrompt, quality, model)
  }

  // 短提示词增强
  let enhanced = simplePrompt

  // 添加风格
  if (style) {
    enhanced += `, ${style} style`
  }

  // 添加质量描述
  if (quality === 'high' || quality === 'ultra') {
    enhanced += ', highly detailed, professional quality'
  }

  // 添加光照和构图（如果原词没有）
  if (!enhanced.includes('light') && !enhanced.includes('lighting')) {
    enhanced += ', natural lighting'
  }

  // 模型特定增强
  if (model === 'midjourney') {
    enhanced += ' --v 6.1 --q 1'
  } else if (model === 'sd') {
    enhanced += ', (best quality:1.2), (masterpiece:1.1)'
  } else if (model === 'flux') {
    enhanced += ', 4k, high resolution'
  }

  return enhanced
}

function addQualityBoost(prompt, quality, model) {
  if (quality === 'ultra') {
    if (model === 'sd') return `${prompt}, (best quality:1.3), (masterpiece:1.2), ultra detailed, 8k`
    if (model === 'flux') return `${prompt}, 8k, ultra detailed, professional photography`
    if (model === 'midjourney') return `${prompt} --v 6.1 --q 2`
  }
  return prompt
}

// ══════════════════════════════════════════
//  AI 图片描述生成器
//  借鉴 ImagePrompt.org: AI 帮助理解图片
// ══════════════════════════════════════════

/**
 * 构建图片描述/问答的 Prompt
 * @param {string} preset - 预设问题: describe | objects | style | colors | custom
 * @param {string} customQuestion - 自定义问题
 * @returns {string} 发送给 AI 的 Prompt
 */
export function buildDescriptionPrompt(preset = 'describe', customQuestion = '') {
  const presets = {
    describe: '请详细描述这张图片的内容，包括：主体、场景、构图、情绪氛围、艺术风格。用中文回答。',
    objects: '请识别并列举这张图片中的所有对象和元素，按重要性排序。用中文回答。',
    style: '请分析这张图片的艺术风格，包括：画法、流派、参考艺术家、视觉特征。用中文回答。',
    colors: '请分析这张图片的色彩方案，包括：主色调、辅助色、色彩情绪、对比关系。用中文回答。',
    custom: customQuestion,
  }

  return presets[preset] || presets.describe
}