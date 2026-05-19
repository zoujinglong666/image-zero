package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.turing.drawing.entity.Notification;
import com.turing.drawing.mapper.NotificationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 消息推送服务
 * 支持微信小程序订阅消息 + 站内信通知（数据库持久化）
 * 场景：AI分析完成、挑战结果、VIP到期提醒、系统公告
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationMapper notificationMapper;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;

    @Value("${wechat.mini-program-app-id:}")
    private String appId;

    @Value("${wechat.mini-program-app-secret:}")
    private String appSecret;

    /** 微信access_token缓存 */
    private volatile String cachedAccessToken;
    private volatile long tokenExpireAt = 0;

    // ══════════════════════════════════════════════════════
    //  微信订阅消息推送
    // ══════════════════════════════════════════════════════

    /**
     * 推送AI分析完成通知
     *
     * @param openid      用户微信openid
     * @param style       识别出的风格
     * @param promptCn    中文提示词（截断）
     */
    public boolean pushAnalyzeComplete(String openid, String style, String promptCn) {
        Map<String, Object> data = Map.of(
                "thing1", Map.of("value", truncate(style, 20)),
                "thing2", Map.of("value", truncate(promptCn, 20)),
                "time3", Map.of("value", formatNow())
        );
        return sendWxSubscribeMessage(openid, "analyze_complete_template_id", data);
    }

    /**
     * 推送挑战结果通知
     *
     * @param openid         用户微信openid
     * @param challengeTitle 挑战标题
     * @param result         结果描述
     */
    public boolean pushChallengeResult(String openid, String challengeTitle, String result) {
        Map<String, Object> data = Map.of(
                "thing1", Map.of("value", truncate(challengeTitle, 20)),
                "thing2", Map.of("value", truncate(result, 20)),
                "time3", Map.of("value", formatNow())
        );
        return sendWxSubscribeMessage(openid, "challenge_result_template_id", data);
    }

    /**
     * 推送VIP到期提醒
     *
     * @param openid   用户微信openid
     * @param plan     当前套餐
     * @param expireAt 到期时间
     */
    public boolean pushVipExpiring(String openid, String plan, String expireAt) {
        Map<String, Object> data = Map.of(
                "thing1", Map.of("value", plan + "会员即将到期"),
                "thing2", Map.of("value", truncate(expireAt, 20)),
                "time3", Map.of("value", formatNow())
        );
        return sendWxSubscribeMessage(openid, "vip_expiring_template_id", data);
    }

    /**
     * 推送系统公告
     *
     * @param openid  用户微信openid
     * @param title   公告标题
     * @param content 公告内容
     */
    public boolean pushSystemNotice(String openid, String title, String content) {
        Map<String, Object> data = Map.of(
                "thing1", Map.of("value", truncate(title, 20)),
                "thing2", Map.of("value", truncate(content, 20)),
                "time3", Map.of("value", formatNow())
        );
        return sendWxSubscribeMessage(openid, "system_notice_template_id", data);
    }

    // ══════════════════════════════════════════════════════
    //  站内信（数据库持久化）
    // ══════════════════════════════════════════════════════

    /**
     * 发送站内信
     *
     * @param userId  接收用户ID
     * @param type    通知类型: system/ai_result/challenge/vip/social
     * @param title   标题
     * @param content 内容
     */
    public void sendInAppNotification(Long userId, String type, String title, String content) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .content(content)
                .isRead(false)
                .build();
        notificationMapper.insert(notification);
        log.debug("[站内信] userId={}, type={}, title={}", userId, type, title);
    }

    /**
     * 获取用户站内信列表
     *
     * @param userId 用户ID
     * @param limit  数量限制
     * @return 通知列表（最新在前）
     */
    public List<Notification> getInbox(Long userId, int limit) {
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .orderByDesc(Notification::getCreatedAt)
                .last("LIMIT " + Math.max(1, Math.min(limit, 100)));
        return notificationMapper.selectList(wrapper);
    }

    /**
     * 获取未读通知数量
     */
    public int getUnreadCount(Long userId) {
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(Notification::getIsRead, false);
        return Math.toIntExact(notificationMapper.selectCount(wrapper));
    }

    /**
     * 标记全部已读
     */
    public void markAllRead(Long userId) {
        notificationMapper.markAllRead(userId);
    }

    /**
     * 标记单条已读
     */
    public void markRead(Long userId, long notificationId) {
        notificationMapper.markRead(userId, notificationId);
    }

    // ══════════════════════════════════════════════════════
    //  批量推送（运营场景）
    // ══════════════════════════════════════════════════════

    /**
     * 批量推送站内信（全员公告）
     *
     * @param userIds 用户ID列表
     * @param title   公告标题
     * @param content 公告内容
     */
    public void broadcastInApp(List<Long> userIds, String title, String content) {
        List<Notification> notifications = userIds.stream()
                .map(uid -> Notification.builder()
                        .userId(uid)
                        .type("system")
                        .title(title)
                        .content(content)
                        .isRead(false)
                        .build())
                .collect(Collectors.toList());

        // 批量插入
        for (Notification n : notifications) {
            notificationMapper.insert(n);
        }
        log.info("[广播] 站内信已推送: 收件人={}, 标题={}", userIds.size(), title);
    }

    // ══════════════════════════════════════════════════════
    //  微信订阅消息底层实现
    // ══════════════════════════════════════════════════════

    /**
     * 发送微信订阅消息
     *
     * @param openid      接收用户openid
     * @param templateId  消息模板ID
     * @param data        模板数据
     * @return 是否发送成功
     */
    private boolean sendWxSubscribeMessage(String openid, String templateId, Map<String, Object> data) {
        if (appId == null || appId.isBlank() || appSecret == null || appSecret.isBlank()) {
            log.warn("[微信推送] appid/secret 未配置，跳过推送: openid={}", openid);
            return false;
        }

        try {
            String accessToken = getAccessToken();
            if (accessToken == null) {
                log.error("[微信推送] 获取access_token失败");
                return false;
            }

            Map<String, Object> body = new HashMap<>();
            body.put("touser", openid);
            body.put("template_id", templateId);
            body.put("data", data);
            body.put("page", "pages/index/index");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

            String url = String.format(
                    "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=%s", accessToken);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            int errcode = root.path("errcode").asInt(0);

            if (errcode == 0) {
                log.info("[微信推送] 成功: openid={}, template={}", openid, templateId);
                return true;
            } else {
                log.warn("[微信推送] 失败: errcode={}, errmsg={}", errcode, root.path("errmsg").asText());
                return false;
            }
        } catch (Exception e) {
            log.error("[微信推送] 异常: openid={}, error={}", openid, e.getMessage());
            return false;
        }
    }

    /**
     * 获取微信access_token（带缓存）
     */
    private String getAccessToken() {
        long now = System.currentTimeMillis();
        if (cachedAccessToken != null && now < tokenExpireAt) {
            return cachedAccessToken;
        }

        try {
            String url = String.format(
                    "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
                    appId, appSecret);

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());

            int errcode = root.path("errcode").asInt(0);
            if (errcode != 0) {
                log.error("[微信Token] 获取失败: errcode={}, errmsg={}", errcode, root.path("errmsg").asText());
                return null;
            }

            cachedAccessToken = root.path("access_token").asText();
            int expiresIn = root.path("expires_in").asInt(7200);
            tokenExpireAt = now + (expiresIn - 300) * 1000L;

            log.info("[微信Token] 刷新成功，有效期{}秒", expiresIn);
            return cachedAccessToken;
        } catch (Exception e) {
            log.error("[微信Token] 获取异常: {}", e.getMessage());
            return null;
        }
    }

    // ══════════════════════════════════════════════════════
    //  工具方法
    // ══════════════════════════════════════════════════════

    private String truncate(String s, int maxLen) {
        if (s == null) return "";
        return s.length() > maxLen ? s.substring(0, maxLen) + "…" : s;
    }

    private String formatNow() {
        return java.time.LocalDateTime.now().format(
                java.time.format.DateTimeFormatter.ofPattern("yyyy年MM月dd日 HH:mm"));
    }
}