package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@TableName("credit_orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreditOrder extends BaseEntity {
    private Long userId;
    private String creditPackId;
    private Integer creditAmount;
    private Integer amountCents;
    private String status;
    private String paymentNo;
    private LocalDateTime paidAt;
}
