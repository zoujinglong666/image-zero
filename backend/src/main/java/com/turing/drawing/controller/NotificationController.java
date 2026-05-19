package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.entity.Notification;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 通知控制器
 * 站内信：inbox / unread / read-all / read/{id}
 */
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
        Long userId = principal != null ? principal.getId() : 0L;
        if (userId == 0) {
            return ApiResponse.success(List.of());
        }
        return ApiResponse.success(notificationService.getInbox(userId, limit));
    }

    /**
     * 获取未读通知数量
     * GET /api/notification/unread
     */
    @GetMapping("/unread")
    public ApiResponse<Map<String, Object>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 0L;
        int count = userId > 0 ? notificationService.getUnreadCount(userId) : 0;
        return ApiResponse.success(Map.of("count", count));
    }

    /**
     * 标记全部已读
     * POST /api/notification/read-all
     */
    @PostMapping("/read-all")
    public ApiResponse<Void> markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 0L;
        if (userId > 0) {
            notificationService.markAllRead(userId);
        }
        return ApiResponse.success();
    }

    /**
     * 标记单条已读
     * POST /api/notification/read/{id}
     */
    @PostMapping("/read/{id}")
    public ApiResponse<Void> markRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable long id) {
        Long userId = principal != null ? principal.getId() : 0L;
        if (userId > 0) {
            notificationService.markRead(userId, id);
        }
        return ApiResponse.success();
    }
}