<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="我的"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#2C2E3A', fontWeight: '700' }"
      :borderBottom="false"
      :placeholder="true"
    />

    <scroll-view scroll-y class="main-scroll">

      <!-- 用户信息卡片 -->
      <view class="user-card" @click="onUserCardTap">
        <view class="user-avatar">
          <u-avatar
            :key="userStore.avatarUrl"
            :src="userStore.avatarUrl"
            size="96"
            :text="userStore.avatarUrl ? '' : avatarText"
            fontSize="36"
            :bg-color="userStore.isLoggedIn ? '#8B9DC8' : '#9A9BAC'"
          />
        </view>
        <view class="user-info">
          <text class="user-name">{{ userStore.userDisplayName }}</text>
          <text class="user-desc">{{ userStore.isLoggedIn ? loginDesc : '点击登录，解锁更多功能' }}</text>
        </view>
        <!-- 未登录时显示登录箭头 -->
        <u-icon v-if="!userStore.isLoggedIn" name="arrow-right" size="40" color="rgba(255,255,255,0.5)" />
        <!-- 已登录时显示微信标识 -->
        <u-tag v-else-if="userStore.isWechatUser" text="微信" type="success" size="mini" plain />
      </view>

      <!-- 未登录：登录按钮区域 -->
      <view v-if="!userStore.isLoggedIn" class="login-section">
        <!-- #ifdef MP-WEIXIN -->
        <button class="wechat-login-btn" @click="handleWechatLogin" :loading="userStore.isLoggingIn">
          <u-icon name="weixin-fill" size="40" color="#FFFFFF" />
          <text>微信一键登录</text>
        </button>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <button class="dev-login-btn" @click="handleAnonymousLogin" :loading="userStore.isLoggingIn">
          <text>游客登录</text>
        </button>
        <!-- #endif -->

        <text class="login-hint">登录后可保存历史记录和收藏</text>
      </view>

      <!-- VIP 状态卡片（暂时隐藏，待微信支付商户号申请完成后开放） -->
      <!-- <view v-if="userStore.isLoggedIn" class="vip-card" @click="goToVip">
        <view class="vip-card-left">
          <u-icon name="crown-fill" size="40" :color="vipStatus.isVip ? '#FFD700' : '#9A9BAC'" />
          <view class="vip-card-info">
            <text class="vip-card-title">{{ vipStatus.isVip ? vipLevelName : '升级 VIP' }}</text>
            <text class="vip-card-desc">{{ vipStatus.isVip ? `剩余 ${remainingDays} 天 · 每日无限次` : '解锁无限生图、免广告、高清下载' }}</text>
          </view>
        </view>
        <view class="vip-card-right">
          <text class="vip-card-action">{{ vipStatus.isVip ? '续费' : '去开通' }}</text>
          <u-icon name="arrow-right" size="28" color="#8B9DC8" />
        </view>
      </view> -->

      <!-- 邀请好友入口 -->
      <view v-if="userStore.isLoggedIn" class="invite-card" @click="goToInvite">
        <view class="invite-card-left">
          <u-icon name="share-fill" size="40" color="#8B9DC8" />
          <view class="invite-card-info">
            <text class="invite-card-title">邀请好友</text>
            <text class="invite-card-desc">各得 3 次免费生图</text>
          </view>
        </view>
        <view class="invite-card-right">
          <u-icon name="arrow-right" size="28" color="#8B9DC8" />
        </view>
      </view>

      <!-- 每日签到 -->
      <view v-if="userStore.isLoggedIn" class="checkin-card" @click="doCheckin">
        <view class="checkin-card-left">
          <u-icon name="calendar-fill" size="40" :color="checkinStatus.checkedIn ? '#E8C97A' : '#8B9DC8'" />
          <view class="checkin-card-info">
            <text class="checkin-card-title">{{ checkinStatus.checkedIn ? '今日已签到' : '每日签到' }}</text>
            <text class="checkin-card-desc">
              {{ checkinStatus.checkedIn
                ? `已连续 ${checkinStatus.streakDays} 天`
                : `连续 ${checkinStatus.streakDays + 1} 天可获 ${checkinStatus.nextReward} 次` }}
            </text>
          </view>
        </view>
        <view class="checkin-card-right">
          <view v-if="checkinStatus.checkedIn" class="checkin-done">
            <u-icon name="checkmark-circle-fill" size="36" color="#E8C97A" />
          </view>
          <text v-else class="checkin-btn-text">签到</text>
        </view>
      </view>

      <!-- 统计网格 -->
      <view class="stats-grid">
        <view class="grid-item" @click="goToHistory">
          <u-icon name="clock-fill" size="40" color="#8B9DC8" />
          <text class="grid-num">{{ historyStore?.history?.length ?? 0 }}</text>
          <text class="grid-label">解析记录</text>
        </view>
        <view class="grid-item">
          <u-icon name="star-fill" size="40" color="#8B9DC8" />
          <text class="grid-num">{{ favoriteCount }}</text>
          <text class="grid-label">我的收藏</text>
        </view>
        <view class="grid-item">
          <u-icon name="bookmark-fill" size="40" color="#A3B0CC" />
          <text class="grid-num">{{ savedPrompts.length }}</text>
          <text class="grid-label">保存提示词</text>
        </view>
        <view class="grid-item">
          <u-icon name="photo-fill" size="40" color="#C4B5E0" />
          <text class="grid-num">{{ generatedCount }}</text>
          <text class="grid-label">生成图片</text>
        </view>
      </view>

      <!-- 功能菜单组 -->
      <view class="menu-section">
        <u-cell-group :border="false">
          <!-- 消息通知 -->
          <u-cell-item
            title="消息通知"
            icon="bell"
            @click="goToNotifications"
          >
            <template #value>
              <u-badge v-if="notificationStore.hasUnread" :count="notificationStore.unreadCount" :offset="[0, 0]" />
              <text v-else class="cell-value-text">暂无新消息</text>
            </template>
          </u-cell-item>
          <!-- 历史记录 -->
          <u-cell-item
            title="历史记录"
            :value="(historyStore?.history || []).length + ' 条'"
            icon="clock"
            @click="goToHistory"
          />
          <!-- 我的收藏 -->
          <u-cell-item
            title="我的收藏"
            :value="favoriteCount + ' 条'"
            icon="star"
            @click="showFavorites"
          />
          <!-- 保存的提示词 -->
          <u-cell-item
            title="保存的提示词"
            :value="savedPrompts.length + ' 条'"
            icon="bookmark"
            @click="showSavedPrompts"
          />
        </u-cell-group>
      </view>

      <!-- 设置菜单组 -->
      <view class="menu-section">
        <u-section
          title="设置"
          :line="true"
          :arrow="false"
        />
        <u-cell-group :border="false">
          <!-- 主题设置 -->
          <u-cell-item
            title="主题设置"
            icon="palette"
            @click="goToSettings"
          >
            <template #value>
              <u-tag :text="currentThemeLabel" type="primary" size="mini" plain />
            </template>
          </u-cell-item>
          <!-- 生成质量 -->
          <u-cell-item
            title="生成质量"
            :value="qualityOptions[currentQuality]"
            icon="setting"
            @click="showQualityPicker"
          />
          <!-- 默认尺寸 -->
          <u-cell-item
            title="默认尺寸"
            :value="sizeOptions[currentSize]"
            icon="grid"
            @click="showSizePicker"
          />
          <!-- 清除缓存 -->
          <u-cell-item
            title="清除缓存"
            icon="trash"
            @click="clearCache"
          >
            <template #value>
              <u-tag text="32.5 MB" type="info" size="mini" plain />
            </template>
          </u-cell-item>
        </u-cell-group>
      </view>

      <!-- 帮助菜单组 -->
      <view class="menu-section">
        <u-cell-group :border="false">
          <!-- 使用帮助 -->
          <u-cell-item
            title="使用帮助"
            icon="question-circle"
            @click="showHelp"
          />
          <!-- 关于 -->
          <u-cell-item
            title="关于图灵绘境"
            :value="'v' + appVersion"
            icon="info-circle"
            @click="showAbout"
          />
          <!-- 反馈建议 -->
          <u-cell-item
            title="反馈建议"
            icon="edit-pen"
            @click="showFeedbackPopup = true"
          />
          <!-- 退出登录（仅已登录时显示） -->
          <u-cell-item
            v-if="userStore.isLoggedIn"
            title="退出登录"
            icon="logout"
            @click="handleLogout"
          >
            <template #value>
              <u-tag text="退出" type="error" size="mini" plain />
            </template>
          </u-cell-item>
        </u-cell-group>
      </view>

      <!-- 版本信息 -->
      <view class="version-info">
        <text>图灵绘境 v{{ appVersion }}</text>
        <text>Powered by uView Pro</text>
      </view>

      <u-gap height="60" />

    </scroll-view>

    <!-- 资料编辑弹窗 -->
    <u-popup
      v-model="showProfilePopup"
      mode="bottom"
      border-radius="20"
      @close="showProfilePopup = false"
    >
      <view class="profile-popup">
        <view class="picker-header">
          <text class="picker-title">编辑资料</text>
          <u-icon name="close" size="40" color="#9A9BAC" @click="showProfilePopup = false" />
        </view>

        <!-- 头像选择 -->
        <view class="profile-row">
          <text class="profile-label">头像</text>
          <view class="profile-avatar-wrap">
            <!-- #ifdef MP-WEIXIN -->
            <button class="avatar-choose-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
              <u-avatar
                :key="userStore.avatarUrl"
                :src="userStore.avatarUrl"
                size="80"
                :text="userStore.avatarUrl ? '' : avatarText"
                fontSize="30"
                bg-color="#8B9DC8"
              />
              <view class="avatar-edit-badge">
                <u-icon name="camera" size="20" color="#FFFFFF" />
              </view>
            </button>
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            <view @click="onChooseAvatarFallback">
              <u-avatar
                :key="userStore.avatarUrl"
                :src="userStore.avatarUrl"
                size="80"
                :text="userStore.avatarUrl ? '' : avatarText"
                fontSize="30"
                bg-color="#8B9DC8"
              />
              <view class="avatar-edit-badge">
                <u-icon name="camera" size="20" color="#FFFFFF" />
              </view>
            </view>
            <!-- #endif -->
          </view>
        </view>

        <!-- 昵称输入 -->
        <view class="profile-row">
          <text class="profile-label">昵称</text>
          <view class="profile-input-wrap">
            <!-- #ifdef MP-WEIXIN -->
            <input
              type="nickname"
              class="profile-nickname-input"
              :value="userStore.nickname"
              placeholder="点击获取微信昵称"
              @blur="onNicknameBlur"
              @change="onNicknameChange"
            />
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            <input
              class="profile-nickname-input"
              :value="userStore.nickname"
              placeholder="请输入昵称"
              @blur="onNicknameBlur"
            />
            <!-- #endif -->
          </view>
        </view>

        <!-- 保存按钮 -->
        <button class="profile-save-btn" @click="onSaveProfile" :loading="isSavingProfile">
          保存
        </button>

        <view class="profile-safe-bottom" />
      </view>
    </u-popup>

    <!-- 质量选择弹窗 -->
    <u-popup
      v-model="showQualityPopup"
      mode="bottom"
      border-radius="20"
      @close="showQualityPopup = false"
    >
      <view class="picker-popup">
        <view class="picker-header">
          <text class="picker-title">选择生成质量</text>
          <u-icon name="close" size="40" color="#9A9BAC" @click="showQualityPopup = false" />
        </view>
        <u-radio-group v-model="currentQuality" @change="(val: any) => { currentQuality = val; showQualityPopup = false }">
          <u-cell-group :border="false">
            <u-cell-item
              v-for="(q, qi) in qualityOptions"
              :key="qi"
              :title="q"
              :arrow="false"
              @click="currentQuality = qi; showQualityPopup = false"
            >
              <template #value>
                <u-radio
                  :name="qi"
                  :checked="currentQuality === qi"
                  activeColor="#8B9DC8"
                />
              </template>
            </u-cell-item>
          </u-cell-group>
        </u-radio-group>
      </view>
    </u-popup>

    <!-- 反馈建议弹窗 -->
    <u-popup v-model="showFeedbackPopup" mode="center" :round="20" closeable>
      <view class="feedback-popup">
        <view class="feedback-header">
          <text class="feedback-title">反馈建议</text>
          <text class="feedback-sub">您的意见对我们很重要</text>
        </view>

        <!-- 反馈类型 -->
        <view class="feedback-type-row">
          <view
            v-for="t in feedbackTypes"
            :key="t.value"
            class="type-chip"
            :class="{ active: feedbackForm.type === t.value }"
            @click="feedbackForm.type = t.value"
          >
            <text>{{ t.label }}</text>
          </view>
        </view>

        <!-- 反馈内容 -->
        <textarea
          v-model="feedbackForm.content"
          class="feedback-textarea"
          placeholder="请详细描述您的问题或建议...（至少5个字）"
          placeholder-class="textarea-ph"
          maxlength="500"
        />
        <view class="char-count"><text>{{ feedbackForm.content.length }}/500</text></view>

        <!-- 联系方式（可选） -->
        <input
          v-model="feedbackForm.contact"
          class="feedback-input"
          placeholder="邮箱或微信（选填，方便我们联系您）"
          placeholder-class="input-ph"
        />

        <!-- 提交按钮 -->
        <button
          class="feedback-submit-btn"
          :loading="feedbackLoading"
          :disabled="feedbackForm.content.trim().length < 5"
          @click="submitFeedback"
        >
          <text>提交反馈</text>
        </button>
      </view>
    </u-popup>

    <!-- 尺寸选择弹窗 -->
    <u-popup
      v-model="showSizePopup"
      mode="bottom"
      border-radius="20"
      @close="showSizePopup = false"
    >
      <view class="picker-popup">
        <view class="picker-header">
          <text class="picker-title">选择默认尺寸</text>
          <u-icon name="close" size="40" color="#9A9BAC" @click="showSizePopup = false" />
        </view>
        <u-radio-group v-model="currentSize" @change="(val: any) => { currentSize = val; showSizePopup = false }">
          <u-cell-group :border="false">
            <u-cell-item
              v-for="(s, si) in sizeOptions"
              :key="si"
              :title="s"
              :arrow="false"
              @click="currentSize = si; showSizePopup = false"
            >
              <template #value>
                <u-radio
                  :name="si"
                  :checked="currentSize === si"
                  activeColor="#8B9DC8"
                />
              </template>
            </u-cell-item>
          </u-cell-group>
        </u-radio-group>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useHistoryStore } from '@/stores/history'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { useTheme, http } from 'uview-pro'
