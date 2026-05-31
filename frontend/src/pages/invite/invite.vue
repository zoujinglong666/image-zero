<template>
  <view class="page">
    <u-navbar
      title="邀请好友"
      :bgColor="'transparent'"
      :titleStyle="{ color: '#FFFFFF', fontWeight: '700' }"
      :borderBottom="false"
      :placeholder="true"
      :autoBack="true"
    />

    <scroll-view scroll-y class="invite-scroll">
      <!-- 顶部头图 -->
      <view class="invite-hero">
        <view class="invite-hero-content">
          <text class="invite-hero-title">邀请好友，各得 3 次</text>
          <text class="invite-hero-desc">好友通过你的邀请码注册，双方各获 3 次免费生图</text>
        </view>
      </view>

      <!-- 邀请码卡片 -->
      <view class="code-card">
        <text class="code-label">我的邀请码</text>
        <view class="code-value" @click="copyCode">
          <text class="code-text">{{ inviteInfo.inviteCode || '加载中...' }}</text>
          <u-icon name="file-text" size="32" color="#8B9DC8" />
        </view>
        <text class="code-hint">点击复制邀请码，分享给好友</text>
      </view>

      <!-- 统计卡片 -->
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-num">{{ inviteInfo.totalInvites }}</text>
          <text class="stat-label">已邀请</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ inviteInfo.completedInvites }}</text>
          <text class="stat-label">已完成</text>
        </view>
        <view class="stat-card highlight">
          <text class="stat-num">{{ inviteInfo.totalReward }}</text>
          <text class="stat-label">已获得次数</text>
        </view>
      </view>

      <!-- 分享按钮 -->
      <view class="share-section">
        <button class="share-btn wechat" @click="shareToWechat">
          <u-icon name="weixin-fill" size="36" color="#FFFFFF" />
          <text>微信分享给好友</text>
        </button>
        <button class="share-btn timeline" @click="shareToTimeline">
          <u-icon name="moments" size="36" color="#FFFFFF" />
          <text>分享到朋友圈</text>
        </button>
      </view>

      <!-- 规则说明 -->
      <view class="rules-section">
        <text class="rules-title">邀请规则</text>
        <view class="rule-item">
          <text class="rule-num">1</text>
          <text class="rule-text">复制你的专属邀请码，分享给好友</text>
        </view>
        <view class="rule-item">
          <text class="rule-num">2</text>
          <text class="rule-text">好友注册时填写你的邀请码</text>
        </view>
        <view class="rule-item">
          <text class="rule-num">3</text>
          <text class="rule-text">好友完成首次生图后，双方各得 3 次免费额度</text>
        </view>
        <view class="rule-item">
          <text class="rule-num">4</text>
          <text class="rule-text">邀请次数无上限，多邀多得</text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getInviteInfo } from '@/api/invite'
import type { InviteInfo } from '@/api/invite'

const inviteInfo = ref<InviteInfo>({ inviteCode: '', totalInvites: 0, completedInvites: 0, totalReward: 0 })

onMounted(async () => {
  try {
    inviteInfo.value = await getInviteInfo()
  } catch (err) {
    console.error('[Invite] 加载邀请信息失败:', err)
  }
})

function copyCode() {
  if (!inviteInfo.value.inviteCode) return
  uni.setClipboardData({
    data: inviteInfo.value.inviteCode,
    success: () => uni.showToast({ title: '邀请码已复制', icon: 'success' }),
  })
}

