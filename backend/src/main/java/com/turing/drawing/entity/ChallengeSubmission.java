package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    /** 点赞数 */
    @Builder.Default
    private Integer likeCount = 0;
}