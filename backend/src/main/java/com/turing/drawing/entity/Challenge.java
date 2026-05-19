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
 * 主题挑战实体
 * 对应表: challenges
 */
@TableName("challenges")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class Challenge extends BaseEntity {

    /** 挑战标题 */
    private String title;

    /** 挑战描述/规则 */
    private String description;

    /** 封面图URL */
    private String coverImage;

    /** 主题标签，逗号分隔 */
    private String themeTags;

    /** 推荐提示词模板 */
    private String promptHint;

    /** 开始时间 */
    private LocalDateTime startAt;

    /** 结束时间 */
    private LocalDateTime endAt;

    /** 状态: upcoming/active/completed */
    @Builder.Default
    private String status = "upcoming";

    /** 排序权重 */
    @Builder.Default
    private Integer sortOrder = 0;

    /** 参与人数(缓存) */
    @Builder.Default
    private Integer participantCount = 0;
}