function shareToWechat() {
  // #ifdef MP-WEIXIN
  uni.shareAppMessage({
    title: `「${inviteInfo.value.inviteCode}」邀请你加入图灵绘境，一起用AI创作！`,
    path: `/pages/index/index?inviteCode=${inviteInfo.value.inviteCode}`,
    imageUrl: '/static/logo.png',
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中使用', icon: 'none' })
  // #endif
}

function shareToTimeline() {
  // #ifdef MP-WEIXIN
  uni.shareTimeline({
    title: `「${inviteInfo.value.inviteCode}」邀请你加入图灵绘境，一起用AI创作！`,
    query: `inviteCode=${inviteInfo.value.inviteCode}`,
    imageUrl: '/static/logo.png',
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中使用', icon: 'none' })
  // #endif
}
</script>

<style lang="scss" scoped>
$bg-page:    #F6F7FB;
$bg-card:    #FFFFFF;
$text-1:     #2C2E3A;
$text-2:     #6B6E7D;
$text-3:     #9A9BAC;
$primary:     #8B9DC8;
$secondary:   #C4B5E0;
$invite-gradient: linear-gradient(135deg, #8B9DC8 0%, #C4B5E0 100%);

.page { min-height: 100vh; background: $bg-page; }
.invite-scroll { height: calc(100vh - 44px); }
.bottom-spacer { height: 40rpx; }

// ── Hero ──
.invite-hero {
  padding: 60rpx 32rpx 80rpx;
  background: $invite-gradient;
  border-radius: 0 0 40rpx 40rpx;
}
.invite-hero-title {
  font-size: 44rpx; font-weight: 800; color: #FFFFFF;
  display: block;
}
.invite-hero-desc {
  font-size: 26rpx; color: rgba(255,255,255,0.85);
  margin-top: 12rpx; display: block;
}

// ── Code Card ──
.code-card {
  margin: -40rpx 24rpx 0;
  padding: 40rpx 32rpx;
  background: $bg-card; border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  display: flex; flex-direction: column; align-items: center;
  position: relative; z-index: 2;
}
.code-label {
  font-size: 26rpx; color: $text-3; margin-bottom: 16rpx;
}
.code-value {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx 48rpx;
  background: linear-gradient(135deg, rgba(139,157,200,0.08), rgba(196,181,224,0.08));
  border-radius: 16rpx;
  border: 2rpx dashed $primary;

  &:active { opacity: 0.7; }
}
.code-text {
  font-size: 48rpx; font-weight: 800; color: $primary;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
  letter-spacing: 4rpx;
}
.code-hint {
  font-size: 22rpx; color: $text-3; margin-top: 16rpx;
}

// ── Stats ──
.stats-row {
  display: flex; gap: 16rpx;
  margin: 24rpx 24rpx 0;
}
.stat-card {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  padding: 28rpx 0;
  background: $bg-card; border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);

  &.highlight {
    background: linear-gradient(135deg, rgba(139,157,200,0.1), rgba(196,181,224,0.1));
  }
}
.stat-num {
  font-size: 40rpx; font-weight: 800; color: $primary;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
}
.stat-label {
  font-size: 22rpx; color: $text-3; margin-top: 8rpx;
}

// ── Share ──
.share-section {
  display: flex; flex-direction: column; gap: 16rpx;
  margin: 32rpx 24rpx 0;
}
.share-btn {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  width: 100%; height: 88rpx;
  font-size: 30rpx; font-weight: 700; color: #FFFFFF;
  border-radius: 999rpx; border: none;

  &:active { opacity: 0.85; }
  &::after { display: none; }

  &.wechat { background: linear-gradient(135deg, #07C160, #05a350); }
  &.timeline { background: linear-gradient(135deg, #8B9DC8, #A3B0CC); }
}

// ── Rules ──
.rules-section {
  margin: 32rpx 24rpx 0;
  padding: 32rpx;
  background: $bg-card; border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.rules-title {
  font-size: 30rpx; font-weight: 700; color: $text-1;
  display: block; margin-bottom: 24rpx;
}
.rule-item {
  display: flex; align-items: flex-start; gap: 16rpx;
  padding: 16rpx 0;
}
.rule-num {
  width: 36rpx; height: 36rpx;
  display: flex; align-items: center; justify-content: center;
  background: $primary; color: #FFFFFF;
  font-size: 22rpx; font-weight: 700;
  border-radius: 50%; flex-shrink: 0;
}
.rule-text {
  font-size: 26rpx; color: $text-2; line-height: 1.6;
  flex: 1;
}
</style>
