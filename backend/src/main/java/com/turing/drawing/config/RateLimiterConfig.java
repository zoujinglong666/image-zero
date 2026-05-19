package com.turing.drawing.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 限流配置属性
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "rate-limiter")
public class RateLimiterConfig {

    /** AI接口（分析/生成/编辑）每IP每分钟上限 */
    private int aiPerMinute = 10;

    /** 登录接口每IP每分钟上限 */
    private int authPerMinute = 20;

    /** 社区接口每IP每分钟上限 */
    private int communityPerMinute = 60;

    /** 上传接口每IP每分钟上限 */
    private int uploadPerMinute = 15;

    /** 限流时间窗口（秒） */
    private int windowSeconds = 60;
}