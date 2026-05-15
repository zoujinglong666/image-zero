/**
 * ════════════════════════════════════════════
 *  全局结果返回器 + 异常处理器
 *
 *  统一响应格式:
 *  { success: true,  data: {...}, message: '操作成功' }
 *  { success: false, error: '错误描述', code: 'ERROR_CODE', detail: null }
 *
 *  使用方式:
 *  - Controller 中 throw new AppError('错误', 400, 'ERROR_CODE')
 *  - 成功直接 return res.success(data, '操作成功')
 *  - 分页 return res.successPage(list, pagination)
 * ══════════════════════════════════════════
 */

import logger from '../utils/logger.js'

// ══════════════════════════════════════════
//  自定义业务异常
// ══════════════════════════════════════════
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', detail = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.detail = detail
  }
}

// 预定义常用错误（快捷创建）
export class BadRequestError extends AppError {
  constructor(message = '请求参数有误', code = 'BAD_REQUEST') {
    super(message, 400, code)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '身份验证已过期，请重新登录', code = 'UNAUTHORIZED') {
    super(message, 401, code)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '没有操作权限', code = 'FORBIDDEN') {
    super(message, 403, code)
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在', code = 'NOT_FOUND') {
    super(message, 404, code)
  }
}

export class RateLimitError extends AppError {
  constructor(message = '操作过于频繁，请稍后再试', code = 'RATE_LIMITED') {
    super(message, 429, code)
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = '服务暂时不可用', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code)
  }
}

// ══════════════════════════════════════════
//  统一结果返回器（挂载到 res 对象）
// ══════════════════════════════════════════
function successResponse(req, res, next) {
  /**
   * 成功响应
   * @param {*} data - 返回数据
   * @param {string} message - 提示信息
   */
  res.success = (data = null, message = '操作成功') => {
    res.json({ success: true, data, message })
  }

  /**
   * 分页成功响应
   * @param {Array} list - 数据列表
   * @param {object} pagination - 分页信息 { page, pageSize, total, totalPages }
   * @param {string} message - 提示信息
   */
  res.successPage = (list = [], pagination = {}, message = '查询成功') => {
    res.json({
      success: true,
      data: { list, pagination },
      message,
    })
  }

  /**
   * 创建成功响应 (201)
   * @param {*} data - 返回数据
   * @param {string} message - 提示信息
   */
  res.created = (data = null, message = '创建成功') => {
    res.status(201).json({ success: true, data, message })
  }

  /**
   * 无内容响应 (204) - 删除成功等
   */
  res.noContent = () => {
    res.status(204).end()
  }

  next()
}

// ══════════════════════════════════════════
//  全局异常处理器
// ══════════════════════════════════════════
function globalErrorHandler(err, req, res, _next) {
  // 默认值
  let statusCode = err.statusCode || 500
  let code = err.code || 'INTERNAL_ERROR'
  let message = err.message || '服务器内部错误'
  let detail = err.detail || null

  // JWT 错误映射
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    code = 'INVALID_TOKEN'
    message = '令牌无效'
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    code = 'TOKEN_EXPIRED'
    message = '令牌已过期'
  }

  // Multer 错误映射
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413
    code = 'IMAGE_TOO_LARGE'
    message = '图片文件太大，请压缩后重试'
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400
    code = 'TOO_MANY_FILES'
    message = '上传文件数量超限'
  }

  // CORS 错误
  if (err.message && err.message.includes('CORS')) {
    statusCode = 403
    code = 'CORS_DENIED'
    message = '跨域请求被拒绝'
  }

  // 未知错误不暴露内部信息
  const isOperational = err instanceof AppError
  if (!isOperational && statusCode >= 500) {
    message = '服务器内部错误，请稍后重试'
    detail = null
  }

  // 日志
  if (statusCode >= 500) {
    logger.error(`[${code}] ${message}`, { stack: err.stack, path: req.path })
  } else if (statusCode >= 400) {
    logger.warn(`[${code}] ${message} | ${req.method} ${req.path}`)
  }

  // 响应
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(detail && { detail }),
  })
}

// ══════════════════════════════════════════
//  404 兜底
// ══════════════════════════════════════════
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `接口不存在: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  })
}

export { successResponse, globalErrorHandler, notFoundHandler }