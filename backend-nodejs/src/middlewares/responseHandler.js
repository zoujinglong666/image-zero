/**
 * ════════════════════════════════════════════
 *  全局结果返回器 + 异常处理器
 *
 *  统一响应格式:
 *  成功: { code: 0, data: {...}, message: '操作成功' }
 *  失败: { code: <HTTP状态码>, data: null, message: '错误描述' }
 *  例:   { code: 400, data: null, message: '请求参数有误' }
 *        { code: 401, data: null, message: '身份验证已过期' }
 *        { code: 500, data: null, message: '服务器繁忙' }
 *
 *  使用方式:
 *  - Controller 中 throw new XxxError('错误')  // code 自动取对应状态码
 *  - 中间件中 next(new XxxError('错误'))
 *  - 成功直接 return res.success(data, '操作成功')
 *  - 分页 return res.successPage(list, pagination)
 * ════════════════════════════════════════════
 */

import logger from '../utils/logger.js'

// ══════════════════════════════════════════
//  自定义业务异常 — code 统一为数字状态码
// ══════════════════════════════════════════
export class AppError extends Error {
  constructor(message, statusCode = 500, code, detail = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    // code 未传则取 statusCode，保证始终为数字
    this.code = typeof code === 'number' ? code : statusCode
    this.detail = detail
  }
}

// 预定义常用错误（快捷创建）— code 默认等于 HTTP 状态码
export class BadRequestError extends AppError {
  constructor(message = '请求参数有误', code, detail = null) {
    super(message, 400, code, detail)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '身份验证已过期，请重新登录', code, detail = null) {
    super(message, 401, code, detail)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '没有操作权限', code, detail = null) {
    super(message, 403, code, detail)
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在', code, detail = null) {
    super(message, 404, code, detail)
  }
}

export class ConflictError extends AppError {
  constructor(message = '资源冲突', code, detail = null) {
    super(message, 409, code, detail)
  }
}

export class RateLimitError extends AppError {
  constructor(message = '操作过于频繁，请稍后再试', code, detail = null) {
    super(message, 429, code, detail)
  }
}

export class InternalError extends AppError {
  constructor(message = '服务器内部错误', code, detail = null) {
    super(message, 500, code, detail)
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = '服务暂时不可用', code, detail = null) {
    super(message, 503, code, detail)
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(message = '请求处理超时', code, detail = null) {
    super(message, 504, code, detail)
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
    res.json({ code: 0, data, message })
  }

  /**
   * 分页成功响应
   * @param {Array} list - 数据列表
   * @param {object} pagination - 分页信息 { page, pageSize, total, totalPages }
   * @param {string} message - 提示信息
   */
  res.successPage = (list = [], pagination = {}, message = '查询成功') => {
    res.json({
      code: 0,
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
    res.status(201).json({ code: 0, data, message })
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
  let code = typeof err.code === 'number' ? err.code : statusCode
  let message = err.message || '服务器内部错误'

  // JWT 错误映射
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    code = 401
    message = '身份验证失败，请重新登录'
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    code = 401
    message = '登录已过期，请重新登录'
  }

  // Multer 错误映射
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413
    code = 413
    message = '图片文件太大，请压缩后重试'
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400
    code = 400
    message = '上传文件数量超限'
  }

  // CORS 错误
  if (err.message && err.message.includes('CORS')) {
    statusCode = 403
    code = 403
    message = '请求来源不被允许'
  }

  // 未知错误不暴露内部信息
  const isOperational = err instanceof AppError
  if (!isOperational && statusCode >= 500) {
    message = '服务器繁忙，请稍后重试'
  }

  // 日志
  if (statusCode >= 500) {
    logger.error(`[${code}] ${message}`, { stack: err.stack, path: req.path })
  } else if (statusCode >= 400) {
    logger.warn(`[${code}] ${message} | ${req.method} ${req.path}`)
  }

  // 响应 — 统一格式，code 始终为数字
  res.status(statusCode).json({
    code,
    data: null,
    message,
  })
}

// ══════════════════════════════════════════
//  404 兜底
// ══════════════════════════════════════════
function notFoundHandler(req, res) {
  res.status(404).json({
    code: 404,
    data: null,
    message: '接口不存在',
  })
}

export { successResponse, globalErrorHandler, notFoundHandler }
