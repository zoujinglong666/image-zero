package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    /** 举报次数 */
    @Builder.Default
    private Integer reportCount = 0;
}