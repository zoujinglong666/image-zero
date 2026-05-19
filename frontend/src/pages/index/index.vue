<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="图灵绘境"
      :titleStyle="{ color: '#111111', fontWeight: '600', fontSize: '17px' }"
      :bgColor="'#FFFFFF'"
      :borderBottom="true"
      :placeholder="true"
    >
      <template #right>
        <u-icon name="setting" size="40" color="#4A3AFF" @click="goToSettings" />
      </template>
    </u-navbar>

    <!-- 网络状态提示 -->
    <view v-if="!isOnline" class="offline-banner">
      <u-icon name="info-circle-fill" size="40" color="#FFF" />
      <text>网络已断开，请检查连接</text>
    </view>

    <!-- 主内容滚动区 -->
    <scroll-view
      scroll-y
      class="main-scroll"
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
      @scrolltolower="loadMorePosts"
    >

      <!-- ====== 搜索框 ====== -->
      <view class="search-bar" @tap="goToSearch">
        <u-icon name="search" size="36" color="#C7C7CC" />
        <text class="search-placeholder">搜索提示词、风格、标签...</text>
      </view>

      <!-- ====== 核心功能区：上传图片获取提示词 ====== -->
      <view class="hero-upload" @tap="triggerUpload">
        <view class="upload-area">
          <u-icon name="plus" size="80" color="#8B7FFF" />
          <text class="upload-title">上传图片，AI 反推提示词</text>
          <text class="upload-desc">支持 JPG / PNG / WEBP，自动压缩后分析</text>
        </view>
      </view>

      <!-- ====== 快捷工具入口 ====== -->
      <view class="quick-tools">
        <view class="tool-item" @tap="goToCreate">
          <view class="tool-icon" style="background: #F0EFFF;">
            <u-icon name="photo" size="40" color="#4A3AFF" />
          </view>
          <text class="tool-label">AI解析</text>
        </view>
        <view class="tool-item" @tap="goToEditDirect">
          <view class="tool-icon" style="background: #F0EFFF;">
            <u-icon name="edit-pen" size="40" color="#4A3AFF" />
          </view>
          <text class="tool-label">编辑</text>
        </view>
        <view class="tool-item" @tap="goToPromptLib">
          <view class="tool-icon" style="background: #F0EFFF;">
            <u-icon name="file-text" size="40" color="#4A3AFF" />
          </view>
          <text class="tool-label">词库</text>
        </view>
        <view class="tool-item" @tap="goToHistory">
          <view class="tool-icon" style="background: #F0EFFF;">
            <u-icon name="clock" size="40" color="#4A3AFF" />
          </view>
          <text class="tool-label">历史</text>
        </view>
      </view>

      <!-- ====== 每日精选（横向滑动）====== -->
      <view class="section">
        <view class="section-header">
          <view class="section-title-row">
            <view class="section-dot" style="background: #4A3AFF;" />
            <text class="section-title">每日精选</text>
          </view>
          <text class="section-more" @tap="goToCommunity">更多 ›</text>
        </view>
        <scroll-view scroll-x class="picks-scroll" :show-scrollbar="false">
          <view class="picks-row">
            <view
              v-for="item in dailyPicks"
              :key="item.id"
              class="pick-card"
              @tap="goToWorkDetail(item)"
            >
              <image
                class="pick-img"
                :src="item.image_url || '/static/logo.png'"
                mode="aspectFill"
              />
              <view class="pick-info">
                <text class="pick-title">{{ item.title || 'AI作品' }}</text>
                <view class="pick-meta">
                  <u-icon name="heart-fill" size="24" color="#FF2D55" />
                  <text class="pick-likes">{{ item.like_count || 0 }}</text>
                </view>
              </view>
            </view>
            <!-- 空状态占位 -->
            <view v-if="dailyPicks.length === 0" class="pick-empty">
              <u-icon name="image" size="48" color="#C7C7CC" />
              <text>暂无精选作品</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ====== 本周挑战 ====== -->
      <view v-if="activeChallenge" class="section">
        <view class="section-header">
          <view class="section-title-row">
            <view class="section-dot" style="background: #4A3AFF;" />
            <text class="section-title">本周挑战</text>
          </view>
        </view>
        <view class="challenge-card" @tap="goToChallenge(activeChallenge)">
          <view class="challenge-content">
            <view class="challenge-badge">
              <u-icon name="fire" size="32" color="#4A3AFF" />
              <text>进行中</text>
            </view>
            <text class="challenge-title">{{ activeChallenge.title }}</text>
            <text class="challenge-desc">{{ activeChallenge.description }}</text>
            <view class="challenge-footer">
              <view class="challenge-participants">
                <u-icon name="man-add" size="28" color="#4A3AFF" />
                <text>{{ activeChallenge.participant_count || 0 }} 人参与</text>
              </view>
              <view class="challenge-tags" v-if="activeChallenge.theme_tags">
                <text
                  v-for="(tag, idx) in activeChallenge.theme_tags.split(',').slice(0, 3)"
                  :key="idx"
                  class="challenge-tag"
                >#{{ tag }}</text>
              </view>
            </view>
          </view>
          <view class="challenge-action" @tap.stop="joinChallenge(activeChallenge)">
            <text>参与挑战 ›</text>
          </view>
        </view>
      </view>

      <!-- ====== 热门推荐（瀑布流）====== -->
      <view class="section">
        <view class="section-header">
          <view class="section-title-row">
            <view class="section-dot" style="background: #4A3AFF;" />
            <text class="section-title">热门推荐</text>
          </view>
          <text class="section-more" @tap="goToCommunity">更多 ›</text>
        </view>

        <!-- 瀑布流列表 -->
        <view class="waterfall">
          <view class="waterfall-col">
            <view
              v-for="item in leftCol"
              :key="item.id"
              class="work-card"
              @tap="goToWorkDetail(item)"
            >
              <image
                class="work-img"
                :src="item.image_url || '/static/logo.png'"
                mode="widthFix"
                :style="{ height: item._imgHeight || 'auto' }"
              />
              <view class="work-info">
                <text class="work-title">{{ item.title || 'AI创作' }}</text>
                <view class="work-meta">
                  <view class="work-likes" @tap.stop="likeWork(item)">
                    <u-icon
                      :name="item._liked ? 'heart-fill' : 'heart'"
                      size="24"
                      :color="item._liked ? '#FF2D55' : '#C7C7CC'"
                    />
                    <text>{{ item.like_count || 0 }}</text>
                  </view>
                  <view class="work-action" @tap.stop="shareWork(item)">
                    <u-icon name="share" size="24" color="#C7C7CC" />
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view class="waterfall-col">
            <view
              v-for="item in rightCol"
              :key="item.id"
              class="work-card"
              @tap="goToWorkDetail(item)"
            >
              <image
                class="work-img"
                :src="item.image_url || '/static/logo.png'"
                mode="widthFix"
                :style="{ height: item._imgHeight || 'auto' }"
              />
              <view class="work-info">
                <text class="work-title">{{ item.title || 'AI创作' }}</text>
                <view class="work-meta">
                  <view class="work-likes" @tap.stop="likeWork(item)">
                    <u-icon
                      :name="item._liked ? 'heart-fill' : 'heart'"
                      size="24"
                      :color="item._liked ? '#FF2D55' : '#C7C7CC'"
                    />
                    <text>{{ item.like_count || 0 }}</text>
                  </view>
                  <view class="work-action" @tap.stop="shareWork(item)">
                    <u-icon name="share" size="24" color="#C7C7CC" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="loading-more">
          <view class="loading-spinner-sm" />
          <text>加载中...</text>
        </view>
        <view v-if="noMorePosts" class="no-more">
          <text>— 已加载全部 —</text>
        </view>
      </view>

      <view class="bottom-spacer" />

    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { useHistoryStore } from '@/stores/history'
