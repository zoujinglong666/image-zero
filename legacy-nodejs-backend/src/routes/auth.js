/**
 * 认证路由
 * 微信登录 / 匿名登录 / Token 验证
 */
import { Router } from 'express'
import { wechatLogin, anonymousLogin, verifyToken, authStatus } from '../controllers/authController.js'
import { RateLimiter } from '../middlewares/rateLimiter.js'

const router = Router()
const rateLimiter = new RateLimiter()

// 认证路由独立限流规则
Object.assign(rateLimiter.rules, {
  '/api/auth/wechat': { windowMs: 60_000, max: 10 },  // 微信登录：1分钟内最多10次
  '/api/auth/token': { windowMs: 60_000, max: 5 },    // 匿名令牌：1分钟内最多5次
})

/**
 * POST /api/auth/wechat — 微信小程序登录
 * 前端 wx.login() → code → 此接口 → JWT
 */
router.post('/wechat',
  rateLimiter.middleware('/api/auth/wechat'),
  wechatLogin
)

/**
 * POST /api/auth/token — 匿名令牌（开发环境）
 */
router.post('/token',
  rateLimiter.middleware('/api/auth/token'),
  anonymousLogin
)

/**
 * GET /api/auth/verify — 验证令牌有效性
 */
router.get('/verify', verifyToken)

/**
 * GET /api/auth/status — 认证服务状态
 */
router.get('/status', authStatus)

export default router