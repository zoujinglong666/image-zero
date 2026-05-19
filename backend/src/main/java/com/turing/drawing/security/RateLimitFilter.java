package com.turing.drawing.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.turing.drawing.config.RateLimiterConfig;
import com.turing.drawing.dto.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 基于IP的请求限流过滤器
 * 使用滑动窗口计数器，纯内存无外部依赖
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterConfig rateLimiterConfig;
    private final ObjectMapper objectMapper;

    /** key: "ip:bucket" → {count, windowStart} */
    private final Map<String, RateBucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String clientIp = resolveClientIp(request);
        String path = request.getServletPath();
        if (path == null || path.isEmpty()) {
            path = request.getRequestURI();
        }
        String bucket = resolveBucket(path);
        String key = clientIp + ":" + bucket;

        int maxRequests = getMaxRequests(bucket);
        int windowSeconds = rateLimiterConfig.getWindowSeconds();

        RateBucket rateBucket = buckets.computeIfAbsent(key, k -> new RateBucket());
        long now = System.currentTimeMillis();

        synchronized (rateBucket) {
            if (now - rateBucket.windowStart > windowSeconds * 1000L) {
                rateBucket.count.set(0);
                rateBucket.windowStart = now;
            }
            int current = rateBucket.count.incrementAndGet();
            if (current > maxRequests) {
                log.warn("限流触发: ip={}, bucket={}, count={}/{}", clientIp, bucket, current, maxRequests);
                sendRateLimitResponse(response);
                return;
            }
        }

        // 设置限流响应头
        response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequests));
        response.setHeader("X-RateLimit-Window", windowSeconds + "s");

        filterChain.doFilter(request, response);
    }

    private void sendRateLimitResponse(HttpServletResponse response) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ApiResponse<?> body = ApiResponse.error(429, "操作过于频繁，请稍后再试");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /**
     * 根据请求路径判断限流桶
     */
    private String resolveBucket(String path) {
        if (path == null) return "default";
        if (path.startsWith("/api/analyze") || path.startsWith("/api/generate") || path.startsWith("/api/edit")) {
            return "ai";
        }
        if (path.startsWith("/api/auth")) {
            return "auth";
        }
        if (path.startsWith("/api/community")) {
            return "community";
        }
        if (path.startsWith("/api/upload") || path.startsWith("/api/image/upload")) {
            return "upload";
        }
        return "default";
    }

    private int getMaxRequests(String bucket) {
        return switch (bucket) {
            case "ai" -> rateLimiterConfig.getAiPerMinute();
            case "auth" -> rateLimiterConfig.getAuthPerMinute();
            case "community" -> rateLimiterConfig.getCommunityPerMinute();
            case "upload" -> rateLimiterConfig.getUploadPerMinute();
            default -> rateLimiterConfig.getCommunityPerMinute(); // 默认使用社区限流值
        };
    }

    private String resolveClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        }
        // 多代理时取第一个
        if (ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    /** 限流桶：计数+窗口起点 */
    private static class RateBucket {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long windowStart = System.currentTimeMillis();
    }
}