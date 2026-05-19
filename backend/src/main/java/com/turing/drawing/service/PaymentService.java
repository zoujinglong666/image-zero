package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.turing.drawing.entity.User;
import com.turing.drawing.entity.VipSubscription;
import com.turing.drawing.mapper.UserMapper;
import com.turing.drawing.mapper.VipSubscriptionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 支付与VIP订阅服务
 * 支持微信小程序支付、VIP套餐管理、额度管理
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final VipSubscriptionMapper vipSubscriptionMapper;
    private final UserMapper userMapper;

    @Value("${wechat.mini-program-app-id:}")
    private String miniProgramAppId;

    @Value("${wechat.mini-program-app-secret:}")
    private String miniProgramAppSecret;

    /** VIP套餐配置 */
    private static final Map<String, VipPlan> VIP_PLANS = Map.of(
            "basic", new VipPlan("basic", "基础版", 990, 30, 1, 50),
            "pro", new VipPlan("pro", "专业版", 2990, 30, 2, 200),
            "ultimate", new VipPlan("ultimate", "旗舰版", 5990, 365, 3, -1)  // -1 表示无限
    );

    // ══════════════════════════════════════════════════════
    //  套餐查询
    // ══════════════════════════════════════════════════════

    /**
     * 获取所有可用VIP套餐
     */
    public Map<String, VipPlan> listPlans() {
        return VIP_PLANS;
    }

    /**
     * 获取用户当前VIP状态
     */
    public Map<String, Object> getUserVipStatus(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            return Map.of("vipLevel", 0, "isVip", false, "expireAt", 0, "dailyQuota", 10);
        }

        boolean isVip = user.getVipLevel() != null && user.getVipLevel() > 0
                && user.getVipExpireAt() != null
                && user.getVipExpireAt() > System.currentTimeMillis() / 1000;

        // VIP过期自动降级
        if (user.getVipLevel() > 0 && !isVip) {
            downgradeExpiredVip(user);
        }

        return Map.of(
                "vipLevel", user.getVipLevel() != null ? user.getVipLevel() : 0,
                "isVip", isVip,
                "expireAt", user.getVipExpireAt() != null ? user.getVipExpireAt() : 0,
                "dailyQuota", user.getDailyQuota() != null ? user.getDailyQuota() : 10,
                "nickname", user.getNickname() != null ? user.getNickname() : "",
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
        );
    }

    // ══════════════════════════════════════════════════════
    //  创建订单（微信支付前置）
    // ══════════════════════════════════════════════════════

    /**
     * 创建VIP订阅订单
     * 返回微信支付所需参数（小程序调用 wx.requestPayment）
     *
     * @param userId  用户ID
     * @param plan    套餐: basic/pro/ultimate
     * @return 微信支付参数 / 或模拟支付参数（开发模式）
     */
    @Transactional
    public Map<String, Object> createOrder(Long userId, String plan) {
        // 参数验证
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("无效的用户ID");
        }
        if (plan == null || plan.isBlank()) {
            throw new IllegalArgumentException("无效的VIP套餐");
        }

        VipPlan vipPlan = VIP_PLANS.get(plan);
        if (vipPlan == null) {
            throw new IllegalArgumentException("无效的VIP套餐: " + plan);
        }

        // 检查用户是否存在
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }

        // 创建订阅记录
        VipSubscription subscription = VipSubscription.builder()
                .userId(userId)
                .plan(plan)
                .status("pending")
                .amountCents(vipPlan.priceCents)
                .startedAt(LocalDateTime.now())
                .build();
        vipSubscriptionMapper.insert(subscription);

        // 检查微信支付配置
        if (miniProgramAppId == null || miniProgramAppId.isBlank()) {
            // 开发模式：直接激活
            log.info("[支付] 开发模式，直接激活VIP: userId={}, plan={}", userId, plan);
            activateVip(userId, subscription.getId(), plan);
            return Map.of(
                    "orderId", subscription.getId(),
                    "mode", "dev",
                    "message", "开发模式，VIP已直接激活"
            );
        }

        try {
            // 生产模式：调用微信支付统一下单接口
            Map<String, Object> wxPayParams = createWxPayOrder(subscription, vipPlan);
            return Map.of(
                    "orderId", subscription.getId(),
                    "mode", "production",
                    "paymentParams", wxPayParams
            );
        } catch (Exception e) {
            log.error("微信支付下单失败: {}", e.getMessage());
            throw new RuntimeException("支付下单失败，请稍后重试");
        }
    }

    // ══════════════════════════════════════════════════════
    //  支付回调
    // ══════════════════════════════════════════════════════

    /**
     * 微信支付回调处理
     * 验证签名 → 更新订阅状态 → 激活VIP
     */
    @Transactional
    public void handlePaymentCallback(String orderId, String paymentNo) {
        // 参数验证
        if (orderId == null || orderId.isBlank()) {
            log.warn("[支付回调] 订单ID为空");
            return;
        }
        if (paymentNo == null || paymentNo.isBlank()) {
            log.warn("[支付回调] 支付单号为空");
            return;
        }
        
        Long orderIdLong;
        try {
            orderIdLong = Long.valueOf(orderId);
        } catch (NumberFormatException e) {
            log.warn("[支付回调] 无效的订单ID格式: {}", orderId);
            return;
        }
        
        VipSubscription subscription = vipSubscriptionMapper.selectById(orderIdLong);
        if (subscription == null) {
            log.warn("[支付回调] 订单不存在: {}", orderId);
            return;
        }
        if ("active".equals(subscription.getStatus())) {
            log.info("[支付回调] 订单已处理，跳过: {}", orderId);
            return;
        }

        // 更新订阅状态
        subscription.setStatus("active");
        subscription.setPaymentNo(paymentNo);
        subscription.setStartedAt(LocalDateTime.now());

        VipPlan plan = VIP_PLANS.get(subscription.getPlan());
        if (plan != null) {
            subscription.setExpireAt(LocalDateTime.now().plusDays(plan.durationDays));
        }
        vipSubscriptionMapper.updateById(subscription);

        // 激活用户VIP
        activateVip(subscription.getUserId(), subscription.getId(), subscription.getPlan());

        log.info("[支付回调] VIP激活成功: userId={}, plan={}", subscription.getUserId(), subscription.getPlan());
    }

    // ══════════════════════════════════════════════════════
    //  额度管理
    // ══════════════════════════════════════════════════════

    /**
     * 检查用户是否有足够的AI使用额度
     */
    public boolean checkQuota(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) return false;

        // VIP用户无限额度
        if (user.getVipLevel() != null && user.getVipLevel() >= 2) {
            boolean vipValid = user.getVipExpireAt() != null
                    && user.getVipExpireAt() > System.currentTimeMillis() / 1000;
            if (vipValid) return true;
        }

        return user.getDailyQuota() != null && user.getDailyQuota() > 0;
    }

    /**
     * 消耗一次AI使用额度
     */
    public void consumeQuota(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) return;

        // VIP用户不扣额度
        if (user.getVipLevel() != null && user.getVipLevel() >= 2) {
            boolean vipValid = user.getVipExpireAt() != null
                    && user.getVipExpireAt() > System.currentTimeMillis() / 1000;
            if (vipValid) return;
        }

        if (user.getDailyQuota() != null && user.getDailyQuota() > 0) {
            userMapper.update(null, new LambdaUpdateWrapper<User>()
                    .eq(User::getId, userId)
                    .setSql("daily_quota = daily_quota - 1"));
        }
    }

    // ══════════════════════════════════════════════════════
    //  内部方法
    // ══════════════════════════════════════════════════════

    /**
     * 激活VIP
     */
    private void activateVip(Long userId, Long subscriptionId, String plan) {
        VipPlan vipPlan = VIP_PLANS.get(plan);
        if (vipPlan == null) return;

        long expireAt = System.currentTimeMillis() / 1000 + vipPlan.durationDays * 86400L;

        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, userId)
                .set(User::getVipLevel, vipPlan.level)
                .set(User::getVipExpireAt, expireAt)
                .set(User::getDailyQuota, vipPlan.dailyQuota));

        // 更新订阅状态
        vipSubscriptionMapper.update(null, new LambdaUpdateWrapper<VipSubscription>()
                .eq(VipSubscription::getId, subscriptionId)
                .set(VipSubscription::getStatus, "active")
                .set(VipSubscription::getStartedAt, LocalDateTime.now())
                .set(VipSubscription::getExpireAt, LocalDateTime.now().plusDays(vipPlan.durationDays)));
    }

    /**
     * VIP过期降级
     */
    private void downgradeExpiredVip(User user) {
        log.info("[VIP] 用户VIP已过期，降级: userId={}", user.getId());
        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, user.getId())
                .set(User::getVipLevel, 0)
                .set(User::getVipExpireAt, 0)
                .set(User::getDailyQuota, 10));
    }

    /**
     * 调用微信支付统一下单接口（模拟实现）
     * 生产环境需接入微信支付SDK
     */
    private Map<String, Object> createWxPayOrder(VipSubscription subscription, VipPlan plan) {
        // TODO: 接入微信支付SDK，调用统一下单接口
        // 参考文档: https://pay.weixin.qq.com/wiki/doc/apiv3/wxpay/pay/transactions/chapter3_2.shtml
        log.info("[支付] 创建微信支付订单: subscriptionId={}, plan={}, amount={}分",
                subscription.getId(), plan.name, plan.priceCents);

        // 返回模拟的支付参数（实际应从微信支付API获取）
        return Map.of(
                "timeStamp", String.valueOf(System.currentTimeMillis() / 1000),
                "nonceStr", java.util.UUID.randomUUID().toString().replace("-", ""),
                "package", "prepay_id=wx" + subscription.getId(),
                "signType", "RSA",
                "paySign", "mock_sign_value"
        );
    }

    /**
     * VIP套餐内部类
     */
    public static class VipPlan {
        public final String id;
        public final String name;
        public final int priceCents;      // 价格（分）
        public final int durationDays;    // 有效期（天）
        public final int level;           // VIP等级
        public final int dailyQuota;      // 每日额度（-1=无限）

        public VipPlan(String id, String name, int priceCents, int durationDays, int level, int dailyQuota) {
            this.id = id;
            this.name = name;
            this.priceCents = priceCents;
            this.durationDays = durationDays;
            this.level = level;
            this.dailyQuota = dailyQuota;
        }
    }
}