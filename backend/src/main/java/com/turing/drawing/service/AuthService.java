package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.turing.drawing.entity.User;
import com.turing.drawing.enums.UserRole;
import com.turing.drawing.mapper.UserMapper;
import com.turing.drawing.config.JwtConfig;
import com.turing.drawing.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * 认证服务
 * 支持三种登录方式：
 * 1. 微信小程序登录 (code2Session)
 * 2. 微信公众号H5网页授权登录 (OAuth2)
 * 3. 游客登录 (匿名，H5/非微信环境)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserMapper userMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtConfig jwtConfig;
    private final InviteService inviteService;

    /** 小程序 appid/secret */
    @Value("${wechat.mini-program-app-id:}")
    private String miniProgramAppId;

    @Value("${wechat.mini-program-app-secret:}")
    private String miniProgramAppSecret;

    /** 公众号 appid/secret (H5网页授权) */
    @Value("${wechat.app-id:}")
    private String officialAppId;

    @Value("${wechat.app-secret:}")
    private String officialAppSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ══════════════════════════════════════════════════════
    //  微信小程序登录
    // ══════════════════════════════════════════════════════

    /**
     * 微信小程序登录
     * @param code 微信授权码
     * @param inviteCode 邀请码（可选，从分享链接带入）
     */
    public Map<String, Object> wechatLogin(String code, String inviteCode) {
        // 参数验证
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("授权码不能为空");
        }

        String openid = resolveMiniProgramOpenid(code);
        if (openid == null || openid.isBlank()) {
            throw new RuntimeException("获取微信用户标识失败");
        }

        String openidHash = hashSha256(openid);

        Optional<User> userOpt = userMapper.findByOpenidHash(openidHash);
        User user;
        boolean isNewUser = false;
        if (userOpt.isPresent()) {
            user = userOpt.get();
        } else {
            user = User.builder()
                    .uid(openidHash.substring(0, 12))
                    .openidHash(openidHash)
                    .wechatOpenid(openid)
                    .type("wechat")
                    .isActive(true)
                    .build();
            userMapper.insert(user);
            isNewUser = true;
        }

        // 新用户 + 有邀请码 → 记录邀请关系
        if (isNewUser && inviteCode != null && !inviteCode.isBlank()) {
            inviteService.recordInvite(user.getId(), inviteCode);
        }

        userMapper.updateLastLoginAt(user.getId(), LocalDateTime.now());
        String token = jwtTokenProvider.generateToken(user.getId(), user.getUid(), user.getRole());
        return Map.of(
                "token", token,
                "expiresIn", String.valueOf(jwtConfig.getExpiration()),
                "user", Map.of("type", user.getType(), "uid", user.getUid(), "role", user.getRole())
        );
    }

    // ══════════════════════════════════════════════════════
    //  微信公众号H5网页授权登录
    // ══════════════════════════════════════════════════════

    /**
     * 获取微信公众号网页授权URL
     * 前端重定向到此URL，用户同意后微信回调带code
     *
     * @param redirectUri 授权后回调地址（必须是在公众号后台配置的授权域名下的地址）
     * @param state       防CSRF参数，原样返回
     * @param scope       snsapi_base（静默）或 snsapi_userinfo（需用户确认）
     * @return 微信授权URL
     */
    public String getWechatOAuthUrl(String redirectUri, String state, String scope) {
        if (officialAppId == null || officialAppId.isBlank()) {
            throw new IllegalStateException("微信公众号 app-id 未配置");
        }
        String actualScope = (scope != null && !scope.isBlank()) ? scope : "snsapi_userinfo";
        String actualState = (state != null && !state.isBlank()) ? state : UUID.randomUUID().toString().replace("-", "");
        return String.format(
                "https://open.weixin.qq.com/connect/oauth2/authorize?appid=%s&redirect_uri=%s&response_type=code&scope=%s&state=%s#wechat_redirect",
                officialAppId, redirectUri, actualScope, actualState);
    }

    /**
     * 微信公众号H5网页授权登录
     * 用微信回调的code换取access_token+openid，查找/创建用户，返回JWT
     *
     * @param code 微信回调返回的授权code
     * @return 登录结果 { token, expiresIn, user }
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> wechatH5Login(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("缺少授权code");
        }
        if (officialAppId == null || officialAppId.isBlank() || officialAppSecret == null || officialAppSecret.isBlank()) {
            log.warn("微信公众号 app-id/app-secret 未配置，H5网页授权不可用");
            throw new IllegalStateException("微信公众号未配置，H5登录暂不可用");
        }

        // 1. 用code换取access_token和openid
        String tokenUrl = String.format(
                "https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code",
                officialAppId, officialAppSecret, code);

        Map<String, Object> tokenResp;
        try {
            // 微信接口可能返回 application/json 或 text/plain，用 String 接住再手动解析
            String rawResp = restTemplate.getForObject(tokenUrl, String.class);
            tokenResp = rawResp == null ? null : objectMapper.readValue(rawResp, Map.class);
        } catch (Exception e) {
            log.error("调用微信网页授权token接口异常", e);
            throw new RuntimeException("微信授权失败，请重试");
        }

        if (tokenResp == null || tokenResp.containsKey("errcode")) {
            Object errcode = tokenResp != null ? tokenResp.get("errcode") : -1;
            Object errmsg = tokenResp != null ? tokenResp.get("errmsg") : "未知错误";
            log.error("微信网页授权token失败: errcode={}, errmsg={}", errcode, errmsg);
            throw new RuntimeException("微信授权失败: " + errmsg);
        }

        String openid = (String) tokenResp.get("openid");
        String unionid = (String) tokenResp.get("unionid");
        String accessToken = (String) tokenResp.get("access_token");

        if (openid == null || openid.isBlank()) {
            throw new RuntimeException("微信授权失败：未获取到openid");
        }

        // 2. 尝试用snsapi_userinfo获取用户头像昵称（如果有access_token）
        String nickname = null;
        String avatarUrl = null;
        if (accessToken != null) {
            try {
                String userInfoUrl = String.format(
                        "https://api.weixin.qq.com/sns/userinfo?access_token=%s&openid=%s&lang=zh_CN",
                        accessToken, openid);
                Map<String, Object> userInfoResp = restTemplate.getForObject(userInfoUrl, Map.class);
                if (userInfoResp != null && !userInfoResp.containsKey("errcode")) {
                    nickname = (String) userInfoResp.get("nickname");
                    // 头像字段微信返回headimgurl
                    avatarUrl = (String) userInfoResp.get("headimgurl");
                }
            } catch (Exception e) {
                log.warn("获取微信用户信息失败（不影响登录）: {}", e.getMessage());
            }
        }

        // 3. 查找或创建用户
        String openidHash = hashSha256(openid);
        Optional<User> userOpt = userMapper.findByOpenidHash(openidHash);
        User user;
        if (userOpt.isPresent()) {
            user = userOpt.get();
            // 更新微信信息（如果获取到了）
            if (nickname != null || avatarUrl != null) {
                userMapper.updateWechatInfo(user.getId(), nickname, avatarUrl, unionid);
            }
        } else {
            user = User.builder()
                    .uid(openidHash.substring(0, 12))
                    .openidHash(openidHash)
                    .wechatOpenid(openid)
                    .wechatUnionid(unionid)
                    .wechatNickname(nickname)
                    .wechatAvatarUrl(avatarUrl)
                    .nickname(nickname)
                    .avatarUrl(avatarUrl)
                    .type("wechat")
                    .isActive(true)
                    .build();
            userMapper.insert(user);
        }

        userMapper.updateLastLoginAt(user.getId(), LocalDateTime.now());
        String jwtToken = jwtTokenProvider.generateToken(user.getId(), user.getUid(), user.getRole());
        return Map.of(
                "token", jwtToken,
                "expiresIn", String.valueOf(jwtConfig.getExpiration()),
                "user", Map.of(
                        "type", user.getType(),
                        "uid", user.getUid(),
                        "role", user.getRole(),
                        "nickname", user.getNickname() != null ? user.getNickname() : "",
                        "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
                )
        );
    }

    // ══════════════════════════════════════════════════════
    //  游客登录（H5非微信环境 / 试用）
    // ══════════════════════════════════════════════════════

    /**
     * 游客登录（非微信环境下的H5用户）
     * 生成一个guest用户，限制部分功能（不能VIP支付等）
     */
    public Map<String, Object> guestLogin() {
        String guestId = "guest_" + UUID.randomUUID().toString().replace("-", "");
        String hash = hashSha256(guestId);

        User user = User.builder()
                .uid(hash.substring(0, 12))
                .openidHash(hash)
                .type("guest")
                .nickname("游客")
                .isActive(true)
                .dailyQuota(5)  // 游客每日额度更少
                .build();
        userMapper.insert(user);

        String token = jwtTokenProvider.generateToken(user.getId(), user.getUid(), user.getRole());
        return Map.of(
                "token", token,
                "expiresIn", String.valueOf(jwtConfig.getExpiration()),
                "user", Map.of("type", "guest", "uid", user.getUid(), "role", user.getRole())
        );
    }

    /**
     * 匿名登录（仅开发环境，保留向后兼容）
     * @deprecated 使用 guestLogin 替代
     */
    @Deprecated
    public Map<String, Object> anonymousLogin() {
        return guestLogin();
    }

    /**
     * 验证 Token
     */
    public boolean verifyToken(String token) {
        return jwtTokenProvider.validateToken(token);
    }

    /**
     * 根据用户ID查询用户类型
     */
    public String getUserType(Long userId) {
        if (userId == null) return null;
        User user = userMapper.selectById(userId);
        return user != null ? user.getType() : null;
    }

    /**
     * 根据用户ID查询用户角色
     */
    public String getUserRole(Long userId) {
        if (userId == null) return UserRole.USER.getValue();
        User user = userMapper.selectById(userId);
        return user != null && user.getRole() != null ? user.getRole() : UserRole.USER.getValue();
    }

    /**
     * 调用微信小程序 code2Session 获取 openid
     * 未配置 appid/secret 时直接抛异常，不降级
     */
    @SuppressWarnings("unchecked")
    private String resolveMiniProgramOpenid(String code) {
        // 参数验证
        if (code == null || code.isBlank()) {
            log.warn("微信小程序登录code为空");
            return null;
        }

        // 必须配置 appid/secret，否则无法走真实微信登录
        if (miniProgramAppId == null || miniProgramAppId.isBlank()
                || miniProgramAppSecret == null || miniProgramAppSecret.isBlank()) {
            log.error("微信小程序 appid/secret 未配置，请在 backend/.env 中设置 WECHAT_MINI_PROGRAM_APP_ID 和 WECHAT_MINI_PROGRAM_APP_SECRET");
            throw new IllegalStateException("微信小程序登录未配置，请联系管理员");
        }

        try {
            String url = String.format(
                    "https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
                    miniProgramAppId, miniProgramAppSecret, code);
            // 微信接口可能返回 application/json 或 text/plain，用 String 接住再手动解析
            String rawResp = restTemplate.getForObject(url, String.class);
            Map<String, Object> resp = rawResp == null ? null
                    : objectMapper.readValue(rawResp, Map.class);
            if (resp != null && resp.containsKey("openid")) {
                return (String) resp.get("openid");
            }
            if (resp != null) {
                log.error("微信 code2Session 失败: errcode={}, errmsg={}", resp.get("errcode"), resp.get("errmsg"));
                throw new RuntimeException("微信登录失败: " + resp.get("errmsg"));
            }
            throw new RuntimeException("微信 code2Session 无响应");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("调用微信 code2Session 异常", e);
            throw new RuntimeException("微信登录异常: " + e.getMessage());
        }
    }

    private String hashSha256(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 哈希失败", e);
        }
    }
}