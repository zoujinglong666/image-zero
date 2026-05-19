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

    /** Controller层兼容方法 */
    public Long getId() {
        return userId;
    }
}