import { getVipStatus, getRemainingDays } from '@/api/payment'
import type { VipStatus } from '@/api/payment'

const historyStore = useHistoryStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const { currentTheme } = useTheme()

// 当前主题标签
const currentThemeLabel = computed(() => currentTheme.value?.label || '灵动紫')

// 头像文字（无头像时显示首字母）
const avatarText = computed(() => {
  if (userStore.nickname) return userStore.nickname.charAt(0)
  if (userStore.userDisplayName) return userStore.userDisplayName.charAt(0)
  return '?'
})

// 登录描述
const loginDesc = computed(() => {
  if (userStore.isWechatUser) return '已绑定微信账号'
  if (userStore.isAnonymousUser || userStore.isGuestUser) return 'AI 驱动的图像提示词工具'
  return 'AI 驱动的图像提示词工具'
})

// 版本
const appVersion = '1.2.0'

// VIP 状态
const vipStatus = ref<VipStatus>({ vipLevel: 0, isVip: false, expireAt: 0, dailyQuota: 10 })
const vipLevelName = computed(() => {
  const names = ['免费', '基础版', '专业版', '旗舰版']
  return names[vipStatus.value.vipLevel] || '免费'
})
const remainingDays = computed(() => getRemainingDays(vipStatus.value.expireAt))

