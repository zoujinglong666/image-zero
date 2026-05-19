package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 绘图任务实体
 * 对应表: drawing_tasks
 */
@TableName("drawing_tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrawingTask extends BaseEntity {

    /** 所属用户ID */
    private Long userId;

    /** 提示词 */
    private String prompt;

    /** 负面提示词 */
    private String negativePrompt;

    /** 模型名称 */
    private String model;

    /** 图片宽度 */
    private Integer width;

    /** 图片高度 */
    private Integer height;

    /** 任务状态: pending/processing/completed/failed */
    @Builder.Default
    private String status = "pending";

    /** 结果图片URL */
    private String resultUrl;

    /** 错误信息 */
    private String errorMessage;

    /** AI服务商: OPENAI/GEMINI/STABILITY */
    private String provider;

    /** AI服务商返回的任务ID */
    private String providerTaskId;
}