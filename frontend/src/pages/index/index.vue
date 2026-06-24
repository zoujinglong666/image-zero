<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="图灵绘境"
      :titleStyle="{ color: '#2C2E3A', fontWeight: '700', fontSize: '17px' }"
      :bgColor="'#FFFFFF'"
      :borderBottom="false"
      :placeholder="true"
    >
      <template #right>
        <u-icon name="setting" size="40" color="#8B9DC8" @click="goToSettings" />
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
      <view class="search-bar animate-item" @click="goToSearch">
        <u-icon name="search" size="36" color="#9A9BAC" />
        <text class="search-placeholder">{{ hotSearchKeywords[hotSearchIdx] }}</text>
      </view>

      <!-- ====== 核心功能区：上传图片获取提示词 ====== -->
      <view class="hero-upload animate-item" :class="{ 'upload-active': uploadPressed }" @click="triggerUpload" @touchstart="uploadPressed = true" @touchend="uploadPressed = false" @touchcancel="uploadPressed = false">
        <view class="hero-bg-orbs">
          <view class="hero-orb hero-orb-1" />
          <view class="hero-orb hero-orb-2" />
          <view class="hero-orb hero-orb-3" />
        </view>
        <view class="upload-area">
          <view class="upload-icon-wrap">
            <view class="upload-ring upload-ring-1" />
            <view class="upload-ring upload-ring-2" />
            <view class="upload-icon-inner">
              <u-icon name="camera" size="48" color="#FFFFFF" />
            </view>
          </view>
          <text class="upload-title">{{ sceneUploadTitle }}</text>
          <text class="upload-desc">{{ sceneUploadDesc }}</text>
          <view v-if="selectedScene" class="scene-badge">
            <text>{{ sceneConfig[selectedScene]?.name || '' }}</text>
          </view>
          <view v-else class="hero-cta">
            <text>点击或拖拽图片到这里</text>
          </view>
        </view>
      </view>

      <!-- ====== 场景选择（四大垂直场景）====== -->
      <view class="trust-strip animate-item">
        <view class="trust-item">
          <text class="trust-num">10万+</text>
          <text class="trust-label">创作者信赖</text>
        </view>
        <view class="trust-divider" />
        <view class="trust-item">
          <text class="trust-num">50万+</text>
          <text class="trust-label">图片已生成</text>
        </view>
        <view class="trust-divider" />
        <view class="trust-item">
          <text class="trust-num">3秒</text>
          <text class="trust-label">极速出图</text>
        </view>
      </view>

      <view class="scene-section">
        <view class="section-header section-header-col">
          <view class="section-title-row">
            <view class="section-dot" />
            <text class="section-title">你想做什么？</text>
          </view>
          <text class="section-sub-title">选一个场景，AI 自动优化分析策略</text>
        </view>

        <view class="scene-grid-2x2">
          <!-- 场景1: 电商主图 -->
          <view class="sc2-card sc2-gold" :class="{ active: selectedScene === 'ecommerce' }" @click="selectScene('ecommerce')">
            <view class="sc2-deco" />
            <view class="sc2-icon sc2-icon-gold">
              <text class="sc2-emoji">🛒</text>
            </view>
            <text class="sc2-name">电商主图</text>
            <text class="sc2-desc">反推构图·换色换背景</text>
            <view class="sc2-tags">
              <text class="sc2-tag">白底图</text>
              <text class="sc2-tag">多尺寸</text>
            </view>
            <view v-if="selectedScene === 'ecommerce'" class="sc2-check">
              <u-icon name="checkmark" size="24" color="#FFF" />
            </view>
          </view>

          <!-- 场景2: 社交头像 -->
          <view class="sc2-card sc2-pink" :class="{ active: selectedScene === 'avatar' }" @click="selectScene('avatar')">
            <view class="sc2-deco" />
            <view class="sc2-icon sc2-icon-pink">
              <text class="sc2-emoji">📱</text>
            </view>
            <text class="sc2-name">社交头像</text>
            <text class="sc2-desc">换脸换背景·多尺寸</text>
            <view class="sc2-tags">
              <text class="sc2-tag">1:1</text>
              <text class="sc2-tag">9:16</text>
            </view>
            <view v-if="selectedScene === 'avatar'" class="sc2-check">
              <u-icon name="checkmark" size="24" color="#FFF" />
            </view>
          </view>

          <!-- 场景3: PPT配图 -->
          <view class="sc2-card sc2-green" :class="{ active: selectedScene === 'ppt' }" @click="selectScene('ppt')">
            <view class="sc2-deco" />
            <view class="sc2-icon sc2-icon-green">
              <text class="sc2-emoji">📊</text>
            </view>
            <text class="sc2-name">PPT配图</text>
            <text class="sc2-desc">配色排版·批量生成</text>
            <view class="sc2-tags">
              <text class="sc2-tag">16:9</text>
              <text class="sc2-tag">扁平风</text>
            </view>
            <view v-if="selectedScene === 'ppt'" class="sc2-check">
              <u-icon name="checkmark" size="24" color="#FFF" />
            </view>
          </view>

          <!-- 场景4: 风格迁移 -->
          <view class="sc2-card sc2-purple" :class="{ active: selectedScene === 'style-transfer' }" @click="selectScene('style-transfer')">
            <view class="sc2-deco" />
            <view class="sc2-icon sc2-icon-purple">
              <text class="sc2-emoji">🎨</text>
            </view>
            <text class="sc2-name">风格迁移</text>
            <text class="sc2-desc">油画·动漫·赛博朋克</text>
            <view class="sc2-tags">
              <text class="sc2-tag">梵高</text>
              <text class="sc2-tag">宫崎骏</text>
            </view>
            <view v-if="selectedScene === 'style-transfer'" class="sc2-check">
              <u-icon name="checkmark" size="24" color="#FFF" />
            </view>
          </view>
        </view>
      </view>

      <!-- ====== 🔥 热门词库模板（精选 Prompt）====== -->
      <!-- 骨架屏 -->
      <view v-if="!dataReady" class="section tmpl-section">
        <view class="section-header">
          <view class="skeleton-line" style="width: 280rpx; height: 34rpx;" />
        </view>
        <scroll-view scroll-x :show-scrollbar="false" class="tmpl-scroll">
          <view class="tmpl-row">
            <view v-for="i in 3" :key="'sk-tmpl-'+i" class="skeleton-card tmpl-mini-card">
              <view class="skeleton-shimmer" style="height: 240rpx;" />
              <view style="padding: 16rpx 18rpx;">
                <view class="skeleton-line" style="width: 70%; height: 24rpx; margin-bottom: 10rpx;" />
                <view class="skeleton-line" style="width: 90%; height: 20rpx;" />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-else-if="hotTemplates.length > 0" class="section tmpl-section">
        <view class="section-header">
          <view class="section-title-row">
            <text class="section-emoji">🔥</text>
            <text class="section-title">不会写提示词？先试这几个</text>
          </view>
          <text class="section-more" @click="goToPromptLib">更多 ›</text>
        </view>
        <text class="section-sub-hint">选一个效果，上传图片就能生成同款</text>

        <scroll-view scroll-x :show-scrollbar="false" class="tmpl-scroll">
          <view class="tmpl-row">
            <view
              v-for="(tmpl, tIdx) in hotTemplates"
              :key="'tmpl' + tmpl.id"
              class="tmpl-mini-card animate-item"
              @click="generateFromTemplate(tmpl)"
            >
              <!-- 封面 -->
              <view class="tmpl-cover" :style="tmplCoverStyle(tmpl, tIdx)">
                <image
                  v-if="tmpl.image_url"
                  class="tmpl-img"
                  :src="tmpl.image_url"
                  mode="aspectFill"
                />
                <text v-else class="tmpl-emoji">{{ getTmplEmoji(tmpl) }}</text>
                <view v-if="isTmplHot(tmpl)" class="tmpl-hot"><text>🔥</text></view>
                <view v-if="isRecentlyUsed(tmpl.id)" class="tmpl-used"><text>用过</text></view>
                <view v-if="tmpl.view_count" class="tmpl-uses">
                  <text>{{ formatTmplUses(tmpl.view_count) }}</text>
                </view>
              </view>
              <!-- 信息 -->
              <view class="tmpl-info">
                <text class="tmpl-name">{{ tmpl.title }}</text>
                <text class="tmpl-desc">{{ truncateTmpl(tmpl.content_cn || tmpl.prompt_text, 36) }}</text>
                <view class="tmpl-gen-btn">
                  <text>生成同款</text>
                  <u-icon name="arrow-right" size="24" color="#FFF" />
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ====== 每日精选（横向滑动）====== -->
      <!-- 骨架屏 -->
      <view v-if="!dataReady" class="section">
        <view class="section-header">
          <view class="skeleton-line" style="width: 200rpx; height: 34rpx;" />
        </view>
        <view class="picks-row" style="padding-left: 24rpx;">
          <view v-for="i in 3" :key="'sk-pick-'+i" class="skeleton-card pick-card">
            <view class="skeleton-shimmer" style="height: 340rpx;" />
            <view style="padding: 16rpx 18rpx;">
              <view class="skeleton-line" style="width: 80%; height: 24rpx;" />
            </view>
          </view>
        </view>
      </view>

      <view v-else class="section">
        <view class="section-header">
          <view class="section-title-row">
            <view class="section-dot" />
            <text class="section-title">每日精选</text>
          </view>
          <text class="section-more" @click="goToCommunity">更多 ›</text>
        </view>
        <scroll-view scroll-x class="picks-scroll" :show-scrollbar="false">
          <view class="picks-row">
            <view
              v-for="item in dailyPicks"
              :key="item.id"
              class="pick-card"
              @click="goToWorkDetail(item)"
            >
              <image
                class="pick-img"
                :src="item.image_url || '/static/logo.png'"
                mode="aspectFill"
              />
              <view class="pick-info">
                <text class="pick-title">{{ item.title || 'AI作品' }}</text>
                <view class="pick-meta">
                  <u-icon name="heart-fill" size="24" color="#E8947A" />
                  <text class="pick-likes">{{ item.like_count || 0 }}</text>
                </view>
              </view>
            </view>
            <!-- 空状态占位 -->
            <view v-if="dailyPicks.length === 0" class="pick-empty">
              <u-icon name="image" size="48" color="#9A9BAC" />
              <text>暂无精选作品</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ====== 本周挑战 ====== -->
      <view v-if="activeChallenge" class="section animate-item">
        <view class="section-header">
          <view class="section-title-row">
            <view class="section-dot" />
            <text class="section-title">本周挑战</text>
          </view>
        </view>
        <view class="challenge-card" @click="goToChallenge(activeChallenge)">
          <view class="challenge-content">
            <view class="challenge-badge">
              <u-icon name="fire" size="32" color="#C4B5E0" />
              <text>进行中</text>
            </view>
            <text class="challenge-title">{{ activeChallenge.title }}</text>
            <text class="challenge-desc">{{ activeChallenge.description }}</text>
            <view class="challenge-footer">
              <view class="challenge-participants">
                <u-icon name="man-add" size="28" color="#8B9DC8" />
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
          <view class="challenge-action" @click.stop="joinChallenge(activeChallenge)">
            <text>参与挑战 ›</text>
          </view>
        </view>
      </view>

      <!-- ====== 热门推荐（瀑布流）====== -->
      <!-- 骨架屏 -->
      <view v-if="!dataReady" class="section">
        <view class="section-header">
          <view class="skeleton-line" style="width: 200rpx; height: 34rpx;" />
        </view>
        <view class="waterfall">
          <view class="waterfall-col">
            <view v-for="i in 2" :key="'sk-wl-'+i" class="skeleton-card work-card">
              <view class="skeleton-shimmer" :style="{ height: (240 + i * 40) + 'rpx' }" />
              <view style="padding: 16rpx 18rpx;">
                <view class="skeleton-line" style="width: 70%; height: 24rpx;" />
              </view>
            </view>
          </view>
          <view class="waterfall-col">
            <view v-for="i in 2" :key="'sk-wr-'+i" class="skeleton-card work-card">
              <view class="skeleton-shimmer" :style="{ height: (260 + i * 30) + 'rpx' }" />
              <view style="padding: 16rpx 18rpx;">
                <view class="skeleton-line" style="width: 70%; height: 24rpx;" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="section">
        <view class="section-header">
          <view class="section-title-row">
            <view class="section-dot" />
            <text class="section-title">热门推荐</text>
          </view>
          <text class="section-more" @click="goToCommunity">更多 ›</text>
        </view>

        <!-- 瀑布流列表 -->
        <view class="waterfall">
          <view class="waterfall-col">
            <view
              v-for="item in leftCol"
              :key="item.id"
              class="work-card"
              @click="goToWorkDetail(item)"
            >
              <view class="work-img-wrap">
                <view v-if="!item._imgLoaded" class="img-shimmer" />
                <image
                  class="work-img"
                  :src="item.image_url || '/static/logo.png'"
                  mode="widthFix"
                  :style="{ height: item._imgHeight || 'auto', opacity: item._imgLoaded ? 1 : 0 }"
                  @load="item._imgLoaded = true"
                />
              </view>
              <view class="work-info">
                <text class="work-title">{{ item.title || 'AI创作' }}</text>
                <view class="work-meta">
                  <view class="work-likes" :class="{ 'liking': likingId === item.id }" @click.stop="likeWork(item)">
                    <u-icon
                      :name="item._liked ? 'heart-fill' : 'heart'"
                      size="24"
                      :color="item._liked ? '#E8947A' : '#9A9BAC'"
                    />
                    <text>{{ item.like_count || 0 }}</text>
                  </view>
                  <view class="work-action" @click.stop="shareWork(item)">
                    <u-icon name="share" size="24" color="#9A9BAC" />
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
              @click="goToWorkDetail(item)"
            >
              <view class="work-img-wrap">
                <view v-if="!item._imgLoaded" class="img-shimmer" />
                <image
                  class="work-img"
                  :src="item.image_url || '/static/logo.png'"
                  mode="widthFix"
                  :style="{ height: item._imgHeight || 'auto', opacity: item._imgLoaded ? 1 : 0 }"
                  @load="item._imgLoaded = true"
                />
              </view>
              <view class="work-info">
                <text class="work-title">{{ item.title || 'AI创作' }}</text>
                <view class="work-meta">
                  <view class="work-likes" :class="{ 'liking': likingId === item.id }" @click.stop="likeWork(item)">
                    <u-icon
                      :name="item._liked ? 'heart-fill' : 'heart'"
                      size="24"
                      :color="item._liked ? '#E8947A' : '#9A9BAC'"
                    />
                    <text>{{ item.like_count || 0 }}</text>
                  </view>
                  <view class="work-action" @click.stop="shareWork(item)">
                    <u-icon name="share" size="24" color="#9A9BAC" />
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
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { useHistoryStore } from '@/stores/history'
import { useUserStore } from '@/stores/user'
import { analyzeImage as apiAnalyze, generateImage as apiGenerate, uploadImage as apiUpload, checkNetwork, watchNetworkChange } from '@/api/image'
import { getHomeData, getLatestPosts, likeSubmission } from '@/api/community'
import { toggleCommunityLike, getPromptList, type PromptItem } from '@/api/prompt'
import type { CommunityWork, Challenge, HomeData } from '@/api/community'
import { getFriendlyError } from '@/common/http.interceptor'
import type { ImageAnalysisResult } from '@/types'