import { analyzeImage as apiAnalyze, generateImage as apiGenerate, checkNetwork, watchNetworkChange } from '@/api/image'
import { getHomeData, getLatestPosts, likeSubmission } from '@/api/community'
import { toggleCommunityLike } from '@/api/prompt'
import type { CommunityWork, Challenge, HomeData } from '@/api/community'
import { getFriendlyError } from '@/common/http.interceptor'
import type { ImageAnalysisResult } from '@/types'

const historyStore = useHistoryStore()
const historyCount = computed(() => historyStore?.history?.length ?? 0)

// ─── 社区数据 ────────────────────────────────
const dailyPicks = ref<CommunityWork[]>([])
const weeklyHot = ref<CommunityWork[]>([])
const activeChallenge = ref<Challenge | null>(null)
const latestPostsList = ref<CommunityWork[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const loadingMore = ref(false)
const noMorePosts = ref(false)
const refreshing = ref(false)

// ─── 瀑布流布局 ──────────────────────────────
const leftCol = computed(() => {
  return latestPostsList.value.filter((_, i) => i % 2 === 0)
})
const rightCol = computed(() => {
  return latestPostsList.value.filter((_, i) => i % 2 !== 0)
})

// ─── 原有工具状态 ─────────────────────────────
const uploadedImage = ref('')
const analyzing = ref(false)
const generating = ref(false)
const analysisResult = ref<ImageAnalysisResult | null>(null)
const showResult = ref(false)
const generatedImage = ref('')
const genImageLoading = ref(false)
const genImageError = ref(false)
const scrollIntoView = ref('')
const isOnline = ref(true)
const compressInfo = ref('')
const analysisElapsed = ref('')
let analyzeStartTime = 0
let analyzeTimer: ReturnType<typeof setInterval> | null = null

// ─── 生命周期 ────────────────────────────
onMounted(async () => {
  isOnline.value = await checkNetwork()
  const unwatch = watchNetworkChange((online) => {
    isOnline.value = online
    if (!online) uni.showToast({ title: '网络已断开', icon: 'none' })
  })

  // 加载首页数据
  await loadHomeData()

  onUnmounted(() => {
    unwatch()
    if (analyzeTimer) clearInterval(analyzeTimer)
  })
})

// ─── 下拉刷新 ──────────────────────────────
onPullDownRefresh(async () => {
  refreshing.value = true
  currentPage.value = 1
  noMorePosts.value = false
  try {
    await loadHomeData()
    uni.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
  } catch (err) {
    console.warn('刷新失败:', err)
  } finally {
    refreshing.value = false
    uni.stopPullDownRefresh()
  }
})

// ─── 加载首页聚合数据 ──────────────────────
async function loadHomeData() {
  try {
    const data = await getHomeData()
    dailyPicks.value = data.daily_picks || []
    weeklyHot.value = data.weekly_hot || []
    activeChallenge.value = data.active_challenge || null

    if (data.latest_posts?.list) {
      latestPostsList.value = data.latest_posts.list.map(item => ({
        ...item,
        _liked: false,
        _imgHeight: `${280 + Math.random() * 200}rpx`,
      }))
      currentPage.value = data.latest_posts.pagination?.page || 1
      totalPages.value = data.latest_posts.pagination?.total_pages || 1
    }
  } catch (err) {
    console.warn('首页数据加载失败:', err)
    // 降级：使用空数据，不阻断页面
  }
}

// ─── 加载更多 ──────────────────────────────
async function loadMorePosts() {
  if (loadingMore.value || noMorePosts.value) return
  if (currentPage.value >= totalPages.value) {
    noMorePosts.value = true
    return
  }

  loadingMore.value = true
  try {
    const result = await getLatestPosts({ page: currentPage.value + 1, page_size: 20 })
    const newItems = (result.list || []).map(item => ({
      ...item,
      _liked: false,
      _imgHeight: `${280 + Math.random() * 200}rpx`,
    }))
    latestPostsList.value = [...latestPostsList.value, ...newItems]
    currentPage.value = result.pagination?.page || currentPage.value + 1
    totalPages.value = result.pagination?.total_pages || totalPages.value
  } catch (err) {
    console.warn('加载更多失败:', err)
  } finally {
    loadingMore.value = false
  }
}

// ─── 点赞作品 ──────────────────────────────
async function likeWork(item: CommunityWork & { _liked?: boolean }) {
  if (item._liked) return
  try {
    await toggleCommunityLike(item.id)
    item._liked = true
    item.like_count = (item.like_count || 0) + 1
  } catch (err) {
    console.warn('点赞失败:', err)
  }
}

// ─── 分享作品 ──────────────────────────────
function shareWork(item: CommunityWork) {
  // 设置分享上下文，使 onShareAppMessage 返回该作品的动态数据
  shareContext.value = item
  // 触发小程序分享
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '点击右上角分享给好友', icon: 'none' })
  // #endif
  // #ifndef MP-WEIXIN
  uni.setClipboardData({
    data: item.prompt_text || item.title,
    success: () => uni.showToast({ title: '提示词已复制', icon: 'success' })
  })
  // #endif
}

