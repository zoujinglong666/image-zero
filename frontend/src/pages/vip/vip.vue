<template>
  <view class="page">
    <u-navbar
      title="VIP 会员"
      :bgColor="'transparent'"
      :titleStyle="{ color: '#FFFFFF', fontWeight: '700' }"
      :borderBottom="false"
      :placeholder="true"
      :autoBack="true"
    />

    <scroll-view scroll-y class="vip-scroll">
      <!-- 顶部 VIP 头图 -->
      <view class="vip-hero">
        <view class="vip-hero-content">
          <text class="vip-hero-title">解锁无限创作</text>
          <text class="vip-hero-desc">升级 VIP，告别次数限制，畅享 AI 生图</text>
        </view>
        <!-- 当前 VIP 状态 -->
        <view v-if="vipStatus.isVip" class="vip-current-badge">
          <u-icon name="crown-fill" size="32" color="#FFD700" />
          <text class="vip-current-text">{{ vipLevelName }} · 剩余 {{ remainingDays }} 天</text>
        </view>
        <view v-else class="vip-current-badge free">
          <text class="vip-current-text">免费用户 · 每日 {{ vipStatus.dailyQuota || 10 }} 次</text>
        </view>
      </view>

      <!-- 套餐卡片 -->
      <view class="plans-section">
        <view
          v-for="plan in planList"
          :key="plan.id"
          class="plan-card"
          :class="{ active: selectedPlan === plan.id, recommended: plan.id === 'pro' }"
          @click="selectedPlan = plan.id"
        >
          <view v-if="plan.id === 'pro'" class="recommend-tag">最受欢迎</view>
          <view class="plan-header">
            <text class="plan-name">{{ plan.name }}</text>
            <view class="plan-price">
              <text class="price-symbol">¥</text>
              <text class="price-num">{{ formatPrice(plan.priceCents) }}</text>
              <text class="price-unit">/{{ plan.durationDays }}天</text>
            </view>
          </view>
          <view class="plan-features">
            <view class="feature-item">
              <u-icon name="checkmark-circle-fill" size="28" color="#8B9DC8" />
              <text>每日 {{ plan.dailyQuota === -1 ? '无限' : plan.dailyQuota }} 次生图</text>
            </view>
            <view class="feature-item">
              <u-icon name="checkmark-circle-fill" size="28" color="#8B9DC8" />
              <text>高清无水印下载</text>
            </view>
            <view class="feature-item">
              <u-icon name="checkmark-circle-fill" size="28" color="#8B9DC8" />
              <text>专属精品提示词</text>
            </view>
            <view class="feature-item">
              <u-icon name="checkmark-circle-fill" size="28" color="#8B9DC8" />
              <text>免广告干扰</text>
            </view>
            <view v-if="plan.level >= 2" class="feature-item highlight">
              <u-icon name="checkmark-circle-fill" size="28" color="#C4B5E0" />
              <text>优先生成队列</text>
            </view>
            <view v-if="plan.level >= 3" class="feature-item highlight">
              <u-icon name="checkmark-circle-fill" size="28" color="#C4B5E0" />
              <text>专属客服支持</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 权益对比表 -->
      <view class="compare-section">
        <text class="section-title">权益对比</text>
        <view class="compare-table">
          <view class="compare-row header">
            <text class="compare-cell feature">权益</text>
            <text class="compare-cell">免费</text>
            <text class="compare-cell active">VIP</text>
          </view>
          <view class="compare-row">
            <text class="compare-cell feature">每日生图</text>
            <text class="compare-cell">{{ vipStatus.dailyQuota || 10 }} 次</text>
            <text class="compare-cell active">无限</text>
          </view>
          <view class="compare-row">
            <text class="compare-cell feature">下载水印</text>
            <text class="compare-cell">有水印</text>
            <text class="compare-cell active">无水印</text>
          </view>
          <view class="compare-row">
            <text class="compare-cell feature">广告墙</text>
            <text class="compare-cell">需观看</text>
            <text class="compare-cell active">免广告</text>
          </view>
          <view class="compare-row">
            <text class="compare-cell feature">精品提示词</text>
            <text class="compare-cell">部分</text>
            <text class="compare-cell active">全部</text>
          </view>
          <view class="compare-row">
            <text class="compare-cell feature">生成队列</text>
            <text class="compare-cell">普通</text>
            <text class="compare-cell active">优先</text>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 底部购买按钮 -->
    <view class="vip-footer">
      <view class="footer-price">
        <text class="footer-price-label">合计</text>
        <text class="footer-price-value">¥{{ currentPlanPrice }}</text>
      </view>
      <button
        class="buy-btn"
        :loading="buying"
        :disabled="buying || !selectedPlan"
        @click="handleBuyWrapper"
      >
        {{ vipStatus.isVip ? '续费会员' : '立即开通' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getVipPlans, createVipOrder, getVipStatus, formatPrice, getRemainingDays } from '@/api/payment'
import type { VipPlan, VipStatus } from '@/api/payment'

// ─── 状态 ────────────────────────────
const plans = ref<Record<string, VipPlan>>({})
const vipStatus = ref<VipStatus>({ vipLevel: 0, isVip: false, expireAt: 0, dailyQuota: 10 })
const selectedPlan = ref('pro')
const buying = ref(false)
const loading = ref(true)

// ─── 计算属性 ──────────────────────────
const planList = computed(() => Object.values(plans.value))

const currentPlanPrice = computed(() => {
  const plan = plans.value[selectedPlan.value]
  return plan ? formatPrice(plan.priceCents) : '0.00'
})

const remainingDays = computed(() => getRemainingDays(vipStatus.value.expireAt))

const vipLevelName = computed(() => {
  const names = ['免费', '基础版', '专业版', '旗舰版']
  return names[vipStatus.value.vipLevel] || '免费'
})

// ─── 生命周期 ──────────────────────────
onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [plansData, statusData] = await Promise.all([
      getVipPlans(),
      getVipStatus(),
    ])
    plans.value = plansData
    vipStatus.value = statusData
  } catch (err: any) {
    console.error('[VIP] 加载数据失败:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ─── 购买（防抖：防止重复点击） ──────────────────────
let buyTimer: ReturnType<typeof setTimeout> | null = null
async function handleBuyWrapper() {
  if (!selectedPlan.value || buying.value) return
  if (buyTimer) clearTimeout(buyTimer)
  buyTimer = setTimeout(async () => {
    buyTimer = null
    await handleBuy()
  }, 500)
}

async function handleBuy() {
  if (!selectedPlan.value) {
    uni.showToast({ title: '请选择套餐', icon: 'none' })
    return
  }

  buying.value = true
  uni.showLoading({ title: '正在创建订单...', mask: true })

  try {
    const result = await createVipOrder(selectedPlan.value)

    // 调起微信支付
    if (result.paymentParams) {
      const { timeStamp, nonceStr, package: pkg, signType, paySign } = result.paymentParams
      // #ifdef MP-WEIXIN
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp,
        nonceStr,
        package: pkg,
        signType,
        paySign,
        success: () => {
          uni.showToast({ title: '支付成功', icon: 'success' })
          loadData()
        },
        fail: (err: any) => {
          console.error('[VIP] 支付失败:', err)
          uni.showToast({ title: '支付已取消', icon: 'none' })
        },
      })
      // #endif

      // #ifndef MP-WEIXIN
      uni.hideLoading()
      uni.showToast({ title: '非小程序环境，无法调起支付', icon: 'none' })
      // #endif
    }
  } catch (err: any) {
    console.error('[VIP] 购买失败:', err)
    uni.hideLoading()
    uni.showToast({ title: err.message || '购买失败', icon: 'none' })
  } finally {
    buying.value = false
  }
}
</script>

