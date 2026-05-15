import type { DarkMode } from 'uview-pro/types/global'
import type { UserInfo, AuthStatusResult } from '@/types'
import { defineStore } from 'pinia'
import { useLocale, useTheme } from 'uview-pro'
import { ref, computed } from 'vue'
import { wechatLogin as apiWechatLogin, anonymousLogin as apiAnonymousLogin, verifyToken as apiVerifyToken, getAuthStatus } from '@/api/auth'
import { useHistoryStore } from './history'

export const useUserStore = defineStore('user', () => {
  // ══════════════════════════════════════════
  //  基础状态
  // ══════════════════════════════════════════
  const userName = ref('')
  const isLoggedIn = ref(false)
  const preferences = ref({
    theme: 'light',
    language: 'zh-CN',
    notifications: true,
  })

  // 认证状态
  const token = ref('')
  const userInfo = ref<UserInfo | null>(null)
  const authStatus = ref<AuthStatusResult | null>(null)
  const isLoggingIn = ref(false)

  // 计算属性
  const isWechatUser = computed(() => userInfo.value?.type === 'wechat')
  const isAnonymousUser = computed(() => userInfo.value?.type === 'anonymous')
  const isGuest = computed(() => !isLoggedIn.value)
  const userDisplayName = computed(() => {
    if (!isLoggedIn.value) return '未登录'
    if (userInfo.value?.type === 'wechat') return `微信用户 ${userInfo.value.uid.slice(0, 6)}`
    if (userInfo.value?.type === 'anonymous') return '访客'
    return '未登录'
  })

  const { setDarkMode } = useTheme()
  const { setLocale } = useLocale()

  // ══════════════════════════════════════════
  //  Token 管理
  // ══════════════════════════════════════════

  /** 保存 Token 到 Store 和 Storage */
  function saveToken(newToken: string) {
    token.value = newToken
    uni.setStorageSync('token', newToken)
  }

  /** 清除 Token */
  function clearToken() {
    token.value = ''
    uni.removeStorageSync('token')
  }

  // ══════════════════════════════════════════
  //  微信登录
  // ══════════════════════════════════════════

  /** 微信小程序登录 */
  async function wechatLogin(): Promise<boolean> {
    if (isLoggingIn.value) return false
    isLoggingIn.value = true

    try {
      const result = await apiWechatLogin()

      if (result.success && result.token) {
        saveToken(result.token)

        userInfo.value = {
          uid: result.user.uid,
          type: 'wechat',
          token: result.token,
          loginAt: Date.now(),
        }

        userName.value = `微信用户 ${result.user.uid.slice(0, 6)}`
        isLoggedIn.value = true

        // 登录成功后同步本地历史到后端
        try {
          const historyStore = useHistoryStore()
          await historyStore.syncLocalToServer()
        } catch (e) {
          console.warn('[Auth] 历史同步失败（不影响登录）:', e)
        }

        console.log('✅ [Auth] 微信登录成功:', result.user.uid)
        return true
      }

      return false
    } catch (err: any) {
      console.error('❌ [Auth] 微信登录失败:', err.message)
      uni.showToast({
        title: err.message || '微信登录失败',
        icon: 'none',
        duration: 3000,
      })
      return false
    } finally {
      isLoggingIn.value = false
    }
  }

  // ══════════════════════════════════════════
  //  匿名登录（开发环境）
  // ══════════════════════════════════════════

  /** 匿名登录 - 仅开发环境可用 */
  async function anonymousLoginAction(): Promise<boolean> {
    if (isLoggingIn.value) return false
    isLoggingIn.value = true

    try {
      const result = await apiAnonymousLogin()

      if (result.success && result.token) {
        saveToken(result.token)

        userInfo.value = {
          uid: `anon_${Date.now()}`,
          type: 'anonymous',
          token: result.token,
          loginAt: Date.now(),
        }

        userName.value = '访客'
        isLoggedIn.value = true

        console.log('✅ [Auth] 匿名登录成功')
        return true
      }

      return false
    } catch (err: any) {
      console.error('❌ [Auth] 匿名登录失败:', err.message)
      uni.showToast({
        title: err.message || '匿名登录失败',
        icon: 'none',
      })
      return false
    } finally {
      isLoggingIn.value = false
    }
  }

  // ══════════════════════════════════════════
  //  Token 验证 & 自动登录
  // ══════════════════════════════════════════

  /** 验证当前 Token 是否仍然有效 */
  async function checkToken(): Promise<boolean> {
    if (!token.value) return false

    try {
      const result = await apiVerifyToken()
      if (result.valid && result.user) {
        userInfo.value = {
          uid: result.user.uid || result.user.id || '',
          type: result.user.type,
          token: token.value,
          loginAt: userInfo.value?.loginAt || Date.now(),
        }
        isLoggedIn.value = true
        return true
      }

      // Token 无效，清除
      clearToken()
      userInfo.value = null
      isLoggedIn.value = false
      return false
    } catch {
      clearToken()
      userInfo.value = null
      isLoggedIn.value = false
      return false
    }
  }

  /** 应用启动时自动登录 */
  async function autoLogin(): Promise<boolean> {
    // 1. 检查本地 Token
    const savedToken = uni.getStorageSync('token') || ''
    if (savedToken) {
      token.value = savedToken
      const valid = await checkToken()
      if (valid) {
        console.log('✅ [Auth] 自动登录成功（Token 有效）')
        return true
      }
    }

    // 2. 查询认证服务状态
    try {
      authStatus.value = await getAuthStatus()
    } catch {
      // 后端不可用，保持游客状态
    }

    console.log('ℹ️ [Auth] 未自动登录，保持游客状态')
    return false
  }

  // ══════════════════════════════════════════
  //  登出
  // ══════════════════════════════════════════

  function logout() {
    clearToken()
    isLoggedIn.value = false
    userName.value = ''
    userInfo.value = null
  }

  // ══════════════════════════════════════════
  //  偏好设置（保留原有功能）
  // ══════════════════════════════════════════

  function updateTheme(theme: DarkMode) {
    preferences.value.theme = theme
    try {
      setDarkMode(theme)
    } catch {
      // ignore if hook not available in runtime
    }
  }

  function setLanguage(locale: string) {
    preferences.value.language = locale
    try {
      setLocale(locale)
    } catch {
      // ignore
    }
  }

  function toggleNotifications() {
    preferences.value.notifications = !preferences.value.notifications
  }

  function clearData() {
    uni.clearStorage()
    clearToken()
    userName.value = ''
    isLoggedIn.value = false
    userInfo.value = null
    preferences.value = {
      theme: 'light',
      language: 'zh-CN',
      notifications: true,
    }
  }

  // 保留原有 login 函数签名（兼容）
  function login(name: string) {
    if (!name || !name.trim()) {
      throw new Error('用户名不能为空')
    }
    userName.value = name
    isLoggedIn.value = true
  }

  return {
    // 状态
    userName,
    isLoggedIn,
    preferences,
    token,
    userInfo,
    authStatus,
    isLoggingIn,
    // 计算属性
    isWechatUser,
    isAnonymousUser,
    isGuest,
    userDisplayName,
    // 认证方法
    login,
    logout,
    wechatLogin,
    anonymousLogin: anonymousLoginAction,
    checkToken,
    autoLogin,
    // 偏好设置
    updateTheme,
    setLanguage,
    toggleNotifications,
    clearData,
  }
}, { persist: true })