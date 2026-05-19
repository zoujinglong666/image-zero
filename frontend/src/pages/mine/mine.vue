<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="我的"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#1C1C1C', fontWeight: '600' }"
      :borderBottom="true"
      :placeholder="true"
    />

    <scroll-view scroll-y class="main-scroll">

      <!-- 用户信息卡片 -->
      <view class="user-card" @tap="onUserCardTap">
        <view class="user-avatar">
          <u-avatar
            :src="userStore.avatarUrl"
            size="96"
            :text="avatarText"
            fontSize="36"
            :bg-color="userStore.isLoggedIn ? '#7C4DFF' : '#B388FF'"
          />
        </view>
        <view class="user-info">
          <text class="user-name">{{ userStore.userDisplayName }}</text>
          <text class="user-desc">{{ userStore.isLoggedIn ? loginDesc : '点击登录，解锁更多功能' }}</text>
        </view>
        <!-- 未登录时显示登录箭头 -->
        <u-icon v-if="!userStore.isLoggedIn" name="arrow-right" size="40" color="#CCCCCC" />
        <!-- 已登录时显示微信标识 -->
        <u-tag v-else-if="userStore.isWechatUser" text="微信" type="success" size="mini" plain />
      </view>

      <!-- 未登录：登录按钮区域 -->
      <view v-if="!userStore.isLoggedIn" class="login-section">
        <!-- #ifdef MP-WEIXIN -->
        <button class="wechat-login-btn" @tap="handleWechatLogin" :loading="userStore.isLoggingIn">
          <u-icon name="weixin-fill" size="40" color="#FFFFFF" />
          <text>微信一键登录</text>
        </button>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <button class="dev-login-btn" @tap="handleAnonymousLogin" :loading="userStore.isLoggingIn">
          <text>访客登录（开发模式）</text>
        </button>
        <!-- #endif -->

        <text class="login-hint">登录后可保存历史记录和收藏</text>
      </view>

      <!-- 统计网格 -->
      <view class="stats-grid">
        <view class="grid-item" @tap="goToHistory">
          <u-icon name="clock-fill" size="40" color="#7C4DFF" />
          <text class="grid-num">{{ historyStore?.history?.length ?? 0 }}</text>
          <text class="grid-label">解析记录</text>
        </view>
        <view class="grid-item">
          <u-icon name="star-fill" size="40" color="#7C4DFF" />
          <text class="grid-num">{{ favoriteCount }}</text>
          <text class="grid-label">我的收藏</text>
        </view>
        <view class="grid-item">
          <u-icon name="bookmark-fill" size="40" color="#19be6b" />
          <text class="grid-num">{{ savedPrompts.length }}</text>
          <text class="grid-label">保存提示词</text>
        </view>
        <view class="grid-item">
          <u-icon name="photo-fill" size="40" color="#6200EA" />
          <text class="grid-num">{{ generatedCount }}</text>
          <text class="grid-label">生成图片</text>
        </view>
      </view>

      <!-- 功能菜单组 -->
      <view class="menu-section">
        <u-cell-group :border="false">
          <!-- 历史记录 -->
          <u-cell-item
            title="历史记录"
            :value="(historyStore?.history || []).length + ' 条'"
            icon="clock"
            @tap="goToHistory"
          />
          <!-- 我的收藏 -->
          <u-cell-item
            title="我的收藏"
            :value="favoriteCount + ' 条'"
            icon="star"
            @tap="showFavorites"
          />
          <!-- 保存的提示词 -->
          <u-cell-item
            title="保存的提示词"
            :value="savedPrompts.length + ' 条'"
            icon="bookmark"
            @tap="showSavedPrompts"
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
            @tap="goToSettings"
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
            @tap="showQualityPicker"
          />
          <!-- 默认尺寸 -->
          <u-cell-item
            title="默认尺寸"
            :value="sizeOptions[currentSize]"
            icon="grid"
            @tap="showSizePicker"
          />
          <!-- 清除缓存 -->
          <u-cell-item
            title="清除缓存"
            icon="trash"
            @tap="clearCache"
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
            @tap="showHelp"
          />
          <!-- 关于 -->
          <u-cell-item
            title="关于图灵绘境"
            :value="'v' + appVersion"
            icon="info-circle"
            @tap="showAbout"
          />
          <!-- 反馈建议 -->
          <u-cell-item
            title="反馈建议"
            icon="edit-pen"
            @tap="showFeedback"
          />
          <!-- 退出登录（仅已登录时显示） -->
          <u-cell-item
            v-if="userStore.isLoggedIn"
            title="退出登录"
            icon="logout"
            @tap="handleLogout"
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
          <u-icon name="close" size="40" color="#999" @click="showProfilePopup = false" />
        </view>

        <!-- 头像选择 -->
        <view class="profile-row">
          <text class="profile-label">头像</text>
          <view class="profile-avatar-wrap">
            <!-- #ifdef MP-WEIXIN -->
            <button class="avatar-choose-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
              <u-avatar
                :src="userStore.avatarUrl"
                size="80"
                :text="avatarText"
                fontSize="30"
                bg-color="#7C4DFF"
              />
              <view class="avatar-edit-badge">
                <u-icon name="camera" size="20" color="#FFFFFF" />
              </view>
            </button>
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            <view @tap="onChooseAvatarFallback">
              <u-avatar
                :src="userStore.avatarUrl"
                size="80"
                :text="avatarText"
                fontSize="30"
                bg-color="#7C4DFF"
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
        <button class="profile-save-btn" @tap="onSaveProfile" :loading="isSavingProfile">
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
          <u-icon name="close" size="40" color="#999" @click="showQualityPopup = false" />
        </view>
        <u-radio-group v-model="currentQuality" @change="(val: any) => { currentQuality = val; showQualityPopup = false }">
          <u-cell-group :border="false">
            <u-cell-item
              v-for="(q, qi) in qualityOptions"
              :key="qi"
              :title="q"
              :arrow="false"
              @tap="currentQuality = qi; showQualityPopup = false"
            >
              <template #value>
                <u-radio
                  :name="qi"
                  :checked="currentQuality === qi"
                  activeColor="#7C4DFF"
                />
              </template>
            </u-cell-item>
          </u-cell-group>
        </u-radio-group>
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
          <u-icon name="close" size="40" color="#999" @click="showSizePopup = false" />
        </view>
        <u-radio-group v-model="currentSize" @change="(val: any) => { currentSize = val; showSizePopup = false }">
          <u-cell-group :border="false">
            <u-cell-item
              v-for="(s, si) in sizeOptions"
              :key="si"
              :title="s"
              :arrow="false"
              @tap="currentSize = si; showSizePopup = false"
            >
              <template #value>
                <u-radio
                  :name="si"
                  :checked="currentSize === si"
                  activeColor="#7C4DFF"
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
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/history'
import { useUserStore } from '@/stores/user'
import { useTheme } from 'uview-pro'

