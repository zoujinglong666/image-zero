<template>
  <view class="page">
    <!-- 导航栏（含发布按钮） -->
    <u-navbar
      title="提示词广场"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#2C2E3A', fontWeight: '700' }"
      :borderBottom="false"
      :placeholder="true"
    >
      <!-- 右侧发布按钮 -->
      <template #right>
      </template>
    </u-navbar>

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
          placeholder="搜索提示词或社区作品..."
          shape="round"
          bg-color="#1A1A36"
          :showAction="false"
          @search="onSearch"
          @custom="onSearch"
          @change="onSearchChange"
        />
      </view>

      <!-- 分类标签 -->
      <scroll-view scroll-x class="category-scroll" v-if="!isCommunityMode">
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

      <!-- Tab 切换：官方 / 社区 -->
      <view class="tab-bar">
        <view
          class="tab-item"
          :class="{ active: !isCommunityMode }"
          @click="switchTab(false)"
        >
          <u-icon name="book" size="40" color="currentColor" />
          <text>官方</text>
        </view>
        <view
          class="tab-item community"
          :class="{ active: isCommunityMode }"
          @click="switchTab(true)"
        >
          <u-icon name="chat" size="40" color="currentColor" />
          <text>社区</text>
          <view class="tab-badge" v-if="communityTotal > 0">
            <text>{{ communityTotal > 99 ? '99+' : communityTotal }}</text>
          </view>
        </view>
      </view>

      <!-- 排序栏（社区模式用不同排序） -->
      <view class="sort-bar" v-if="isCommunityMode">
        <view
          v-for="s in communitySortOptions"
          :key="s.value"
          class="sort-item"
          :class="{ active: currentSort === s.value }"
          @click="changeSort(s.value)"
        >
          <text>{{ s.label }}</text>
        </view>
      </view>
      <view class="sort-bar" v-else>
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

      <!-- ═══ 官方提示词列表 ═══ -->
      <view class="prompt-list" v-if="!isCommunityMode && prompts.length > 0">
        <view
          v-for="item in prompts"
          :key="'p' + item.id"
          class="prompt-card"
          @click="viewDetail(item)"
        >
          <view class="card-header">
            <text class="card-category">{{ item.category_name || '未分类' }}</text>
            <text class="card-source">{{ sourceLabel(item.source) }}</text>
          </view>
          <text class="card-title">{{ item.title }}</text>
          <text class="card-text">{{ truncateText(item.prompt_text, 120) }}</text>
          <view class="card-footer">
            <view class="card-stats">
              <view class="stat"><u-icon name="eye" size="40" color="#9A9BAC" /><text>{{ formatCount(item.view_count) }}</text></view>
              <view class="stat"><u-icon name="heart-fill" size="40" color="#E8947A" /><text>{{ formatCount(item.like_count) }}</text></view>
              <view class="stat"><u-icon name="file-text" size="40" color="#9A9BAC" /><text>{{ formatCount(item.copy_count) }}</text></view>
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

      <!-- ═══ 社区分享列表 ═══ -->
      <view class="community-list" v-if="isCommunityMode && communityPosts.length > 0">
        <view
          v-for="post in communityPosts"
          :key="'c' + post.id"
          class="community-card"
          @click="viewCommunityDetail(post)"
        >
          <!-- 图片区域 -->
          <view class="post-image-wrap" v-if="post.image_url">
            <!-- #ifdef H5 -->
            <img
              class="post-image"
              :src="post.image_url"
              mode="aspectFill"
              loading="lazy"
            />
            <!-- #endif -->
            <!-- #ifndef H5 -->
            <image
              class="post-image"
              :src="post.image_url"
              mode="aspectFill"
              lazy-load
            />
            <!-- #endif -->
          </view>

          <!-- 内容区域 -->
          <view class="post-content">
            <!-- 作者信息 -->
            <view class="post-author">
              <view class="author-avatar">
                <u-avatar
                  :src="post.avatar_url"
                  size="32"
                  :text="(post.nickname || '?').charAt(0)"
                  fontSize="14"
                  bg-color="#8B9DC8"
                />
              </view>
              <text class="author-name">{{ post.nickname || '匿名用户' }}</text>
              <text class="post-time">{{ timeAgo(post.created_at) }}</text>
            </view>

            <text class="post-title">{{ post.title }}</text>
            <text class="post-prompt-preview">{{ truncateText(post.prompt_text, 80) }}</text>

            <!-- 底部操作栏 -->
            <view class="post-footer">
              <view class="post-stats">
                <view class="stat"><u-icon name="eye" size="40" color="#9A9BAC" /><text>{{ formatCount(post.view_count) }}</text></view>
                <view
                  class="like-btn stat"
                  :class="{ liked: post.is_liked }"
                  @click.stop="toggleLike(post)"
                >
                  <u-icon :name="post.is_liked ? 'heart-fill' : 'heart'" size="40" :color="post.is_liked ? '#E8947A' : '#9A9BAC'" />
                  <text>{{ formatCount(post.like_count) }}</text>
                </view>
              </view>
              <view class="post-actions">
                <view class="action-mini" @click.stop="copyPrompt(post as any)">
                  <text>复制</text>
                </view>
                <view class="action-mini report" @click.stop="openReportPopup(post)">
                  <text>举报</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-else-if="!loading">
        <u-icon :name="isCommunityMode ? 'color-fill' : 'edit-pen'" size="40" color="#ccc" />
        <text class="empty-text">{{ isCommunityMode ? '还没有人分享，来发第一条吧！' : '暂无提示词' }}</text>
        <view class="empty-action" v-if="isCommunityMode && isLoggedIn" @click="goPublish">
          <u-icon name="plus" size="40" color="#fff" />
          <text class="empty-btn-text">我要分享</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="loading">
        <view class="loading-spinner"></view>
        <text class="load-text">加载中...</text>
      </view>
      <view class="load-more" v-else-if="noMore && currentListLength > 0">
        <text class="load-text">— 已经到底啦 —</text>
      </view>
    </scroll-view>

    <!-- ══════════════════════════════════
         悬浮发布按钮
         ══════════════════════════════════ -->
    <view class="float-publish-tab" @click="goPublish">
      <u-icon name="plus" size="40" color="#fff" />
      <text class="float-publish-text">发布</text>
    </view>

    <!-- ══════════════════════════════════
         官方提示词详情弹窗
         ══════════════════════════════════ -->
    <u-popup v-model="showDetail" mode="bottom" round="16" @close="showDetail = false">
      <view class="detail-popup" v-if="detailData">
        <view class="detail-header">
          <text class="detail-title">{{ detailData.title }}</text>
          <view class="detail-close" @click="showDetail = false">
            <u-icon name="close" size="40" color="#9A9BAC" />
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
            <view class="detail-stat"><u-icon name="eye" size="40" color="#9A9BAC" /><text>{{ detailData.view_count }} 浏览</text></view>
            <view class="detail-stat"><u-icon name="heart-fill" size="40" color="#E8947A" /><text>{{ detailData.like_count }} 点赞</text></view>
            <view class="detail-stat"><u-icon name="file-text" size="40" color="#9A9BAC" /><text>{{ detailData.copy_count }} 复制</text></view>
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

    <!-- ══════════════════════════════════
         社区帖子详情弹窗
         ══════════════════════════════════ -->
    <u-popup v-model="showCommunityDetail" mode="bottom" round="16" @close="showCommunityDetail = false">
      <view class="community-detail-popup" v-if="communityDetailData">
        <!-- 帖子图片 -->
        <view class="cd-image-wrap" v-if="communityDetailData.image_url">
          <!-- #ifdef H5 -->
          <img class="cd-image" :src="communityDetailData.image_url" mode="widthFix" />
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <image class="cd-image" :src="communityDetailData.image_url" mode="widthFix" />
          <!-- #endif -->
        </view>

        <scroll-view scroll-y class="cd-body">
          <!-- 作者 + 时间 -->
          <view class="cd-author-row">
            <u-avatar
              :src="communityDetailData.avatar_url"
              size="40"
              :text="(communityDetailData.nickname || '?').charAt(0)"
              fontSize="18"
              bg-color="#C4B5E0"
            />
            <view class="cd-author-info">
              <text class="cd-name">{{ communityDetailData.nickname || '匿名用户' }}</text>
              <text class="cd-time">{{ formatTime(communityDetailData.created_at) }}</text>
            </view>
          </view>

          <!-- 标题 + 提示词 -->
          <text class="cd-title">{{ communityDetailData.title }}</text>
          <view class="cd-prompt-box">
            <text class="cd-prompt-text" selectable>{{ communityDetailData.prompt_text }}</text>
          </view>

          <!-- 统计 -->
          <view class="cd-stats">
            <view class="detail-stat"><u-icon name="eye" size="40" color="#9A9BAC" /><text>{{ communityDetailData.view_count }} 浏览</text></view>
            <view class="detail-stat"><u-icon name="heart-fill" size="40" color="#E8947A" /><text>{{ communityDetailData.like_count }} 点赞</text></view>
          </view>
        </scroll-view>

        <!-- 底部操作 -->
        <view class="cd-actions">
          <view class="cd-btn copy" @click="copyPrompt(communityDetailData as any)">
            <u-icon name="file-text" size="40" color="#fff" />
            <text>复制提示词</text>
          </view>
          <view
            class="cd-btn like"
            :class="{ liked: communityDetailData.is_liked }"
            @click="toggleLike(communityDetailData)"
          >
            <u-icon :name="communityDetailData.is_liked ? 'heart-fill' : 'heart'" size="40" />
            <text>{{ communityDetailData.is_liked ? '已赞' : '点赞' }}</text>
          </view>
          <view class="cd-btn report" @click="openReportPopup(communityDetailData); showCommunityDetail = false">
            <u-icon name="warning" size="40" />
            <text>举报</text>
          </view>
        </view>
      </view>
    </u-popup>

    <!-- ══════════════════════════════════
         举报弹窗
         ══════════════════════════════════ -->
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
  // 社区 API
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
const currentSort = ref('latest')
const searchKeyword = ref('')
const page = ref(1)
const total = ref(0)
const communityTotal = ref(0)
const commPage = ref(1)
const commTotal = ref(0)
const loading = ref(false)
const noMore = ref(false)

