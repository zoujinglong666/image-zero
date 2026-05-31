package com.turing.drawing.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.turing.drawing.enums.UserRole;

import java.time.LocalDateTime;

/**
 * 用户实体
 * 对应表: users
 */
@TableName("users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity {

    /** JWT中的uid (openid SHA256前12位) */
    private String uid;

    /** openid完整SHA256 (微信用户) */
    private String openidHash;

    /** 用户类型: guest/wechat/anonymous */
    private String type;

    /** 用户角色: ADMIN-管理员 / USER-普通用户 */
    @Builder.Default
    private String role = UserRole.USER.getValue();

    /** 昵称 */
    private String nickname;

    /** 头像URL */
    private String avatarUrl;

    /** VIP等级: 0=免费 1=基础 2=专业 3=旗舰 */
    @Builder.Default
    private Integer vipLevel = 0;

    /** VIP到期时间(unix timestamp秒) */
    @Builder.Default
    private Long vipExpireAt = 0L;

    /** 每日免费额度 */
    @Builder.Default
    private Integer dailyQuota = 10;

    /** 微信OpenID(绑定后填充) */
    private String wechatOpenid;

    /** 微信UnionID */
    private String wechatUnionid;

    /** 微信昵称 */
    private String wechatNickname;

    /** 微信头像URL */
    private String wechatAvatarUrl;

    /** 密码哈希(本地用户) */
    private String passwordHash;

    /** 邮箱 */
    private String email;

    /** 是否启用 */
    @TableField("is_active")
    @Builder.Default
    private Boolean isActive = true;

    /** 上次登录时间 */
    private LocalDateTime lastLoginAt;

    /** 个人邀请码 */
    private String inviteCode;

    /** 邀请人用户ID */
    private Long invitedBy;
}