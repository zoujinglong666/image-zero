<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="我的收藏"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#2C2E3A', fontWeight: '800', fontSize: '18px' }"
      :borderBottom="false"
      :placeholder="true"
    >
      <template #left>
        <view class="nav-back" @click="goBack">
          <u-icon name="arrow-left" size="40" color="#2C2E3A" />
        </view>
      </template>
    </u-navbar>

    <scroll-view
      scroll-y
      class="main-scroll"
      @scrolltolower="loadMore"
      :lower-threshold="200"
    >
      <!-- 统计信息 -->
      <view class="fav-header" v-if="favorites.length > 0">
        <text class="fav-count">共 {{ total }} 个收藏</text>
      </view>

      <!-- 瀑布流卡片 -->
      <view v-if="favorites.length > 0" class="card-grid">
        <view class="grid-col">
          <view
            v-for="(item, idx) in leftCol"
            :key="'L' + item.id"
            class="tmpl-card"
            :class="{ 'card-removing': removingId === item.id }"
            @click="viewDetail(item)"
          >
            <view class="card-cover" :style="coverStyle(item, idx)">
              <image
                v-if="item.image_url"
                class="cover-img"
                :src="item.image_url"
                mode="aspectFill"
              />
              <view v-else class="cover-fallback">
                <text class="cover-emoji">{{ getCoverEmoji(item) }}</text>
              </view>
              <!-- 收藏按钮 -->
              <view class="card-fav-btn" @click.stop="unfavItem(item)">
                <u-icon name="heart-fill" size="36" color="#E8947A" />
              </view>
            </view>
            <view class="card-body">
              <text class="card-title">{{ item.title }}</text>
              <text class="card-desc">{{ truncateText(item.prompt_text, 70) }}</text>
              <view class="tag-row" v-if="item.tags">
                <view v-for="(tag, ti) in parseTags(item.tags).slice(0, 3)" :key="ti" class="mini-tag">
                  <text>{{ tag }}</text>
                </view>
              </view>
              <view class="card-bottom">
                <view class="card-stats">
                  <text class="stat-text">{{ formatCount(item.view_count) }} 浏览</text>
                </view>
                <view class="gen-btn" @click.stop="generateFromPrompt(item)">
                  <text>生成同款</text>
                  <u-icon name="arrow-right" size="26" color="#FFF" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="grid-col">
          <view
            v-for="(item, idx) in rightCol"
            :key="'R' + item.id"
            class="tmpl-card"
            :class="{ 'card-removing': removingId === item.id }"
            @click="viewDetail(item)"
          >
            <view class="card-cover" :style="coverStyle(item, idx + 100)">
              <image
                v-if="item.image_url"
                class="cover-img"
                :src="item.image_url"
                mode="aspectFill"
              />
              <view v-else class="cover-fallback">
                <text class="cover-emoji">{{ getCoverEmoji(item) }}</text>
              </view>
              <view class="card-fav-btn" @click.stop="unfavItem(item)">
                <u-icon name="heart-fill" size="36" color="#E8947A" />
              </view>
            </view>
            <view class="card-body">
              <text class="card-title">{{ item.title }}</text>
              <text class="card-desc">{{ truncateText(item.prompt_text, 70) }}</text>
              <view class="tag-row" v-if="item.tags">
                <view v-for="(tag, ti) in parseTags(item.tags).slice(0, 3)" :key="ti" class="mini-tag">
                  <text>{{ tag }}</text>
                </view>
              </view>
              <view class="card-bottom">
                <view class="card-stats">
                  <text class="stat-text">{{ formatCount(item.view_count) }} 浏览</text>
                </view>
                <view class="gen-btn" @click.stop="generateFromPrompt(item)">
                  <text>生成同款</text>
                  <u-icon name="arrow-right" size="26" color="#FFF" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-else-if="!loading">
        <view class="empty-icon-wrap">
          <text class="empty-emoji">⭐</text>
        </view>
        <text class="empty-title">还没有收藏</text>
        <text class="empty-desc">去词库发现好提示词，点击心形收藏</text>
        <view class="empty-action" @click="goPrompt">
          <text>去词库看看</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="loading">
        <view class="loading-spinner" />
        <text class="load-text">加载中...</text>
      </view>
      <view class="load-more" v-else-if="noMore && favorites.length > 0">
        <text class="load-text">— 已经到底啦 —</text>
      </view>

      <view style="height: 60rpx;" />
    </scroll-view>

    <!-- 详情弹窗 -->
    <u-popup v-model="showDetail" mode="bottom" round="20" @close="showDetail = false">
      <view class="detail-popup" v-if="detailData">
        <view class="detail-head">
          <text class="detail-title">{{ detailData.title }}</text>
          <view class="detail-close" @click="showDetail = false">
            <u-icon name="close" size="40" color="#9A9BAC" />
          </view>
        </view>
        <scroll-view scroll-y class="detail-scroll">
          <view class="detail-cover-lg" v-if="detailData.image_url">
            <image class="detail-img" :src="detailData.image_url" mode="widthFix" />
          </view>
          <view v-else class="detail-cover-placeholder" :style="coverStyle(detailData, 0)">
            <text class="detail-emoji-lg">{{ getCoverEmoji(detailData) }}</text>
          </view>

          <view class="detail-info">
            <view class="detail-meta-row">
              <view class="d-meta-tag"><text>{{ detailData.category_name || '未分类' }}</text></view>
              <view class="d-meta-tag" v-if="isHot(detailData)"><text>🔥 热门</text></view>
            </view>

            <view class="detail-prompt-box">
              <view class="prompt-label"><text>📋 Prompt</text></view>
              <text class="detail-prompt-text" selectable>{{ detailData.prompt_text }}</text>
            </view>

            <view class="detail-stats-row">
              <view class="d-stat"><u-icon name="eye" size="36" color="#9A9BAC" /><text>{{ detailData.view_count }} 浏览</text></view>
              <view class="d-stat"><u-icon name="heart-fill" size="36" color="#E8947A" /><text>{{ detailData.like_count }} 点赞</text></view>
              <view class="d-stat"><u-icon name="star-fill" size="36" color="#E8C97A" /><text>{{ detailData.favorite_count }} 收藏</text></view>
            </view>
          </view>
        </scroll-view>

        <view class="detail-actions">
          <view class="d-action copy" @click="copyPrompt(detailData)">
            <u-icon name="file-text" size="34" color="#FFF" />
            <text>复制提示词</text>
          </view>
          <view class="d-action gen" @click="generateFromPrompt(detailData); showDetail = false;">
            <u-icon name="photo-film" size="34" color="#FFF" />
            <text>生成同款</text>
          </view>
          <view class="d-action unfav" @click="unfavFromDetail(detailData)">
            <u-icon name="heart-fill" size="34" color="#E8947A" />
            <text>取消收藏</text>
          </view>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getFavoriteList,
  getPromptDetail,
  interactPrompt,
  togglePromptFavorite,
  type PromptItem,
} from '../../api/prompt'