<style lang="scss" scoped>
/* ════════════════════════════════
   VIP 页面 · 薄雾白设计系统
   ════════════════════════════════ */

$bg-page:    #F6F7FB;
$bg-card:    #FFFFFF;
$text-1:     #2C2E3A;
$text-2:     #6B6E7D;
$text-3:     #9A9BAC;
$primary:     #8B9DC8;
$primary-light: #A3B0CC;
$secondary:   #C4B5E0;
$vip-gold:   #FFD700;
$vip-gradient: linear-gradient(135deg, #8B9DC8 0%, #C4B5E0 100%);

.page { min-height: 100vh; background: $bg-page; }
.vip-scroll { height: calc(100vh - 44px - 120rpx); }
.bottom-spacer { height: 40rpx; }

// ── Hero ──
.vip-hero {
  position: relative;
  padding: 60rpx 32rpx 80rpx;
  background: $vip-gradient;
  border-radius: 0 0 40rpx 40rpx;
  overflow: hidden;
}
.vip-hero::before {
  content: '';
  position: absolute; top: -50%; right: -20%;
  width: 400rpx; height: 400rpx;
  background: rgba(255,255,255,0.08);
  border-radius: 50%;
}
.vip-hero-content {
  position: relative; z-index: 1;
}
.vip-hero-title {
  font-size: 48rpx; font-weight: 800; color: #FFFFFF;
  display: block; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}
.vip-hero-desc {
  font-size: 26rpx; color: rgba(255,255,255,0.85);
  margin-top: 12rpx; display: block;
}
.vip-current-badge {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 10rpx;
  margin-top: 24rpx;
  padding: 12rpx 24rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 999rpx;
  backdrop-filter: blur(10rpx);
}
.vip-current-badge.free {
  background: rgba(255,255,255,0.15);
}
.vip-current-text {
  font-size: 24rpx; color: #FFFFFF; font-weight: 500;
}

// ── Plans ──
.plans-section {
  display: flex; flex-direction: column; gap: 20rpx;
  padding: 0 24rpx; margin-top: -40rpx;
  position: relative; z-index: 2;
}
.plan-card {
  background: $bg-card; border-radius: 24rpx;
  padding: 32rpx; border: 2rpx solid transparent;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  position: relative; overflow: hidden;
  transition: all 0.2s ease;

  &.active {
    border-color: $primary;
    box-shadow: 0 4rpx 24rpx rgba(139,157,200,0.2);
  }
  &.recommended {
    border-color: $secondary;
  }
}
.recommend-tag {
  position: absolute; top: 0; right: 0;
  padding: 8rpx 20rpx;
  background: $secondary; color: #FFFFFF;
  font-size: 20rpx; font-weight: 600;
  border-radius: 0 0 0 16rpx;
}
.plan-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 24rpx;
}
.plan-name {
  font-size: 34rpx; font-weight: 700; color: $text-1;
}
.plan-price {
  display: flex; align-items: baseline; gap: 4rpx;
}
.price-symbol { font-size: 24rpx; color: $primary; font-weight: 600; }
.price-num { font-size: 48rpx; color: $primary; font-weight: 800; }
.price-unit { font-size: 22rpx; color: $text-3; }

