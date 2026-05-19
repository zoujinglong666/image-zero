package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.turing.drawing.entity.User;
import com.turing.drawing.mapper.UserMapper;
import com.turing.drawing.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * 认证服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserMapper userMapper;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 微信登录
     */
    public Map<String, Object> wechatLogin(String code) {
        // TODO: 调用微信 code2Session 获取 openid
        // 此处简化，实际需要调用微信API
        String openid = code; // 临时用code作为openid
        String openidHash = hashSha256(openid);

        Optional<User> userOpt = userMapper.findByOpenidHash(openidHash);
        User user;
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
        }

        userMapper.updateLastLoginAt(user.getId(), LocalDateTime.now());
        String token = jwtTokenProvider.generateToken(user.getId(), user.getUid());
        return Map.of(
                "token", token,
                "expiresIn", String.valueOf(jwtConfig.getExpiration()),
                "user", Map.of("type", user.getType(), "uid", user.getUid())
        );
    }

    /**
     * 匿名登录（开发环境）
     */
    public Map<String, Object> anonymousLogin() {
        String guestId = "guest_" + System.currentTimeMillis();
        String hash = hashSha256(guestId);

        User user = User.builder()
                .uid(hash.substring(0, 12))
                .openidHash(hash)
                .type("guest")
                .isActive(true)
                .build();
        userMapper.insert(user);

        String token = jwtTokenProvider.generateToken(user.getId(), user.getUid());
        return Map.of(
                "token", token,
                "expiresIn", String.valueOf(jwtConfig.getExpiration()),
                "user", Map.of("type", "guest", "uid", user.getUid())
        );
    }

    /**
     * 验证 Token
     */
    public boolean verifyToken(String token) {
        return jwtTokenProvider.validateToken(token);
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