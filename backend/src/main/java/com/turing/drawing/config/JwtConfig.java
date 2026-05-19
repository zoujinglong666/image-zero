package com.turing.drawing.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * JWT配置属性
 */
@Slf4j
@Data
@Configuration
@ConfigurationProperties(prefix = "jwt")
public class JwtConfig {

    /** JWT签名密钥 */
    private String secret;

    /** 访问Token过期时间（毫秒），默认2小时 */
    private long expiration = 7200000L;

    /** 刷新Token过期时间（毫秒），默认7天 */
    private long refreshExpiration = 604800000L;

    /**
     * 启动时校验密钥安全性
     * HMAC-SHA256 要求密钥至少 32 字节 (256 bit)
     */
    @PostConstruct
    public void validateSecret() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT密钥未配置! 请设置环境变量 JWT_SECRET");
        }
        if (secret.length() < 32) {
            throw new IllegalStateException("JWT密钥过短! HMAC-SHA256 要求至少32字符, 当前: " + secret.length() + "字符");
        }
        if (secret.contains("dev-only") || secret.contains("please-change")) {
            log.warn("⚠️ 检测到开发用JWT密钥! 生产环境必须更换! 请设置环境变量 JWT_SECRET");
        }
    }
}