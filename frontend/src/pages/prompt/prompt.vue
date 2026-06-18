<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="万能词库"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#1C1C1C', fontWeight: '800', fontSize: '18px' }"
      :borderBottom="false"
      :placeholder="true"
    >
      <template #right>
        <view class="nav-right" @click="goPublish">
          <u-icon name="plus" size="38" color="#8B9DC8" />
        </view>
      </template>
    </u-navbar>

    <scroll-view
      scroll-y
      class="main-scroll"
      @scrolltolower="loadMore"
      :lower-threshold="200"
    >
      <!-- 搜索栏（带总数展示） -->
      <view class="search-header">
        <view class="search-box">
          <u-icon name="search" size="34" color="#9A9BAC" />
          <input
            class="search-input"
            v-model="searchKeyword"
            placeholder="在 {{ promptTotal }} 个词库里搜索文案、标题..."
            placeholder-class="search-ph"
            confirm-type="search"
            @confirm="onSearch"
          />
          <view v-if="searchKeyword" class="search-clear" @click="clearSearch">
            <u-icon name="close-circle-fill" size="32" color="#C5C8D0" />
          </view>
        </view>
      </view>

      <!-- 分类标签（横向滚动） -->
      <scroll-view scroll-x :show-scrollbar="false" class="category-scroll" v-if="!isCommunityMode">
        <view class="category-row">
          <view
            class="cat-chip"
            :class="{ active: currentCategory === 0 }"
            @click="selectCategory(0)"
          >
            <text>全部</text>
          </view>
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: currentCategory === cat.id }"
            @click="selectCategory(cat.id)"
          >
            <text>{{ cat.icon }} {{ cat.name }}</text>
            <view v-if="cat.prompt_count > 0" class="cat-count">
              <text>{{ formatCount(cat.prompt_count) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- Tab 切换：词库 / 社区 -->
      <view class="tab-strip">
        <view
          class="tab-pill"
          :class="{ active: !isCommunityMode }"
          @click="switchTab(false)"
        >
          <u-icon name="book-fill" size="34" :color="!isCommunityMode ? '#D4A017' : '#9A9BAC'" />
          <text>官方词库</text>
          <view v-if="promptTotal > 0" class="tab-num"><text>{{ promptTotal }}</text></view>
        </view>
        <view
          class="tab-pill community-pill"
          :class="{ active: isCommunityMode }"
          @click="switchTab(true)"
        >
          <u-icon name="chat-fill" size="34" :color="isCommunityMode ? '#D4A017' : '#9A9BAC'" />
          <text>社区</text>
          <view v-if="communityTotal > 0" class="tab-badge"><text>{{ communityTotal > 99 ? '99+' : communityTotal }}</text></view>
        </view>
      </view>

      <!-- ══════════════════════════════
           官方词库 — 图文瀑布流卡片
           ════════════════════════════ -->
      <view v-if="!isCommunityMode && prompts.length > 0" class="card-grid">
        <view class="grid-col">
          <view
            v-for="(item, idx) in leftCol"
            :key="'L' + item.id"
            class="tmpl-card"
            @click="viewDetail(item)"
          >
            <!-- 封面区域：有图显示图片，无图用渐变+emoji -->
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
              <!-- Hot 标签 -->
              <view v-if="isHot(item)" class="hot-badge">
                <text>🔥 Hot</text>
              </view>
              <!-- 原图/效果 标签 -->
              <view class="cover-labels">
                <view class="label-tag origin"><text>原图</text></view>
                <view class="label-tag effect"><text>效果</text></view>
              </view>
            </view>

            <!-- 信息区 -->
            <view class="card-body">
              <text class="card-title">{{ item.title }}</text>
              <text class="card-desc">{{ truncateText(item.content_cn || item.prompt_text, 70) }}</text>

              <!-- 标签行 -->
              <view class="tag-row" v-if="item.tags">
                <view v-for="(tag, ti) in parseTags(item.tags).slice(0, 3)" :key="ti" class="mini-tag">
                  <text>{{ tag }}</text>
                </view>
              </view>

              <!-- 底部操作区 -->
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
              <view v-if="isHot(item)" class="hot-badge">
                <text>🔥 Hot</text>
              </view>
              <view class="cover-labels">
                <view class="label-tag origin"><text>原图</text></view>
                <view class="label-tag effect"><text>效果</text></view>
              </view>
            </view>

            <view class="card-body">
              <text class="card-title">{{ item.title }}</text>
              <text class="card-desc">{{ truncateText(item.content_cn || item.prompt_text, 70) }}</text>

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

      <!-- ══════════════════════════════
           社区分享列表（保持原有样式）
           ════════════════════════════ -->
      <view class="community-list" v-if="isCommunityMode && communityPosts.length > 0">
        <view
          v-for="post in communityPosts"
          :key="'c' + post.id"
          class="community-card"
          @click="viewCommunityDetail(post)"
        >
          <view class="post-image-wrap" v-if="post.image_url">
            <!-- #ifdef H5 -->
            <img class="post-image" :src="post.image_url" mode="aspectFill" loading="lazy" />
            <!-- #endif -->
            <!-- #ifndef H5 -->
            <image class="post-image" :src="post.image_url" mode="aspectFill" lazy-load />
            <!-- #endif -->
          </view>
          <view class="post-content">
            <view class="post-author">
              <view class="author-avatar">
                <u-avatar :src="post.avatar_url" size="32" :text="(post.nickname || '?').charAt(0)" fontSize="14" bg-color="#8B9DC8" />
              </view>
              <text class="author-name">{{ post.nickname || '匿名用户' }}</text>
              <text class="post-time">{{ timeAgo(post.created_at) }}</text>
            </view>
            <text class="post-title">{{ post.title }}</text>
            <text class="post-prompt-preview">{{ truncateText(post.prompt_text, 80) }}</text>
            <view class="post-footer">
              <view class="post-stats">
                <view class="stat"><u-icon name="eye" size="40" color="#9A9BAC" /><text>{{ formatCount(post.view_count) }}</text></view>
                <view class="like-btn stat" :class="{ liked: post.is_liked }" @click.stop="toggleLike(post)">
                  <u-icon :name="post.is_liked ? 'heart-fill' : 'heart'" size="40" :color="post.is_liked ? '#E8947A' : '#9A9BAC'" />
                  <text>{{ formatCount(post.like_count) }}</text>
                </view>
              </view>
              <view class="post-actions">
                <view class="action-mini" @click.stop="copyPrompt(post as any)"><text>复制</text></view>
                <view class="action-mini report" @click.stop="openReportPopup(post)"><text>举报</text></view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-else-if="!loading">
        <view class="empty-icon-wrap">
          <text class="empty-emoji">🎨</text>
        </view>
        <text class="empty-title">{{ isCommunityMode ? '还没有人分享，来发第一条吧！' : '词库正在建设中...' }}</text>
        <text class="empty-desc">{{ isCommunityMode ? '分享你的 AI 创作灵感' : '更多精美模板即将上线 ✨' }}</text>
        <view v-if="isCommunityMode && isLoggedIn" class="empty-action" @click="goPublish">
          <text>我要分享</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="loading">
        <view class="loading-spinner" />
        <text class="load-text">加载中...</text>
      </view>
      <view class="load-more" v-else-if="noMore && currentListLength > 0">
        <text class="load-text">— 已经到底啦 —</text>
      </view>
    </scroll-view>

    <!-- ══════════════════════════════════
         详情弹窗（官方提示词）
         ══════════════════════════════════ -->
    <u-popup v-model="showDetail" mode="bottom" round="20" @close="showDetail = false">
      <view class="detail-popup" v-if="detailData">
        <view class="detail-head">
          <text class="detail-title">{{ detailData.title }}</text>
          <view class="detail-close" @click="showDetail = false">
            <u-icon name="close" size="40" color="#9A9BAC" />
          </view>
        </view>
        <scroll-view scroll-y class="detail-scroll">
          <!-- 封面大图 -->
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
              <text class="d-lang">{{ detailData.language === 'zh' ? '中文' : detailData.language === 'en' ? '英文' : detailData.language === 'ja' ? '日文' : detailData.language || '' }}</text>
            </view>

            <!-- 描述 -->
            <text v-if="detailData.content_cn" class="detail-cn">{{ detailData.content_cn }}</text>

            <!-- Prompt 文本 -->
            <view class="detail-prompt-box">
              <view class="prompt-label"><text>📋 英文 Prompt</text></view>
              <text class="detail-prompt-text" selectable>{{ detailData.prompt_text }}</text>
            </view>

            <!-- 统计 -->
            <view class="detail-stats-row">
              <view class="d-stat"><u-icon name="eye" size="36" color="#9A9BAC" /><text>{{ detailData.view_count }} 浏览</text></view>
              <view class="d-stat"><u-icon name="heart-fill" size="36" color="#E8947A" /><text>{{ detailData.like_count }} 点赞</text></view>
              <view class="d-stat"><u-icon name="file-text" size="36" color="#9A9BAC" /><text>{{ detailData.copy_count }} 复制</text></view>
            </view>
          </view>
        </scroll-view>

        <!-- 底部操作栏 -->
        <view class="detail-actions">
          <view class="d-action copy" @click="copyPrompt(detailData)">
            <u-icon name="file-text" size="34" color="#FFF" />
            <text>复制提示词</text>
          </view>
          <view class="d-action gen" @click="generateFromPrompt(detailData); showDetail = false;">
            <u-icon name="photo-film" size="34" color="#FFF" />
            <text>生成同款</text>
          </view>
          <view
            class="d-action fav"
            :class="{ favored: detailData.is_favorited }"
            @click="toggleFav(detailData)"
          >
            <u-icon :name="detailData.is_favorited ? 'star-fill' : 'star'" size="34" />
            <text>{{ detailData.is_favorited ? '已收藏' : '收藏' }}</text>
          </view>
        </view>
      </view>
    </u-popup>

    <!-- ══════════════════════════════════
         社区帖子详情弹窗
         ══════════════════════════════════ -->
    <u-popup v-model="showCommunityDetail" mode="bottom" round="20" @close="showCommunityDetail = false">
      <view class="cd-popup" v-if="communityDetailData">
        <view v-if="communityDetailData.image_url" class="cd-image-wrap">
          <!-- #ifdef H5 -->
          <img class="cd-image" :src="communityDetailData.image_url" mode="widthFix" />
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <image class="cd-image" :src="communityDetailData.image_url" mode="widthFix" />
          <!-- #endif -->
        </view>
        <scroll-view scroll-y class="cd-body">
          <view class="cd-author-row">
            <u-avatar :src="communityDetailData.avatar_url" size="44" :text="(communityDetailData.nickname || '?').charAt(0)" fontSize="18" bg-color="#C4B5E0" />
            <view class="cd-author-info">
              <text class="cd-name">{{ communityDetailData.nickname || '匿名用户' }}</text>
              <text class="cd-time">{{ formatTime(communityDetailData.created_at) }}</text>
            </view>
          </view>
          <text class="cd-title">{{ communityDetailData.title }}</text>
          <view class="cd-prompt-box">
            <text class="cd-prompt-text" selectable>{{ communityDetailData.prompt_text }}</text>
          </view>
          <view class="cd-stats">
            <view class="cd-stat"><u-icon name="eye" size="40" color="#9A9BAC" /><text>{{ communityDetailData.view_count }} 浏览</text></view>
            <view class="cd-stat"><u-icon name="heart-fill" size="40" color="#E8947A" /><text>{{ communityDetailData.like_count }} 点赞</text></view>
          </view>
        </scroll-view>
        <view class="cd-actions">
          <view class="cd-btn copy" @click="copyPrompt(communityDetailData as any)">
            <u-icon name="file-text" size="36" color="#fff" /><text>复制提示词</text>
          </view>
          <view class="cd-btn like" :class="{ liked: communityDetailData.is_liked }" @click="toggleLike(communityDetailData)">
            <u-icon :name="communityDetailData.is_liked ? 'heart-fill' : 'heart'" size="36" /><text>{{ communityDetailData.is_liked ? '已赞' : '点赞' }}</text>
          </view>
          <view class="cd-btn report" @click="openReportPopup(communityDetailData); showCommunityDetail = false;">
            <u-icon name="warning" size="36" /><text>举报</text>
          </view>
        </view>
      </view>
    </u-popup>

    <!-- 举报弹窗 -->
    <u-modal
      v-model="showReport"
      title="举报内容"
      content="请选择举报原因"
      :showCancelButton="true"
      confirmText="提交举报"
      @confirm="submitReport"
      @cancel="showReport = false"
    >
      <view class="report-reasons">
        <view
          v-for="r in reportReasons"
          :key="r.value"
          class="reason-option"
          :class="{ active: reportForm.reason === r.value }"
          @click="reportForm.reason = r.value"
        >
          <text>{{ r.label }}</text>
        </view>
      </view>
    </u-modal>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getCategories,
  getPromptList,
  searchPrompts,
  getPromptDetail,
  interactPrompt,
  togglePromptFavorite as toggleFavorite,
  getCommunityPosts,
  getCommunityPostDetail,
  toggleCommunityLike,
  reportCommunityPost,
  type PromptCategory,
  type PromptItem,
  type CommunityPost,
} from '../../api/prompt'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

// ── 状态 ──
const categories = ref<PromptCategory[]>([])
const prompts = ref<PromptItem[]>([])
const communityPosts = ref<CommunityPost[]>([])
const currentCategory = ref(0)
const currentSort = ref('popular')
const searchKeyword = ref('')
const page = ref(1)
const total = ref(0)
const promptTotal = ref(0)
const communityTotal = ref(0)
const commPage = ref(1)
const commTotal = ref(0)
const loading = ref(false)
const noMore = ref(false)

// Tab
const isCommunityMode = ref(false)

// 详情弹窗
const showDetail = ref(false)
const detailData = ref<PromptItem | null>(null)
const showCommunityDetail = ref(false)
const communityDetailData = ref<CommunityPost | null>(null)

// 举报
const showReport = ref(false)
const reportTarget = ref<CommunityPost | null>(null)
const reportForm = ref<{ reason: string; description: string }>({ reason: 'other', description: '' })

const reportReasons = [
  { label: '垃圾广告', value: 'spam' },
  { label: '内容不当', value: 'inappropriate' },
  { label: '侵权盗版', value: 'copyright' },
  { label: '其他原因', value: 'other' },
]

// ── 计算属性 ──
const isLoggedIn = computed(() => userStore.isLoggedIn)
const currentListLength = computed(() =>
  isCommunityMode.value ? communityPosts.value.length : prompts.value.length
)

/** 左列（偶数索引） */
const leftCol = computed(() => prompts.value.filter((_item: PromptItem, i: number) => i % 2 === 0))
/** 右列（奇数索引） */
const rightCol = computed(() => prompts.value.filter((_item: PromptItem, i: number) => i % 2 !== 0))

// ── 渐变配色方案（用于无图占位）──
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5576c 0%, #ff686b 100%)',
  'linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)',
]

