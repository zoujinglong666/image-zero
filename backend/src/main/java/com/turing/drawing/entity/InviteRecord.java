package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 邀请记录实体
 * 对应表: invite_records
 */
@TableName("invite_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteRecord extends BaseEntity {

    /** 邀请人ID */
    private Long inviterId;

    /** 被邀请人ID */
    private Long inviteeId;

    /** 状态: pending-待完成注册 / registered-已注册 / completed-已完成任务 */
    @Builder.Default
    private String status = "pending";

    /** 是否已发放奖励 */
    @Builder.Default
    private Boolean rewardGiven = false;
}