// ─── 导航方法 ──────────────────────────────
const goToSearch = () => {
  uni.switchTab({ url: '/pages/prompt/prompt' })
}

const goToCreate = () => {
  // AI解析按钮也触发上传
  triggerUpload()
}

const goToEditDirect = () => {
  uni.switchTab({ url: '/pages/edit/edit' })
}

const goToPromptLib = () => {
  uni.switchTab({ url: '/pages/prompt/prompt' })
}

const goToHistory = () => {
  uni.switchTab({ url: '/pages/history/history' })
}

const goToCommunity = () => {
  uni.switchTab({ url: '/pages/prompt/prompt' })
}

const goToSettings = () => {
  uni.switchTab({ url: '/pages/mine/mine' })
}

const goToWorkDetail = (item: CommunityWork) => {
  // 跳转到作品详情（提示词详情页）
  uni.navigateTo({
    url: `/pages/edit/edit?postId=${item.id}&promptText=${encodeURIComponent(item.prompt_text || '')}`
  })
}

const goToChallenge = (challenge: Challenge) => {
  // 跳转到挑战详情
  uni.navigateTo({
    url: `/pages/edit/edit?challengeId=${challenge.id}&promptHint=${encodeURIComponent(challenge.prompt_hint || '')}`
  })
}

const joinChallenge = (challenge: Challenge) => {
  goToChallenge(challenge)
}

