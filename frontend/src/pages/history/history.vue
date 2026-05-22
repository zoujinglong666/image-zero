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
    >
      
      <!-- 统计栏 -->
      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-num">{{ historyStore?.history?.length ?? 0 }}</text>
          <text class="stat-label">总记录</text>
        </view>
        <u-line direction="col" color="rgba(255,255,255,0.06)" :length="40" />
        <view class="stat-item">
          <text class="stat-num">{{ favoriteCount }}</text>
          <text class="stat-label">已收藏</text>
        </view>
        <u-line direction="col" color="rgba(255,255,255,0.06)" :length="40" />
        <view class="stat-item">
          <text class="stat-num">{{ todayCount }}</text>
          <text class="stat-label">今日</text>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="search-wrap">
        <u-search
          v-model="searchKeyword"
          placeholder="搜索提示词..."
          shape="round"
          bg-color="#1A1A36"
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
              @tap="viewDetail(item)"
            >
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
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/history'

const historyStore = useHistoryStore()

// ─── 分页配置 ──────────────────────────
const PAGE_SIZE = 10
const currentPage = ref(1)
const loadingMore = ref(false)

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

const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
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
.main-scroll { height: calc(100vh - 44px); }

// ── Stats Bar ──
.stats-bar {
  display: flex; align-items: center; justify-content: center;
  padding: 28rpx 32rpx;
  background: $bg-card;
  border-bottom: 1rpx solid $border;
  gap: 48rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-num {
  font-size: 40rpx; font-weight: 800; color: $primary;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
}
.stat-label { font-size: 22rpx; color: $text-3; }

// ── Search ──
.search-wrap { padding: 20rpx 24rpx; background: $bg-card;
  border-bottom: 1rpx solid $border;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
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
  &:active { transform: scale(0.98); }
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
</style>
