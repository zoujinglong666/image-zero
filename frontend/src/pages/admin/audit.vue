<template>
  <view class="page">
    <u-navbar
      title="内容审核"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#2C2E3A', fontWeight: '700' }"
      :borderBottom="false"
      :placeholder="true"
      :autoBack="true"
    >
      <template #right>
        <view v-if="pendingTotal > 0" class="nav-badge">
          <text>{{ pendingTotal }}</text>
        </view>
      </template>
    </u-navbar>

    <!-- 非管理员提示 -->
    <view v-if="!userStore.isAdmin" class="no-access">
      <u-icon name="lock" size="80" color="#9A9BAC" />
      <text class="no-access-title">无权限访问</text>
      <text class="no-access-desc">此页面仅管理员可见</text>
    </view>

    <scroll-view v-else scroll-y class="main-scroll" @scrolltolower="loadMore">
      <!-- Tab 切换 -->
      <view class="tab-bar">
        <view class="tab-item" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
          <text>全部</text>
          <view v-if="allItems.length > 0" class="tab-count"><text>{{ allItems.length }}</text></view>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'prompt' }" @click="activeTab = 'prompt'">
          <text>社区作品</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'submission' }" @click="activeTab = 'submission'">
          <text>挑战投稿</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredItems.length === 0 && !loading" class="empty-area">
        <u-icon name="checkmark-circle" size="96" color="#A3B8A5" />
        <text class="empty-title">暂无待审核内容</text>
        <text class="empty-desc">所有内容已审核完毕 ✨</text>
      </view>

      <!-- 审核列表 -->
      <view v-else class="review-list">
        <view
          v-for="item in filteredItems"
          :key="item.type + '-' + item.id"
          class="review-card"
        >
          <!-- 顶部信息 -->
          <view class="review-top">
            <view class="review-thumb">
              <image v-if="item.image_url" class="thumb-img" :src="item.image_url" mode="aspectFill" />
              <u-icon v-else name="image" size="48" color="#9A9BAC" />
            </view>
            <view class="review-info">
              <view class="review-type-badge" :class="item.type">
                <text>{{ item.type === 'prompt' ? '社区' : '挑战' }}</text>
              </view>
              <text class="review-title">{{ item.title || '无标题' }}</text>
              <text class="review-user">{{ item.user_name || ('用户#' + item.user_id) }}</text>
            </view>
          </view>

          <!-- 提示词预览 -->
          <view v-if="item.prompt_text" class="review-prompt">
            <text>{{ item.prompt_text }}</text>
          </view>

          <!-- 操作区 -->
          <view class="review-actions">
            <button class="review-btn reject" @click="handleReview(item, 'rejected')">
              <u-icon name="close" size="32" color="#E8947A" />
              <text>拒绝</text>
            </button>
            <button class="review-btn approve" @click="handleReview(item, 'approved')">
              <u-icon name="checkmark" size="32" color="#FFFFFF" />
              <text>通过</text>
            </button>
          </view>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-area">
        <view class="spinner" />
        <text>加载中...</text>
      </view>

      <u-gap height="120" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getPendingReviews, reviewPrompt, reviewSubmission } from '@/api/community'
import type { PendingReviewItem } from '@/api/community'

const userStore = useUserStore()

const activeTab = ref<'all' | 'prompt' | 'submission'>('all')
const loading = ref(false)
const pendingTotal = ref(0)
const allItems = ref<PendingReviewItem[]>([])

const filteredItems = computed(() => {
  if (activeTab.value === 'all') return allItems.value
  return allItems.value.filter(i => i.type === activeTab.value)
})