// 签到状态
const checkinStatus = ref({ checkedIn: false, streakDays: 0, nextReward: 1 })

// 统计
const favoriteCount = computed(() => (historyStore?.history || []).filter(h => h.favorite).length)
const savedPrompts = computed(() => [])
const generatedCount = ref(0)

// 每次页面显示时刷新最新资料（头像、昵称等）
onShow(() => {
  if (userStore.isLoggedIn) {
    userStore.loadProfile()
  }
})

// 加载 VIP 状态和签到状态
onMounted(async () => {
  if (userStore.isLoggedIn) {
    try {
      vipStatus.value = await getVipStatus()
    } catch (err) {
      console.error('[Mine] 获取VIP状态失败:', err)
    }
    try {
      const data: any = await http.get('/daily/status')
      if (data) {
        checkinStatus.value = data || checkinStatus.value
      }
    } catch (err) {
      console.error('[Mine] 获取签到状态失败:', err)
    }
  }
})

async function doCheckin() {
  if (checkinStatus.value.checkedIn) return
  uni.showLoading({ title: '签到中...', mask: true })
  try {
    const d: any = await http.post('/daily/checkin')
    if (d) {
      checkinStatus.value = { checkedIn: true, streakDays: d.streakDays || checkinStatus.value.streakDays + 1, nextReward: 0 }
      uni.hideLoading()
      setTimeout(() => {
        uni.showToast({ title: d.message || '签到成功！', icon: 'success' })
      }, 50)
    } else {
      uni.hideLoading()
      setTimeout(() => {
        uni.showToast({ title: '签到失败', icon: 'none' })
      }, 50)
    }
  } catch (err: any) {
    uni.hideLoading()
    setTimeout(() => {
      uni.showToast({ title: err?.message || '签到失败，请检查网络', icon: 'none' })
    }, 50)
  }
}