function coverStyle(item: PromptItem | null, idx: number): Record<string, string> {
  if (!item?.image_url) {
    return { background: gradients[idx % gradients.length] }
  }
  return {}
}

/** 根据 tags/title 推断 emoji 图标 */
function getCoverEmoji(item: PromptItem): string {
  const t = (item.title + '|' + (item.tags || '')).toLowerCase()
  if (/portrait|头像|headshot|自拍|人像/i.test(t)) return '👤'
  if (/poster|海报|电影|movie|film/i.test(t)) return '🎬'
  if (/cyber|赛博|punk|科幻|sci-fi/i.test(t)) return '🤖'
  if (/fantasy|奇幻|魔法|magic|dragon|龙/i.test(t)) return '🐉'
  if (/landscape|风景|自然|nature|森林|forest/i.test(t)) return '🏔️'
  if (/product|产品|电商|商品|珠宝|ring|diamond/i.test(t)) return '💍'
  if (/sneaker|鞋|运动|sport|shoe/i.test(t)) return '👟'
  if (/character|角色|人物|rpg|game/i.test(t)) return '🎮'
  if (/cozy|可爱|cute|萌|动物|animal|tea/i.test(t)) return '🧸'
  if (/illustration|插画|flat|扁平|商务|business|ppt/i.test(t)) return '📊'
  if (/pixel|像素|retro|复古|vintage/i.test(t)) return '👾'
  if (/luxury|奢华|高端|premium/i.test(t)) return '✨'
  if (/minimal|极简|minimalist/i.test(t)) return '⬜'
  if (/music|音乐|festival|节/i.test(t)) return '🎵'
  if (/enviro|环保|awareness|冰川/i.test(t)) return '🌍'
  return '🎨'
}

