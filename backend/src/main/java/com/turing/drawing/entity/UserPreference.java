package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 用户偏好实体 (key-value灵活结构)
 * 对应表: user_preferences
 */
@TableName("user_preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreference extends BaseEntity {

    /** 所属用户ID */
    private Long userId;

    /** 偏好键: theme/language/quality/size/model */
    private String prefKey;

    /** 偏好值 */
    private String prefValue;
}