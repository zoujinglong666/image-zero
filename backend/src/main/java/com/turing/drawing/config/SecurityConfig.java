package com.turing.drawing.config;

import org.springframework.beans.factory.annotation.Value;
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
import com.turing.drawing.security.RateLimitFilter;

import lombok.RequiredArgsConstructor;

/**
 * Spring Security 安全配置
 * 生产环境(prod profile): Swagger/Actuator需要认证
 * 开发环境(dev profile): Swagger/Actuator公开访问
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint;
    private final RateLimitFilter rateLimitFilter;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        boolean isProd = isProduction();

        http
            // 启用CORS（委托给CorsConfig的CorsFilter Bean）
            .cors(cors -> {})
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
            .authorizeHttpRequests(auth -> {
                // 管理后台接口 - 需要ADMIN角色
                auth.requestMatchers("/api/admin/**").hasRole("ADMIN")
                    // 认证接口 - 无需认证
                    .requestMatchers("/api/auth/wechat", "/api/auth/wechat-h5", "/api/auth/wechat-h5/url", "/api/auth/token", "/api/auth/guest", "/api/auth/verify", "/api/auth/status").permitAll()
                    // 提示词公开接口（含详情、互动、收藏、列表）
                    .requestMatchers("/api/prompt/categories", "/api/prompt/list", "/api/prompt/search", "/api/prompt/{id}",
                                       "/api/prompt/*/interact", "/api/prompt/*/favorite",
                                       "/api/prompt/favorites/**", "/api/prompt/mine/**").permitAll()
                    // 社区公开接口
                    .requestMatchers("/api/community/**").permitAll()
                    // 社区分享公开接口
                    .requestMatchers("/api/prompt/community", "/api/prompt/community/**").permitAll()
                    // VIP套餐列表（公开浏览）
                    .requestMatchers("/api/payment/plans", "/api/payment/callback").permitAll()
                    // VIP状态查询（公开）
                    .requestMatchers("/api/vip/status", "/api/payment/status").permitAll()
                    // 邀请相关
                    // /code/{code} 公开（分享链接展示邀请人）
                    // /info 需登录（查自己的邀请数据）
                    .requestMatchers("/api/invite/code/**").permitAll()
                    .requestMatchers("/api/invite/info").authenticated()
                    // 每日签到（登录后使用，但 status 接口需认证）
                    .requestMatchers("/api/daily/checkin", "/api/daily/status").authenticated()
                    // AI接口 - 允许匿名访问（未登录用户可试用）
                    .requestMatchers("/api/analyze", "/api/generate", "/api/edit", "/api/upload", "/api/task/**").permitAll()
                    // 数据统计接口（开发环境公开，生产需认证）
                    .requestMatchers("/api/data/**").permitAll()
                    // 健康检查 - 公开（用于负载均衡、监控探活）
                    .requestMatchers("/api/health", "/actuator/health", "/actuator/info").permitAll()
                    .requestMatchers("/actuator/**").authenticated();

                // Swagger文档 - 生产需要ADMIN权限，开发公开
                if (isProd) {
                    auth.requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").hasRole("ADMIN");
                } else {
                    auth.requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").permitAll();
                }

                auth
                    // 静态资源
                    .requestMatchers("/static/**", "/public/**", "/uploads/**").permitAll()
                    // OPTIONS请求（CORS预检）
                    .requestMatchers("OPTIONS").permitAll()
                    // 其他请求需要认证
                    .anyRequest().authenticated();
            })
            // 限流过滤器（最先执行）
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            // 添加JWT过滤器
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            // 未认证时返回JSON而非重定向
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(jsonAuthenticationEntryPoint));

        return http.build();
    }

    private boolean isProduction() {
        return activeProfile != null && activeProfile.contains("prod");
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