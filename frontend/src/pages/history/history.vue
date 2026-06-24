<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="历史记录"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#2C2E3A', fontWeight: '700' }"
      :borderBottom="false"
      :placeholder="true"
    >
      <template #right>
        <u-button
          v-if="(historyStore?.history || []).length > 0"
          type="error"
          size="mini"
          text="清空"
          icon="trash"
          plain
          @tap="clearAllHistory"
        />
      </template>
    </u-navbar>

    <scroll-view
      scroll-y
      class="main-scroll"
      @scrolltolower="loadMore"
      :lower-threshold="200"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onPullRefresh"
    >
      
      <!-- 统计栏 -->
      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-num">{{ historyStore?.history?.length ?? 0 }}</text>
          <text class="stat-label">总记录</text>
        </view>
        <u-line direction="col" color="rgba(0,0,0,0.06)" :length="40" />
        <view class="stat-item">
          <text class="stat-num">{{ favoriteCount }}</text>
          <text class="stat-label">已收藏</text>
        </view>
        <u-line direction="col" color="rgba(0,0,0,0.06)" :length="40" />
        <view class="stat-item">
          <text class="stat-num">{{ todayCount }}</text>
          <text class="stat-label">今日</text>
        </view>
      </view>

      <!-- 状态筛选 Tab -->
      <view class="filter-tabs">
        <view
          v-for="tab in filterTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: activeFilter === tab.value }"
          @click="activeFilter = tab.value"
        >
          <text>{{ tab.label }}</text>
          <view v-if="tab.count > 0" class="filter-count"><text>{{ tab.count }}</text></view>
        </view>
      </view>

      <!-- 批量操作栏 -->
      <view v-if="batchMode" class="batch-bar">
        <view class="batch-info">
          <text>已选 {{ selectedIds.length }} 项</text>
        </view>
        <view class="batch-actions">
          <view class="batch-btn" @click="batchFavorite">
            <u-icon name="star" size="32" color="#8B9DC8" />
            <text>收藏</text>
          </view>
          <view class="batch-btn batch-danger" @click="batchDelete">
            <u-icon name="trash" size="32" color="#E8947A" />
            <text>删除</text>
          </view>
          <view class="batch-btn" @click="batchMode = false">
            <text>取消</text>
          </view>
        </view>
      </view>

      <!-- 生成任务区域 -->
      <view v-if="filteredTasks.length > 0" class="task-section">
        <view class="section-header">
          <text class="section-title">生成任务</text>
          <text class="section-count">{{ filteredTasks.length }} 个</text>
        </view>

        <view class="task-list">
          <view
            v-for="task in filteredTasks"
            :key="task.id"
            class="task-card"
            :class="'task-' + task.status"
          >
            <!-- 处理中状态 -->
            <view v-if="task.status === 'pending' || task.status === 'processing'" class="task-processing">
              <view class="task-thumb-placeholder">
                <view class="task-spinner" />
                <text class="task-status-text">{{ task.status === 'pending' ? '等待中...' : `AI 生成中 ${getTaskProgress(task)}%` }}</text>
              </view>
              <view class="task-body">
                <view class="task-prompt">{{ task.prompt }}</view>
                <view v-if="task.status === 'processing'" class="task-progress-bar">
                  <view class="task-progress-fill" :style="{ width: getTaskProgress(task) + '%' }" />
                </view>
                <view class="task-meta">
                  <text class="task-model">{{ task.provider }} · {{ task.model }}</text>
                  <text class="task-time">{{ formatTaskTime(task.createdAt) }}</text>
                </view>
              </view>
            </view>

            <!-- 已完成状态 -->
            <view v-else-if="task.status === 'completed'" class="task-completed" @tap="previewTaskImage(task)">
              <view class="task-thumb">
                <!-- #ifdef H5 -->
                <img class="task-thumb-img" :src="task.resultUrl" loading="lazy" />
                <!-- #endif -->
                <!-- #ifndef H5 -->
                <image class="task-thumb-img" :src="task.resultUrl" mode="aspectFill" />
                <!-- #endif -->
              </view>
              <view class="task-body">
                <view class="task-prompt">{{ task.prompt }}</view>
                <view class="task-meta">
                  <text class="task-model">{{ task.provider }} · {{ task.model }}</text>
                  <view class="task-actions">
                    <u-icon name="reload" size="36" color="#9A9BAC" @tap.stop="regenerateFromTask(task)" />
                    <u-icon name="download" size="36" color="#9A9BAC" @tap.stop="downloadImage(task.resultUrl)" />
                  </view>
                </view>
              </view>
            </view>

            <!-- 失败状态 -->
            <view v-else-if="task.status === 'failed'" class="task-failed">
              <view class="task-thumb-placeholder">
                <u-icon name="error-circle" size="48" color="#E8947A" />
                <text class="task-status-text task-error">生成失败</text>
              </view>
              <view class="task-body">
                <view class="task-prompt">{{ task.prompt }}</view>
                <view class="task-meta">
                  <text class="task-error-msg">{{ task.errorMessage || '未知错误' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="search-wrap">
        <u-search
          v-model="searchKeyword"
          placeholder="搜索提示词..."
          shape="round"
          bg-color="#F0F1F5"
          :showAction="false"
          @search="onSearch"
          @custom="onSearch"
        />
      </view>

      <!-- 空状态 -->
      <view v-if="filteredHistory.length === 0" class="empty-area">
        <u-empty
          mode="data"
          :text="searchKeyword ? '没有找到匹配的记录' : '暂无解析记录，去首页上传图片试试吧'"
          :marginTop="80"
        >
          <template #button>
            <u-button
              v-if="!searchKeyword"
              type="primary"
              text="开始使用"
              icon="plus-circle-fill"
              @tap="goHome"
            />
            <u-button
              v-else
              type="default"
              text="清除搜索"
              plain
              @tap="searchKeyword = ''"
            />
          </template>
        </u-empty>
      </view>

      <!-- 历史列表（分页渲染） -->
      <view v-else class="history-list">
        
        <!-- 按日期分组（只渲染已加载的部分） -->
        <block v-for="(group, gi) in visibleGroups" :key="gi">
          
          <!-- 日期标题 -->
          <view class="date-header">
            <u-section
              :title="group.dateLabel"
              :sub-title="`${group.items.length} 条记录`"
              :line="false"
              :arrow="false"
            />
          </view>

          <!-- 记录卡片 -->
          <view class="card-list">
            <view
              v-for="(item, ii) in group.items"
              :key="item.id"
              class="history-card"
              :class="{ 'card-selected': selectedIds.includes(item.id) }"
              @tap="batchMode ? toggleSelect(item.id) : viewDetail(item)"
              @longpress="enterBatchMode(item.id)"
            >
              <!-- 批量选择指示器 -->
              <view v-if="batchMode" class="card-checkbox" :class="{ checked: selectedIds.includes(item.id) }">
                <u-icon v-if="selectedIds.includes(item.id)" name="checkmark" size="24" color="#FFF" />
              </view>
              <!-- 缩略图 -->
              <view class="card-thumb">
                <!-- #ifdef H5 -->
                <img class="thumb-img" :src="item.imageUrl" loading="lazy" />
                <!-- #endif -->
                <!-- #ifndef H5 -->
                <image class="thumb-img" :src="item.imageUrl" mode="aspectFill" />
                <!-- #endif -->
                <view v-if="item.favorite" class="fav-badge">
                  <u-icon name="star-fill" size="40" color="#8B9DC8" />
                </view>
              </view>

              <!-- 信息区 -->
              <view class="card-body">
                <view class="card-prompt">{{ item.prompt }}</view>
                <view class="card-meta">
                  <view class="meta-left">
                    <u-icon name="clock" size="40" color="#9A9BAC" />
                    <text>{{ formatTime(item.timestamp) }}</text>
                  </view>
                  <view class="meta-right">
                    <u-icon
                      :name="item.favorite ? 'star-fill' : 'star'"
                      size="40"
                      :color="item.favorite ? '#8B9DC8' : '#9A9BAC'"
                      @tap.stop="toggleFavorite(item)"
                    />
                    <u-icon
                      name="download"
                      size="40"
                      color="#9A9BAC"
                      style="margin-left: 16rpx;"
                      @tap.stop="downloadImage(item.imageUrl)"
                    />
                    <u-icon
                      name="trash-fill"
                      size="40"
                      color="#9A9BAC"
                      style="margin-left: 16rpx;"
                      @tap.stop="deleteItem(item.id)"
                    />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </block>

        <!-- 加载更多指示器 -->
        <view v-if="hasMore && filteredHistory.length > PAGE_SIZE" class="load-more">
          <view v-if="loadingMore" class="load-spinner" />
          <text>{{ loadingMore ? '加载中...' : '上滑加载更多' }}</text>
        </view>

        <!-- 到底了 -->
        <view v-if="!hasMore && filteredHistory.length > PAGE_SIZE" class="load-end">
          <text>— 已经到底了 —</text>
        </view>
      </view>

      <u-gap height="60" />

    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useHistoryStore } from '@/stores/history'
import { useUserStore } from '@/stores/user'
import { getTaskList, type DrawingTask } from '@/api/image'

const historyStore = useHistoryStore()
const userStore = useUserStore()

// ─── 生成任务 ────────────────────────
const generateTasks = ref<DrawingTask[]>([])
let pollingTimer: ReturnType<typeof setInterval> | null = null

// ─── 状态筛选 ────────────────────────
const activeFilter = ref('all')
const filterTabs = computed(() => {
  const tasks = generateTasks.value
  return [
    { label: '全部', value: 'all', count: 0 },
    { label: '处理中', value: 'processing', count: tasks.filter(t => t.status === 'pending' || t.status === 'processing').length },
    { label: '已完成', value: 'completed', count: tasks.filter(t => t.status === 'completed').length },
    { label: '失败', value: 'failed', count: tasks.filter(t => t.status === 'failed').length },
  ]
})
const filteredTasks = computed(() => {
  if (activeFilter.value === 'all') return generateTasks.value
  if (activeFilter.value === 'processing') return generateTasks.value.filter(t => t.status === 'pending' || t.status === 'processing')
  return generateTasks.value.filter(t => t.status === activeFilter.value)
})

// ─── 批量操作 ────────────────────────
const batchMode = ref(false)
const selectedIds = ref<string[]>([])

function enterBatchMode(id: string) {
  if (batchMode.value) return
  batchMode.value = true
  selectedIds.value = [id]
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function batchFavorite() {
  selectedIds.value.forEach(id => {
    const item = (historyStore?.history || []).find(h => h.id === id)
    if (item && !item.favorite) {
      item.favorite = true
      historyStore.updateFavorite(id, true)
    }
  })
  uni.showToast({ title: `已收藏 ${selectedIds.value.length} 项`, icon: 'success' })
  batchMode.value = false
  selectedIds.value = []
}

function batchDelete() {
  uni.showModal({
    title: '批量删除',
    content: `确定要删除选中的 ${selectedIds.value.length} 条记录吗？`,
    success: (res) => {
      if (res.confirm) {
        selectedIds.value.forEach(id => historyStore.removeHistory(id))
        uni.showToast({ title: '已删除', icon: 'success' })
        batchMode.value = false
        selectedIds.value = []
      }
    }
  })
}

// ─── 任务进度模拟 ────────────────────────
function getTaskProgress(task: DrawingTask): number {
  if (task.status === 'pending') return 0
  if (task.status === 'completed') return 100
  // processing: 基于创建时间估算（30s 内从 10% 到 90%）
  const elapsed = Date.now() - new Date(task.createdAt).getTime()
  const progress = Math.min(90, Math.max(10, Math.floor(elapsed / 300)))
  return progress
}

/** 加载生图任务列表 */
async function loadTasks() {
  if (!userStore.isLoggedIn) return
  try {
    const tasks = await getTaskList(20)
    generateTasks.value = tasks || []
    startPollingIfNeeded()
  } catch (err) {
    console.warn('[History] 加载生成任务失败:', err)
  }
}

/** 如果有 processing/pending 任务，开启 3s 轮询 */
function startPollingIfNeeded() {
  const hasProcessing = generateTasks.value.some(t => t.status === 'pending' || t.status === 'processing')
  if (hasProcessing && !pollingTimer) {
    pollingTimer = setInterval(async () => {
      try {
        const tasks = await getTaskList(20)
        generateTasks.value = tasks || []
        // 全部完成则停止轮询
        const still = generateTasks.value.some(t => t.status === 'pending' || t.status === 'processing')
        if (!still) {
          stopPolling()
        }
      } catch {}
    }, 3000)
  }
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 每次页面显示时刷新（仅登录状态下加载任务）
onShow(() => {
  if (userStore.isLoggedIn) {
    loadTasks()
  }
})

onUnmounted(() => {
  stopPolling()
})

// 预览任务图片
function previewTaskImage(task: DrawingTask) {
  if (!task.resultUrl) return
  uni.previewImage({ urls: [task.resultUrl], current: task.resultUrl })
}

// 用已有任务的 prompt 重新生成
function regenerateFromTask(task: DrawingTask) {
  if (!task.prompt) return
  uni.navigateTo({
    url: `/pages/edit/edit?promptText=${encodeURIComponent(task.prompt)}`,
  })
}

function formatTaskTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// ─── 分页配置 ──────────────────────────
const PAGE_SIZE = 10
const currentPage = ref(1)
const loadingMore = ref(false)
const isRefreshing = ref(false)

// 搜索
const searchKeyword = ref('')

// 统计数据
const favoriteCount = computed(() => (historyStore?.history || []).filter(h => h.favorite).length)
const todayCount = computed(() => {
  const today = new Date().toDateString()
  return (historyStore?.history || []).filter(h => {
    return new Date(h.timestamp).toDateString() === today
  }).length
})

// 过滤后的历史
const filteredHistory = computed(() => {
  const list = historyStore?.history || []
  if (!searchKeyword.value) return list
  const kw = searchKeyword.value.toLowerCase()
  return list.filter(h =>
    h.prompt.toLowerCase().includes(kw)
  )
})

// 按日期分组
const groupedHistory = computed(() => {
  const groups: Record<string, { dateLabel: string; items: any[] }> = {}

  filteredHistory.value.forEach(item => {
    const date = new Date(item.timestamp)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let label = dateKey
    if (date.toDateString() === today.toDateString()) label = '今天'
    else if (date.toDateString() === yesterday.toDateString()) label = '昨天'
    else label = `${date.getMonth() + 1}月${date.getDate()}日`

    if (!groups[dateKey]) {
      groups[dateKey] = { dateLabel: label, items: [] }
    }
    groups[dateKey].items.push(item)
  })

  // 按日期倒序
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([_, group]) => group)
})

// 可见的分组（分页截断）
const visibleGroups = computed(() => {
  let count = 0
  const result: typeof groupedHistory.value = []

  for (const group of groupedHistory.value) {
    if (count >= currentPage.value * PAGE_SIZE) break
    // 当前组可能只显示部分
    const remaining = currentPage.value * PAGE_SIZE - count
    if (remaining < group.items.length) {
      result.push({ ...group, items: group.items.slice(0, remaining) })
      count += remaining
      break
    }
    result.push(group)
    count += group.items.length
  }

  return result
})

// 是否还有更多
const hasMore = computed(() => {
  const totalItems = filteredHistory.value.length
  return totalItems > currentPage.value * PAGE_SIZE
})

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  setTimeout(() => {
    currentPage.value++
    loadingMore.value = false
  }, 300) // 短暂延迟让用户感知到加载过程
}

// ====== 操作 ======
const onSearch = () => {
  // 搜索时重置分页
  currentPage.value = 1
}

const toggleFavorite = (item: any) => {
  item.favorite = !item.favorite
  historyStore.updateFavorite(item.id, item.favorite)
}

const deleteItem = (id: string) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条记录吗？',
    success: (res) => {
      if (res.confirm) {
        historyStore.removeHistory(id)
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    }
  })
}

