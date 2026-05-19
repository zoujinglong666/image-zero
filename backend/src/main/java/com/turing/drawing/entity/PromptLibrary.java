package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 提示词库实体 (官方精选)
 * 对应表: prompt_library
 * 前端 PromptItem 接口使用 snake_case 字段名
 */
@TableName("prompt_library")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptLibrary extends BaseEntity {

    /** 分类ID */
    private Long categoryId;

    /** 标题/简短描述 */
    private String title;

    /** 完整提示词内容 */
    private String promptText;

    /** 提示词中文内容 */
    private String contentCn;

    /** SHA256去重哈希 */
    private String promptHash;

    /** 来源仓库 */
    private String source;

    /** 原始链接 */
    private String sourceUrl;

    /** 原始作者 */
    private String author;

    /** 语言: zh/en/ja/mixed */
    @Builder.Default
    private String language = "zh";

    /** 状态: published/draft */
    @Builder.Default
    private String status = "published";

    /** 0=普通 1=含参数模板 */
    @TableField("is_template")
    @Builder.Default
    private Boolean isTemplate = false;

    /** 逗号分隔标签 */
    private String tags;

    /** 排序权重 */
    @Builder.Default
    private Integer sortOrder = 0;

    /** 浏览次数 */
    @Builder.Default
    private Integer viewCount = 0;

    /** 点赞次数 */
    @Builder.Default
    private Integer likeCount = 0;

    /** 复制次数 */
    @Builder.Default
    private Integer copyCount = 0;

    /** 收藏次数 */
    @Builder.Default
    private Integer favoriteCount = 0;
}