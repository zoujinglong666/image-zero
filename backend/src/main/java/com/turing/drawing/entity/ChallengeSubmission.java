package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 挑战投稿实体
 * 对应表: challenge_submissions
 */
@TableName("challenge_submissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ChallengeSubmission extends BaseEntity {

    /** 挑战ID */
    private Long challengeId;

    /** 用户ID */
    private Long userId;

    /** 作品标题 */
    private String title;

    /** 使用的提示词 */
    private String promptText;

    /** 作品图片URL */
    private String imageUrl;

    /** 审核状态: pending/ai_pass/ai_warn/ai_reject/approved/rejected */
    @Builder.Default
    private String reviewStatus = "pending";

    /** AI审核结果JSON */
    private String moderationResult;

    /** 拒绝原因 */
    private String rejectReason;

    /** 审核时间 */
    private LocalDateTime reviewedAt;

    /** 审核员ID */
    private Long reviewedBy;

    /** 点赞数 */
    @Builder.Default
    private Integer likeCount = 0;
}