const historyStore = useHistoryStore()
const userStore = useUserStore()
const historyCount = computed(() => historyStore?.history?.length ?? 0)

// ─── 搜索热词轮播 ──────────────────────────────
const hotSearchKeywords = [
  '搜索提示词、风格、标签...',
  '赛博朋克头像',
  '电商白底图',
  '宫崎骏动漫风',
  '极简商务 PPT 配图',
  '梵高星空风格迁移',
]
const hotSearchIdx = ref(0)
let hotSearchTimer: ReturnType<typeof setInterval> | null = null

// ─── 上传区按压反馈 ─────────────────────────────
const uploadPressed = ref(false)

// ─── 最近使用的模板 ─────────────────────────────
const recentTmplIds = ref<number[]>([])

function loadRecentTmplIds() {
  try {
    const raw = uni.getStorageSync('recent_tmpl_ids')
    if (raw) recentTmplIds.value = JSON.parse(raw)
  } catch {}
}

function saveRecentTmplId(id: number) {
  const ids = recentTmplIds.value.filter(i => i !== id)
  ids.unshift(id)
  recentTmplIds.value = ids.slice(0, 20)
  try { uni.setStorageSync('recent_tmpl_ids', JSON.stringify(recentTmplIds.value)) } catch {}
}

function isRecentlyUsed(id: number): boolean {
  return recentTmplIds.value.includes(id)
}

