package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 历史记录实体 (图片分析/生成/编辑)
 * 对应表: history
 */
@TableName("history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class History extends BaseEntity {

    /** 所属用户ID */
    private Long userId;

    /** 类型: analyze/edit/generate */
    private String type;

    /** 原图URL/base64(缩略) */
    private String imageUrl;

    /** 中文提示词 */
    private String promptCn;

    /** 英文提示词 */
    private String promptEn;

    /** 风格 */
    private String style;

    /** 完整分析结果JSON */
    private String resultJson;

    /** 生成的图片URL */
    private String generatedUrl;

    /** 0=未收藏 1=已收藏 */
    @Builder.Default
    private Boolean favorite = false;

    /** 0=私密 1=公开 */
    @Builder.Default
    private Boolean isPublic = false;

    /** 图片宽度 */
    private Integer width;

    /** 图片高度 */
    private Integer height;

    /** 文件大小(字节) */
    private Long fileSize;

    /** 文件格式 */
    private String format;

    /** 前端期望 prompt 字段名（优先返回中文，回退英文） */
    @JsonProperty("prompt")
    public String getPrompt() {
        if (promptCn != null && !promptCn.isBlank()) return promptCn;
        if (promptEn != null && !promptEn.isBlank()) return promptEn;
        return "";
    }

    /** 前端期望 timestamp 字段名（后端 createdAt 别名） */
    @JsonProperty("timestamp")
    public Long getTimestamp() {
        // createdAt 是 LocalDateTime，转为 unix timestamp (毫秒)
        if (getCreatedAt() != null) {
            return getCreatedAt().atZone(java.time.ZoneId.systemDefault())
                    .toInstant().toEpochMilli();
        }
        return null;
    }
}