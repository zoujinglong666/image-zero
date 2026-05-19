package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 支付与VIP控制器
 * 对齐前端路由: /api/payment/plans, /api/payment/order, /api/payment/callback, /api/vip/status
 */
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * 获取VIP套餐列表
     * GET /api/payment/plans
     */
    @GetMapping("/plans")
    public ApiResponse<Map<String, PaymentService.VipPlan>> listPlans() {
        return ApiResponse.success(paymentService.listPlans());
    }

    /**
     * 创建VIP订阅订单
     * POST /api/payment/order
     */
    @PostMapping("/order")
    public ApiResponse<Map<String, Object>> createOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> request) {
        if (principal == null) {
            return ApiResponse.error(401, "请先登录");
        }
        String plan = request.get("plan");
        if (plan == null || plan.isBlank()) {
            return ApiResponse.error("缺少 plan 参数");
        }
        Map<String, Object> result = paymentService.createOrder(principal.getId(), plan);
        return ApiResponse.success(result);
    }

    /**
     * 微信支付回调（微信服务器调用）
     * POST /api/payment/callback
     */
    @PostMapping("/callback")
    public String handleCallback(@RequestBody String body) {
        // TODO: 验证微信支付签名，解析回调数据
        // 简化处理：直接返回成功
        return "{\"code\":0,\"message\":\"success\"}";
    }

    /**
     * 获取当前用户VIP状态
     * GET /api/vip/status
     */
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> getVipStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 0L;
        if (userId == 0) {
            return ApiResponse.success(Map.of("vipLevel", 0, "isVip", false, "expireAt", 0, "dailyQuota", 10));
        }
        return ApiResponse.success(paymentService.getUserVipStatus(userId));
    }
}