// 设置选项
const qualityOptions = ['标准', '高清', '超清', '原图']
const currentQuality = ref(1)

const sizeOptions = ['1:1 (1024×1024)', '3:4 (768×1024)', '4:3 (1024×768)', '16:9 (1024×576)']
const currentSize = ref(0)

// 弹窗状态
const showQualityPopup = ref(false)
const showSizePopup = ref(false)
const showProfilePopup = ref(false)

// 反馈表单
const showFeedbackPopup = ref(false)
const feedbackLoading = ref(false)
const feedbackTypes = [
  { label: '💡 功能建议', value: 'suggestion' },
  { label: '🐛 报告 Bug', value: 'bug_report' },
  { label: '❓ 其他', value: 'feedback' },
]
const feedbackForm = reactive({
  type: 'suggestion',
  content: '',
  contact: '',
})

async function submitFeedback() {
  if (feedbackForm.content.trim().length < 5) {
    uni.showToast({ title: '请至少输入5个字', icon: 'none' })
    return
  }
  feedbackLoading.value = true
  try {
    await import('@/api/feedback').then(m => m.submitFeedback({
      type: feedbackForm.type,
      content: feedbackForm.content.trim(),
      contact: feedbackForm.contact.trim() || undefined,
    }))
    uni.showToast({ title: '反馈已提交，感谢您！', icon: 'success' })
    showFeedbackPopup.value = false
    feedbackForm.content = ''
    feedbackForm.contact = ''
    feedbackForm.type = 'suggestion'
  } catch (err: any) {
    uni.showToast({ title: err?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    feedbackLoading.value = false
  }
}
const isSavingProfile = ref(false)

// 临时存储的昵称（用于编辑时暂存）
const pendingNickname = ref('')

// ====== 操作 ======
const goToHistory = () => {
  uni.switchTab({ url: '/pages/history/history' })
}

const goToNotifications = () => {
  uni.navigateTo({ url: '/pages/notification/notification' })
}

const goToSettings = () => {
  uni.navigateTo({ url: '/pages/about/settings' })
}

const goToVip = () => {
  uni.navigateTo({ url: '/pages/vip/vip' })
}

const goToInvite = () => {
  uni.navigateTo({ url: '/pages/invite/invite' })
}

const showFavorites = () => {
  uni.showToast({ title: '收藏功能开发中', icon: 'none' })
}

const showSavedPrompts = () => {
  uni.showToast({ title: '提示词管理开发中', icon: 'none' })
}

const showQualityPicker = () => {
  showQualityPopup.value = true
}

const showSizePicker = () => {
  showSizePopup.value = true
}

const clearCache = () => {
  uni.showModal({
    title: '清除缓存',
    content: '确定要清除所有本地缓存数据吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorage()
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      }
    }
  })
}

