package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@TableName("user_credits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCredit extends BaseEntity {
    private Long userId;
    private Integer balance;
    private Integer totalEarned;
    private Integer totalSpent;
}