async function loadReviews() {
  if (!userStore.isAdmin) return
  loading.value = true
  try {
    const data = await getPendingReviews(1, 50)
    const prompts = (data.prompts || []).map(p => ({ ...p, type: 'prompt' as const }))
    const submissions = (data.submissions || []).map(s => ({ ...s, type: 'submission' as const }))
    allItems.value = [...prompts, ...submissions]
    pendingTotal.value = data.total || allItems.value.length
  } catch (err) {
    console.error('[Audit] 加载审核列表失败:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleReview(item: PendingReviewItem, verdict: 'approved' | 'rejected') {
  const action = verdict === 'approved' ? '通过' : '拒绝'
  uni.showModal({
    title: `确认${action}`,
    content: `确定要${action}「${item.title || '此内容'}」吗？`,
    success: async (res) => {
      if (!res.confirm) return
      uni.showLoading({ title: '处理中...', mask: true })
      try {
        if (item.type === 'prompt') {
          await reviewPrompt(item.id, verdict)
        } else {
          await reviewSubmission(item.id, verdict)
        }
        uni.hideLoading()
        uni.showToast({ title: `已${action}`, icon: 'success' })
        allItems.value = allItems.value.filter(i => !(i.id === item.id && i.type === item.type))
        pendingTotal.value = Math.max(0, pendingTotal.value - 1)
      } catch (err: any) {
        uni.hideLoading()
        uni.showToast({ title: err?.message || '操作失败', icon: 'none' })
      }
    }
  })
}

function loadMore() {
  // 后续可加分页加载
}

onMounted(() => {
  loadReviews()
})
</script>

<style lang="scss" scoped>
/* Mist Canvas Design System */
$bg-page:    #F6F7FB;
$bg-card:    #FFFFFF;
$bg-raised:  #F0F1F5;
$border:     rgba(0,0,0,0.05);
$text-1:     #2C2E3A;
$text-2:     #6B6E7D;
$text-3:     #9A9BAC;
$primary:    #8B9DC8;
$primary-light: rgba(139,157,200,0.12);
$danger:     #E8947A;
$green:      #A3B8A5;

.page { min-height: 100vh; background: $bg-page; }
.main-scroll { height: calc(100vh - 44px); }

.nav-badge {
  min-width: 36rpx; height: 36rpx; padding: 0 10rpx;
  background: $danger; color: #FFF;
  font-size: 20rpx; font-weight: 700;
  border-radius: 18rpx;
  display: flex; align-items: center; justify-content: center;
}

// ── 无权限 ──
.no-access {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; gap: 16rpx;
}
.no-access-title { font-size: 32rpx; font-weight: 700; color: $text-1; }
.no-access-desc { font-size: 26rpx; color: $text-3; }

// ── Tab 栏 ──
.tab-bar {
  display: flex; gap: 16rpx;
  padding: 20rpx 24rpx;
  background: $bg-card;
  border-bottom: 1rpx solid $border;
}
.tab-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 28rpx; border-radius: 999rpx;
  background: $bg-raised; font-size: 26rpx; color: $text-2; font-weight: 600;
  border: 1rpx solid transparent;
  transition: all 0.15s;
  &.active {
    background: $primary-light; color: $primary;
    border-color: rgba(139,157,200,0.25);
  }
}
.tab-count {
  font-size: 20rpx; background: rgba(139,157,200,0.2);
  color: $primary; padding: 2rpx 10rpx; border-radius: 10rpx; font-weight: 700;
}

// ── 空状态 ──
.empty-area {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 40rpx; gap: 12rpx;
}
.empty-title { font-size: 30rpx; font-weight: 700; color: $text-1; }
.empty-desc { font-size: 24rpx; color: $text-3; }

// ── 审核列表 ──
.review-list { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }

.review-card {
  background: $bg-card; border-radius: 22rpx;
  padding: 24rpx; border: 1rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.review-top {
  display: flex; gap: 18rpx; align-items: flex-start;
}
.review-thumb {
  width: 140rpx; height: 140rpx; border-radius: 16rpx;
  overflow: hidden; flex-shrink: 0; background: $bg-raised;
  display: flex; align-items: center; justify-content: center;
}
.thumb-img { width: 100%; height: 100%; object-fit: cover; }

.review-info {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 8rpx;
}
.review-type-badge {
  align-self: flex-start;
  padding: 4rpx 16rpx; border-radius: 8rpx;
  font-size: 20rpx; font-weight: 700;
  &.prompt { background: $primary-light; color: $primary; }
  &.submission { background: rgba(163,184,165,0.15); color: #5B8C5A; }
}
.review-title {
  font-size: 28rpx; font-weight: 700; color: $text-1;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.review-user { font-size: 22rpx; color: $text-3; }

.review-prompt {
  margin-top: 16rpx; padding: 16rpx 20rpx;
  background: $bg-raised; border-radius: 14rpx;
  text {
    font-size: 24rpx; color: $text-2; line-height: 1.6;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
}

.review-actions {
  display: flex; gap: 16rpx; margin-top: 20rpx;
}
.review-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx;
  height: 80rpx; border-radius: 999rpx; border: none;
  font-size: 26rpx; font-weight: 700;
  transition: all 0.15s;
  &:active { transform: scale(0.97); }

  &.reject {
    background: rgba(232,148,122,0.1); color: $danger;
    border: 1rpx solid rgba(232,148,122,0.2);
  }
  &.approve {
    background: linear-gradient(135deg, #8B9DC8, #A3B0CC);
    color: #FFF;
    box-shadow: 0 4rpx 16rpx rgba(139,157,200,0.25);
  }
}

// ── Loading ──
.loading-area {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 40rpx 0;
  text { font-size: 24rpx; color: $text-3; }
}
.spinner {
  width: 32rpx; height: 32rpx;
  border: 3rpx solid $bg-raised; border-top-color: $primary; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
