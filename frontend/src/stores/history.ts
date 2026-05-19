/**
 * 历史记录 Store — 后端优先 + 本地缓存兜底
 *
 * 策略:
 * 1. 已登录 → 所有操作走后端 API，本地缓存作为离线兜底
 * 2. 未登录 → 仅使用本地缓存（纯前端）
 * 3. 登录后自动同步本地记录到后端
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchHistory,
  createHistory,
  toggleFavorite as apiToggleFavorite,
  deleteHistory as apiDeleteHistory,
  clearAllHistory as apiClearAllHistory,
} from '@/api/data'
import type { HistoryItem as ApiHistoryItem } from '@/api/data'
import { useUserStore } from './user'

// 兼容前端原有 SimpleHistoryItem
export interface SimpleHistoryItem {
  id: string
  imageUrl: string
  prompt: string
  timestamp: number
  favorite: boolean
}

const STORAGE_KEY = 'turing_history_v2'
const MAX_LOCAL_COUNT = 50

export const useHistoryStore = defineStore('history', () => {
  // ══════════════════════════════════════════
  //  核心状态
  // ══════════════════════════════════════════
  const history = ref<SimpleHistoryItem[]>([])
  const loading = ref(false)
  const currentPage = ref(1)
  const totalPages = ref(1)
  const totalCount = ref(0)

  const userStore = useUserStore()
  const isLoggedIn = computed(() => userStore.isLoggedIn)

  // ══════════════════════════════════════════
  //  本地缓存操作
  // ══════════════════════════════════════════
  function loadFromStorage() {
    try {
      const data = uni.getStorageSync(STORAGE_KEY)
      if (data && typeof data === 'string') {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed)) history.value = parsed
      }
    } catch (e) {
      console.error('[History] 加载本地缓存失败:', e)
      history.value = []
    }
  }

  function saveToStorage() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(history.value))
    } catch (e) {
      console.error('[History] 保存本地缓存失败:', e)
    }
  }

  // ══════════════════════════════════════════
  //  后端 API ↔ 本地转换
  // ══════════════════════════════════════════
  function apiToLocal(item: ApiHistoryItem): SimpleHistoryItem {
    return {
      id: String(item.id),
      imageUrl: item.imageUrl || '',
      prompt: item.prompt || item.promptEn || '',
      timestamp: item.timestamp,
      favorite: item.favorite,
    }
  }

  // ══════════════════════════════════════════
  //  从后端刷新
  // ══════════════════════════════════════════
  async function refreshFromServer(page = 1) {
    if (!isLoggedIn.value) return

    loading.value = true
    try {
      const result = await fetchHistory({ page, pageSize: 20 })
      history.value = result.list.map(apiToLocal)
      currentPage.value = result.pagination.page
      totalPages.value = result.pagination.totalPages
      totalCount.value = result.pagination.total
      // 同步到本地缓存
      saveToStorage()
    } catch (e) {
      console.warn('[History] 后端加载失败，使用本地缓存:', e)
    } finally {
      loading.value = false
    }
  }

  // ══════════════════════════════════════════
  //  添加历史记录（双写）
  // ══════════════════════════════════════════
  function addHistory(item: SimpleHistoryItem) {
    // 1. 本地立刻写入（即时响应）
    history.value.unshift(item)
    if (history.value.length > MAX_LOCAL_COUNT) {
      history.value = history.value.slice(0, MAX_LOCAL_COUNT)
    }
    saveToStorage()

    // 2. 后端异步写入（不阻塞 UI）
    if (isLoggedIn.value) {
      createHistory({
        type: 'analyze',
        imageUrl: item.imageUrl,
        promptCn: item.prompt,
        style: '',
      }).catch(e => console.warn('[History] 后端写入失败:', e))
    }
  }

  // ══════════════════════════════════════════
  //  切换收藏（双写）
  // ══════════════════════════════════════════
  function updateFavorite(id: string, favorite: boolean) {
    // 本地立刻更新
    const item = history.value.find(h => h.id === id)
    if (item) {
      item.favorite = favorite
      saveToStorage()
    }

    // 后端异步
    if (isLoggedIn.value) {
      apiToggleFavorite(parseInt(id)).catch(e => console.warn('[History] 后端收藏操作失败:', e))
    }
  }

  // ══════════════════════════════════════════
  //  删除记录（双写）
  // ══════════════════════════════════════════
  function removeHistory(id: string) {
    // 本地立刻删除
    history.value = history.value.filter(item => item.id !== id)
    saveToStorage()

    // 后端异步
    if (isLoggedIn.value) {
      apiDeleteHistory(parseInt(id)).catch(e => console.warn('[History] 后端删除失败:', e))
    }
  }

  // ══════════════════════════════════════════
  //  清空（双写）
  // ══════════════════════════════════════════
  function clearHistory() {
    history.value = []
    saveToStorage()

    if (isLoggedIn.value) {
      apiClearAllHistory().catch(e => console.warn('[History] 后端清空失败:', e))
    }
  }

  // ══════════════════════════════════════════
  //  登录后同步本地数据到后端
  // ══════════════════════════════════════════
  async function syncLocalToServer() {
    if (!isLoggedIn.value) return

    const localItems = [...history.value]
    if (localItems.length === 0) {
      // 本地无数据，直接从后端拉取
      await refreshFromServer()
      return
    }

    // 先把本地记录逐条同步到后端
    for (const item of localItems) {
      try {
        await createHistory({
          type: 'analyze',
          imageUrl: item.imageUrl,
          promptCn: item.prompt,
        })
      } catch (e) {
        console.warn('[History] 同步单条失败:', e)
      }
    }

    // 同步完毕，从后端刷新完整数据
    await refreshFromServer()
    console.log('[History] 本地→后端同步完成')
  }

  // ══════════════════════════════════════════
  //  初始化
  // ══════════════════════════════════════════
  loadFromStorage()

  return {
    history,
    loading,
    currentPage,
    totalPages,
    totalCount,
    addHistory,
    removeHistory,
    updateFavorite,
    clearHistory,
    refreshFromServer,
    syncLocalToServer,
    // 别名（兼容）
    historyList: history,
    addAnalyzeRecord: addHistory,
    addEditRecord: addHistory,
    removeRecord: removeHistory,
    clearAll: clearHistory,
  }
}, { persist: false })