<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="提示词库"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#1C1C1C', fontWeight: '600' }"
      :borderBottom="true"
      :placeholder="true"
    />

    <scroll-view
      scroll-y
      class="main-scroll"
      @scrolltolower="loadMore"
      :lower-threshold="200"
    >
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
          @change="onSearchChange"
        />
      </view>

      <!-- 分类标签 -->
      <scroll-view scroll-x class="category-scroll">
        <view class="category-list">
          <view
            class="category-tag"
            :class="{ active: currentCategory === 0 }"
            @click="selectCategory(0)"
          >
            <text>全部</text>
          </view>
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="category-tag"
            :class="{ active: currentCategory === cat.id }"
            @click="selectCategory(cat.id)"
          >
            <text>{{ cat.icon }} {{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 排序栏 -->
      <view class="sort-bar">
        <view
          v-for="s in sortOptions"
          :key="s.value"
          class="sort-item"
          :class="{ active: currentSort === s.value }"
          @click="changeSort(s.value)"
        >
          <text>{{ s.label }}</text>
        </view>
      </view>

      <!-- 提示词列表 -->
      <view class="prompt-list" v-if="prompts.length > 0">
        <view
          v-for="item in prompts"
          :key="item.id"
          class="prompt-card"
          @click="viewDetail(item)"
        >
          <view class="card-header">
            <text class="card-category">{{ item.category_name }}</text>
            <text class="card-source">{{ sourceLabel(item.source) }}</text>
          </view>
          <text class="card-title">{{ item.title }}</text>
          <text class="card-text">{{ truncateText(item.prompt_text, 120) }}</text>
          <view class="card-footer">
            <view class="card-stats">
              <text class="stat">👁 {{ item.view_count }}</text>
              <text class="stat">❤ {{ item.like_count }}</text>
              <text class="stat">📋 {{ item.copy_count }}</text>
            </view>
            <view class="card-actions">
              <view class="action-btn" @click.stop="copyPrompt(item)">
                <text>复制</text>
              </view>
              <view
                class="action-btn fav"
                :class="{ favored: item.is_favorited }"
                @click.stop="toggleFav(item)"
              >
                <text>{{ item.is_favorited ? '已收藏' : '收藏' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-else-if="!loading">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无提示词</text>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="loading">
        <text class="load-text">加载中...</text>
      </view>
      <view class="load-more" v-else-if="noMore && prompts.length > 0">
        <text class="load-text">没有更多了</text>
      </view>
    </scroll-view>

    <!-- 详情弹窗 -->
    <u-popup :show="showDetail" mode="bottom" round="16" @close="showDetail = false">
      <view class="detail-popup" v-if="detailData">
        <view class="detail-header">
          <text class="detail-title">{{ detailData.title }}</text>
          <view class="detail-close" @click="showDetail = false">
            <text>✕</text>
          </view>
        </view>
        <scroll-view scroll-y class="detail-body">
          <view class="detail-meta">
            <text class="detail-cat">{{ detailData.category_name }}</text>
            <text class="detail-lang">{{ langLabel(detailData.language) }}</text>
          </view>
          <view class="detail-prompt-box">
            <text class="detail-prompt-text" selectable>{{ detailData.prompt_text }}</text>
          </view>
          <view class="detail-stats">
            <text>👁 {{ detailData.view_count }} 浏览</text>
            <text>❤ {{ detailData.like_count }} 点赞</text>
            <text>📋 {{ detailData.copy_count }} 复制</text>
          </view>
        </scroll-view>
        <view class="detail-actions">
          <view class="detail-btn copy" @click="copyPrompt(detailData)">
            <text>复制提示词</text>
          </view>
          <view
            class="detail-btn fav"
            :class="{ favored: detailData.is_favorited }"
            @click="toggleFav(detailData)"
          >
            <text>{{ detailData.is_favorited ? '取消收藏' : '收藏' }}</text>
          </view>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getCategories,
  getPromptList,
  searchPrompts,
  getPromptDetail,
  interactPrompt,
  toggleFavorite,
  type PromptCategory,
  type PromptItem,
} from '../../api/prompt'

// ── 状态 ──
const categories = ref<PromptCategory[]>([])
const prompts = ref<PromptItem[]>([])
const currentCategory = ref(0)
const currentSort = ref('latest')
const searchKeyword = ref('')
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const noMore = ref(false)

// 详情弹窗
const showDetail = ref(false)
const detailData = ref<PromptItem | null>(null)

// 排序选项
const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '最热', value: 'popular' },
  { label: '最多赞', value: 'most_liked' },
  { label: '最多复制', value: 'most_copied' },
]

// ── 初始化 ──
onMounted(async () => {
  await loadCategories()
  await loadPrompts()
})

// ── 加载分类 ──
async function loadCategories() {
  try {
    categories.value = await getCategories()
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

// ── 加载提示词列表 ──
async function loadPrompts(reset = false) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    prompts.value = []
    noMore.value = false
  }

  loading.value = true
  try {
    let result
    if (searchKeyword.value.trim()) {
      result = await searchPrompts({
        q: searchKeyword.value.trim(),
        category_id: currentCategory.value || undefined,
        page: page.value,
        page_size: 20,
      })
    } else {
      result = await getPromptList({
        category_id: currentCategory.value || undefined,
        sort: currentSort.value,
        page: page.value,
        page_size: 20,
      })
    }

    if (page.value === 1) {
      prompts.value = result.list
    } else {
      prompts.value.push(...result.list)
    }
    total.value = result.pagination.total
    noMore.value = prompts.value.length >= total.value
  } catch (e) {
    console.error('加载提示词失败', e)
  } finally {
    loading.value = false
  }
}

// ── 加载更多 ──
function loadMore() {
  if (noMore.value || loading.value) return
  page.value++
  loadPrompts()
}

// ── 选择分类 ──
function selectCategory(id: number) {
  currentCategory.value = id
  loadPrompts(true)
}

// ── 切换排序 ──
function changeSort(sort: string) {
  currentSort.value = sort
  loadPrompts(true)
}

// ── 搜索 ──
let searchTimer: ReturnType<typeof setTimeout>
function onSearchChange() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadPrompts(true), 500)
}
function onSearch() {
  loadPrompts(true)
}

