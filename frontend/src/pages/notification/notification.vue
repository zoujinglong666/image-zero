<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="消息通知"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#1C1C1C', fontWeight: '600' }"
      :borderBottom="true"
      :placeholder="true"
    >
      <template #right>
        <view v-if="notificationStore.hasUnread" class="nav-right" @tap="handleMarkAllRead">
          <text class="nav-right-text">全部已读</text>
        </view>
      </template>
    </u-navbar>

    <scroll-view
      scroll-y
      class="main-scroll"
      @scrolltolower="loadMore"
      :refresherEnabled="true"
      :refresherTriggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 空状态 -->
      <view v-if="!notificationStore.loading && notificationStore.inbox.length === 0" class="empty-state">
        <u-icon name="bell" size="120" color="#D0D0D0" />
        <text class="empty-text">暂无消息</text>
        <text class="empty-desc">你的通知将在这里显示</text>
      </view>

      <!-- 通知列表 -->
      <view v-else class="notification-list">
        <view
          v-for="item in notificationStore.inbox"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.isRead }"
          @tap="handleTapItem(item)"
        >
          <!-- 类型图标 -->
          <view class="item-icon" :class="'type-' + item.type">
            <u-icon :name="typeIcon(item.type)" size="40" color="#FFFFFF" />
          </view>

          <!-- 内容 -->
          <view class="item-content">
            <view class="item-header">
              <text class="item-title">{{ item.title }}</text>
              <view v-if="!item.isRead" class="unread-dot" />
            </view>
            <text class="item-body">{{ item.content }}</text>
            <text class="item-time">{{ formatTime(item.createdAt) }}</text>
          </view>

          <!-- 类型标签 -->
          <view class="item-tag">
            <u-tag :text="typeLabel(item.type)" :type="typeTagColor(item.type)" size="mini" plain />
          </view>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="notificationStore.loading" class="loading-state">
        <u-loading mode="circle" size="48" />
        <text class="loading-text">加载中...</text>
      </view>

      <u-gap height="40" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import type { NotificationItem } from '@/api/notification'

const notificationStore = useNotificationStore()
const isRefreshing = ref(false)

onMounted(() => {
  notificationStore.fetchInbox()
})

onUnmounted(() => {
  // 页面离开时不停止轮询，保持未读数更新
})

/** 下拉刷新 */
async function onRefresh() {
  isRefreshing.value = true
  await notificationStore.fetchInbox()
  await notificationStore.fetchUnreadCount()
  isRefreshing.value = false
}

/** 加载更多（暂不分页） */
function loadMore() {
  // 预留分页加载
}

/** 点击通知项 */
async function handleTapItem(item: NotificationItem) {
  if (!item.isRead) {
    await notificationStore.markAsRead(item.id)
  }
  // 根据类型跳转（预留）
  // if (item.type === 'ai_result') uni.navigateTo({ url: '/pages/history/history' })
}

/** 全部标记已读 */
async function handleMarkAllRead() {
  await notificationStore.markAllAsRead()
  uni.showToast({ title: '已全部标记为已读', icon: 'none' })
}

/** 通知类型图标 */
function typeIcon(type: string): string {
  const map: Record<string, string> = {
    system: 'notification-fill',
    ai_result: 'cpu-fill',
    challenge: 'trophy-fill',
    vip: 'crown-fill',
    social: 'heart-fill',
  }
  return map[type] || 'bell-fill'
}

/** 通知类型标签文字 */
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    system: '系统',
    ai_result: 'AI结果',
    challenge: '挑战',
    vip: 'VIP',
    social: '社交',
  }
  return map[type] || '通知'
}

/** 通知类型标签颜色 */
function typeTagColor(type: string): string {
  const map: Record<string, string> = {
    system: 'primary',
    ai_result: 'success',
    challenge: 'warning',
    vip: 'error',
    social: 'info',
  }
  return map[type] || 'primary'
}

/** 格式化时间 */
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return Math.floor(diff / minute) + '分钟前'
  if (diff < day) return Math.floor(diff / hour) + '小时前'
  if (diff < 7 * day) return Math.floor(diff / day) + '天前'

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y === now.getFullYear() ? `${m}-${d}` : `${y}-${m}-${d}`
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: #F5F6FA;
}

.main-scroll {
  height: calc(100vh - 44px);
}

/* 导航栏右侧 */
.nav-right {
  padding: 0 20rpx;
}
.nav-right-text {
  font-size: 28rpx;
  color: #4A3AFF;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}
.empty-text {
  margin-top: 24rpx;
  font-size: 32rpx;
  color: #999;
}
.empty-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #C7C7CC;
}

/* 通知列表 */
.notification-list {
  padding: 20rpx 24rpx;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: background 0.2s;

  &:active {
    background: #F8F8FC;
  }

  &.unread {
    background: #F8F5FF;
    border-left: 6rpx solid #4A3AFF;
  }
}

/* 类型图标 */
.item-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 20rpx;

  &.type-system { background: linear-gradient(135deg, #4A3AFF, #4A3AFF); }
  &.type-ai_result { background: linear-gradient(135deg, #19be6b, #8CE99A); }
  &.type-challenge { background: linear-gradient(135deg, #FF9800, #FFD180); }
  &.type-vip { background: linear-gradient(135deg, #F44336, #FF8A80); }
  &.type-social { background: linear-gradient(135deg, #2196F3, #82B1FF); }
}

/* 内容 */
.item-content {
  flex: 1;
  min-width: 0;
}
.item-header {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}
.item-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1C1C1C;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.unread-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #F44336;
  margin-left: 12rpx;
  flex-shrink: 0;
}
.item-body {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.item-time {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 类型标签 */
.item-tag {
  flex-shrink: 0;
  margin-left: 12rpx;
  margin-top: 4rpx;
}

/* 加载中 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}
.loading-text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #999;
}
</style>