package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("feedback")
public class Feedback {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    /** feedback / suggestion / bug_report */
    private String type;

    /** 反馈内容 */
    private String content;

    /** 联系方式（可选） */
    private String contact;

    /** pending / replied / resolved / closed */
    private String status;

    /** 管理员回复 */
    private String adminReply;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
