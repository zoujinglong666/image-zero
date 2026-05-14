// 历史记录 Store
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SimpleHistoryItem {
  id: string
  imageUrl: string
  prompt: string
  timestamp: number
  favorite: boolean
}

export const useHistoryStore = defineStore('history', () => {
  // 核心状态 - 直接用 ref，确保始终是数组
  const history = ref<SimpleHistoryItem[]>([])
  const maxHistoryCount = 50

  // ====== 持久化 ======
  function loadFromStorage() {
    try {
      const data = uni.getStorageSync('turing_history_v2')
      if (data && typeof data === 'string') {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed)) {
          history.value = parsed
        }
      }
    } catch (e) {
      console.error('加载历史记录失败:', e)
      history.value = []
    }
  }

  function saveToStorage() {
    try {
      uni.setStorageSync('turing_history_v2', JSON.stringify(history.value))
    } catch (e) {
      console.error('保存历史记录失败:', e)
    }
  }

  // ====== CRUD 操作 ======
  function addHistory(item: SimpleHistoryItem) {
    history.value.unshift(item)
    if (history.value.length > maxHistoryCount) {
      history.value = history.value.slice(0, maxHistoryCount)
    }
    saveToStorage()
  }

  function removeHistory(id: string) {
    history.value = history.value.filter(item => item.id !== id)
    saveToStorage()
  }

  function updateFavorite(id: string, favorite: boolean) {
    const item = history.value.find(h => h.id === id)
    if (item) {
      item.favorite = favorite
      saveToStorage()
    }
  }

  function clearHistory() {
    history.value = []
    saveToStorage()
  }

  // 初始化
  loadFromStorage()

  return {
    history,
    addHistory,
    removeHistory,
    updateFavorite,
    clearHistory,
    // 别名
    historyList: history,
    addAnalyzeRecord: addHistory,
    addEditRecord: addHistory,
    removeRecord: removeHistory,
    clearAll: clearHistory,
  }
}, {
  // 禁用内置持久化，我们手动管理
  persist: false
})