/** 是否热门（浏览量 > 5000） */
function isHot(item: PromptItem): boolean {
  return (item.view_count || 0) > 5000
}

// ── 初始化 ──
onMounted(async () => {
  await loadCategories()
  await loadPrompts()
})

onShow(() => {
  if (isCommunityMode.value && communityPosts.value.length > 0) {
    loadCommunityPosts(true)
  }
})

// ── 加载分类 ──
async function loadCategories() {
  try {
    categories.value = await getCategories()
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

// ── Tab 切换 ──
function switchTab(community: boolean) {
  if (isCommunityMode.value === community) return
  isCommunityMode.value = community
  if (community) loadCommunityPosts(true)
  else loadPrompts(true)
}

// ── 加载官方词库 ──
async function loadPrompts(reset = false) {
  if (loading.value) return
  if (reset) { page.value = 1; prompts.value = []; noMore.value = false }

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

    if (page.value === 1) prompts.value = result.list
    else prompts.value.push(...result.list)

    total.value = result.pagination.total
    promptTotal.value = result.pagination.total
    noMore.value = prompts.value.length >= total.value
  } catch (e) {
    console.error('加载词库失败', e)
  } finally {
    loading.value = false
  }
}

// ── 加载社区列表 ──
async function loadCommunityPosts(reset = false) {
  if (loading.value) return
  if (reset) { commPage.value = 1; communityPosts.value = []; noMore.value = false }

  loading.value = true
  try {
    const result = await getCommunityPosts({
      sort: currentSort.value as any,
      page: commPage.value,
      page_size: 15,
      category_id: currentCategory.value || undefined,
    })

    if (commPage.value === 1) communityPosts.value = result.list
    else communityPosts.value.push(...result.list)

    commTotal.value = result.pagination.total
    communityTotal.value = result.pagination.total
    noMore.value = communityPosts.value.length >= commTotal.value
  } catch (e) {
    console.error('加载社区失败', e)
  } finally {
    loading.value = false
  }
}

// ── 加载更多 ──
function loadMore() {
  if (noMore.value || loading.value) return
  if (isCommunityMode.value) { commPage.value++; loadCommunityPosts() }
  else { page.value++; loadPrompts() }
}

// ── 选择分类 ──
function selectCategory(id: number) {
  currentCategory.value = id
  if (isCommunityMode.value) loadCommunityPosts(true)
  else loadPrompts(true)
}

// ── 搜索 ──
let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  if (isCommunityMode.value) loadCommunityPosts(true)
  else loadPrompts(true)
}
function clearSearch() {
  searchKeyword.value = ''
  if (isCommunityMode.value) loadCommunityPosts(true)
  else loadPrompts(true)
}

