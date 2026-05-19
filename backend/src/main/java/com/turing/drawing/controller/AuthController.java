package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.security.JwtTokenProvider;
import com.turing.drawing.service.AuthService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * 认证控制器
 * 支持三种登录方式：
 * 1. /api/auth/wechat      — 微信小程序登录 (wx.login → code2Session)
 * 2. /api/auth/wechat-h5   — 微信公众号H5网页授权 (OAuth2回调)
 * 3. /api/auth/guest       — 游客登录 (非微信环境)
 *
 * 辅助端点：
 * - /api/auth/wechat-h5/url — 获取H5网页授权重定向URL
 * - /api/auth/token         — 匿名登录（向后兼容，已废弃）
 * - /api/auth/verify        — 验证令牌有效性
 * - /api/auth/status        — 认证服务状态
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

    // ══════════════════════════════════════════════════════
    //  微信公众号H5网页授权
    // ══════════════════════════════════════════════════════

    /**
     * GET /api/auth/wechat-h5/url — 获取H5网页授权重定向URL
     * 前端调用此接口获取URL后，在微信内浏览器重定向到该URL
     * 用户同意授权后，微信会回调到 redirectUri 并携带code和state参数
     *
     * 参数:
     * - redirectUri: 回调地址（必填，通常是前端的某个页面URL）
     * - state:       防CSRF参数（可选，自动生成）
     * - scope:       snsapi_base（静默授权）或 snsapi_userinfo（需确认，可选）
     */
    @GetMapping("/wechat-h5/url")
    public ApiResponse<Map<String, Object>> getWechatH5AuthUrl(
            @RequestParam String redirectUri,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String scope) {
        try {
            String encodedRedirectUri = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
            String authUrl = authService.getWechatOAuthUrl(encodedRedirectUri, state, scope);
            return ApiResponse.success(Map.of("url", authUrl));
        } catch (IllegalStateException e) {
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * POST /api/auth/wechat-h5 — 微信公众号H5网页授权登录
     * 微信回调后前端拿到code，发送到此接口换取JWT
     *
     * 参数:
     * - code: 微信OAuth2回调返回的授权code
     */
    @PostMapping("/wechat-h5")
    public ApiResponse<Map<String, Object>> wechatH5Login(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ApiResponse.error("缺少授权 code 参数");
        }
        try {
            Map<String, Object> result = authService.wechatH5Login(code);
            return ApiResponse.success(result);
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ApiResponse.error(e.getMessage());
        } catch (RuntimeException e) {
            return ApiResponse.error("微信授权登录失败: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════
    //  游客登录（H5非微信环境）
    // ══════════════════════════════════════════════════════

    /**
     * POST /api/auth/guest — 游客登录
     * 非微信环境（普通浏览器/PC）下使用，功能受限（不能VIP支付等）
     */
    @PostMapping("/guest")
    public ApiResponse<Map<String, Object>> guestLogin() {
        Map<String, Object> result = authService.guestLogin();
        return ApiResponse.success(result);
    }

    /**
     * POST /api/auth/token — 匿名令牌（向后兼容，已废弃）
     * @deprecated 使用 /api/auth/guest 替代
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
        String tokenStr = authHeader.substring(7);
        boolean valid = authService.verifyToken(tokenStr);
        if (valid) {
            Claims claims = jwtTokenProvider.parseToken(tokenStr);
            Long userId = claims != null && claims.get("userId") instanceof Number
                    ? ((Number) claims.get("userId")).longValue() : null;
            String uid = claims != null ? claims.getSubject() : null;
            // 从数据库查询用户真实类型（wechat/guest等）
            String userType = authService.getUserType(userId);
            String userRole = authService.getUserRole(userId);
            return ApiResponse.success(Map.of(
                    "valid", true,
                    "user", Map.of(
                            "type", userType != null ? userType : "guest",
                            "uid", uid != null ? uid : "",
                            "id", userId != null ? String.valueOf(userId) : "",
                            "role", userRole != null ? userRole : "USER"
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