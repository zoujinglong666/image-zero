package com.turing.drawing.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.turing.drawing.security.JwtAuthenticationFilter;
import com.turing.drawing.security.JsonAuthenticationEntryPoint;

import lombok.RequiredArgsConstructor;

/**
 * Spring Security 安全配置
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 禁用CSRF（使用JWT，不需要CSRF保护）
            .csrf(AbstractHttpConfigurer::disable)
            // 禁用默认登录页
            .formLogin(AbstractHttpConfigurer::disable)
            // 禁用默认登出
            .logout(AbstractHttpConfigurer::disable)
            // 无状态Session管理
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 请求授权配置
            .authorizeHttpRequests(auth -> auth
                // 认证接口 - 无需认证
                .requestMatchers("/api/auth/wechat", "/api/auth/token", "/api/auth/verify", "/api/auth/status").permitAll()
                // 提示词公开接口 - 无需认证（浏览/搜索/分类）
                .requestMatchers("/api/prompt/categories", "/api/prompt/list", "/api/prompt/search", "/api/prompt/{id}").permitAll()
                // 社区公开接口
                .requestMatchers("/api/prompt/community").permitAll()
                // AI接口 - 允许匿名访问（未登录用户可试用）
                .requestMatchers("/api/analyze", "/api/generate", "/api/edit", "/api/task/*").permitAll()
                // Swagger文档
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").permitAll()
                // Actuator健康检查
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // 静态资源
                .requestMatchers("/static/**", "/public/**", "/uploads/**").permitAll()
                // OPTIONS请求（CORS预检）
                .requestMatchers("OPTIONS").permitAll()
                // 其他请求需要认证
                .anyRequest().authenticated())
            // 添加JWT过滤器
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            // 未认证时返回JSON而非重定向
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(jsonAuthenticationEntryPoint));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}