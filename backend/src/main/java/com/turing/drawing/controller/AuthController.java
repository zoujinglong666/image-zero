package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.security.JwtTokenProvider;
import com.turing.drawing.service.AuthService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器
 * 对齐前端路由: /api/auth/wechat, /api/auth/token, /api/auth/verify, /api/auth/status
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * POST /api/auth/wechat — 微信小程序登录
     */
    @PostMapping("/wechat")
    public ApiResponse<Map<String, Object>> wechatLogin(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ApiResponse.error("缺少 code 参数");
        }
        Map<String, Object> result = authService.wechatLogin(code);
        return ApiResponse.success(result);
    }

    /**
     * POST /api/auth/token — 匿名令牌（开发环境）
     */
    @PostMapping("/token")
    public ApiResponse<Map<String, Object>> anonymousLogin() {
        Map<String, Object> result = authService.anonymousLogin();
        return ApiResponse.success(result);
    }

    /**
     * GET /api/auth/verify — 验证令牌有效性
     * 返回格式对齐前端 VerifyTokenResult: { valid, user?: { type, uid, id } }
     */
    @GetMapping("/verify")
    public ApiResponse<Map<String, Object>> verifyToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ApiResponse.success(Map.of("valid", false, "error", "未提供 Token"));
        }
        String token = authHeader.substring(7);
        boolean valid = authService.verifyToken(token);
        if (valid) {
            Claims claims = jwtTokenProvider.parseToken(token);
            Long userId = claims != null && claims.get("userId") instanceof Number
                    ? ((Number) claims.get("userId")).longValue() : null;
            String uid = claims != null ? claims.getSubject() : null;
            return ApiResponse.success(Map.of(
                    "valid", true,
                    "user", Map.of(
                            "type", "wechat",
                            "uid", uid != null ? uid : "",
                            "id", userId != null ? String.valueOf(userId) : ""
                    )
            ));
        }
        return ApiResponse.success(Map.of("valid", false, "error", "Token 无效或已过期"));
    }

    /**
     * GET /api/auth/status — 认证服务状态
     * 返回格式对齐前端 AuthStatusResult: { jwt, wechat, anonymousAllowed }
     */
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> authStatus() {
        return ApiResponse.success(Map.of(
                "jwt", true,
                "wechat", true,
                "anonymousAllowed", true
        ));
    }
}