// ── 状态 ──
const favorites = ref<PromptItem[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const noMore = ref(false)
const removingId = ref<number | null>(null)

// 详情弹窗
const showDetail = ref(false)
const detailData = ref<PromptItem | null>(null)

// ── 计算属性 ──
const leftCol = computed(() => favorites.value.filter((_item: PromptItem, i: number) => i % 2 === 0))
const rightCol = computed(() => favorites.value.filter((_item: PromptItem, i: number) => i % 2 !== 0))

// ── 渐变配色 ──
const gradients = [
  'linear-gradient(135deg, #8B9DC8 0%, #6B7EC8 100%)',
  'linear-gradient(135deg, #B8A9C9 0%, #9B8BB4 100%)',
  'linear-gradient(135deg, #C9B8A9 0%, #B49B84 100%)',
  'linear-gradient(135deg, #A9C9B8 0%, #7EB89A 100%)',
  'linear-gradient(135deg, #C9B8A9 0%, #D4C4B0 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)',
]

function coverStyle(item: PromptItem | null, idx: number): Record<string, string> {
  if (!item?.image_url) return { background: gradients[idx % gradients.length] }
  return {}
}

function getCoverEmoji(item: PromptItem): string {
  const t = (item.title + '|' + (item.tags || '')).toLowerCase()
  if (/portrait|头像|headshot/i.test(t)) return '👤'
  if (/poster|海报|电影/i.test(t)) return '🎬'
  if (/cyber|赛博|punk|科幻/i.test(t)) return '🤖'
  if (/fantasy|奇幻|魔法/i.test(t)) return '🐉'
  if (/landscape|风景|自然|森林/i.test(t)) return '🏔️'
  if (/product|产品|电商|商品/i.test(t)) return '💍'
  if (/sneaker|鞋|运动/i.test(t)) return '👟'
  if (/character|角色|人物/i.test(t)) return '🎮'
  if (/cozy|可爱|cute|萌/i.test(t)) return '🧸'
  if (/illustration|插画|扁平|商务/i.test(t)) return '📊'
  if (/pixel|像素|retro|复古/i.test(t)) return '👾'
  if (/luxury|奢华|高端/i.test(t)) return '✨'
  if (/minimal|极简/i.test(t)) return '⬜'
  return '🎨'
}

function isHot(item: PromptItem): boolean {
  return (item.view_count || 0) > 5000
}

// ── 加载数据 ──
onMounted(() => {
  loadFavorites(true)
})

async function loadFavorites(reset = false) {
  if (loading.value) return
  if (reset) { page.value = 1; favorites.value = []; noMore.value = false }

  loading.value = true
  try {
    const result = await getFavoriteList({ page: page.value, page_size: 20 })
    if (page.value === 1) favorites.value = result.list
    else favorites.value.push(...result.list)
    total.value = result.pagination.total
    noMore.value = favorites.value.length >= total.value
  } catch (e) {
    console.error('加载收藏失败', e)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (noMore.value || loading.value) return
  page.value++
  loadFavorites()
}

// ── 详情弹窗 ──
async function viewDetail(item: PromptItem) {
  try {
    const detail = await getPromptDetail(item.id)
    detailData.value = detail
    showDetail.value = true
  } catch {
    detailData.value = item
    showDetail.value = true
  }
}

// ── 复制 ──
async function copyPrompt(item: PromptItem) {
  uni.setClipboardData({
    data: item.prompt_text,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
  try { await interactPrompt(item.id, 'copy') } catch {}
  item.copy_count = (item.copy_count || 0) + 1
}

// ── 取消收藏（从列表） ──
async function unfavItem(item: PromptItem) {
  try {
    await togglePromptFavorite(item.id)
    removingId.value = item.id
    setTimeout(() => {
      favorites.value = favorites.value.filter((f: PromptItem) => f.id !== item.id)
      total.value = Math.max(0, total.value - 1)
      removingId.value = null
    }, 300)
    uni.showToast({ title: '已取消收藏', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

// ── 取消收藏（从详情弹窗） ──
async function unfavFromDetail(item: PromptItem) {
  try {
    await togglePromptFavorite(item.id)
    showDetail.value = false
    favorites.value = favorites.value.filter((f: PromptItem) => f.id !== item.id)
    total.value = Math.max(0, total.value - 1)
    uni.showToast({ title: '已取消收藏', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

// ── 生成同款 ──
function generateFromPrompt(item: PromptItem) {
  uni.navigateTo({
    url: `/pages/edit/edit?promptText=${encodeURIComponent(item.prompt_text)}&tmplId=${item.id}`,
  })
}

// ── 导航 ──
function goBack() {
  uni.navigateBack({ delta: 1 })
}

function goPrompt() {
  uni.switchTab({ url: '/pages/prompt/prompt' })
}

// ── 辅助 ──
function truncateText(text: string, max: number): string {
  return text?.length > max ? text.substring(0, max) + '...' : (text || '')
}

function formatCount(n: number): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function parseTags(tags: string): string[] {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}
</script>

<style lang="scss" scoped>
/* ══════════════════════════════════════════════
   Mist Canvas Design System — 收藏页
   ══════════════════════════════════════════════ */

$bg-page:     #F6F7FB;
$bg-card:     #FFFFFF;
$bg-raised:   #F0F1F5;
$border:      rgba(0,0,0,0.05);
$text-1:      #2C2E3A;
$text-2:      #6B6E7D;
$text-3:      #9A9BAC;
$primary:     #8B9DC8;
$primary-dark: #6B7FA8;
$primary-light: rgba(139,157,200,0.12);
$coral:       #E8947A;
$gold:        #E8C97A;

.page { min-height: 100vh; background: $bg-page; }
.main-scroll { height: calc(100vh - 44px); }
.nav-back { padding: 12rpx; }

// ── Header ──
.fav-header {
  padding: 20rpx 32rpx 8rpx;
}
.fav-count {
  font-size: 24rpx;
  color: $text-3;
}

// ── Card Grid (瀑布流) ──
.card-grid {
  display: flex; gap: 16rpx;
  padding: 12rpx 24rpx;
}
.grid-col { flex: 1; display: flex; flex-direction: column; gap: 16rpx; }

.tmpl-card {
  background: $bg-card;
  border-radius: 20rpx;
  overflow: hidden;
  border: 1rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  transition: opacity 0.3s, transform 0.3s;

  &.card-removing {
    opacity: 0;
    transform: scale(0.9);
  }
}

.card-cover {
  position: relative;
  width: 100%;
  min-height: 200rpx;
  overflow: hidden;
}
.cover-img {
  width: 100%;
  min-height: 200rpx;
  display: block;
}
.cover-fallback {
  display: flex; align-items: center; justify-content: center;
  min-height: 200rpx;
}
.cover-emoji { font-size: 64rpx; }

// 收藏按钮
.card-fav-btn {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  z-index: 2;

  &:active { transform: scale(0.9); }
}

// ── Card Body ──
.card-body {
  padding: 20rpx 20rpx 24rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8rpx;
}
.card-desc {
  font-size: 22rpx;
  color: $text-3;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.mini-tag {
  padding: 4rpx 14rpx;
  background: $primary-light;
  border-radius: 999rpx;
  font-size: 18rpx;
  color: $primary-dark;
}

.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-stats {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.stat-text { font-size: 20rpx; color: $text-3; }
.gen-btn {
  display: flex; align-items: center; gap: 6rpx;
  padding: 10rpx 22rpx;
  background: linear-gradient(135deg, $primary, #A3B0CC);
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #FFFFFF;
  font-weight: 600;

  &:active { opacity: 0.85; }
}

// ── Empty ──
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 64rpx 80rpx;
  gap: 16rpx;
}
.empty-icon-wrap {
  width: 120rpx; height: 120rpx;
  border-radius: 50%;
  background: $bg-raised;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16rpx;
}
.empty-emoji { font-size: 56rpx; }
.empty-title { font-size: 32rpx; font-weight: 700; color: $text-1; }
.empty-desc { font-size: 24rpx; color: $text-3; text-align: center; }
.empty-action {
  margin-top: 24rpx;
  padding: 20rpx 48rpx;
  background: linear-gradient(135deg, $primary, #A3B0CC);
  border-radius: 999rpx;
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 600;

  &:active { opacity: 0.85; }
}

// ── Loading ──
.load-more {
  display: flex; align-items: center; justify-content: center;
  gap: 12rpx; padding: 32rpx 0;
}
.load-text { font-size: 24rpx; color: $text-3; }
.loading-spinner {
  width: 32rpx; height: 32rpx;
  border: 3rpx solid $border;
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

// ── 详情弹窗 ──
.detail-popup {
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: $bg-card;
}
.detail-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
}
.detail-title { font-size: 34rpx; font-weight: 800; color: $text-1; flex: 1; }
.detail-close { padding: 12rpx; }
.detail-scroll { flex: 1; overflow-y: auto; }

.detail-cover-lg {
  width: 100%;
  overflow: hidden;
}
.detail-img { width: 100%; display: block; }
.detail-cover-placeholder {
  min-height: 240rpx;
  display: flex; align-items: center; justify-content: center;
}
.detail-emoji-lg { font-size: 80rpx; }

.detail-info { padding: 24rpx 32rpx; }
.detail-meta-row {
  display: flex; align-items: center; gap: 12rpx;
  margin-bottom: 20rpx;
}
.d-meta-tag {
  padding: 6rpx 18rpx;
  background: $primary-light;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: $primary-dark;
}
.detail-prompt-box {
  background: $bg-raised;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.prompt-label {
  font-size: 22rpx;
  color: $text-3;
  margin-bottom: 12rpx;
}
.detail-prompt-text {
  font-size: 26rpx;
  color: $text-1;
  line-height: 1.7;
  word-break: break-all;
}
.detail-stats-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.d-stat {
  display: flex; align-items: center; gap: 8rpx;
  font-size: 22rpx;
  color: $text-3;
}

// ── Detail Actions ──
.detail-actions {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $border;
}
.d-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 80rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;

  &.copy {
    background: $bg-raised;
    color: $text-2;
  }
  &.gen {
    background: linear-gradient(135deg, $primary, #A3B0CC);
    color: #FFFFFF;
  }
  &.unfav {
    background: rgba(232,148,122,0.1);
    color: $coral;
  }
  &:active { opacity: 0.85; }
}
</style>