// ====== 图片上传（含自动压缩）======
const triggerUpload = () => {
  // #ifdef H5
  const existingInput = document.getElementById('__turing_file_input__') as HTMLInputElement
  if (existingInput) existingInput.remove()

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.id = '__turing_file_input__'
  input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;'

  input.onchange = async (e: any) => {
    const files = e.target.files
    if (!files || !files[0]) return

    const origSizeKB = Math.round(files[0].size / 1024)
    const reader = new FileReader()
    reader.onload = async (ev: any) => {
      const dataUrl = ev.target.result as string
      if (origSizeKB > 500) {
        compressInfo.value = `${(origSizeKB / 1024).toFixed(1)}MB → 压缩中...`
      }
      uploadedImage.value = dataUrl

      // 直接跳转到编辑页分析
      uni.navigateTo({
        url: `/pages/edit/edit?imageUrl=${encodeURIComponent(dataUrl.substring(0, 2000))}`
      })
    }
    reader.readAsDataURL(files[0])
    setTimeout(() => input.remove(), 100)
  }

  document.body.appendChild(input)
  input.click()
  // #endif

  // #ifndef H5
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      uploadedImage.value = res.tempFilePaths[0]
      uni.navigateTo({
        url: `/pages/edit/edit?imageUrl=${encodeURIComponent(res.tempFilePaths[0])}`
      })
    }
  })
  // #endif
}

// ====== 小程序分享功能 ======

// 当前分享上下文（用户点击了某个作品的分享按钮时，分享该作品）
const shareContext = ref<CommunityWork | null>(null)

// 分享给好友
const onShareAppMessage = () => {
  const work = shareContext.value || dailyPicks.value[0]
  if (work) {
    return {
      title: work.title ? `「${work.title}」来图灵绘境试试` : '我用AI画了这个！来图灵绘境试试',
      path: `/pages/index/index?workId=${work.id}`,
      imageUrl: work.image_url || '/static/logo.png',
    }
  }
  return {
    title: '图灵绘境 - AI反推提示词神器',
    path: '/pages/index/index',
    imageUrl: '/static/logo.png',
  }
}

// 分享到朋友圈
const onShareTimeline = () => {
  const work = shareContext.value || dailyPicks.value[0]
  if (work) {
    return {
      title: work.title ? `「${work.title}」| 图灵绘境` : '图灵绘境 - AI反推提示词神器',
      query: `workId=${work.id}`,
      imageUrl: work.image_url || '/static/logo.png',
    }
  }
  return {
    title: '图灵绘境 - AI反推提示词神器',
    query: '',
    imageUrl: '/static/logo.png',
  }
}

// 收藏到「我的小程序」
const onAddToFavorites = () => {
  return {
    title: '图灵绘境 - AI反推提示词神器',
    imageUrl: '/static/logo.png',
  }
}

// 暴露分享方法（uni-app 页面生命周期要求）
defineExpose({
  onShareAppMessage,
  onShareTimeline,
  onAddToFavorites,
})
</script>

<style lang="scss" scoped>
/* ====== 全局 ====== */
.page {
  min-height: 100vh;
  background: #F5F5F7;
}

.main-scroll {
  height: calc(100vh - 44px);
}

.bottom-spacer {
  height: calc(env(safe-area-inset-bottom) + 120rpx);
}

/* ====== 离线横幅 ====== */
.offline-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #DC2626, #991B1B);
  position: sticky;
  top: 0;
  z-index: 10;

  text {
    font-size: 24rpx;
    color: #FFF;
    font-weight: 500;
  }
}

/* ====== 搜索框 ====== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 20rpx 24rpx 0;
  padding: 22rpx 32rpx;
  background: #FFFFFF;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
  border: 1rpx solid rgba(0, 0, 0, 0.03);
}

.search-placeholder {
  font-size: 28rpx;
  color: #C7C7CC;
}

/* ====== 快捷工具入口 ====== */
.quick-tools {
  display: flex;
  justify-content: space-between;
  padding: 32rpx 24rpx 16rpx;
  gap: 16rpx;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.tool-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F0EFFF;
  box-shadow: 0 4rpx 16rpx rgba(74, 58, 255, 0.08);
}