const showHelp = () => {
  uni.showModal({
    title: '使用帮助',
    content: '1. 在首页上传图片\n2. 点击「开始解析图片」\n3. 查看分析结果和提示词\n4. 可编辑优化或直接生成图片',
    showCancel: false,
    confirmText: '我知道了'
  })
}

const showAbout = () => {
  uni.showModal({
    title: '关于图灵绘境',
    content: '版本：v' + appVersion + '\n基于 uView Pro 组件库构建\n采用腾讯 CoDesign 设计规范\n\n核心功能：\n• AI 图片提示词反推\n• 可视化编辑优化\n• 多格式导出适配',
    showCancel: false,
    confirmText: '好的'
  })
}

// ====== 登录操作 ======
const onUserCardTap = () => {
  if (userStore.isLoggedIn) {
    // 已登录 → 打开资料编辑弹窗
    pendingNickname.value = userStore.nickname
    showProfilePopup.value = true
    return
  }
  // 未登录时点击用户卡片 → 触发登录
  // #ifdef MP-WEIXIN
  handleWechatLogin()
  // #endif
  // #ifndef MP-WEIXIN
  handleAnonymousLogin()
  // #endif
}

const handleWechatLogin = async () => {
  try {
    const success = await userStore.wechatLogin()
    if (success) {
      uni.showToast({ title: '登录成功', icon: 'success' })
      // 首次登录且没有设置过头像/昵称 → 弹出资料编辑弹窗
      if (!userStore.avatarUrl && !userStore.nickname) {
        pendingNickname.value = ''
        showProfilePopup.value = true
      }
    }
  } catch (err: any) {
    // 明确在这里 reset 加载状态（双重保险，防止卡死）
    userStore.isLoggingIn = false
    uni.showToast({ title: err?.message || '登录失败，请重试', icon: 'none', duration: 3000 })
  }
}

