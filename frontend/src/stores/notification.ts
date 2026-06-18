import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getInbox,
  getUnreadCount,
  markAllRead as apiMarkAllRead,
  markRead as apiMarkRead,
  type NotificationItem,
} from '@/api/notification'
import { useUserStore } from './user'

/**
 * 站内信通知 Store
 * - 未读数轮询（30秒间隔）
 * - 收件箱列表
 * - 标记已读
 */
export const useNotificationStore = defineStore('notification', () => {
  // ══════════════════════════════════════════
  //  状态
  // ══════════════════════════════════════════
  const unreadCount = ref(0)
  const inbox = ref<NotificationItem[]>([])
  const loading = ref(false)
  const initialized = ref(false)

  /** 是否有未读通知 */
  const hasUnread = computed(() => unreadCount.value > 0)

  /** 轮询定时器 */
  let pollTimer: ReturnType<typeof setInterval> | null = null

  // ══════════════════════════════════════════
  //  未读数
  // ══════════════════════════════════════════

  /** 拉取未读数 */
  async function fetchUnreadCount(): Promise<void> {
    try {
      const res = await getUnreadCount()
      unreadCount.value = res?.count ?? 0
    } catch {
      // 静默失败
    }
  }

  /** 启动轮询（登录后调用） */
  function startPolling(interval = 30000): void {
    stopPolling()
    fetchUnreadCount()
    pollTimer = setInterval(fetchUnreadCount, interval)
  }

  /** 停止轮询（登出时调用） */
  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  // ══════════════════════════════════════════
  //  收件箱
  // ══════════════════════════════════════════

  /** 拉取站内信列表 */
  async function fetchInbox(limit = 20): Promise<void> {
    loading.value = true
    try {
      const list = await getInbox(limit)
      inbox.value = list ?? []
    } catch {
      inbox.value = []
    } finally {
      loading.value = false
    }
  }

  // ══════════════════════════════════════════
  //  标记已读
  // ══════════════════════════════════════════

  /** 标记全部已读 */
  async function markAllAsRead(): Promise<void> {
    try {
      await apiMarkAllRead()
      inbox.value.forEach((n) => (n.isRead = true))
      unreadCount.value = 0
    } catch {
      // 静默失败
    }
  }

  /** 标记单条已读 */
  async function markAsRead(id: number): Promise<void> {
    try {
      await apiMarkRead(id)
      const item = inbox.value.find((n) => n.id === id)
      if (item && !item.isRead) {
        item.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch {
      // 静默失败
    }
  }

  // ══════════════════════════════════════════
  //  初始化（登录后调用一次）
  // ══════════════════════════════════════════

  async function init(): Promise<void> {
    if (initialized.value) return
    const userStore = useUserStore()
    if (!userStore.isLoggedIn) return

    startPolling()
    initialized.value = true
  }

  /** 重置（登出时调用） */
  function reset(): void {
    stopPolling()
    unreadCount.value = 0
    inbox.value = []
    initialized.value = false
  }

  return {
    // 状态
    unreadCount,
    inbox,
    loading,
    hasUnread,
    initialized,
    // 方法
    fetchUnreadCount,
    fetchInbox,
    markAllAsRead,
    markAsRead,
    startPolling,
    stopPolling,
    init,
    reset,
  }
}, { persist: { paths: ['unreadCount'] } })