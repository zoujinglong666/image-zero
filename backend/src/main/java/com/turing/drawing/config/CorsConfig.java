package com.turing.drawing.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

/**
 * 跨域配置
 * 生产环境通过 CORS_ALLOWED_ORIGINS 环境变量限制允许的域名
 * 示例: CORS_ALLOWED_ORIGINS=https://www.image-zero.art,https://image-zero.art
 */
@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // 根据配置决定允许的来源
        if (allowedOrigins != null && !allowedOrigins.isBlank()) {
            // 生产模式：仅允许配置的域名
            for (String origin : allowedOrigins.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty()) {
                    config.addAllowedOrigin(trimmed);
                }
            }
        } else {
            // 开发模式：允许所有来源
            config.addAllowedOriginPattern("*");
        }

        // 允许的请求头
        config.addAllowedHeader("*");
        // 允许的HTTP方法
        config.addAllowedMethod("*");
        // 允许携带凭证
        config.setAllowCredentials(true);
        // 暴露的响应头（前端需要读取）
        config.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        // 预检请求缓存时间
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}