// ─── 社区数据 ────────────────────────────────
const dailyPicks = ref<CommunityWork[]>([])
const weeklyHot = ref<CommunityWork[]>([])
const activeChallenge = ref<Challenge | null>(null)
const latestPostsList = ref<CommunityWork[]>([])

// ─── 热门词库模板（首页展示）──────────────────
const hotTemplates = ref<PromptItem[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const loadingMore = ref(false)
const noMorePosts = ref(false)
const refreshing = ref(false)
const dataReady = ref(false)
const likingId = ref<number | null>(null)

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

// ─── 场景化工作台 ──────────────────────────────
type SceneType = 'ecommerce' | 'avatar' | 'ppt' | 'style-transfer' | ''
const selectedScene = ref<SceneType>('')

/** 场景配置表 */
const sceneConfig: Record<Exclude<SceneType, ''>, {
  name: string
  uploadTitle: string
  uploadDesc: string
  analyzeHint: string
  defaultProvider: string
  outputSizes: Array<{ label: string; w: number; h: number }>
}> = {
  ecommerce: {
    name: '电商主图',
    uploadTitle: '上传竞品/参考图，AI 反推构图与材质',
    uploadDesc: '自动分析光影角度 → 换色换背景 → 多尺寸电商图',
    analyzeHint: '这是一张电商产品图，请重点分析：1)拍摄角度和构图方式 2)光影布局 3)产品材质和质感 4)背景处理方式 5)适合的电商平台尺寸规格',
    defaultProvider: 'zhipu',
    outputSizes: [
      { label: '方形', w: 1000, h: 1000 },
      { label: '主图', w: 800, h: 800 },
      { label: '详情', w: 1200, h: 1200 },
      { label: '横版', w: 1920, h: 600 },
    ],
  },
  avatar: {
    name: '社交头像',
    uploadTitle: '上传风格参考图，AI 提取并迁移',
    uploadDesc: '保持氛围感 → 换脸换背景 → 一键多尺寸',
    analyzeHint: '这是一张社交头像/壁纸风格的图片，请重点分析：1)整体画风和艺术风格 2)色彩情绪和氛围 3)人物姿态和表情特点 4)背景元素和景深效果 5)适合做头像/壁纸的裁剪建议',
    defaultProvider: 'zhipu',
    outputSizes: [
      { label: '头像1:1', w: 1000, h: 1000 },
      { label: '壁纸9:16', w: 1080, h: 1920 },
      { label: '朋友圈', w: 1200, h: 1200 },
      { label: '横幅', w: 1920, h: 1080 },
    ],
  },
  ppt: {
    name: 'PPT配图',
    uploadTitle: '上传喜欢的配图风格参考',
    uploadDesc: '分析配色排版 → 输入文字需求 → 批量生成',
    analyzeHint: '这是一张PPT/商务配图风格的图片，请重点分析：1)配色方案和色彩比例 2)插图风格(扁平/插画风/数据图表风) 3)排版布局和留白 4)字体和文字设计风格 5)是否适合商务演示场景',
    defaultProvider: 'zhipu',
    outputSizes: [
      { label: '16:9宽屏', w: 1920, h: 1080 },
      { label: '4:3标准', w: 1600, h: 1200 },
      { label: '全屏海报', w: 1080, h: 1920 },
    ],
  },
  'style-transfer': {
    name: '风格迁移',
    uploadTitle: '上传原图，AI 帮你变身',
    uploadDesc: '保护主体不变 → 选择目标风格 → 强度可调',
    analyzeHint: '这是一张用于风格迁移的原图，请重点分析：1)画面主体内容(必须保留) 2)当前风格特征 3)色彩分布 4)构图结构 5)如果转换为其他艺术风格(如梵高油画、宫崎骏动漫、赛博朋克)，哪些元素应该保留、哪些可以改变',
    defaultProvider: 'zhipu',
    outputSizes: [
      { label: '原图比例', w: 1024, h: 1024 },
      { label: '横向', w: 1280, h: 720 },
      { label: '竖向', w: 720, h: 1280 },
    ],
  },
}

/** 当前场景的上传区文案（响应式） */
const sceneUploadTitle = computed(() => {
  return selectedScene.value ? sceneConfig[selectedScene.value]?.uploadTitle : '上传图片，AI 反推提示词'
})
const sceneUploadDesc = computed(() => {
  return selectedScene.value ? sceneConfig[selectedScene.value]?.uploadDesc : '支持 JPG / PNG / WEBP，自动压缩后分析'
})

/** 选择/取消选择场景 */
function selectScene(scene: SceneType) {
  if (selectedScene.value === scene) {
    selectedScene.value = ''
  } else {
    selectedScene.value = scene
  }
}

// ─── 生命周期 ────────────────────────────
onLoad((options?: any) => {
  // 处理邀请码（从分享链接携带）
  if (options && options.inviteCode) {
    handleInviteCode(String(options.inviteCode))
  }

  // 启用微信分享（必须！否则 onShareAppMessage 不会触发）
  // #ifdef MP-WEIXIN
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  })
  // #endif
})