.plan-features {
  display: flex; flex-direction: column; gap: 16rpx;
}
.feature-item {
  display: flex; align-items: center; gap: 12rpx;
  font-size: 26rpx; color: $text-2;

  &.highlight {
    color: $text-1; font-weight: 500;
  }
}

// ── Compare ──
.compare-section {
  margin: 32rpx 24rpx 0;
  padding: 32rpx;
  background: $bg-card; border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.section-title {
  font-size: 30rpx; font-weight: 700; color: $text-1;
  display: block; margin-bottom: 24rpx;
}
.compare-table {
  display: flex; flex-direction: column;
}
.compare-row {
  display: flex; align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid rgba(0,0,0,0.04);

  &.header {
    padding: 16rpx 0;
    border-bottom: 2rpx solid rgba(0,0,0,0.08);
    font-weight: 600;
  }
  &:last-child { border-bottom: none; }
}
.compare-cell {
  flex: 1; text-align: center; font-size: 26rpx; color: $text-2;

  &.feature {
    flex: 1.5; text-align: left; color: $text-1;
  }
  &.active {
    color: $primary; font-weight: 600;
  }
}

// ── Footer ──
.vip-footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: $bg-card;
  border-top: 1rpx solid rgba(0,0,0,0.05);
  box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.04);
}
.footer-price {
  display: flex; align-items: baseline; gap: 8rpx;
}
.footer-price-label {
  font-size: 26rpx; color: $text-3;
}
.footer-price-value {
  font-size: 40rpx; color: $primary; font-weight: 800;
}
.buy-btn {
  width: 280rpx; height: 84rpx;
  background: $vip-gradient; color: #FFFFFF;
  font-size: 30rpx; font-weight: 700;
  border-radius: 999rpx; border: none;
  display: flex; align-items: center; justify-content: center;

  &:active { opacity: 0.85; }
  &[disabled] {
    opacity: 0.5;
    background: linear-gradient(135deg, #B0B8CC, #C8C0D8);
  }
}
</style>
