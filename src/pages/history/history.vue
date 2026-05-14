<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="历史记录"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#1C1C1C', fontWeight: '600' }"
      :borderBottom="true"
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
          @click="clearAllHistory"
        />
      </template>
    </u-navbar>

    <scroll-view scroll-y class="main-scroll">
      
      <!-- 统计栏 -->
      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-num">{{ historyStore?.history?.length ?? 0 }}</text>
          <text class="stat-label">总记录</text>
        </view>
        <u-line direction="col" color="#E8E8E8" :length="40" />
        <view class="stat-item">
          <text class="stat-num">{{ favoriteCount }}</text>
          <text class="stat-label">已收藏</text>
        </view>
        <u-line direction="col" color="#E8E8E8" :length="40" />
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
          bg-color="#F7F8FA"
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
              @click="goHome"
            />
            <u-button
              v-else
              type="default"
              text="清除搜索"
              plain
              @click="searchKeyword = ''"
            />
          </template>
        </u-empty>
      </view>

      <!-- 历史列表 -->
      <view v-else class="history-list">
        
        <!-- 按日期分组 -->
        <block v-for="(group, gi) in groupedHistory" :key="gi">
          
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
                <u-image
                  :src="item.imageUrl"
                  width="100%"
                  height="160rpx"
                  mode="aspectFill"
                  radius="8"
                />
                <view v-if="item.favorite" class="fav-badge">
                  <u-icon name="star-fill" size="12" color="#D4A017" />
                </view>
              </view>

              <!-- 信息区 -->
              <view class="card-body">
                <view class="card-prompt">{{ item.prompt }}</view>
                <view class="card-meta">
                  <view class="meta-left">
                    <u-icon name="clock" size="12" color="#BBBBBB" />
                    <text>{{ formatTime(item.timestamp) }}</text>
                  </view>
                  <view class="meta-right">
                    <u-icon
                      :name="item.favorite ? 'star-fill' : 'star'"
                      size="18"
                      :color="item.favorite ? '#D4A017' : '#CCCCCC'"
                      @tap.stop="toggleFavorite(item)"
                    />
                    <u-icon
                      name="trash-fill"
                      size="18"
                      color="#CCCCCC"
                      style="margin-left: 16rpx;"
                      @tap.stop="deleteItem(item.id)"
                    />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </block>
      </view>

      <u-gap height="60" />

    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/history'

const historyStore = useHistoryStore()

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
  const groups: Record<string, { dateLabel: string; items: typeof historyStore.history }> = {}

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

// ====== 操作 ======
const onSearch = () => {
  // 搜索由 computed 自动处理
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
  // 可以跳转到详情或预览图片
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
.page {
  min-height: 100vh;
  background-color: #F7F8FA;
}

.main-scroll {
  height: calc(100vh - 44px);
}

/* 统计栏 */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28rpx 32rpx;
  background: #FFFFFF;
  gap: 48rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #1C1C1C;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
}

.stat-label {
  font-size: 22rpx;
  color: #999999;
}

/* 搜索 */
.search-wrap {
  padding: 20rpx 32rpx;
  background: #FFFFFF;
}

/* 空状态 */
.empty-area {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 0 32rpx;
}

/* 列表 */
.history-list {
  padding: 16rpx 24rpx;
}

.date-header {
  padding: 16rpx 12rpx 8rpx;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 卡片 */
.history-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;

  &:active {
    transform: scale(0.98);
  }
}

.card-thumb {
  position: relative;
}

.fav-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-body {
  padding: 20rpx 24rpx;
}

.card-prompt {
  font-size: 26rpx;
  color: #333333;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F5F5F5;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 6rpx;

  text {
    font-size: 22rpx;
    color: #BBBBBB;
  }
}

.meta-right {
  display: flex;
  align-items: center;
}
</style>