const handleAnonymousLogin = async () => {
  try {
    const success = await userStore.guestLogin()
    if (success) {
      uni.showToast({ title: '游客登录成功', icon: 'success' })
    }
  } catch (err: any) {
    userStore.isLoggingIn = false
    uni.showToast({ title: err?.message || '登录失败，请检查后端服务', icon: 'none', duration: 3000 })
  }
}

const handleLogout = () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？历史记录将保留在本地。',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出登录', icon: 'none' })
      }
    }
  })
}

// ====== 资料编辑 ======

/** 微信 chooseAvatar 回调 */
const onChooseAvatar = async (e: any) => {
  const tempUrl = e.detail?.avatarUrl
  if (!tempUrl) return

  console.log('[Mine] 选择头像临时路径:', tempUrl)
  uni.showLoading({ title: '上传头像中...', mask: true })
  const success = await userStore.updateAvatar(tempUrl)
  uni.hideLoading()

  if (success) {
    console.log('[Mine] 头像更新成功, avatarUrl =', userStore.avatarUrl)
    uni.showToast({ title: '头像已更新', icon: 'success' })
  }
}

/** 非微信环境的头像选择降级方案 */
const onChooseAvatarFallback = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempUrl = res.tempFilePaths[0]
      if (!tempUrl) return

      uni.showLoading({ title: '上传头像中...', mask: true })
      const success = await userStore.updateAvatar(tempUrl)
      uni.hideLoading()

      if (success) {
        uni.showToast({ title: '头像已更新', icon: 'success' })
      }
    },
  })
}

/** 昵称输入 blur 事件 */
const onNicknameBlur = async (e: any) => {
  const newNickname = e.detail?.value?.trim()
  if (newNickname && newNickname !== userStore.nickname) {
    pendingNickname.value = newNickname
  }
}

/** 昵称输入 change 事件（微信 nickname 类型键盘确认） */
const onNicknameChange = async (e: any) => {
  const newNickname = e.detail?.value?.trim()
  if (newNickname && newNickname !== userStore.nickname) {
    pendingNickname.value = newNickname
  }
}

