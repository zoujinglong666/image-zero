package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * VIP订阅实体
 * 对应表: vip_subscriptions
 */
@TableName("vip_subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VipSubscription extends BaseEntity {

    /** 所属用户ID */
    private Long userId;

    /** 套餐: basic/pro/ultimate */
    private String plan;

    /** 状态: active/expired/cancelled */
    private String status;

    /** 开始时间 */
    private LocalDateTime startedAt;

    /** 到期时间 */
    private LocalDateTime expireAt;

    /** 支付单号 */
    private String paymentNo;

    /** 金额(分) */
    @Builder.Default
    private Integer amountCents = 0;
}