// ── 查看详情 ──
async function viewDetail(item: PromptItem) {
  try {
    const detail = await getPromptDetail(item.id)
    detailData.value = detail
    showDetail.value = true
  } catch (e) {
    // 降级显示
    detailData.value = item
    showDetail.value = true
  }
}

// ── 复制提示词 ──
async function copyPrompt(item: PromptItem) {
  uni.setClipboardData({
    data: item.prompt_text,
    success: () => {
      uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
    },
  })
  // 记录复制互动
  try { await interactPrompt(item.id, 'copy') } catch {}
  item.copy_count++
}

// ── 收藏/取消收藏 ──
async function toggleFav(item: PromptItem) {
  try {
    const result = await toggleFavorite(item.id)
    item.is_favorited = result.is_favorited
    item.favorite_count += result.is_favorited ? 1 : -1
    uni.showToast({
      title: result.is_favorited ? '已收藏' : '已取消收藏',
      icon: 'success',
    })
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

// ── 辅助 ──
function truncateText(text: string, max: number) {
  return text.length > max ? text.substring(0, max) + '...' : text
}

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    'freestylefly': 'FSF',
    'anil-matcha': 'AM',
    'youmind': 'YM',
  }
  return map[source] || source
}

function langLabel(lang: string) {
  const map: Record<string, string> = { zh: '中文', en: '英文', ja: '日文', mixed: '混合' }
  return map[lang] || lang
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #F7F8FA;
}

.main-scroll {
  height: calc(100vh - 44px);
}

/* 搜索栏 */
.search-wrap {
  padding: 12rpx 24rpx;
  background: #fff;
}

/* 分类标签 */
.category-scroll {
  white-space: nowrap;
  background: #fff;
  border-bottom: 1rpx solid #F0F0F0;
}

.category-list {
  display: inline-flex;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.category-tag {
  display: inline-flex;
  padding: 8rpx 24rpx;
  border-radius: 32rpx;
  background: #F5F5F5;
  font-size: 26rpx;
  color: #666;

  &.active {
    background: #6366F1;
    color: #fff;
  }
}

/* 排序栏 */
.sort-bar {
  display: flex;
  padding: 16rpx 24rpx;
  gap: 24rpx;
  background: #fff;
}

.sort-item {
  font-size: 26rpx;
  color: #999;

  &.active {
    color: #6366F1;
    font-weight: 600;
  }
}

/* 提示词卡片 */
.prompt-list {
  padding: 16rpx 24rpx;
}

.prompt-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.card-category {
  font-size: 22rpx;
  color: #6366F1;
  background: #EEF2FF;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.card-source {
  font-size: 22rpx;
  color: #999;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1C1C1C;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-stats {
  display: flex;
  gap: 16rpx;
}

.stat {
  font-size: 22rpx;
  color: #999;
}

.card-actions {
  display: flex;
  gap: 12rpx;
}

.action-btn {
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  background: #F5F5F5;
  color: #666;

  &.fav {
    background: #FFF7ED;
    color: #F59E0B;
  }

  &.favored {
    background: #6366F1;
    color: #fff;
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 加载更多 */
.load-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24rpx;
}

.load-text {
  font-size: 24rpx;
  color: #999;
  margin-left: 8rpx;
}

/* 详情弹窗 */
.detail-popup {
  max-height: 80vh;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.detail-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1C1C1C;
  flex: 1;
}

.detail-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
}

.detail-body {
  padding: 24rpx 32rpx;
  max-height: 55vh;
}

.detail-meta {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.detail-cat {
  font-size: 24rpx;
  color: #6366F1;
  background: #EEF2FF;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.detail-lang {
  font-size: 24rpx;
  color: #999;
  background: #F5F5F5;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.detail-prompt-box {
  background: #F7F8FA;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.detail-prompt-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
}

.detail-stats {
  display: flex;
  gap: 24rpx;
  font-size: 24rpx;
  color: #999;
}

.detail-actions {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx;
  border-top: 1rpx solid #F0F0F0;
}

.detail-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;

  &.copy {
    background: #6366F1;
    color: #fff;
  }

  &.fav {
    background: #F5F5F5;
    color: #666;
  }

  &.favored {
    background: #EEF2FF;
    color: #6366F1;
  }
}
</style>