const historyStore = useHistoryStore()
const userStore = useUserStore()
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
  if (userStore.isAnonymousUser) return '访客模式 · 功能受限'
  return 'AI 驱动的图像提示词工具'
})

// 版本
const appVersion = '1.2.0'

// 统计
const favoriteCount = computed(() => (historyStore?.history || []).filter(h => h.favorite).length)
const savedPrompts = computed(() => [])
const generatedCount = ref(0)

// 设置选项
const qualityOptions = ['标准', '高清', '超清', '原图']
const currentQuality = ref(1)

const sizeOptions = ['1:1 (1024×1024)', '3:4 (768×1024)', '4:3 (1024×768)', '16:9 (1024×576)']
const currentSize = ref(0)

// 弹窗状态
const showQualityPopup = ref(false)
const showSizePopup = ref(false)
const showProfilePopup = ref(false)
const isSavingProfile = ref(false)

// 临时存储的昵称（用于编辑时暂存）
const pendingNickname = ref('')

// ====== 操作 ======
const goToHistory = () => {
  uni.switchTab({ url: '/pages/history/history' })
}

const goToSettings = () => {
  uni.navigateTo({ url: '/pages/about/settings' })
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

const showFeedback = () => {
  uni.showToast({ title: '感谢您的反馈！', icon: 'none' })
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
  const success = await userStore.wechatLogin()
  if (success) {
    uni.showToast({ title: '登录成功', icon: 'success' })
    // 首次登录且没有设置过头像/昵称 → 弹出资料编辑弹窗
    if (!userStore.avatarUrl && !userStore.nickname) {
      pendingNickname.value = ''
      showProfilePopup.value = true
    }
  }
}

const handleAnonymousLogin = async () => {
  const success = await userStore.anonymousLogin()
  if (success) {
    uni.showToast({ title: '访客登录成功', icon: 'success' })
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

  uni.showLoading({ title: '上传头像中...', mask: true })
  const success = await userStore.updateAvatar(tempUrl)
  uni.hideLoading()

  if (success) {
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
.page {
  min-height: 100vh;
  background-color: #F7F8FA;
}

.main-scroll {
  height: calc(100vh - 44px);
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #6200EA 0%, #7C4DFF 100%);
  gap: 24rpx;
}

.user-info {
  flex: 1;

  .user-name {
    font-size: 34rpx;
    font-weight: 700;
    color: #FFFFFF;
    display: block;
  }

  .user-desc {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 6rpx;
    display: block;
  }
}

/* 统计网格 */
.stats-grid {
  display: flex;
  margin: -20rpx 24rpx 0;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 32rpx 0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.grid-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;

  &:active {
    opacity: 0.7;
  }
}

.grid-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #1C1C1C;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
}

.grid-label {
  font-size: 22rpx;
  color: #999999;
}

/* 菜单区域 */
.menu-section {
  margin: 20rpx 24rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

/* 版本信息 */
.version-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 32rpx 0;

  text {
    font-size: 22rpx;
    color: #CCCCCC;
  }
}

/* 登录区域 */
.login-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 32rpx 48rpx;
  margin: 0 24rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.wechat-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 88rpx;
  background: #7C4DFF;
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;

  &:active {
    opacity: 0.85;
  }
}

.dev-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 88rpx;
  background: #7C4DFF;
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;

  &:active {
    opacity: 0.85;
  }
}

.login-hint {
  font-size: 22rpx;
  color: #999999;
}

/* 弹窗通用 */
.picker-popup {
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1C1C1C;
}

/* 资料编辑弹窗 */
.profile-popup {
  padding: 32rpx;
}

.profile-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.profile-label {
  font-size: 28rpx;
  color: #666666;
  width: 120rpx;
  flex-shrink: 0;
}

.profile-avatar-wrap {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  position: relative;
}

.avatar-choose-btn {
  position: relative;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  line-height: 1;

  &::after {
    display: none;
  }
}

.avatar-edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36rpx;
  height: 36rpx;
  background: #7C4DFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #FFFFFF;
}

.profile-input-wrap {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.profile-nickname-input {
  font-size: 28rpx;
  color: #1C1C1C;
  text-align: right;
  flex: 1;
  padding: 8rpx 0;
  background: transparent;
}

.profile-save-btn {
  margin-top: 40rpx;
  width: 100%;
  height: 88rpx;
  background: #7C4DFF;
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.85;
  }
}

.profile-safe-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
