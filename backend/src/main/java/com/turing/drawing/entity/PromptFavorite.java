package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 提示词收藏实体 (仅官方库)
 * 对应表: prompt_favorites
 */
@TableName("prompt_favorites")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromptFavorite extends BaseEntity {

    /** 用户ID */
    private Long userId;

    /** 提示词ID */
    private Long promptId;
}