/** 保存资料 */
const onSaveProfile = async () => {
  if (isSavingProfile.value) return
  isSavingProfile.value = true

  try {
    if (pendingNickname.value && pendingNickname.value !== userStore.nickname) {
      await userStore.updateNickname(pendingNickname.value)
    }
    uni.showToast({ title: '资料已保存', icon: 'success' })
    showProfilePopup.value = false
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    isSavingProfile.value = false
  }
}
</script>

<style lang="scss" scoped>
/* ════════════════════════════════
   Mist Canvas Design System
   薄雾白 · 通透清新
   ════════════════════════════════ */

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

// ── User Card ──
.user-card {
  display: flex; align-items: center; padding: 40rpx 32rpx;
  background: $bg-card;
  gap: 24rpx; border-bottom: 1rpx solid $border;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.user-info {
  flex: 1;
  .user-name { font-size: 34rpx; font-weight: 700; color: $text-1; display: block; }
  .user-desc { font-size: 24rpx; color: $text-3; margin-top: 6rpx; display: block; }
}

// ── Stats Grid ──
.stats-grid {
  display: flex; margin: -20rpx 24rpx 0;
  background: $bg-card; border-radius: 24rpx;
  padding: 32rpx 0; border: 1rpx solid $border;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.grid-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx;
  &:active { opacity: 0.7; }
}
.grid-num {
  font-size: 36rpx; font-weight: 800; color: $text-1;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
}
.grid-label { font-size: 22rpx; color: $text-3; }

// ── Menu ──
.menu-section {
  margin: 20rpx 24rpx; background: $bg-card; border-radius: 20rpx;
  overflow: hidden; border: 1rpx solid $border;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.cell-value-text { font-size: 24rpx; color: $text-3; }

// ── VIP Card ──
.vip-card {
  display: flex; align-items: center; justify-content: space-between;
  margin: 20rpx 24rpx 0; padding: 28rpx 32rpx;
  background: linear-gradient(135deg, #8B9DC8 0%, #C4B5E0 100%);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(139,157,200,0.25);

  &:active { opacity: 0.9; }
}
.vip-card-left {
  display: flex; align-items: center; gap: 20rpx;
}
.vip-card-info {
  display: flex; flex-direction: column; gap: 6rpx;
}
.vip-card-title {
  font-size: 30rpx; font-weight: 700; color: #FFFFFF;
}
.vip-card-desc {
  font-size: 22rpx; color: rgba(255,255,255,0.85);
}
.vip-card-right {
  display: flex; align-items: center; gap: 8rpx;
}
.vip-card-action {
  font-size: 26rpx; color: #FFFFFF; font-weight: 600;
}

// ── Invite Card ──
.invite-card {
  display: flex; align-items: center; justify-content: space-between;
  margin: 16rpx 24rpx 0; padding: 28rpx 32rpx;
  background: $bg-card; border-radius: 20rpx;
  border: 1rpx solid $border;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);

  &:active { opacity: 0.7; }
}
.invite-card-left { display: flex; align-items: center; gap: 20rpx; }
.invite-card-info { display: flex; flex-direction: column; gap: 6rpx; }
.invite-card-title { font-size: 28rpx; font-weight: 600; color: $text-1; }
.invite-card-desc { font-size: 22rpx; color: $text-3; }
.invite-card-right { display: flex; align-items: center; }

// ── Checkin Card ──
.checkin-card {
  display: flex; align-items: center; justify-content: space-between;
  margin: 16rpx 24rpx 0; padding: 28rpx 32rpx;
  background: $bg-card; border-radius: 20rpx;
  border: 1rpx solid $border;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);

  &:active { opacity: 0.7; }
}
.checkin-card-left { display: flex; align-items: center; gap: 20rpx; }
.checkin-card-info { display: flex; flex-direction: column; gap: 6rpx; flex: 1; }
.checkin-card-title { font-size: 28rpx; font-weight: 600; color: $text-1; }
.checkin-card-desc { font-size: 22rpx; color: $text-3; }
.checkin-card-right { display: flex; align-items: center; }
.checkin-btn-text {
  font-size: 26rpx; color: $primary; font-weight: 600;
  padding: 12rpx 28rpx; background: rgba(139,157,200,0.1);
  border-radius: 999rpx;
}
.checkin-done {}

// ── Version ──
.version-info {
  display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 32rpx 0;
  text { font-size: 22rpx; color: $text-3; }
}

// ── Login Section ──
.login-section {
  display: flex; flex-direction: column; align-items: center; gap: 16rpx;
  padding: 32rpx 48rpx; margin: 20rpx 24rpx 0;
  background: $bg-card; border-radius: 20rpx; border: 1rpx solid $border;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.wechat-login-btn, .dev-login-btn {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  width: 100%; height: 88rpx;
  background: $primary-grad; color: #FFFFFF;
  font-size: 30rpx; font-weight: 700; border-radius: 999rpx; border: none;
  &:active { opacity: 0.85; }
}
.login-hint { font-size: 22rpx; color: $text-3; }

// ── Popups ──
.picker-popup {
  padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background: $bg-card;
}
.picker-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.picker-title { font-size: 32rpx; font-weight: 700; color: $text-1; }

// ── Profile Popup ──
.profile-popup { padding: 32rpx; background: $bg-card; }
.profile-row { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid $border; }
.profile-label { font-size: 28rpx; color: $text-2; width: 120rpx; flex-shrink: 0; }
.profile-avatar-wrap { flex: 1; display: flex; justify-content: flex-end; position: relative; }
.avatar-choose-btn { position: relative; background: none; border: none; padding: 0; margin: 0; line-height: 1;
  &::after { display: none; }
}
.avatar-edit-badge {
  position: absolute; bottom: 0; right: 0;
  width: 36rpx; height: 36rpx; background: $primary-grad;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  border: 3rpx solid $bg-card;
}
.profile-input-wrap { flex: 1; display: flex; justify-content: flex-end; }
.profile-nickname-input { font-size: 28rpx; color: $text-1; text-align: right; flex: 1; padding: 8rpx 0; background: transparent; }
.profile-save-btn {
  margin-top: 40rpx; width: 100%; height: 88rpx;
  background: $primary-grad; color: #FFFFFF;
  font-size: 30rpx; font-weight: 700; border-radius: 999rpx; border: none;
  display: flex; align-items: center; justify-content: center;
  &:active { opacity: 0.85; }
}
.profile-safe-bottom { height: env(safe-area-inset-bottom); }

// ── 反馈建议弹窗 ──
.feedback-popup {
  padding: 48rpx 40rpx;
  width: 620rpx;
}
.feedback-header {
  text-align: center; margin-bottom: 36rpx;
  .feedback-title { font-size: 36rpx; font-weight: 800; color: $text-1; display: block; }
  .feedback-sub { font-size: 24rpx; color: $text-3; margin-top: 8rpx; display: block; }
}
.feedback-type-row {
  display: flex; gap: 16rpx; margin-bottom: 28rpx;
}
.type-chip {
  flex: 1; text-align: center; padding: 14rpx 0;
  border-radius: 12rpx; background: $bg-raised;
  border: 2rpx solid $border; font-size: 24rpx; color: $text-2;
  &.active {
    background: rgba(139,157,200,0.12);
    border-color: $primary; color: $primary; font-weight: 700;
  }
}
.feedback-textarea {
  width: 100%; height: 200rpx; padding: 20rpx;
  background: $bg-raised; border-radius: 16rpx; border: 2rpx solid $border;
  font-size: 28rpx; color: $text-1; box-sizing: border-box; resize: none;
  .textarea-ph { color: $text-3; font-size: 26rpx; }
}
.char-count { text-align: right; font-size: 22rpx; color: $text-3; margin-top: 8rpx; }
.feedback-input {
  margin-top: 20rpx; width: 100%; padding: 20rpx;
  background: $bg-raised; border-radius: 16rpx; border: 2rpx solid $border;
  font-size: 28rpx; color: $text-1; box-sizing: border-box;
  .input-ph { color: $text-3; font-size: 26rpx; }
}
.feedback-submit-btn {
  margin-top: 32rpx; width: 100%; height: 88rpx;
  background: $primary-grad; color: #FFFFFF;
  font-size: 30rpx; font-weight: 700; border-radius: 999rpx; border: none;
  display: flex; align-items: center; justify-content: center;
  &:active { opacity: 0.85; }
  &[disabled] { opacity: 0.4; }
}
</style>
