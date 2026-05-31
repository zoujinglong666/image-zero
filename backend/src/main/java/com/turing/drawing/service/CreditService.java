package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.turing.drawing.entity.CreditOrder;
import com.turing.drawing.entity.User;
import com.turing.drawing.entity.UserCredit;
import com.turing.drawing.mapper.CreditOrderMapper;
import com.turing.drawing.mapper.UserCreditMapper;
import com.turing.drawing.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 积分充值服务
 * 用户可用积分替代免费额度进行生图
 * 所有支付均走微信支付 V3 JSAPI，无 mock 逻辑
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CreditService {

    private final UserCreditMapper userCreditMapper;
    private final CreditOrderMapper creditOrderMapper;
    private final UserMapper userMapper;
    private final WechatPayService wechatPayService;

    @Value("${wechat.mini-program-app-id:}")
    private String miniProgramAppId;

    private static final Map<String, CreditPack> CREDIT_PACKS = Map.of(
            "mini", new CreditPack("mini", "体验包", 60, 600, "6元 = 60积分"),
            "small", new CreditPack("small", "入门包", 200, 1800, "18元 = 200积分"),
            "medium", new CreditPack("medium", "进阶包", 500, 3900, "39元 = 500积分"),
            "large", new CreditPack("large", "专业包", 1200, 7900, "79元 = 1200积分")
    );

    private static final int CREDITS_PER_GENERATION = 1; // 1积分 = 1次生图

    public Map<String, CreditPack> listPacks() {
        return CREDIT_PACKS;
    }

    public UserCredit getOrCreateCredit(Long userId) {
        UserCredit credit = userCreditMapper.selectOne(
                new LambdaQueryWrapper<UserCredit>().eq(UserCredit::getUserId, userId));
        if (credit == null) {
            credit = UserCredit.builder().userId(userId).balance(0).totalEarned(0).totalSpent(0).build();
            userCreditMapper.insert(credit);
        }
        return credit;
    }

    /**
     * 创建积分充值订单，调用微信支付 V3 JSAPI 统一下单
     *
     * @return { orderId, paymentParams: { timeStamp, nonceStr, package, signType, paySign } }
     */
    @Transactional
    public Map<String, Object> createCreditOrder(Long userId, String packId) {
        CreditPack pack = CREDIT_PACKS.get(packId);
        if (pack == null) throw new IllegalArgumentException("无效的积分包");

        // 获取用户 openid
        User user = userMapper.selectById(userId);
        if (user == null) throw new IllegalArgumentException("用户不存在");
        String openid = user.getWechatOpenid();
        if (openid == null || openid.isBlank()) {
            throw new IllegalStateException("用户未绑定微信，无法发起支付，请重新登录");
        }

        // 幂等性：同一用户 + 同积分包 + pending 状态 → 重新生成支付参数
        CreditOrder existing = creditOrderMapper.selectOne(
                new LambdaQueryWrapper<CreditOrder>()
                        .eq(CreditOrder::getUserId, userId)
                        .eq(CreditOrder::getCreditPackId, packId)
                        .eq(CreditOrder::getStatus, "pending")
                        .orderByDesc(CreditOrder::getId)
                        .last("LIMIT 1")
        );

        if (existing != null) {
            log.info("[积分] 检测到重复提交，复用已有订单: orderId={}", existing.getId());
            // 重新生成支付参数（prepay_id 可能过期）
            Map<String, String> wxParams = wechatPayService.createJSAPIOrderForCredit(
                    existing.getId(), existing.getAmountCents(),
                    "图灵绘境 - " + pack.name, openid);
            return Map.of("orderId", existing.getId(), "paymentParams", wxParams);
        }

        // 创建新订单
        CreditOrder order = CreditOrder.builder()
                .userId(userId).creditPackId(packId)
                .creditAmount(pack.credits).amountCents(pack.priceCents)
                .status("pending").build();
        creditOrderMapper.insert(order);

        log.info("[积分] 创建订单成功: orderId={}, userId={}, pack={}, amount={}分",
                order.getId(), userId, packId, pack.priceCents);

        // 调用微信支付 V3 统一下单
        Map<String, String> wxParams = wechatPayService.createJSAPIOrderForCredit(
                order.getId(), order.getAmountCents(),
                "图灵绘境 - " + pack.name, openid);

        return Map.of("orderId", order.getId(), "paymentParams", wxParams);
    }

    /**
     * 微信支付回调：完成充值（更新订单状态 + 增加用户积分）
     * 由 PaymentController 在回调入口分派调用
     *
     * @param notifyData 解密后的回调数据 Map { out_trade_no, transaction_id, trade_state, ... }
     */
    @Transactional
    public void handleCreditPaymentCallback(Map<String, Object> notifyData) {
        String outTradeNo = (String) notifyData.get("out_trade_no");
        String transactionId = (String) notifyData.get("transaction_id");

        Long orderId = parseCreditOrderIdFromOutTradeNo(outTradeNo);
        if (orderId == null) {
            log.warn("[积分回调] 无法解析订单ID: out_trade_no={}", outTradeNo);
            return;
        }

        fulfillCreditOrder(orderId, transactionId);
        log.info("[积分回调] 处理完成: orderId={}, transactionId={}",
                orderId, transactionId);
    }

    /**
     * 从 out_trade_no 解析积分订单ID
     * 格式：CR{orderId}T{timestamp}
     */
    private Long parseCreditOrderIdFromOutTradeNo(String outTradeNo) {
        try {
            if (outTradeNo != null && outTradeNo.startsWith("CR")) {
                String[] parts = outTradeNo.split("T");
                return Long.valueOf(parts[0].substring(2));
            }
        } catch (Exception e) {
            log.error("[积分回调] 解析 out_trade_no 失败: {}", outTradeNo, e);
        }
        return null;
    }

    /**
     * 完成充值（支付回调/开发模式直接调用）
     * @param orderId      订单ID
     * @param transactionId 微信支付单号（可为 null，开发模式调用时）
     */
    @Transactional
    public void fulfillCreditOrder(Long orderId, String transactionId) {
        CreditOrder order = creditOrderMapper.selectById(orderId);
        if (order == null) {
            log.warn("[积分回调] 订单不存在: orderId={}", orderId);
            return;
        }
        if ("paid".equals(order.getStatus())) {
            log.info("[积分回调] 订单已处理，跳过: orderId={}", orderId);
            return;
        }

        // 更新订单状态
        order.setStatus("paid");
        order.setPaymentNo(transactionId);
        order.setPaidAt(LocalDateTime.now());
        creditOrderMapper.updateById(order);

        // 增加用户积分
        getOrCreateCredit(order.getUserId());
        userCreditMapper.update(null, new LambdaUpdateWrapper<UserCredit>()
                .eq(UserCredit::getUserId, order.getUserId())
                .setSql("balance = balance + " + order.getCreditAmount())
                .setSql("total_earned = total_earned + " + order.getCreditAmount()));

        log.info("[积分回调] 充值到账: userId={}, +{}积分, transactionId={}",
                order.getUserId(), order.getCreditAmount(), transactionId);
    }

    /**
     * 尝试使用积分替代免费额度
     *
     * @return true=消耗成功，false=积分不足
     */
    @Transactional
    public boolean trySpendCredit(Long userId) {
        UserCredit credit = userCreditMapper.selectOne(
                new LambdaQueryWrapper<UserCredit>().eq(UserCredit::getUserId, userId));
        if (credit == null || credit.getBalance() < CREDITS_PER_GENERATION) return false;

        userCreditMapper.update(null, new LambdaUpdateWrapper<UserCredit>()
                .eq(UserCredit::getUserId, userId)
                .setSql("balance = balance - " + CREDITS_PER_GENERATION)
                .setSql("total_spent = total_spent + " + CREDITS_PER_GENERATION));
        return true;
    }

    /** 发放奖励积分（邀请等场景） */
    @Transactional
    public void grantCredits(Long userId, int amount, String reason) {
        getOrCreateCredit(userId);
        userCreditMapper.update(null, new LambdaUpdateWrapper<UserCredit>()
                .eq(UserCredit::getUserId, userId)
                .setSql("balance = balance + " + amount)
                .setSql("total_earned = total_earned + " + amount));
        log.info("[积分] {}: userId={}, +{}积分", reason, userId, amount);
    }

    public static class CreditPack {
        public final String id;
        public final String name;
        public final int credits;
        public final int priceCents;
        public final String desc;

        public CreditPack(String id, String name, int credits, int priceCents, String desc) {
            this.id = id;
            this.name = name;
            this.credits = credits;
            this.priceCents = priceCents;
            this.desc = desc;
        }
    }
}
