package com.turing.drawing.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * JWT配置属性
 */
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
}