// Tab 切换
const isCommunityMode = ref(false)

// 详情弹窗（官方）
const showDetail = ref(false)
const detailData = ref<PromptItem | null>(null)

// 详情弹窗（社区）
const showCommunityDetail = ref(false)
const communityDetailData = ref<CommunityPost | null>(null)

// 举报弹窗
const showReport = ref(false)
const reportTarget = ref<CommunityPost | null>(null)
const reportForm = ref({ reason: 'other' as const, description: '' })

// 排序选项
const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '最热', value: 'popular' },
  { label: '最多赞', value: 'most_liked' },
  { label: '最多复制', value: 'most_copied' },
]

const communitySortOptions = [
  { label: '最新', value: 'latest' },
  { label: '最热门', value: 'popular' },
  { label: '最多浏览', value: 'most_viewed' },
]

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

// ── 初始化 ──
onMounted(async () => {
  await loadCategories()
  await loadPrompts()
})

// ── 页面重新显示时刷新社区列表（发布后返回） ──
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
  if (community) {
    loadCommunityPosts(true)
  } else {
    loadPrompts(true)
  }
}

// ── 加载官方提示词列表 ──
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

// ── 加载社区列表 ──
async function loadCommunityPosts(reset = false) {
  if (loading.value) return
  if (reset) {
    commPage.value = 1
    communityPosts.value = []
    noMore.value = false
  }

  loading.value = true
  try {
    const result = await getCommunityPosts({
      sort: currentSort.value as any,
      page: commPage.value,
      page_size: 15,
      category_id: currentCategory.value || undefined,
    })

    if (commPage.value === 1) {
      communityPosts.value = result.list
    } else {
      communityPosts.value.push(...result.list)
    }
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
  if (isCommunityMode.value) {
    commPage.value++
    loadCommunityPosts()
  } else {
    page.value++
    loadPrompts()
  }
}

// ── 选择分类 ──
function selectCategory(id: number) {
  currentCategory.value = id
  if (isCommunityMode.value) {
    loadCommunityPosts(true)
  } else {
    loadPrompts(true)
  }
}

// ── 切换排序 ──
function changeSort(sort: string) {
  currentSort.value = sort
  if (isCommunityMode.value) {
    loadCommunityPosts(true)
  } else {
    loadPrompts(true)
  }
}

// ── 搜索 ──
let searchTimer: ReturnType<typeof setTimeout>
function onSearchChange() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (isCommunityMode.value) {
      loadCommunityPosts(true)
    } else {
      loadPrompts(true)
    }
  }, 500)
}
function onSearch() {
  if (isCommunityMode.value) {
    loadCommunityPosts(true)
  } else {
    loadPrompts(true)
  }
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
    success: () => {
      uni.showToast({ title: '已复制 ✅', icon: 'success' })
    },
  })
  try { await interactPrompt(item.id, 'copy') } catch {}
  item.copy_count = (item.copy_count || 0) + 1
}

