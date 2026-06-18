package com.turing.drawing.security;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 认证用户主体信息
 * 存储在Spring Security上下文中的用户信息
 */
@Data
@AllArgsConstructor
public class UserPrincipal {

    /** 用户ID */
    private Long userId;

    /** 用户名 */
    private String username;

    /** 用户角色: ADMIN / USER */
    private String role;

    /** Controller层兼容方法 */
    public Long getId() {
        return userId;
    }

    /** 兼容旧调用（默认普通用户） */
    public UserPrincipal(Long userId, String username) {
        this.userId = userId;
        this.username = username;
        this.role = "USER";
    }

    /** 是否为管理员 */
    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(role);
    }
}