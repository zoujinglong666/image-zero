package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 提示词互动实体 (浏览/点赞/复制)
 * 对应表: prompt_interactions
 */
@TableName("prompt_interactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromptInteraction extends BaseEntity {

    /** 用户ID (0=游客) */
    private Long userId;

    /** 提示词ID */
    private Long promptId;

    /** 目标类型: library/community */
    private String targetType;

    /** 动作: view/like/copy/community_like */
    private String action;
}