package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 站内信通知实体
 * 对应表: notifications
 */
@TableName("notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification extends BaseEntity {

    /** 接收用户ID */
    private Long userId;

    /** 通知类型: system/ai_result/challenge/vip/social */
    private String type;

    /** 通知标题 */
    private String title;

    /** 通知内容 */
    private String content;

    /** 是否已读 */
    @Builder.Default
    private Boolean isRead = false;
}