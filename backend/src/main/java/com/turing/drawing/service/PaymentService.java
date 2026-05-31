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
 * 所有支付均走微信支付 V3 JSAPI，无 mock 逻辑
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final VipSubscriptionMapper vipSubscriptionMapper;
    private final UserMapper userMapper;
    private final WechatPayService wechatPayService;

    @Value("${wechat.mini-program-app-id:}")
    private String miniProgramAppId;

    /** VIP套餐配置 */
    private static final Map<String, VipPlan> VIP_PLANS = Map.of(
            "basic", new VipPlan("basic", "基础版", 990, 30, 1, 50),
            "pro", new VipPlan("pro", "专业版", 2990, 30, 2, 200),
            "ultimate", new VipPlan("ultimate", "旗舰版", 5990, 365, 3, -1)
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
    //  创建订单（微信支付 JSAPI）
    // ══════════════════════════════════════════════════════

    /**
     * 创建VIP订阅订单，调用微信支付 V3 JSAPI 统一下单
     *
     * @param userId 用户ID
     * @param plan   套餐: basic/pro/ultimate
     * @return 微信支付前端调起参数 { orderId, paymentParams: { timeStamp, nonceStr, package, signType, paySign } }
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

        // 获取用户 openid（用于 JSAPI 支付）
        String openid = user.getWechatOpenid();
        if (openid == null || openid.isBlank()) {
            throw new IllegalStateException("用户未绑定微信，无法发起支付，请重新登录");
        }

        // 幂等性：同一用户 + 同套餐 + pending 状态 → 返回已有订单的支付参数
        VipSubscription existing = vipSubscriptionMapper.selectOne(
                new LambdaQueryWrapper<VipSubscription>()
                        .eq(VipSubscription::getUserId, userId)
                        .eq(VipSubscription::getPlan, plan)
                        .eq(VipSubscription::getStatus, "pending")
                        .orderByDesc(VipSubscription::getId)
                        .last("LIMIT 1")
        );

        if (existing != null) {
            log.info("[支付] 检测到重复提交，复用已有订单: orderId={}", existing.getId());
            // 重新生成支付参数（prepay_id 可能过期，每次都重新下单）
            Map<String, String> wxParams = wechatPayService.createJSAPIOrder(
                    existing, vipPlan.name, openid);
            return Map.of(
                    "orderId", existing.getId(),
                    "paymentParams", wxParams
            );
        }

        // 创建订阅记录
        VipSubscription subscription = VipSubscription.builder()
                .userId(userId)
                .plan(plan)
                .status("pending")
                .amountCents(vipPlan.priceCents)
                .startedAt(LocalDateTime.now())
                .expireAt(LocalDateTime.now().plusDays(vipPlan.durationDays))
                .build();
        vipSubscriptionMapper.insert(subscription);

        log.info("[支付] 创建订单成功: orderId={}, userId={}, plan={}, amount={}分",
                subscription.getId(), userId, plan, vipPlan.priceCents);

        // 调用微信支付 V3 统一下单
        Map<String, String> wxParams = wechatPayService.createJSAPIOrder(
                subscription, vipPlan.name, openid);

        return Map.of(
                "orderId", subscription.getId(),
                "paymentParams", wxParams
        );
    }

    // ══════════════════════════════════════════════════════
    //  支付回调处理
    // ══════════════════════════════════════════════════════

    /**
     * 微信支付回调处理（V3 格式）—— 仅处理 VIP 订单
     * 验证签名 → 解密 resource → 更新订单状态 → 激活VIP
     *
     * @param notifyData 解密后的回调数据 Map { out_trade_no, transaction_id, trade_state, ... }
     */
    public void handleVipPaymentCallback(Map<String, Object> notifyData) {
        String tradeState = (String) notifyData.get("trade_state");
        String outTradeNo = (String) notifyData.get("out_trade_no");
        String transactionId = (String) notifyData.get("transaction_id");

        log.info("[支付回调-VIP] trade_state={}, out_trade_no={}, transaction_id={}",
                tradeState, outTradeNo, transactionId);

        if (!"SUCCESS".equals(tradeState)) {
            log.info("[支付回调-VIP] 订单未支付成功，忽略: trade_state={}", tradeState);
            return;
        }

        Long orderId = parseVipOrderIdFromOutTradeNo(outTradeNo);
        if (orderId == null) {
            log.warn("[支付回调-VIP] 无法解析VIP订单ID: out_trade_no={}", outTradeNo);
            return;
        }

        // 幂等处理
        VipSubscription subscription = vipSubscriptionMapper.selectById(orderId);
        if (subscription == null) {
            log.warn("[支付回调-VIP] 订单不存在: orderId={}", orderId);
            return;
        }
        if ("active".equals(subscription.getStatus())) {
            log.info("[支付回调-VIP] 订单已处理，跳过: orderId={}", orderId);
            return;
        }

        // 更新订单状态
        subscription.setStatus("active");
        subscription.setPaymentNo(transactionId);
        subscription.setStartedAt(LocalDateTime.now());
        VipPlan plan = VIP_PLANS.get(subscription.getPlan());
        if (plan != null) {
            subscription.setExpireAt(LocalDateTime.now().plusDays(plan.durationDays));
        }
        vipSubscriptionMapper.updateById(subscription);

        // 激活用户 VIP
        activateVip(subscription.getUserId(), subscription.getId(), subscription.getPlan());

        log.info("[支付回调-VIP] VIP激活成功: userId={}, plan={}, orderId={}",
                subscription.getUserId(), subscription.getPlan(), orderId);
    }

    /**
     * 从 out_trade_no 解析 VIP 订单ID
     * 格式：VIP{orderId}T{timestamp}
     */
    private Long parseVipOrderIdFromOutTradeNo(String outTradeNo) {
        try {
            if (outTradeNo != null && outTradeNo.startsWith("VIP")) {
                String[] parts = outTradeNo.split("T");
                return Long.valueOf(parts[0].substring(3));
            }
        } catch (Exception e) {
            log.error("[支付回调-VIP] 解析 out_trade_no 失败: {}", outTradeNo, e);
        }
        return null;
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

        // 更新订阅记录
        vipSubscriptionMapper.update(null, new LambdaUpdateWrapper<VipSubscription>()
                .eq(VipSubscription::getId, subscriptionId)
                .set(VipSubscription::getStatus, "active")
                .set(VipSubscription::getStartedAt, LocalDateTime.now())
                .set(VipSubscription::getExpireAt,
                        LocalDateTime.now().plusDays(vipPlan.durationDays)));
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