// ══════════════════════════════════════════
//  官方提示词操作
// ══════════════════════════════════════════

async function viewDetail(item: PromptItem) {
  try {
    const detail = await getPromptDetail(item.id)
    detailData.value = detail
    showDetail.value = true
  } catch (e) {
    detailData.value = item
    showDetail.value = true
  }
}

async function copyPrompt(item: PromptItem | CommunityPost) {
  uni.setClipboardData({
    data: item.prompt_text,
    success: () => uni.showToast({ title: '已复制 ✅', icon: 'success' }),
  })
  try { await interactPrompt(item.id, 'copy') } catch {}
  item.copy_count = (item.copy_count || 0) + 1
}

async function toggleFav(item: PromptItem) {
  try {
    const result = await toggleFavorite(item.id)
    item.is_favorited = result.is_favorited
    item.favorite_count += result.is_favorited ? 1 : -1
    uni.showToast({ title: result.is_favorited ? '已收藏 ⭐' : '已取消收藏', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

/** ⭐ 核心功能：从模板生成同款 —— 跳转编辑页并自动填入 prompt */
function generateFromPrompt(item: PromptItem) {
  uni.navigateTo({
    url: `/pages/edit/edit?promptText=${encodeURIComponent(item.prompt_text)}&tmplId=${item.id}`,
  })
}

// ══════════════════════════════════════════
//  社区操作
// ══════════════════════════════════════════

async function viewCommunityDetail(post: CommunityPost) {
  try {
    const detail = await getCommunityPostDetail(post.id)
    communityDetailData.value = detail
    showCommunityDetail.value = true
  } catch (e) {
    communityDetailData.value = post
    showCommunityDetail.value = true
  }
}

async function toggleLike(post: CommunityPost) {
  if (!isLoggedIn.value) { uni.showToast({ title: '请先登录再点赞', icon: 'none' }); return }
  try {
    const result = await toggleCommunityLike(post.id)
    post.is_liked = result.is_liked
    post.like_count = result.like_count
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

// ══════════════════════════════════════════
//  发布 / 举报
// ══════════════════════════════════════════

function goPublish() {
  if (!isLoggedIn.value) { uni.showToast({ title: '请先登录后再分享', icon: 'none' }); return }
  uni.navigateTo({ url: '/pages/publish/publish' })
}

function openReportPopup(post: CommunityPost) {
  if (!isLoggedIn.value) { uni.showToast({ title: '请先登录后举报', icon: 'none' }); return }
  reportTarget.value = post
  reportForm.value = { reason: 'other', description: '' }
  showReport.value = true
}

async function submitReport() {
  if (!reportTarget.value) return
  try {
    await reportCommunityPost(reportTarget.value.id, {
      reason: reportForm.value.reason,
      description: reportForm.value.description,
    })
    showReport.value = false
    uni.showToast({ title: '举报成功，感谢反馈 🙏', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e.message || '举报失败', icon: 'none' })
  }
}

// ══════════════════════════════════════════
//  辅助函数
// ══════════════════════════════════════════

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

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp * 1000
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return min + '分钟前'
  const hour = Math.floor(min / 60)
  if (hour < 24) return hour + '小时前'
  const day = Math.floor(hour / 24)
  if (day < 30) return day + '天前'
  return new Date(timestamp * 1000).toLocaleDateString()
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}
</script>

<style lang="scss" scoped>
/* ══════════════════════════════════════════════
   🎨 图灵绘境 · 词库广场 Design System
   对标万能蕉蕉 · 上线级品质
   ══════════════════════════════════════════════ */

// ── Palette ──
$bg-page:     #F7F8FC;
$bg-card:     #FFFFFF;
$bg-raised:   #F4F5FA;
$border:      rgba(0,0,0,0.06);
$text-1:      #1C1C1C;
$text-2:      #5A5D66;
$text-3:      #9BA0AD;
$primary:     #8B9DC8;
$primary-dark: #5B73B8;
$amber:       #D4A017;
$amber-light: #FFF5D6;
$coral:       #E8947A;
$green:       #4ECB71;

.page { min-height: 100vh; background: $bg-page; }
.main-scroll { height: calc(100vh - 44px); }

// ── 导航右侧按钮 ──
.nav-right {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
}

// ── 搜索头部 ──
.search-header {
  padding: 16rpx 28rpx 12rpx;
  background: $bg-card;
  border-bottom: 1rpx solid $border;
}
.search-box {
  display: flex; align-items: center; gap: 14rpx;
  padding: 18rpx 28rpx;
  background: $bg-raised;
  border-radius: 16rpx;
  border: 1rpx solid $border;
}
.search-input {
  flex: 1; font-size: 28rpx; color: $text-1;
}
.search-ph { color: $text-3; font-size: 28rpx; }
.search-clear { padding: 4rpx; }

// ── 分类标签 ──
.category-scroll {
  background: $bg-card;
  border-bottom: 1rpx solid $border;
  padding: 16rpx 0;
}
.category-row {
  display: flex; padding: 0 24rpx; gap: 14rpx;
}
.cat-chip {
  display: flex; align-items: center; gap: 6rpx; flex-shrink: 0;
  padding: 10rpx 24rpx; border-radius: 999rpx;
  background: $bg-raised;
  font-size: 25rpx; color: $text-2;
  border: 1rpx solid transparent;
  transition: all 0.2s ease;
  &.active {
    background: $amber-light;
    color: #B8860B;
    font-weight: 700;
    border-color: rgba(212,160,23,0.3);
    box-shadow: 0 2rpx 8rpx rgba(212,160,23,0.12);
  }
}
.cat-count {
  font-size: 20rpx; color: $text-3;
  background: rgba(0,0,0,0.04); padding: 2rpx 10rpx; border-radius: 10rpx;
  .active & { background: rgba(184,134,11,0.15); color: #8B7500; }
}

// ── Tab 条 ──
.tab-strip {
  display: flex; padding: 16rpx 28rpx; gap: 20rpx;
  background: $bg-card;
  border-bottom: 1rpx solid $border;
}
.tab-pill {
  display: flex; align-items: center; gap: 8rpx;
  padding: 14rpx 32rpx; border-radius: 999rpx;
  background: $bg-raised;
  font-size: 27rpx; color: $text-2; font-weight: 600;
  transition: all 0.2s ease;
  border: 1rpx solid transparent;
  &.active {
    background: $amber-light;
    color: #B8860B;
    border-color: rgba(212,160,23,0.25);
    box-shadow: 0 2rpx 12rpx rgba(212,160,23,0.15);
  }
}
.tab-num {
  font-size: 20rpx; background: rgba(212,160,23,0.2);
  color: #B8860B; padding: 2rpx 12rpx; border-radius: 10rpx; font-weight: 700;
}
.tab-badge {
  min-width: 28rpx; height: 28rpx;
  background: $coral; color: #fff;
  font-size: 18rpx; font-weight: 700;
  border-radius: 14rpx;
  display: flex; align-items: center; justify-content: center;
  padding: 0 8rpx;
}

// ══════════════════════════════
//  ★★★ 词库卡片（核心组件）★★★
// ══════════════════════════════

.card-grid {
  display: flex; gap: 16rpx;
  padding: 20rpx 20rpx 0;
}
.grid-col {
  flex: 1;
  display: flex; flex-direction: column;
  gap: 20rpx;
}

.tmpl-card {
  background: $bg-card;
  border-radius: 20rpx;
  overflow: hidden;
  border: 1rpx solid $border;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
  transition: transform 0.2s, box-shadow 0.2s;

  &:active {
    transform: scale(0.97);
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08);
  }
}

// ── 卡片封面 ──
.card-cover {
  position: relative;
  width: 100%;
  height: 280rpx;
  overflow: hidden;
  background: $bg-raised;
}
.cover-img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.cover-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.cover-emoji {
  font-size: 80rpx;
  filter: drop-shadow(0 4rpx 12rpx rgba(0,0,0,0.15));
}

// Hot 徽章
.hot-badge {
  position: absolute; top: 14rpx; left: 14rpx;
  z-index: 2;
  display: flex; align-items: center; gap: 4rpx;
  padding: 6rpx 16rpx;
  background: linear-gradient(135deg, #FF6B35, #FF2E63);
  border-radius: 999rpx;
  box-shadow: 0 4rpx 12rpx rgba(255,46,99,0.3);

  text {
    font-size: 20rpx; color: #FFF; font-weight: 800;
    letter-spacing: 0.5px;
  }
}

// 原图/效果标签
.cover-labels {
  position: absolute; top: 14rpx; right: 14rpx;
  z-index: 2;
  display: flex; gap: 8rpx;
}
.label-tag {
  padding: 4rpx 14rpx; border-radius: 8rpx;
  backdrop-filter: blur(8px);
  text { font-size: 18rpx; font-weight: 700; }
  &.origin {
    background: rgba(255,255,255,0.85);
    text { color: #555; }
  }
  &.effect {
    background: linear-gradient(135deg, #FFD700, #FFA500);
    text { color: #FFF; }
  }
}

// ── 卡片信息体 ──
.card-body {
  padding: 18rpx 18rpx 16rpx;
}
.card-title {
  font-size: 28rpx; font-weight: 800; color: $text-1;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.3;
}
.card-desc {
  font-size: 23rpx; color: $text-2; line-height: 1.5;
  margin-top: 8rpx;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}

// 标签行
.tag-row {
  display: flex; gap: 8rpx; margin-top: 12rpx; flex-wrap: wrap;
}
.mini-tag {
  padding: 4rpx 14rpx; border-radius: 8rpx;
  background: rgba(139,157,200,0.08);
  text { font-size: 19rpx; color: $primary; font-weight: 500; }
}

// ── 底部操作区 ──
.card-bottom {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 14rpx; padding-top: 14rpx;
  border-top: 1rpx solid $border;
}
.card-stats { flex: 1; }
.stat-text { font-size:21rpx; color: $text-3; }

.gen-btn {
  display: flex; align-items: center; gap: 6rpx;
  padding: 10rpx 22rpx;
  background: linear-gradient(135deg, #1C1C1C, #3A3A4A);
  border-radius: 999rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.15);
  transition: all 0.2s;
  &:active { transform: scale(0.95); }

  text {
    font-size: 23rpx; color: #FFF; font-weight: 700;
    letter-spacing: 0.5px;
  }
}

// ══════════════════════════════
//  社区卡片（保持原设计）
// ══════════════════════════════

.community-list { padding: 16rpx 24rpx; }
.community-card {
  background: $bg-card; border-radius: 22rpx; overflow: hidden;
  margin-bottom: 20rpx; border: 1rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
}
.post-image-wrap { width: 100%; height: 360rpx; overflow: hidden; background: $bg-raised; }
.post-image { width: 100%; height: 100%; object-fit: cover; }
.post-content { padding: 20rpx 24rpx; }
.post-author { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.author-avatar { flex-shrink: 0; }
.author-name { font-size: 24rpx; color: $text-1; font-weight: 500; }
.post-time { font-size: 22rpx; color: $text-3; margin-left: auto; }
.post-title {
  font-size: 30rpx; font-weight: 700; color: $text-1; margin-bottom: 8rpx;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.post-prompt-preview {
  font-size: 25rpx; color: $text-2; line-height: 1.5; margin-bottom: 16rpx;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.post-footer { display: flex; justify-content: space-between; align-items: center; }
.post-stats { display: flex; gap: 16rpx; align-items: center; }
.like-btn { display: flex; align-items: center; &.liked .stat { color: $coral; } }
.post-actions { display: flex; gap: 12rpx; }
.action-mini {
  padding: 4rpx 16rpx; border-radius: 20rpx; font-size: 22rpx;
  background: $bg-raised; color: $text-2; border: 1rpx solid $border;
  &.report { background: rgba(232,148,122,0.08); color: $coral; }
}

// ══════════════════════════════
//  空状态
// ══════════════════════════════

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 40rpx; gap: 16rpx;
}
.empty-icon-wrap {
  width: 160rpx; height: 160rpx;
  background: linear-gradient(135deg, #FFF5D6, #FFE8A0);
  border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8rpx;
}
.empty-emoji { font-size: 72rpx; }
.empty-title { font-size: 32rpx; color: $text-1; font-weight: 700; }
.empty-desc { font-size: 26rpx; color: $text-3; }
.empty-action {
  display: flex; align-items: center; gap: 8rpx;
  margin-top: 16rpx; padding: 18rpx 40rpx;
  background: linear-gradient(135deg, $amber, #E8B84A);
  border-radius: 999rpx;
  box-shadow: 0 6rpx 20rpx rgba(212,160,23,0.3);
  text { font-size: 28rpx; color: #FFF; font-weight: 800; }
}

// ══════════════════════════════
//  加载更多
// ══════════════════════════════

.load-more { display: flex; justify-content: center; align-items: center; padding: 32rpx; gap: 12rpx; }
.loading-spinner {
  width: 32rpx; height: 32rpx;
  border: 3rpx solid $bg-raised; border-top-color: $amber; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-text { font-size: 24rpx; color: $text-3; }

// ══════════════════════════════
//  ★ 详情弹窗（官方）★
// ══════════════════════════════

.detail-popup { max-height: 85vh; background: $bg-card; border-radius: 24rpx 24rpx 0 0; }
.detail-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid $border;
  position: sticky; top: 0; background: $bg-card; z-index: 2;
}
.detail-title { font-size: 36rpx; font-weight: 800; color: $text-1; flex: 1; }
.detail-close { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; }

.detail-scroll { max-height: 65vh; }

.detail-cover-lg {
  width: 100%; overflow: hidden;
}
.detail-img { width: 100%; display: block; }
.detail-cover-placeholder {
  width: 100%; height: 400rpx;
  display: flex; align-items: center; justify-content: center;
}
.detail-emoji-lg { font-size: 120rpx; filter: drop-shadow(0 6rpx 20rpx rgba(0,0,0,0.15)); }

.detail-info { padding: 28rpx 32rpx; }
.detail-meta-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; flex-wrap: wrap; }
.d-meta-tag {
  padding: 6rpx 18rpx; border-radius: 10rpx;
  background: $amber-light;
  text { font-size: 22rpx; color: #B8860B; font-weight: 700; }
}
.d-lang { font-size: 22rpx; color: $text-3; }

.detail-cn {
  font-size: 28rpx; color: $text-2; line-height: 1.7;
  margin-bottom: 20rpx; display: block;
}

.prompt-label {
  font-size: 24rpx; color: $text-3; font-weight: 600;
  margin-bottom: 12rpx; display: block;
}
.detail-prompt-box {
  background: $bg-raised; border-radius: 16rpx; padding: 24rpx;
  margin-bottom: 24rpx; border: 1rpx solid $border;
}
.detail-prompt-text { font-size: 27rpx; color: $text-1; line-height: 1.8; word-break: break-all; }

.detail-stats-row { display: flex; gap: 28rpx; }
.d-stat { display: flex; align-items: center; gap: 6rpx; font-size: 24rpx; color: $text-3; }

.detail-actions {
  display: flex; gap: 14rpx; padding: 24rpx 32rpx;
  border-top: 1rpx solid $border;
  background: $bg-card;
  position: sticky; bottom: 0; z-index: 2;
  border-radius: 0 0 24rpx 24rpx;
}
.d-action {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx;
  padding: 18rpx 0; border-radius: 999rpx; font-size: 27rpx; font-weight: 700;
  transition: all 0.15s;
  &.copy { background: linear-gradient(135deg, $primary, #A3B0CC); color: #FFF; }
  &.gen { background: linear-gradient(135deg, #1C1C1C, #3A3A4A); color: #FFF; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.2); }
  &.fav { background: $bg-raised; color: $text-2; border: 1rpx solid $border; }
  &.fav.favored { background: $amber-light; color: #B8860B; border-color: rgba(212,160,23,0.3); }
}

// ══════════════════════════════
//  社区详情弹窗
// ══════════════════════════════

.cd-popup { max-height: 88vh; background: $bg-card; border-radius: 24rpx 24rpx 0 0; }
.cd-image-wrap { width: 100%; max-height: 420rpx; overflow: hidden; background: $bg-raised; }
.cd-image { width: 100%; display: block; }
.cd-body { padding: 28rpx 32rpx; max-height: 45vh; }
.cd-author-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.cd-author-info { display: flex; flex-direction: column; }
.cd-name { font-size: 29rpx; color: $text-1; font-weight: 700; }
.cd-time { font-size: 22rpx; color: $text-3; }
.cd-title { font-size: 34rpx; font-weight: 800; color: $text-1; margin-bottom: 16rpx; }
.cd-prompt-box { background: $bg-raised; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; border: 1rpx solid $border; }
.cd-prompt-text { font-size: 26rpx; color: $text-1; line-height: 1.8; }
.cd-stats { display: flex; gap: 28rpx; }
.cd-stat { display: flex; align-items: center; gap: 6rpx; font-size: 24rpx; color: $text-3; }
.cd-actions { display: flex; gap: 12rpx; padding: 24rpx 32rpx; border-top: 1rpx solid $border; }
.cd-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx;
  padding: 16rpx 0; border-radius: 999rpx; font-size: 26rpx; font-weight: 600;
  &.copy { background: linear-gradient(135deg, $primary, #A3B0CC); color: #FFF; }
  &.like { background: $bg-raised; color: $text-2; border: 1rpx solid $border; }
  &.like.liked { background: rgba(232,148,122,0.1); color: $coral; }
  &.report { background: $bg-raised; color: $text-3; border: 1rpx solid $border; }
}

// ══════════════════════════════
//  举报
// ══════════════════════════════

.report-reasons { padding: 16rpx 0; }
.reason-option {
  padding: 22rpx 24rpx; border-radius: 16rpx; font-size: 28rpx;
  color: $text-1; margin-bottom: 12rpx;
  background: $bg-raised; border: 1rpx solid $border;
  transition: all 0.15s;
  &.active { background: $amber-light; color: #B8860B; font-weight: 700; border-color: rgba(212,160,23,0.3); }
}
</style>
