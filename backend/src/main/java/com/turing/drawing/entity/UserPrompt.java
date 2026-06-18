package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户自创提示词实体（含社区分享）
 * 对应表: user_prompts
 * 前端 CommunityPost 接口使用 snake_case 字段名
 */
@TableName("user_prompts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class UserPrompt extends BaseEntity {

    /** 所属用户ID */
    private Long userId;

    /** 标题 */
    private String title;

    /** 提示词内容 */
    private String promptText;

    /** 分类ID */
    private Long categoryId;

    /** 逗号分隔标签 */
    private String tags;

    /** 0=私密 1=公开(社区可见) */
    @TableField("is_public")
    @Builder.Default
    private Boolean isPublic = false;

    /** 示例图片URL(COS) */
    private String imageUrl;

    /** 图片指纹(SHA256前32位) */
    private String imageHash;

    /** 浏览次数 */
    @Builder.Default
    private Integer viewCount = 0;

    /** 点赞次数 */
    @Builder.Default
    private Integer likeCount = 0;

    /** 复制次数 */
    @Builder.Default
    private Integer copyCount = 0;

    /** 状态: published/pending_review/hidden/reported */
    @Builder.Default
    private String status = "published";

    /** AI+人工审核状态: pending/ai_pass/ai_warn/ai_reject/approved/rejected */
    @TableField("review_status")
    @Builder.Default
    private String reviewStatus = "pending";

    /** AI审核结果JSON */
    private String moderationResult;

    /** 人工审核时间 */
    private LocalDateTime reviewedAt;

    /** 人工审核员ID */
    private Long reviewedBy;

    /** 举报次数 */
    @Builder.Default
    private Integer reportCount = 0;
}