const clearAllHistory = () => {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有历史记录吗？此操作不可恢复',
    confirmColor: '#fa3534',
    success: (res) => {
      if (res.confirm) {
        historyStore.clearHistory()
        uni.showToast({ title: '已清空', icon: 'success' })
      }
    }
  })
}

const viewDetail = (item: any) => {
  uni.previewImage({
    urls: [item.imageUrl],
    current: item.imageUrl
  })
}

const downloadImage = (url: string) => {
  if (!url) return

  // #ifdef H5
  fetch(url)
    .then(res => res.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `turing-drawing-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      uni.showToast({ title: '图片已保存', icon: 'success' })
    })
    .catch(() => {
      const a = document.createElement('a')
      a.href = url
      a.download = `turing-drawing-${Date.now()}.png`
      a.click()
      uni.showToast({ title: '图片已保存', icon: 'success' })
    })
  // #endif

  // #ifndef H5
  uni.showLoading({ title: '保存中...' })
  uni.downloadFile({
    url,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => {
          uni.hideLoading()
          uni.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: (err) => {
          uni.hideLoading()
          if (err.errMsg?.includes('auth')) {
            uni.showModal({ title: '需要授权', content: '请授权访问相册权限后再试', showCancel: false })
          } else {
            uni.showToast({ title: '保存失败，请重试', icon: 'none' })
          }
        },
      })
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '下载失败，请重试', icon: 'none' })
    },
  })
  // #endif
}

const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}

// 下拉刷新
async function onPullRefresh() {
  isRefreshing.value = true
  try {
    await loadTasks()
  } catch {}
  isRefreshing.value = false
}
</script>

<style lang="scss" scoped>
/* ══════════════════════════════════
   Mist Canvas Design System
   薄雾白 · 通透清新
   ══════════════════════════════════ */

// ── Palette ──
$bg-page:    #F6F7FB;
$bg-card:    #FFFFFF;
$bg-raised:  #F0F1F5;
$border:     rgba(0,0,0,0.05);
$text-1:     #2C2E3A;
$text-2:     #6B6E7D;
$text-3:     #9A9BAC;
$primary:     #8B9DC8;
$primary-grad: linear-gradient(135deg, #8B9DC8, #A3B0CC);
$secondary:   #C4B5E0;
$accent:     #A3B8A5;
$warning:     #E8C97A;
$danger:     #E8947A;

.page { min-height: 100vh; background: $bg-page; }
.main-scroll { height: calc(100vh - 44px - 50px); }

// ── Stats Bar ──
.stats-bar {
  display: flex; align-items: center; justify-content: center;
  padding: 28rpx 32rpx;
  background: $bg-card;
  border-bottom: 1rpx solid $border;
  gap: 48rpx;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-num {
  font-size: 40rpx; font-weight: 800; color: $primary;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
}
.stat-label { font-size: 22rpx; color: $text-3; }

// ── Filter Tabs ──
.filter-tabs {
  display: flex; gap: 12rpx;
  padding: 16rpx 24rpx;
  background: $bg-card;
  border-bottom: 1rpx solid $border;
}
.filter-tab {
  display: flex; align-items: center; gap: 6rpx;
  padding: 10rpx 24rpx; border-radius: 999rpx;
  background: $bg-raised; font-size: 24rpx; color: $text-2;
  border: 1rpx solid transparent;
  transition: all 0.2s;
  &.active {
    background: rgba(139,157,200,0.12);
    color: $primary; font-weight: 700;
    border-color: rgba(139,157,200,0.25);
  }
}
.filter-count {
  font-size: 18rpx; color: $text-3;
  background: rgba(0,0,0,0.04); padding: 2rpx 10rpx; border-radius: 10rpx;
  .active & { background: rgba(139,157,200,0.15); color: $primary; }
}

// ── Batch Bar ──
.batch-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16rpx 24rpx;
  background: rgba(139,157,200,0.06);
  border-bottom: 1rpx solid rgba(139,157,200,0.15);
}
.batch-info { font-size: 26rpx; color: $primary; font-weight: 600; }
.batch-actions { display: flex; gap: 16rpx; }
.batch-btn {
  display: flex; align-items: center; gap: 6rpx;
  padding: 10rpx 20rpx; border-radius: 999rpx;
  background: $bg-card; border: 1rpx solid $border;
  font-size: 24rpx; color: $text-2;
  &:active { opacity: 0.7; }
  text { font-size: 24rpx; }
}
.batch-danger { border-color: rgba(232,148,122,0.3); }

// ── Task Progress Bar ──
.task-progress-bar {
  height: 6rpx; border-radius: 3rpx;
  background: $bg-raised; overflow: hidden;
  margin: 8rpx 0;
}
.task-progress-fill {
  height: 100%; border-radius: 3rpx;
  background: $primary-grad;
  transition: width 0.5s ease;
}

// ── Search ──
.search-wrap { padding: 20rpx 24rpx; background: $bg-card;
  border-bottom: 1rpx solid $border;
}

// ── Empty ──
.empty-area {
  display: flex; align-items: center; justify-content: center;
  min-height: 50vh; padding: 0 32rpx;
}

// ── List ──
.history-list { padding: 16rpx 24rpx; }
.date-header { padding: 16rpx 12rpx 8rpx; }
.card-list { display: flex; flex-direction: column; gap: 20rpx; }

// ── Card ──
.history-card {
  background: $bg-card; border-radius: 20rpx; overflow: hidden;
  border: 1rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  transition: all 0.15s;
  position: relative;
  &:active { transform: scale(0.98); }
  &.card-selected {
    border-color: $primary;
    box-shadow: 0 4rpx 16rpx rgba(139,157,200,0.15);
  }
}
.card-checkbox {
  position: absolute; top: 16rpx; left: 16rpx; z-index: 3;
  width: 40rpx; height: 40rpx; border-radius: 50%;
  background: rgba(255,255,255,0.9); border: 2rpx solid $border;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  &.checked {
    background: $primary-grad; border-color: $primary;
  }
}
.card-thumb { position: relative; height: 240rpx; overflow: hidden; }
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.fav-badge {
  position: absolute; top: 12rpx; right: 12rpx;
  width: 48rpx; height: 48rpx; border-radius: 50%;
  background: rgba(255,255,255,0.92);
  display: flex; align-items: center; justify-content: center;
  border: 1rpx solid rgba(139,157,200,0.2);
}
.card-body { padding: 20rpx 24rpx; }
.card-prompt {
  font-size: 26rpx; color: $text-1; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-meta {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid $border;
}
.meta-left { display: flex; align-items: center; gap: 6rpx;
  text { font-size: 22rpx; color: $text-3; }
}
.meta-right { display: flex; align-items: center; }

// ── Load More ──
.load-more { display: flex; align-items: center; justify-content: center; gap: 10rpx; padding: 28rpx 0;
  text { font-size: 24rpx; color: $text-3; }
}
.load-spinner {
  width: 28rpx; height: 28rpx;
  border: 3rpx solid $bg-raised; border-top-color: $primary; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-end { text-align: center; padding: 28rpx 0;
  text { font-size: 24rpx; color: $text-3; }
}

// ── Task Section ──
.task-section {
  padding: 24rpx 24rpx 0;
}
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4rpx 16rpx;
}
.section-title {
  font-size: 30rpx; font-weight: 700; color: $text-1;
}
.section-count {
  font-size: 24rpx; color: $text-3;
}
.task-list {
  display: flex; flex-direction: column; gap: 20rpx;
}

// ── Task Card ──
.task-card {
  background: $bg-card; border-radius: 20rpx; overflow: hidden;
  border: 1rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  &:active { transform: scale(0.98); }
}
.task-processing, .task-completed, .task-failed {
  display: flex; flex-direction: row; align-items: stretch;
}

// 缩略图占位（pending / failed）
.task-thumb-placeholder {
  width: 200rpx; min-height: 200rpx; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: $bg-raised; gap: 12rpx;
}
.task-spinner {
  width: 48rpx; height: 48rpx;
  border: 4rpx solid $bg-card; border-top-color: $primary; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.task-status-text {
  font-size: 22rpx; color: $text-3;
}

// 已完成缩略图
.task-thumb {
  width: 200rpx; min-height: 200rpx; flex-shrink: 0; overflow: hidden;
}
.task-thumb-img {
  width: 100%; height: 100%; object-fit: cover;
}

// 信息区
.task-body {
  flex: 1; padding: 20rpx 24rpx;
  display: flex; flex-direction: column; justify-content: space-between;
  min-width: 0;
}
.task-prompt {
  font-size: 26rpx; color: $text-1; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.task-meta {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12rpx; padding-top: 12rpx; border-top: 1rpx solid $border;
}
.task-model {
  font-size: 22rpx; color: $text-3;
}
.task-time {
  font-size: 22rpx; color: $text-3;
}
.task-actions {
  display: flex; align-items: center; gap: 16rpx;
}
.task-error {
  color: $danger;
}
.task-error-msg {
  font-size: 22rpx; color: $danger;
}
</style>
