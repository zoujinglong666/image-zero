package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 社区举报实体
 * 对应表: community_reports
 */
@TableName("community_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityReport extends BaseEntity {

    /** 被举报的提示词ID */
    private Long promptId;

    /** 举报人ID */
    private Long reporterId;

    /** 举报原因: spam/inappropriate/copyright/other */
    @Builder.Default
    private String reason = "other";

    /** 举报描述 */
    private String description;

    /** 状态: pending/resolved/dismissed */
    @Builder.Default
    private String status = "pending";
}