let unwatchNetwork: (() => void) | null = null

onMounted(async () => {
  isOnline.value = await checkNetwork()
  unwatchNetwork = watchNetworkChange((online) => {
    isOnline.value = online
    if (!online) uni.showToast({ title: '网络已断开', icon: 'none' })
  })

  // 加载最近使用模板
  loadRecentTmplIds()

  // 搜索热词轮播（3s 切换）
  hotSearchTimer = setInterval(() => {
    hotSearchIdx.value = (hotSearchIdx.value + 1) % hotSearchKeywords.length
  }, 3000)

  // 加载首页数据
  await loadHomeData()
})

onUnmounted(() => {
  unwatchNetwork?.()
  if (analyzeTimer) clearInterval(analyzeTimer)
  if (hotSearchTimer) clearInterval(hotSearchTimer)
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
        _imgLoaded: false,
        _imgHeight: `${280 + Math.random() * 200}rpx`,
      }))
      currentPage.value = data.latest_posts.pagination?.page || 1
      totalPages.value = data.latest_posts.pagination?.total_pages || 1
    }

    // 加载热门词库模板（首页展示用）
    try {
      const tmplResult = await getPromptList({ sort: 'popular', page: 1, page_size: 8 })
      hotTemplates.value = (tmplResult.list || []).slice(0, 8)
    } catch { /* 模板加载失败不阻断 */ }

    dataReady.value = true
  } catch (err) {
    console.warn('首页数据加载失败:', err)
    dataReady.value = true // 即使失败也停止骨架屏
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
      _imgLoaded: false,
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
    likingId.value = item.id
    await toggleCommunityLike(item.id)
    item._liked = true
    item.like_count = (item.like_count || 0) + 1
  } catch (err) {
    console.warn('点赞失败:', err)
  } finally {
    setTimeout(() => { likingId.value = null }, 400)
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
const triggerUpload = async () => {
  // 登录守卫：未登录不允许上传
  const loggedIn = await userStore.ensureLogin()
  if (!loggedIn) return

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
    if (origSizeKB > 500) {
      compressInfo.value = `${(origSizeKB / 1024).toFixed(1)}MB → 上传中...`
    }

    try {
      // 用 ObjectURL 作为临时路径上传到后端
      const tempUrl = URL.createObjectURL(files[0])
      uploadedImage.value = tempUrl

      uni.showLoading({ title: '上传中...', mask: true })
      // 先上传拿 URL，再跳转分析（不再传 base64！）
      const serverUrl = await apiUpload(tempUrl)
      uni.hideLoading()
      console.log(`✅ [首页] 上传成功，跳转编辑页... scene=${selectedScene.value || 'none'}`)
      const sceneParam = selectedScene.value ? `&scene=${selectedScene.value}` : ''
      uni.navigateTo({
        url: `/pages/edit/edit?imageUrl=${encodeURIComponent(serverUrl)}${sceneParam}`
      })
    } catch (err: any) {
      uni.hideLoading()
      console.error('❌ [上传]', err)
      uni.showToast({ title: '上传失败，请重试', icon: 'none' })
    }
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
    success: async (res) => {
      uploadedImage.value = res.tempFilePaths[0]
      try {
        uni.showLoading({ title: '上传中...', mask: true })
        const serverUrl = await apiUpload(res.tempFilePaths[0])
        uni.hideLoading()
        const sceneParam = selectedScene.value ? `&scene=${selectedScene.value}` : ''
        uni.navigateTo({
          url: `/pages/edit/edit?imageUrl=${encodeURIComponent(serverUrl)}${sceneParam}`
        })
      } catch (err: any) {
        uni.hideLoading()
        uni.showToast({ title: '上传失败，请重试', icon: 'none' })
      }
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

// 处理邀请码（从分享链接携带）
function handleInviteCode(code: string) {
  if (!code) return
  uni.setStorageSync('pending_invite_code', code)
  console.log('[邀请] 收到邀请码:', code)
}

// ─── 热门词库模板辅助函数 ──────────────────────

const tmplGradients = [
  'none',
  'none',
  'none',
  'none',
  'none',
  'none',
  'none',
  'none',
]

function tmplCoverStyle(item: PromptItem, idx: number): Record<string, string> {
  if (item?.image_url) return {}
  // 无图时用淡灰素底 + emoji，不显示彩色渐变占位
  return { background: '#F0F1F5' }
}

function getTmplEmoji(item: PromptItem): string {
  const t = (item.title + '|' + (item.tags || '')).toLowerCase()
  if (/portrait|头像|headshot/i.test(t)) return '👤'
  if (/poster|海报|电影|movie/i.test(t)) return '🎬'
  if (/cyber|赛博|punk|科幻/i.test(t)) return '🤖'
  if (/fantasy|奇幻|龙|dragon/i.test(t)) return '🐉'
  if (/landscape|风景|自然|森林/i.test(t)) return '🏔️'
  if (/product|产品|电商|珠宝|ring/i.test(t)) return '💍'
  if (/sneaker|鞋|运动/i.test(t)) return '👟'
  if (/character|角色|rpg|game/i.test(t)) return '🎮'
  if (/cozy|可爱|cute|萌|动物/i.test(t)) return '🧸'
  if (/illustration|插画|flat|商务|ppt/i.test(t)) return '📊'
  return '✨'
}

function isTmplHot(item: PromptItem): boolean { return (item.view_count || 0) > 5000 }

function truncateTmpl(text: string, max: number): string {
  return text?.length > max ? text.substring(0, max) + '...' : (text || '')
}

function formatTmplUses(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n) + ' 次使用'
}

/** 从首页模板卡片跳转编辑页 */
function generateFromTemplate(tmpl: PromptItem) {
  saveRecentTmplId(tmpl.id)
  uni.navigateTo({
    url: `/pages/edit/edit?promptText=${encodeURIComponent(tmpl.prompt_text)}&tmplId=${tmpl.id}`,
  })
}

// 暴露分享方法（uni-app 页面生命周期要求）
defineExpose({
  onShareAppMessage,
  onShareTimeline,
  onAddToFavorites,
})
</script>

<style lang="scss" scoped>
/* ══════════════════════════════════
   Mist Canvas Design System
   薄雾白 · 通透清新
   ══════════════════════════════════ */

// ── Palette ──
$bg-page:    #F6F7FB;   // 页面背景（微冷雾蓝灰）
$bg-card:    #FFFFFF;   // 卡片表面
$bg-raised:  #F0F1F5;   // 微凸起表面
$border:     rgba(0,0,0,0.05);  // 极淡边框
$text-1:     #2C2E3A;   // 主文字（深海军）
$text-2:     #6B6E7D;   // 次文字
$text-3:     #9A9BAC;   // 弱文字
$primary:     #8B9DC8;   // 主色（雾蓝）
$primary-light: #A3B0CC;   // 浅主色
$primary-grad: linear-gradient(135deg, #8B9DC8, #A3B0CC);
$secondary:   #C4B5E0;   // 辅色（淡薰衣草）
$accent:     #A3B8A5;   // 点缀（鼠尾草绿）
$warning:     #E8C97A;   // 警告（柔金）
$danger:     #E8947A;   // 危险（柔珊瑚）

// ── Base ──
.page {
  min-height: 100vh;
  background: $bg-page;
  background-image:
    radial-gradient(circle at 15% 10%, rgba(139,157,200,0.04) 0%, transparent 50%),
    radial-gradient(circle at 85% 30%, rgba(196,181,224,0.05) 0%, transparent 50%),
    radial-gradient(circle at 50% 80%, rgba(163,184,165,0.03) 0%, transparent 50%);
}

.main-scroll { height: calc(100vh - 44px - 50px); }
.bottom-spacer { height: calc(env(safe-area-inset-bottom) + 120rpx); }

// ── Skeleton / Shimmer ──
.skeleton-card {
  background: $bg-card;
  border: 1rpx solid $border;
  border-radius: 20rpx;
  overflow: hidden;
}
.skeleton-shimmer {
  background: linear-gradient(90deg,
    $bg-raised 25%,
    rgba(196,181,224,0.15) 50%,
    $bg-raised 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
.skeleton-line {
  background: $bg-raised;
  border-radius: 8rpx;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ── Entrance Animations ──
.animate-item {
  opacity: 0;
  transform: translateY(24rpx);
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@for $i from 1 through 12 {
  .animate-item:nth-child(#{$i}) {
    animation-delay: #{$i * 0.06}s;
  }
}
@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ── Offline Banner ──
.offline-banner {
  display: flex; align-items: center; justify-content: center; gap: 10rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #E8947A, #D16B50);
  position: relative; z-index: 1;
  text { font-size: 24rpx; color: #FFF; font-weight: 500; }
}

// ── Search Bar ──
.search-bar {
  display: flex; align-items: center; gap: 16rpx;
  margin: 20rpx 24rpx 0;
  padding: 24rpx 32rpx;
  background: $bg-card;
  border-radius: 999rpx;
  border: 1rpx solid $border;
  box-shadow: 0 4rpx 20rpx rgba(139,157,200,0.1), 0 1rpx 4rpx rgba(0,0,0,0.04);
  transition: box-shadow 0.25s, transform 0.15s;
  &:active { box-shadow: 0 6rpx 28rpx rgba(139,157,200,0.18); transform: scale(0.985); }
}
.search-placeholder {
  font-size: 28rpx; color: $text-3;
  animation: fadeInSearch 0.4s ease;
}
@keyframes fadeInSearch {
  from { opacity: 0; transform: translateY(4rpx); }
  to   { opacity: 1; transform: translateY(0); }
}

// ── Hero Upload ──
.hero-upload {
  margin: 24rpx 24rpx 0;
  border-radius: 32rpx;
  overflow: hidden;
  position: relative;
  background: linear-gradient(135deg, #8B9DC8 0%, #A3B0CC 40%, #C4B5E0 100%);
  border: none;
  box-shadow: 0 8rpx 40rpx rgba(139,157,200,0.3), 0 2rpx 8rpx rgba(0,0,0,0.06);
  transition: all 0.25s ease;

  &:active, &.upload-active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 24rpx rgba(139,157,200,0.4), 0 1rpx 4rpx rgba(0,0,0,0.08);
  }
}
.hero-bg-orbs {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
}
.hero-orb {
  position: absolute; border-radius: 50%; filter: blur(40rpx); opacity: 0.35;
  animation: orbFloat 6s ease-in-out infinite;
}
.hero-orb-1 {
  width: 300rpx; height: 300rpx; background: rgba(255,255,255,0.4);
  top: -60rpx; right: -40rpx;
  animation-delay: 0s;
}
.hero-orb-2 {
  width: 200rpx; height: 200rpx; background: rgba(196,181,224,0.5);
  bottom: -40rpx; left: -20rpx;
  animation-delay: -2s;
}
.hero-orb-3 {
  width: 160rpx; height: 160rpx; background: rgba(255,255,255,0.3);
  top: 40%; left: 60%;
  animation-delay: -4s;
}
@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20rpx, -15rpx) scale(1.08); }
  66% { transform: translate(-10rpx, 10rpx) scale(0.95); }
}
.upload-area {
  display: flex; flex-direction: column; align-items: center; gap: 20rpx;
  padding: 64rpx 40rpx 56rpx;
  position: relative; z-index: 1;
}
.upload-icon-wrap {
  width: 140rpx; height: 140rpx; border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  border: 2rpx solid rgba(255,255,255,0.35);
  position: relative;
  backdrop-filter: blur(8px);
}
.upload-icon-inner {
  width: 108rpx; height: 108rpx; border-radius: 50%;
  background: rgba(255,255,255,0.9);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}
.upload-ring-1 {
  position: absolute; inset: -12rpx; border-radius: 50%;
  border: 2rpx solid rgba(255,255,255,0.25);
  animation: ringPulse 2.8s ease-in-out infinite;
}
.upload-ring-2 {
  position: absolute; inset: -28rpx; border-radius: 50%;
  border: 1.5rpx solid rgba(255,255,255,0.12);
  animation: ringPulse 2.8s ease-in-out infinite;
  animation-delay: 0.5s;
}
@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 0; }
}
.upload-title {
  font-size: 36rpx; font-weight: 800; color: #FFFFFF;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}
.upload-desc {
  font-size: 24rpx; color: rgba(255,255,255,0.8);
}
.hero-cta {
  margin-top: 4rpx;
  padding: 14rpx 36rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 999rpx;
  backdrop-filter: blur(4px);
  text { font-size: 24rpx; color: #FFFFFF; font-weight: 600; }
}

// ── Trust Strip（社会证明条）──
.trust-strip {
  display: flex; align-items: center; justify-content: center; gap: 0;
  margin: 24rpx 24rpx 0;
  padding: 20rpx 0;
  background: $bg-card;
  border-radius: 20rpx;
  border: 1rpx solid $border;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.trust-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx;
}
.trust-num {
  font-size: 28rpx; font-weight: 800; color: $primary;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
}
.trust-label { font-size: 20rpx; color: $text-3; }
.trust-divider {
  width: 1rpx; height: 40rpx; background: $border; flex-shrink: 0;
}

// ── Section ──
.section { margin-top: 44rpx; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28rpx 20rpx;
}
.section-title-row { display: flex; align-items: center; gap: 14rpx; }
.section-dot {
  width: 7rpx; height: 30rpx; border-radius: 4rpx;
  background: $primary-grad;
  box-shadow: 0 2rpx 8rpx rgba(139,157,200,0.3);
}
.section-title {
  font-size: 34rpx; font-weight: 800; color: $text-1; letter-spacing: 0.5rpx;
}
.section-more {
  font-size: 26rpx; color: $primary; font-weight: 700;
  padding: 6rpx 16rpx;
  background: rgba(139,157,200,0.08);
  border-radius: 12rpx;
}
.section-header-col {
  flex-direction: column; align-items: flex-start; gap: 10rpx;
}
.section-sub-title {
  font-size: 24rpx; color: $text-3; line-height: 1.5;
  padding-left: 20rpx;  // 与 section-dot(6rpx) + gap(14rpx) 对齐
}

// ── Daily Picks ──
.picks-scroll { white-space: nowrap; padding-left: 24rpx; }
.picks-row { display: inline-flex; gap: 16rpx; padding-right: 24rpx; }
.pick-card {
  display: inline-flex; flex-direction: column; width: 260rpx;
  background: $bg-card; border-radius: 20rpx; overflow: hidden;
  border: 1rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  transition: transform 0.15s, box-shadow 0.2s;
  &:active { transform: scale(0.97); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08); }
}
.pick-img { width: 260rpx; height: 340rpx; background: $bg-raised; }
.pick-info { padding: 16rpx 18rpx; }
.pick-title {
  font-size: 26rpx; font-weight: 600; color: $text-1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;
}
.pick-meta { display: flex; align-items: center; gap: 8rpx; margin-top: 10rpx; }
.pick-likes { font-size: 22rpx; color: $text-3; }
.pick-empty {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  width: 260rpx; height: 340rpx; background: $bg-card; border-radius: 20rpx;
  gap: 16rpx; border: 1rpx solid $border;
  text { font-size: 26rpx; color: $text-3; font-weight: 500; }
}

// ── Challenge ──
.challenge-card {
  margin: 0 24rpx; background: $bg-card; border-radius: 24rpx;
  padding: 28rpx; border: 1rpx solid $border;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.challenge-content { display: flex; flex-direction: column; gap: 12rpx; }
.challenge-badge {
  display: inline-flex; align-items: center; gap: 6rpx; align-self: flex-start;
  padding: 6rpx 18rpx; background: rgba(139,157,200,0.1); border-radius: 999rpx;
  text { font-size: 22rpx; color: $primary; font-weight: 700; }
}
.challenge-title { font-size: 34rpx; font-weight: 700; color: $text-1; }
.challenge-desc {
  font-size: 24rpx; color: $text-2; line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.challenge-footer {
  display: flex; align-items: center; justify-content: space-between; margin-top: 8rpx;
}
.challenge-participants {
  display: flex; align-items: center; gap: 6rpx;
  text { font-size: 22rpx; color: $primary; font-weight: 500; }
}
.challenge-tags { display: flex; gap: 8rpx; }
.challenge-tag {
  font-size: 20rpx; color: $primary;
  background: rgba(139,157,200,0.08);
  padding: 4rpx 12rpx; border-radius: 12rpx;
}
.challenge-action {
  margin-top: 20rpx; display: flex; justify-content: flex-end;
  text { font-size: 26rpx; color: $primary; font-weight: 700; }
}

// ── Waterfall ──
.waterfall { display: flex; gap: 16rpx; padding: 0 24rpx; }
.waterfall-col { flex: 1; display: flex; flex-direction: column; gap: 16rpx; }
.work-card {
  background: $bg-card; border-radius: 20rpx; overflow: hidden;
  border: 1rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  transition: transform 0.15s, box-shadow 0.2s;
  &:active { transform: scale(0.97); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08); }
}
.work-img-wrap { position: relative; width: 100%; min-height: 200rpx; overflow: hidden; }
.img-shimmer {
  position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(90deg, $bg-raised 25%, rgba(196,181,224,0.12) 50%, $bg-raised 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
.work-img { width: 100%; min-height: 200rpx; background: $bg-raised; transition: opacity 0.3s ease; }
.work-info { padding: 16rpx 18rpx; }
.work-title {
  font-size: 26rpx; font-weight: 600; color: $text-1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;
}
.work-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.work-likes { display: flex; align-items: center; gap: 8rpx;
  text { font-size: 22rpx; color: $text-3; }
}
.work-action { padding: 8rpx; }

// ── Load More ──
.loading-more {
  display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 32rpx 0;
  text { font-size: 24rpx; color: $text-3; }
}
.loading-spinner-sm {
  width: 28rpx; height: 28rpx;
  border: 3rpx solid $bg-raised; border-top-color: $primary; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.no-more { text-align: center; padding: 32rpx 0;
  text { font-size: 24rpx; color: $text-3; }
}

// ── Scene Cards 2x2 网格 ──
.scene-section { margin-top: 40rpx; padding: 0 28rpx; }
.scene-grid-2x2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 20rpx;
}

.sc2-card {
  display: flex; flex-direction: column; align-items: center; gap: 6rpx;
  padding: 32rpx 16rpx 24rpx;
  border-radius: 28rpx;
  border: 2rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative; overflow: hidden;
  cursor: pointer;

  &:active { transform: scale(0.95); }

  // ── 装饰圆（右上角大光圈） ──
  .sc2-deco {
    position: absolute; top: -30rpx; right: -30rpx;
    width: 100rpx; height: 100rpx; border-radius: 50%;
    opacity: 0.12;
    transition: opacity 0.3s;
  }

  // ── 每个卡片独立配色 ──
  &.sc2-gold {
    background: linear-gradient(155deg, #FFF8ED 0%, #FFF2E0 60%, #FFE9CC 100%);
    border-color: rgba(255, 200, 87, 0.25);
    box-shadow: 0 6rpx 24rpx rgba(255, 200, 87, 0.12);
    .sc2-deco { background: #FFC857; }
    .sc2-name { color: #7A5C1E; }
    .sc2-desc { color: #B89440; }
    .sc2-tag { background: rgba(255, 200, 87, 0.2); color: #8B6B20; }
    .sc2-check { background: linear-gradient(135deg, #FFC857, #F5A623); box-shadow: 0 4rpx 14rpx rgba(255,200,87,0.4); }

    &.active {
      border-color: #FFC857;
      box-shadow: 0 12rpx 40rpx rgba(255, 200, 87, 0.28), 0 0 0 3rpx rgba(255, 200, 87, 0.15);
      .sc2-deco { opacity: 0.22; }
      .sc2-icon { transform: scale(1.18) rotate(-3deg); box-shadow: 0 10rpx 32rpx rgba(255, 200, 87, 0.4); }
      .sc2-tag { background: rgba(255, 200, 87, 0.35); color: #6B4F10; }
    }
  }

  &.sc2-pink {
    background: linear-gradient(155deg, #FFF0F5 0%, #FFE8F0 60%, #FDDCE8 100%);
    border-color: rgba(232, 168, 204, 0.25);
    box-shadow: 0 6rpx 24rpx rgba(232, 168, 204, 0.12);
    .sc2-deco { background: #E8A8CC; }
    .sc2-name { color: #7A3A5C; }
    .sc2-desc { color: #B86E90; }
    .sc2-tag { background: rgba(232, 168, 204, 0.2); color: #7A3A5C; }
    .sc2-check { background: linear-gradient(135deg, #E8A8CC, #D484A8); box-shadow: 0 4rpx 14rpx rgba(232,168,204,0.4); }

    &.active {
      border-color: #E8A8CC;
      box-shadow: 0 12rpx 40rpx rgba(232, 168, 204, 0.28), 0 0 0 3rpx rgba(232, 168, 204, 0.15);
      .sc2-deco { opacity: 0.22; }
      .sc2-icon { transform: scale(1.18) rotate(-3deg); box-shadow: 0 10rpx 32rpx rgba(232, 168, 204, 0.4); }
      .sc2-tag { background: rgba(232, 168, 204, 0.35); color: #5C2848; }
    }
  }

  &.sc2-green {
    background: linear-gradient(155deg, #F0FBF4 0%, #E6F7ED 60%, #D4F0DE 100%);
    border-color: rgba(86, 171, 145, 0.25);
    box-shadow: 0 6rpx 24rpx rgba(86, 171, 145, 0.12);
    .sc2-deco { background: #56AB91; }
    .sc2-name { color: #2A6B55; }
    .sc2-desc { color: #5E9E88; }
    .sc2-tag { background: rgba(86, 171, 145, 0.2); color: #2A6B55; }
    .sc2-check { background: linear-gradient(135deg, #56AB91, #3D9177); box-shadow: 0 4rpx 14rpx rgba(86,171,145,0.4); }

    &.active {
      border-color: #56AB91;
      box-shadow: 0 12rpx 40rpx rgba(86, 171, 145, 0.28), 0 0 0 3rpx rgba(86, 171, 145, 0.15);
      .sc2-deco { opacity: 0.22; }
      .sc2-icon { transform: scale(1.18) rotate(-3deg); box-shadow: 0 10rpx 32rpx rgba(86, 171, 145, 0.4); }
      .sc2-tag { background: rgba(86, 171, 145, 0.35); color: #1A4A38; }
    }
  }

  &.sc2-purple {
    background: linear-gradient(155deg, #F3F0FF 0%, #EAE4FD 60%, #E0D6F8 100%);
    border-color: rgba(139, 157, 200, 0.25);
    box-shadow: 0 6rpx 24rpx rgba(139, 157, 200, 0.12);
    .sc2-deco { background: #8B9DC8; }
    .sc2-name { color: #4A5680; }
    .sc2-desc { color: #7E8BA8; }
    .sc2-tag { background: rgba(139, 157, 200, 0.2); color: #4A5680; }
    .sc2-check { background: linear-gradient(135deg, #8B9DC8, #C4B5E0); box-shadow: 0 4rpx 14rpx rgba(139,157,200,0.4); }

    &.active {
      border-color: #8B9DC8;
      box-shadow: 0 12rpx 40rpx rgba(139, 157, 200, 0.28), 0 0 0 3rpx rgba(139, 157, 200, 0.15);
      .sc2-deco { opacity: 0.22; }
      .sc2-icon { transform: scale(1.18) rotate(-3deg); box-shadow: 0 10rpx 32rpx rgba(139, 157, 200, 0.4); }
      .sc2-tag { background: rgba(139, 157, 200, 0.35); color: #3A4570; }
    }
  }

  // ── 通用 active 提升 ──
  &.active {
    transform: scale(1.02);
    .sc2-name { font-weight: 900; }
  }
}

.sc2-icon {
  width: 96rpx; height: 96rpx; border-radius: 28rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8rpx;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12);
}
.sc2-emoji { font-size: 44rpx; filter: drop-shadow(0 3rpx 8rpx rgba(0,0,0,0.15)); }
.sc2-icon-gold  { background: linear-gradient(135deg, #FFE5B4, #FFC857); }
.sc2-icon-pink  { background: linear-gradient(135deg, #F8D7E8, #E8A8CC); }
.sc2-icon-green { background: linear-gradient(135deg, #B8EDCF, #56AB91); }
.sc2-icon-purple { background: linear-gradient(135deg, #8B9DC8, #C4B5E0); }

.sc2-name {
  font-size: 30rpx; font-weight: 800;
  transition: all 0.2s;
}
.sc2-desc {
  font-size: 20rpx; text-align: center;
  line-height: 1.4; opacity: 0.85;
}

.sc2-tags {
  display: flex; gap: 10rpx; margin-top: 8rpx;
}
.sc2-tag {
  font-size: 18rpx;
  padding: 6rpx 16rpx; border-radius: 12rpx;
  font-weight: 600;
  transition: all 0.25s;
}

.sc2-check {
  position: absolute; top: 14rpx; right: 14rpx;
  width: 42rpx; height: 42rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  animation: checkPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes checkPop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

// 场景徽章（上传区）
.scene-badge {
  display: inline-flex; align-items: center; gap: 6rpx;
  margin-top: 12rpx; padding: 8rpx 24rpx;
  background: rgba(255,255,255,0.25);
  border-radius: 20rpx; border: 1rpx solid rgba(255,255,255,0.4);
  backdrop-filter: blur(4px);
  text { font-size: 22rpx; color: #FFFFFF; font-weight: 700; }
}

// ══════════════════════════════
//  🔥 热门词库模板（首页横滑区）
// ══════════════════════════════

.tmpl-section { margin-top: 48rpx; }
.section-emoji { font-size: 34rpx; margin-right: 4rpx; }
.section-sub-hint {
  font-size: 24rpx; color: $text-3;
  padding: 0 28rpx; margin-top: -12rpx; margin-bottom: 16rpx;
  display: block;
}

.tmpl-scroll {
  white-space: nowrap; padding-left: 24rpx;
}
.tmpl-row {
  display: inline-flex; gap: 16rpx;
  padding-right: 24rpx;
}

.tmpl-mini-card {
  display: inline-flex; flex-direction: column;
  width: 300rpx;
  background: $bg-card;
  border-radius: 22rpx;
  overflow: hidden;
  border: 1rpx solid $border;
  box-shadow: 0 6rpx 24rpx rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s;

  &:active {
    transform: scale(0.96);
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.1);
  }
}

.tmpl-cover {
  width: 100%; height: 240rpx;
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.tmpl-img { width: 100%; height: 100%; object-fit: cover; }
.tmpl-emoji { font-size: 72rpx; filter: drop-shadow(0 4rpx 12rpx rgba(0,0,0,0.15)); }
.tmpl-hot {
  position: absolute; top: 12rpx; left: 12rpx;
  padding: 4rpx 14rpx;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(6px);
  border-radius: 12rpx;
  text { font-size: 22rpx; }
}
.tmpl-used {
  position: absolute; top: 12rpx; right: 12rpx;
  padding: 4rpx 14rpx;
  background: rgba(163,184,165,0.9);
  backdrop-filter: blur(6px);
  border-radius: 10rpx;
  text { font-size: 18rpx; color: #FFF; font-weight: 700; }
}

// 使用次数角标
.tmpl-uses {
  position: absolute; bottom: 12rpx; right: 12rpx;
  display: flex; align-items: center; gap: 4rpx;
  padding: 4rpx 14rpx;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(6px);
  border-radius: 10rpx;
  text { font-size: 18rpx; color: #FFF; font-weight: 600; }
}

.tmpl-info { padding: 18rpx 20rpx 20rpx; }
.tmpl-name {
  font-size: 28rpx; font-weight: 800; color: $text-1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: block;
}
.tmpl-desc {
  font-size: 22rpx; color: $text-3; line-height: 1.4;
  margin-top: 8rpx;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}

.tmpl-gen-btn {
  display: flex; align-items: center; justify-content: center; gap: 6rpx;
  margin-top: 16rpx; padding: 14rpx 0;
  background: $primary-grad;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(139,157,200,0.25);
  transition: transform 0.15s, box-shadow 0.2s;

  &:active {
    transform: scale(0.96);
    box-shadow: 0 2rpx 8rpx rgba(139,157,200,0.3);
  }

  text {
    font-size: 24rpx; color: #FFF; font-weight: 700;
    letter-spacing: 0.5px;
  }
}

// ── Like Heart Animation ──
.work-likes.liking {
  .u-icon { animation: heartBeat 0.4s ease; }
  text { animation: countPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
}
@keyframes heartBeat {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  50% { transform: scale(0.9); }
  75% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes countPop {
  0% { transform: scale(1); color: $text-3; }
  50% { transform: scale(1.4); color: $danger; }
  100% { transform: scale(1); color: $danger; }
}
</style>