package com.turing.drawing.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;

/**
 * 外部服务健康检查指标
 */
@Component
public class ExternalServicesHealthIndicator implements HealthIndicator {

    @Value("${cos.bucket:}")
    private String cosBucket;

    @Value("${openai.api-key:}")
    private String openaiApiKey;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public Health health() {
        Health.Builder builder = Health.up();
        
        boolean allServicesUp = true;
        
        // 检查COS配置
        if (cosBucket != null && !cosBucket.isEmpty()) {
            builder.withDetail("cos", "Configured");
        } else {
            builder.withDetail("cos", "Not configured");
        }
        
        // 检查OpenAI配置
        if (openaiApiKey != null && !openaiApiKey.isEmpty()) {
            builder.withDetail("openai", "Configured");
        } else {
            builder.withDetail("openai", "Not configured");
        }
        
        // 检查Gemini配置
        if (geminiApiKey != null && !geminiApiKey.isEmpty()) {
            builder.withDetail("gemini", "Configured");
        } else {
            builder.withDetail("gemini", "Not configured");
        }
        
        if (allServicesUp) {
            return builder.build();
        } else {
            return Health.down().build();
        }
    }
}