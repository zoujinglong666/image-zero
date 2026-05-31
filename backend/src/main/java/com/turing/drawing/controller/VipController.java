package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * VIP 状态查询控制器
 * 路径: /api/vip/**
 */
@Slf4j
@RestController
@RequestMapping("/api/vip")
@RequiredArgsConstructor
public class VipController {

    private final PaymentService paymentService;

    /**
     * 获取当前用户VIP状态
     * GET /api/vip/status
     */
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> getStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.success(Map.of(
                    "vipLevel", 0, "isVip", false,
                    "expireAt", 0, "dailyQuota", 10));
        }
        try {
            Map<String, Object> status = paymentService.getUserVipStatus(principal.getId());
            return ApiResponse.success(status != null ? status :
                    Map.of("vipLevel", 0, "isVip", false, "expireAt", 0, "dailyQuota", 10));
        } catch (Exception e) {
            log.error("获取VIP状态失败: userId={}, error={}", principal.getId(), e.getMessage());
            return ApiResponse.success(Map.of(
                    "vipLevel", 0, "isVip", false,
                    "expireAt", 0, "dailyQuota", 10));
        }
    }
}
