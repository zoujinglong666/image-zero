package com.turing.drawing.config;

import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson 全局配置
 * 保持默认 camelCase 输出（前端 auth/data/image 接口用 camelCase）
 * 特定实体（PromptCategory/PromptLibrary）使用 @JsonNaming 注解单独配置 snake_case
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jsonCustomizer() {
        return builder -> {
            // 保持默认 camelCase，不设置全局 SNAKE_CASE
            // 日期输出为时间戳（前端期望 number）
        };
    }
}