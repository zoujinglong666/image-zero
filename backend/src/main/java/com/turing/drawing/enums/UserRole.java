package com.turing.drawing.enums;

/**
 * 用户角色枚举
 * ADMIN - 管理员：可访问管理后台、审核内容、管理用户等
 * USER  - 普通用户：默认角色，正常使用平台功能
 */
public enum UserRole {

    /** 管理员 */
    ADMIN("ADMIN", "管理员"),

    /** 普通用户（默认） */
    USER("USER", "普通用户");

    private final String value;
    private final String label;

    UserRole(String value, String label) {
        this.value = value;
        this.label = label;
    }

    public String getValue() {
        return value;
    }

    public String getLabel() {
        return label;
    }

    /**
     * 从字符串值解析枚举，未知值默认返回 USER
     */
    public static UserRole fromValue(String value) {
        if (value == null) return USER;
        for (UserRole role : values()) {
            if (role.value.equalsIgnoreCase(value)) return role;
        }
        return USER;
    }
}