.tool-label {
  font-size: 24rpx;
  color: #111111;
  font-weight: 600;
}

/* ====== 通用 section ====== */
.section {
  margin-top: 36rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx 20rpx;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.section-dot {
  width: 8rpx;
  height: 36rpx;
  border-radius: 4rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #111111;
  letter-spacing: 0.5rpx;
}

.section-more {
  font-size: 26rpx;
  color: #4A3AFF;
  font-weight: 500;
}

/* ====== 每日精选（横向滑动）====== */
.picks-scroll {
  white-space: nowrap;
  padding-left: 24rpx;
}

.picks-row {
  display: inline-flex;
  gap: 16rpx;
  padding-right: 24rpx;
}

.pick-card {
  display: inline-flex;
  flex-direction: column;
  width: 260rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.pick-card:active {
  transform: scale(0.97);
}

.pick-img {
  width: 260rpx;
  height: 340rpx;
  background: linear-gradient(135deg, #F0F0F0, #E8E8E8);
}

.pick-info {
  padding: 16rpx 18rpx;
}

.pick-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #111111;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.pick-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 10rpx;
}

.pick-likes {
  font-size: 22rpx;
  color: #8E8E93;
}

.pick-empty {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 260rpx;
  height: 340rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  gap: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  text {
    font-size: 26rpx;
    color: #C7C7CC;
    font-weight: 500;
  }
}

/* ====== 本周挑战 ====== */
.challenge-card {
  margin: 0 24rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid #F0EFFF;
}

.challenge-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.challenge-badge {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  align-self: flex-start;
  padding: 4rpx 16rpx;
  background: #F0EFFF;
  border-radius: 20rpx;

  text {
    font-size: 22rpx;
    color: #4A3AFF;
    font-weight: 600;
  }
}

.challenge-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111111;
}

.challenge-desc {
  font-size: 24rpx;
  color: #8E8E93;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.challenge-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}

.challenge-participants {
  display: flex;
  align-items: center;
  gap: 6rpx;

  text {
    font-size: 22rpx;
    color: #4A3AFF;
    font-weight: 500;
  }
}

.challenge-tags {
  display: flex;
  gap: 8rpx;
}

.challenge-tag {
  font-size: 20rpx;
  color: #4A3AFF;
  background: #F0EFFF;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.challenge-action {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;

  text {
    font-size: 26rpx;
    color: #4A3AFF;
    font-weight: 600;
  }
}

/* ====== 热门推荐（瀑布流）====== */
.waterfall {
  display: flex;
  gap: 16rpx;
  padding: 0 24rpx;
}

.waterfall-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.work-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.07);
  transition: transform 0.2s;
}

.work-card:active {
  transform: scale(0.97);
}

.work-img {
  width: 100%;
  min-height: 200rpx;
  background: linear-gradient(135deg, #F0F0F0, #E8E8E8);
}

.work-info {
  padding: 16rpx 18rpx;
}

.work-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #111111;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.work-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.work-likes {
  display: flex;
  align-items: center;
  gap: 8rpx;

  text {
    font-size: 22rpx;
    color: #8E8E93;
  }
}

.work-action {
  padding: 8rpx;
}

/* ====== 加载更多 ====== */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 0;

  text {
    font-size: 24rpx;
    color: #8E8E93;
  }
}

.loading-spinner-sm {
  width: 28rpx;
  height: 28rpx;
  border: 3rpx solid #E5E5EA;
  border-top-color: #4A3AFF;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-more {
  text-align: center;
  padding: 32rpx 0;

  text {
    font-size: 24rpx;
    color: #C7C7CC;
  }
}

/* ====== 核心上传区域 ====== */
.hero-upload {
  margin: 24rpx 24rpx 0;
  padding: 0;
  background: #1C1C1C;
  border-radius: 28rpx;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 40rpx rgba(74, 58, 255, 0.15);
}

.hero-upload::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(123, 111, 255, 0.18) 0%, transparent 70%),
    radial-gradient(ellipse 60% 40% at 80% 60%, rgba(74, 58, 255, 0.12) 0%, transparent 70%);
  pointer-events: none;
}

.hero-upload:active {
  transform: scale(0.98);
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 56rpx 40rpx;
  position: relative;
  z-index: 1;
}

.upload-area .u-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(74, 58, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.upload-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
}
</style>