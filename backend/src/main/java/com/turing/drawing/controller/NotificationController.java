package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.entity.Notification;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 通知控制器
 * 站内信：inbox / unread / read-all / read/{id}
 */
@Slf4j
@RestController
@RequestMapping("/api/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * 获取站内信列表
     * GET /api/notification/inbox
     */
    @GetMapping("/inbox")
    public ApiResponse<List<Notification>> getInbox(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "20") int limit) {
        // 参数验证
        if (limit <= 0 || limit > 100) {
            limit = 20;
        }
        
        // 用户认证检查
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.success(List.of());
        }
        
        try {
            List<Notification> notifications = notificationService.getInbox(principal.getId(), limit);
            return ApiResponse.success(notifications != null ? notifications : List.of());
        } catch (Exception e) {
            log.error("获取站内信列表失败: userId={}, error={}", principal.getId(), e.getMessage());
            return ApiResponse.success(List.of());
        }
    }

    /**
     * 获取未读通知数量
     * GET /api/notification/unread
     */
    @GetMapping("/unread")
    public ApiResponse<Map<String, Object>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        // 用户认证检查
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.success(Map.of("count", 0));
        }
        
        try {
            int count = notificationService.getUnreadCount(principal.getId());
            return ApiResponse.success(Map.of("count", Math.max(0, count)));
        } catch (Exception e) {
            log.error("获取未读通知数量失败: userId={}, error={}", principal.getId(), e.getMessage());
            return ApiResponse.success(Map.of("count", 0));
        }
    }

    /**
     * 标记全部已读
     * POST /api/notification/read-all
     */
    @PostMapping("/read-all")
    public ApiResponse<Void> markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        // 用户认证检查
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.error(401, "用户未登录");
        }
        
        try {
            notificationService.markAllRead(principal.getId());
            return ApiResponse.success();
        } catch (Exception e) {
            log.error("标记全部已读失败: userId={}, error={}", principal.getId(), e.getMessage());
            return ApiResponse.error("操作失败，请稍后重试");
        }
    }

    /**
     * 标记单条已读
     * POST /api/notification/read/{id}
     */
    @PostMapping("/read/{id}")
    public ApiResponse<Void> markRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable long id) {
        // 参数验证
        if (id <= 0) {
            return ApiResponse.error("无效的通知ID");
        }
        
        // 用户认证检查
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.error(401, "用户未登录");
        }
        
        try {
            notificationService.markRead(principal.getId(), id);
            return ApiResponse.success();
        } catch (Exception e) {
            log.error("标记通知已读失败: userId={}, notificationId={}, error={}", 
                     principal.getId(), id, e.getMessage());
            return ApiResponse.error("操作失败，请稍后重试");
        }
    }
}