package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 提示词分类实体
 * 对应表: prompt_categories
 * 前端 PromptCategory 接口使用 snake_case 字段名
 */
@TableName("prompt_categories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptCategory extends BaseEntity {

    /** 分类名(中文) */
    private String name;

    /** 英文名 */
    private String nameEn;

    /** 分类图标(emoji) */
    private String icon;

    /** 排序权重(越小越靠前) */
    @Builder.Default
    private Integer sortOrder = 0;

    /** 提示词数量(缓存) */
    @Builder.Default
    private Integer promptCount = 0;
}