async function toggleFav(item: PromptItem) {
  try {
    const result = await toggleFavorite(item.id)
    item.is_favorited = result.is_favorited
    item.favorite_count += result.is_favorited ? 1 : -1
    uni.showToast({
      title: result.is_favorited ? '已收藏 ⭐' : '已取消收藏',
      icon: 'success',
    })
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
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
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录再点赞', icon: 'none' })
    return
  }
  try {
    const result = await toggleCommunityLike(post.id)
    post.is_liked = result.is_liked
    post.like_count = result.like_count
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

// ══════════════════════════════════════════
//  发布功能
// ══════════════════════════════════════════

function goPublish() {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录后再分享', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/publish/publish' })
}

// ══════════════════════════════════════════
//  举报功能
// ══════════════════════════════════════════

function openReportPopup(post: CommunityPost) {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录后举报', icon: 'none' })
    return
  }
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

function truncateText(text: string, max: number) {
  return text.length > max ? text.substring(0, max) + '...' : text
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
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
/* ══════════════════════════════
   Mist Canvas Design System
   薄雾白 · 通透清新
   ══════════════════════════════ */

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

// ── Float Publish ──
.float-publish-tab {
  position: fixed; bottom: 120rpx; right: 32rpx; z-index: 100;
  display: flex; align-items: center; gap: 8rpx; padding: 20rpx 32rpx;
  background: $primary-grad; border-radius: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(139,157,200,0.18);
}
.float-publish-text { font-size: 28rpx; color: #FFFFFF; font-weight: 700; }

// ── Search ──
.search-wrap { padding: 12rpx 24rpx; background: $bg-card;
  border-bottom: 1rpx solid $border;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
}
.category-scroll { background: $bg-card; border-bottom: 1rpx solid $border; }
.category-list { display: flex; padding: 16rpx 24rpx; gap: 16rpx; }
.category-tag {
  display: flex; align-items: center; flex-shrink: 0; white-space: nowrap;
  padding: 8rpx 24rpx; border-radius: 32rpx; background: $bg-raised;
  font-size: 26rpx; color: $text-2; border: 1rpx solid $border;
  transition: all 0.15s;
  &.active { background: $primary-grad; color: #FFFFFF; font-weight: 600; border-color: transparent; }
}

// ── Tab Bar ──
.tab-bar { display: flex; padding: 8rpx 24rpx; gap: 24rpx; background: $bg-card;
  border-bottom: 1rpx solid $border;
}
.tab-item {
  display: flex; align-items: center; gap: 8rpx; padding: 12rpx 28rpx;
  border-radius: 32rpx; font-size: 28rpx; color: $text-2; position: relative;
  background: $bg-raised; border: 1rpx solid $border;
  transition: all 0.15s;
  &.active { background: $bg-card; color: $primary; font-weight: 600; border-color: rgba(139,157,200,0.25); }
  &.community .tab-badge {
    position: absolute; top: -4rpx; right: -8rpx; background: $danger;
    color: #fff; font-size: 18rpx; padding: 2rpx 10rpx;
    border-radius: 20rpx; min-width: 28rpx; text-align: center;
  }
}

// ── Sort ──
.sort-bar { display: flex; padding: 16rpx 24rpx; gap: 24rpx; background: $bg-card; }
.sort-item { font-size: 26rpx; color: $text-3;
  padding: 6rpx 0;
  &.active { color: $primary; font-weight: 700; border-bottom: 3rpx solid $primary; }
}

// ── Prompt Cards ──
.prompt-list { padding: 16rpx 24rpx; }
.prompt-card {
  background: $bg-card; border-radius: 20rpx; padding: 24rpx;
  margin-bottom: 16rpx; border: 1rpx solid $border;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
  transition: all 0.15s;
  &:active { transform: scale(0.985); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
}
.card-header { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.card-category {
  font-size: 22rpx; color: $primary; background: rgba(139,157,200,0.08);
  padding: 4rpx 12rpx; border-radius: 8rpx; font-weight: 500;
}
.card-source { font-size: 22rpx; color: $text-3; }
.card-title {
  font-size: 30rpx; font-weight: 700; color: $text-1; margin-bottom: 8rpx;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-text {
  font-size: 26rpx; color: $text-2; line-height: 1.6; margin-bottom: 16rpx;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.card-stats { display: flex; gap: 16rpx; }
.stat { display: flex; align-items: center; gap: 4rpx; font-size: 22rpx; color: $text-3; }
.card-actions { display: flex; gap: 12rpx; }
.action-btn {
  padding: 6rpx 20rpx; border-radius: 24rpx; font-size: 24rpx;
  background: $bg-raised; color: $text-2; border: 1rpx solid $border;
  transition: all 0.15s;
  &.fav { background: rgba(139,157,200,0.08); color: $primary; }
  &.favored { background: $primary-grad; color: #FFFFFF; }
}

// ── Community Cards ──
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
.like-btn { display: flex; align-items: center;
  &.liked .stat { color: $danger; }
}
.post-actions { display: flex; gap: 12rpx; }
.action-mini {
  padding: 4rpx 16rpx; border-radius: 20rpx; font-size: 22rpx;
  background: $bg-raised; color: $text-2; border: 1rpx solid $border;
  transition: all 0.15s;
  &.report { background: rgba(232,148,122,0.08); color: $danger; }
}

// ── Empty ──
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; gap: 16rpx; }
.empty-text { font-size: 28rpx; color: $text-3; margin-bottom: 8rpx; }
.empty-action {
  display: flex; align-items: center; gap: 8rpx; padding: 16rpx 40rpx;
  background: $primary-grad; border-radius: 40rpx; color: #FFFFFF; font-weight: 700;
  box-shadow: 0 4rpx 16rpx rgba(139,157,200,0.2);
}
.empty-btn-text { font-size: 28rpx; }

// ── Load More ──
.load-more { display: flex; justify-content: center; align-items: center; padding: 24rpx; gap: 12rpx; }
.loading-spinner {
  width: 32rpx; height: 32rpx;
  border: 3rpx solid $bg-raised; border-top-color: $primary; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-text { font-size: 24rpx; color: $text-3; }

// ── Detail Popup (Official) ──
.detail-popup { max-height: 80vh; background: $bg-card; }
.detail-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 32rpx;
  border-bottom: 1rpx solid $border; }
.detail-title { font-size: 34rpx; font-weight: 700; color: $text-1; flex: 1; }
.detail-close { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center;
  font-size: 32rpx; color: $text-2; }
.detail-body { padding: 24rpx 32rpx; max-height: 55vh; }
.detail-meta { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.detail-cat { font-size: 24rpx; color: $primary; background: rgba(139,157,200,0.08);
  padding: 4rpx 16rpx; border-radius: 8rpx; font-weight: 500; }
.detail-lang { font-size: 24rpx; color: $text-3; background: $bg-raised;
  padding: 4rpx 16rpx; border-radius: 8rpx; }
.detail-prompt-box { background: $bg-raised; border-radius: 16rpx; padding: 24rpx;
  margin-bottom: 20rpx; border: 1rpx solid $border; }
.detail-prompt-text { font-size: 28rpx; color: $text-1; line-height: 1.8; }
.detail-stats { display: flex; gap: 24rpx; }
.detail-stat { display: flex; align-items: center; gap: 4rpx; font-size: 24rpx; color: $text-3; }
.detail-actions { display: flex; gap: 16rpx; padding: 20rpx 32rpx;
  border-top: 1rpx solid $border; }
.detail-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx;
  padding: 16rpx 0; border-radius: 999rpx; font-size: 28rpx; font-weight: 700;
  transition: all 0.15s;
  &.copy { background: $primary-grad; color: #FFFFFF; }
  &.fav { background: $bg-raised; color: $text-2; border: 1rpx solid $border; }
  &.favored { background: rgba(139,157,200,0.1); color: $primary; border-color: rgba(139,157,200,0.25); }
}

// ── Community Detail Popup ──
.community-detail-popup { max-height: 85vh; background: $bg-card; }
.cd-image-wrap { width: 100%; max-height: 400rpx; overflow: hidden; background: $bg-raised; }
.cd-image { width: 100%; display: block; }
.cd-body { padding: 24rpx 32rpx; max-height: 45vh; }
.cd-author-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.cd-author-info { display: flex; flex-direction: column; }
.cd-name { font-size: 28rpx; color: $text-1; font-weight: 600; }
.cd-time { font-size: 22rpx; color: $text-3; }
.cd-title { font-size: 34rpx; font-weight: 700; color: $text-1; margin-bottom: 16rpx; }
.cd-prompt-box { background: $bg-raised; border-radius: 16rpx; padding: 24rpx;
  margin-bottom: 20rpx; border: 1rpx solid $border; }
.cd-prompt-text { font-size: 26rpx; color: $text-1; line-height: 1.8; }
.cd-stats { display: flex; gap: 24rpx; }
.cd-actions { display: flex; gap: 12rpx; padding: 20rpx 32rpx;
  border-top: 1rpx solid $border; }
.cd-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6rpx;
  padding: 14rpx 0; border-radius: 999rpx; font-size: 26rpx; font-weight: 600;
  transition: all 0.15s;
  &.copy { background: $primary-grad; color: #FFFFFF; }
  &.like { background: $bg-raised; color: $text-2; border: 1rpx solid $border; }
  &.like.liked { background: rgba(232,148,122,0.1); color: $danger; }
  &.report { background: $bg-raised; color: $text-3; border: 1rpx solid $border; }
}

// ── Report ──
.report-reasons { padding: 16rpx 0; }
.reason-option {
  padding: 20rpx 24rpx; border-radius: 16rpx; font-size: 28rpx;
  color: $text-1; margin-bottom: 12rpx; background: $bg-raised; border: 1rpx solid $border;
  transition: all 0.15s;
  &.active { background: rgba(139,157,200,0.08); color: $primary; font-weight: 600;
    border: 1rpx solid rgba(139,157,200,0.25); }
}
</style>
