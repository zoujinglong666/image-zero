/**
 * 微信小程序登录服务
 * 文档: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
 */
import axios from 'axios'
import config from '../config/index.js'
import logger from '../utils/logger.js'

const CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session'

/**
 * 用微信 code 换取 openid + session_key
 * @param {string} code - wx.login 获取的临时登录凭证
 * @returns {{ openid: string, session_key: string, unionid?: string }}
 */
export async function code2Session(code) {
  if (!config.wechat.appid || !config.wechat.secret) {
    throw new Error('微信小程序未配置 (WX_APPID / WX_SECRET)')
  }

  const params = {
    appid: config.wechat.appid,
    secret: config.wechat.secret,
    js_code: code,
    grant_type: 'authorization_code',
  }

  try {
    const res = await axios.get(CODE2SESSION_URL, {
      params,
      timeout: 10000,
    })

    const data = res.data

    // 微信接口错误码检查
    if (data.errcode) {
      const errMap = {
        '-1': '微信系统繁忙，请稍后重试',
        40029: 'code 无效或已过期',
        45011: '频率限制，请稍后重试',
        40013: 'appid 无效',
        40125: 'appsecret 错误',
      }
      const msg = errMap[data.errcode] || data.errmsg || '未知错误'
      logger.warn(`微信 code2Session 失败: errcode=${data.errcode} ${msg}`)
      throw new Error(`微信登录失败: ${msg}`)
    }

    logger.info(`微信登录成功: openid=${data.openid?.substring(0, 8)}...`)

    return {
      openid: data.openid,
      session_key: data.session_key,
      unionid: data.unionid || undefined,
    }
  } catch (err) {
    if (err.response) {
      logger.error(`微信 API 请求失败: ${err.response.status}`)
      throw new Error('微信服务不可用，请稍后重试')
    }
    throw err
  }
}

/**
 * 检查微信登录是否已配置
 */
export function isWechatConfigured() {
  return !!(config.wechat.appid && config.wechat.secret)
}