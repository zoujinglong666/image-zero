import type { DarkMode } from 'uview-pro/types/global'
import type { UserInfo, AuthStatusResult } from '@/types'
import { defineStore } from 'pinia'
import { useLocale, useTheme } from 'uview-pro'
import { ref, computed } from 'vue'
import {
  wechatLogin as apiWechatLogin,
  wechatH5Login as apiWechatH5Login,
  getWechatH5AuthUrl,
  guestLogin as apiGuestLogin,
  anonymousLogin as apiAnonymousLogin,
  verifyToken as apiVerifyToken,
  getAuthStatus,
} from '@/api/auth'
import { fetchProfile, updateProfile, uploadAvatar } from '@/api/data'
import { useHistoryStore } from './history'
import { useNotificationStore } from './notification'

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

  // 用户资料
  const avatarUrl = ref('')
  const nickname = ref('')

  // 计算属性
  const isWechatUser = computed(() => userInfo.value?.type === 'wechat')
  const isAnonymousUser = computed(() => userInfo.value?.type === 'anonymous')
  const isGuestUser = computed(() => userInfo.value?.type === 'guest')
  const isGuest = computed(() => !isLoggedIn.value)
  const isAdmin = computed(() => userInfo.value?.role === 'ADMIN')
  const userDisplayName = computed(() => {
    if (!isLoggedIn.value) return '未登录'
    if (nickname.value) return nickname.value
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
  //  用户资料
  // ══════════════════════════════════════════

  /** 从后端拉取用户完整资料（头像/昵称等） */
  async function loadProfile(): Promise<void> {
    try {
      const profile = await fetchProfile()
      if (profile) {
        avatarUrl.value = profile.avatarUrl || ''
        nickname.value = profile.nickname || ''

        // 同步到 userInfo
        if (userInfo.value) {
          userInfo.value.avatarUrl = profile.avatarUrl || ''
          userInfo.value.nickname = profile.nickname || ''
        }
      }
    } catch (e) {
      console.warn('[Auth] 拉取用户资料失败（不影响登录）:', e)
    }
  }

  /** 更新昵称并同步到后端 */
  async function updateNickname(newNickname: string): Promise<boolean> {
    if (!newNickname.trim()) return false
    try {
      await updateProfile({ nickname: newNickname })
      nickname.value = newNickname
      if (userInfo.value) {
        userInfo.value.nickname = newNickname
      }
      return true
    } catch (e: any) {
      console.error('[Profile] 更新昵称失败:', e.message)
      uni.showToast({ title: '昵称更新失败', icon: 'none' })
      return false
    }
  }

  /** 上传头像并更新到后端 */
  async function updateAvatar(tempFilePath: string): Promise<boolean> {
    try {
      const result = await uploadAvatar(tempFilePath)
      const url = result?.url || ''
      if (url) {
        await updateProfile({ avatarUrl: url })
        // 强制重新从后端拉取最新资料，确保数据一致
        await loadProfile()
        return true
      }
      // 上传成功但没有返回 URL
      console.error('[Profile] 上传成功但无 URL 返回:', result)
      uni.showToast({ title: '头像上传失败（无地址）', icon: 'none' })
      return false
    } catch (e: any) {
      console.error('[Profile] 上传头像失败:', e.message, e)
      uni.showToast({ title: '头像更新失败: ' + (e.message || '未知错误'), icon: 'none' })
      return false
    }
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

      if (result.token) {
        saveToken(result.token)

        userInfo.value = {
          uid: result.user.uid,
          type: 'wechat',
          role: result.user.role || 'USER',
          token: result.token,
          loginAt: Date.now(),
          avatarUrl: '',
          nickname: '',
        }

        userName.value = `微信用户 ${result.user.uid.slice(0, 6)}`
        isLoggedIn.value = true

        // 登录成功后拉取完整用户资料
        await loadProfile()

        // 初始化通知轮询
        try {
          const notificationStore = useNotificationStore()
          notificationStore.init()
        } catch (e) {
          console.warn('[Auth] 通知初始化失败（不影响登录）:', e)
        }

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
  //  H5微信网页授权登录
  // ══════════════════════════════════════════

  /**
   * H5微信网页授权登录（在微信内浏览器中使用）
   * 流程：获取授权URL → 重定向 → 微信回调带code → 用code换JWT
   *
   * @param redirectUri 授权后回调的前端页面URL
   */
  async function wechatH5Login(redirectUri?: string): Promise<boolean> {
    if (isLoggingIn.value) return false
    isLoggingIn.value = true

    try {
      // 默认回调到当前页面
      const callbackUri = redirectUri || window.location.href.split('?')[0]
      const { url } = await getWechatH5AuthUrl(callbackUri, 'snsapi_userinfo')

      // 重定向到微信授权页
      window.location.href = url
      return true // 重定向后不会执行到这里
    } catch (err: any) {
      console.error('[Auth] H5微信授权失败:', err.message)
      uni.showToast({
        title: err.message || '微信授权失败',
        icon: 'none',
        duration: 3000,
      })
      return false
    } finally {
      isLoggingIn.value = false
    }
  }

  /**
   * 处理H5微信网页授权回调
   * 从URL参数中提取code，发送到后端换取JWT
   */
  async function handleWechatH5Callback(code: string): Promise<boolean> {
    if (isLoggingIn.value) return false
    isLoggingIn.value = true

    try {
      const result = await apiWechatH5Login(code)

      if (result.token) {
        saveToken(result.token)

        userInfo.value = {
          uid: result.user.uid,
          type: 'wechat',
          role: (result.user as any).role || 'USER',
          token: result.token,
          loginAt: Date.now(),
          avatarUrl: (result.user as any).avatarUrl || '',
          nickname: (result.user as any).nickname || '',
        }

        userName.value = (result.user as any).nickname || `微信用户 ${result.user.uid.slice(0, 6)}`
        isLoggedIn.value = true

        await loadProfile()

        try {
          const historyStore = useHistoryStore()
          await historyStore.syncLocalToServer()
        } catch (e) {
          console.warn('[Auth] 历史同步失败（不影响登录）:', e)
        }

        console.log('[Auth] H5微信登录成功:', result.user.uid)
        return true
      }

      return false
    } catch (err: any) {
      console.error('[Auth] H5微信登录失败:', err.message)
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
  //  游客登录（非微信环境）
  // ══════════════════════════════════════════

  /** 游客登录 — 非微信环境（普通浏览器/PC） */
  async function guestLoginAction(): Promise<boolean> {
    if (isLoggingIn.value) return false
    isLoggingIn.value = true

    try {
      const result = await apiGuestLogin()

      if (result.token) {
        saveToken(result.token)

        userInfo.value = {
          uid: result.user?.uid || `guest_${Date.now()}`,
          type: 'guest',
          role: result.user?.role || 'USER',
          token: result.token,
          loginAt: Date.now(),
          avatarUrl: '',
          nickname: '游客',
        }

        userName.value = '游客'
        isLoggedIn.value = true

        await loadProfile()

        console.log('[Auth] 游客登录成功')
        return true
      }

      return false
    } catch (err: any) {
      console.error('[Auth] 游客登录失败:', err.message)
      uni.showToast({
        title: err.message || '游客登录失败',
        icon: 'none',
      })
      return false
    } finally {
      isLoggingIn.value = false
    }
  }

  /** 匿名登录 - 向后兼容，已废弃 */
  async function anonymousLoginAction(): Promise<boolean> {
    return guestLoginAction()
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
          role: result.user.role || 'USER',
          token: token.value,
          loginAt: userInfo.value?.loginAt || Date.now(),
          avatarUrl: avatarUrl.value,
          nickname: nickname.value,
        }
        isLoggedIn.value = true

        // Token 有效时拉取最新资料
        await loadProfile()

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
    // 1. H5环境：检查URL中是否有微信回调的code参数
    // #ifdef H5
    const urlParams = new URLSearchParams(window.location.search)
    const wechatCode = urlParams.get('code')
    const wechatState = urlParams.get('state')
    if (wechatCode) {
      // 清除URL中的code/state参数（防止刷新重复使用）
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)

      const success = await handleWechatH5Callback(wechatCode)
      if (success) {
        console.log('[Auth] H5微信授权自动登录成功')
        return true
      }
    }
    // #endif

    // 2. 检查本地 Token
    const savedToken = uni.getStorageSync('token') || ''
    if (savedToken) {
      token.value = savedToken
      const valid = await checkToken()
      if (valid) {
        console.log('[Auth] 自动登录成功（Token 有效）')
        return true
      }
    }

    // 3. H5环境且无Token：尝试游客登录（H5不应让用户无法使用）
    // #ifdef H5
    try {
      const success = await guestLoginAction()
      if (success) {
        console.log('[Auth] 自动游客登录成功')
        return true
      }
    } catch {
      // 游客登录也失败，保持未登录状态
    }
    // #endif

    // 4. 查询认证服务状态
    try {
      authStatus.value = await getAuthStatus()
    } catch {
      // 后端不可用，保持游客状态
    }

    console.log('[Auth] 未自动登录，保持游客状态')
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
    avatarUrl.value = ''
    nickname.value = ''
    // 重置通知
    try {
      const notificationStore = useNotificationStore()
      notificationStore.reset()
    } catch {
      // ignore
    }
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
    avatarUrl.value = ''
    nickname.value = ''
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

  // ══════════════════════════════════════════
  //  登录守卫 — 操作前确保已登录
  // ══════════════════════════════════════════

  /**
   * 确保用户已登录；未登录时弹出提示引导登录。
   * 用于上传、生图等需要身份认证的操作前。
   * @returns true = 已登录可继续操作, false = 未登录已取消
   */
  function ensureLogin(): Promise<boolean> {
    if (isLoggedIn.value) return Promise.resolve(true)

    return new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '请先登录',
        content: '上传图片与生成图片需要先登录账号',
        confirmText: '立即登录',
        cancelText: '取消',
        success: async (res) => {
          if (!res.confirm) {
            resolve(false)
            return
          }
          // 微信小程序 → 微信登录
          // #ifdef MP-WEIXIN
          const ok = await wechatLogin()
          resolve(ok)
          // #endif

          // H5 环境 → 游客登录
          // #ifdef H5
          const okH5 = await guestLoginAction()
          resolve(okH5)
          // #endif

          // 其他环境兜底
          // #ifndef MP-WEIXIN || H5
          const okOther = await guestLoginAction()
          resolve(okOther)
          // #endif
        },
      })
    })
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
    // 用户资料
    avatarUrl,
    nickname,
    // 计算属性
    isWechatUser,
    isAnonymousUser,
    isGuestUser,
    isGuest,
    userDisplayName,
    isAdmin,
    // 认证方法
    login,
    logout,
    ensureLogin,
    wechatLogin,
    wechatH5Login,
    handleWechatH5Callback,
    guestLogin: guestLoginAction,
    anonymousLogin: anonymousLoginAction,
    checkToken,
    autoLogin,
    // 用户资料方法
    loadProfile,
    updateNickname,
    updateAvatar,
    // 偏好设置
    updateTheme,
    setLanguage,
    toggleNotifications,
    clearData,
  }
}, { persist: true })
