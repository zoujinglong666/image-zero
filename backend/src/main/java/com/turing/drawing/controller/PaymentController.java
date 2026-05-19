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
 * 支付与VIP控制器
 * 对齐前端路由: /api/payment/plans, /api/payment/order, /api/payment/callback, /api/vip/status
 */
@Slf4j
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
        try {
            Map<String, PaymentService.VipPlan> plans = paymentService.listPlans();
            return ApiResponse.success(plans != null ? plans : Map.of());
        } catch (Exception e) {
            log.error("获取VIP套餐列表失败: {}", e.getMessage());
            return ApiResponse.success(Map.of());
        }
    }

    /**
     * 创建VIP订阅订单
     * POST /api/payment/order
     */
    @PostMapping("/order")
    public ApiResponse<Map<String, Object>> createOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> request) {
        // 用户认证检查
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.error(401, "请先登录");
        }
        
        // 参数验证
        if (request == null) {
            return ApiResponse.error("请求参数不能为空");
        }
        
        String plan = request.get("plan");
        if (plan == null || plan.isBlank()) {
            return ApiResponse.error("缺少 plan 参数");
        }
        
        // 验证plan参数有效性
        if (!isValidPlan(plan)) {
            return ApiResponse.error("无效的 plan 参数");
        }
        
        try {
            Map<String, Object> result = paymentService.createOrder(principal.getId(), plan);
            return ApiResponse.success(result);
        } catch (IllegalArgumentException e) {
            log.warn("创建订单参数错误: userId={}, plan={}, error={}", principal.getId(), plan, e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("创建订单失败: userId={}, plan={}, error={}", principal.getId(), plan, e.getMessage());
            return ApiResponse.error("创建订单失败，请稍后重试");
        }
    }

    /**
     * 微信支付回调（微信服务器调用）
     * POST /api/payment/callback
     */
    @PostMapping("/callback")
    public String handleCallback(@RequestBody String body) {
        // 参数验证
        if (body == null || body.isBlank()) {
            log.warn("支付回调请求体为空");
            return "{\"code\":1,\"message\":\"invalid_request\"}";
        }
        
        try {
            // TODO: 验证微信支付签名，解析回调数据
            log.info("收到支付回调: {}", body.length() > 100 ? body.substring(0, 100) + "..." : body);
            // 简化处理：直接返回成功
            return "{\"code\":0,\"message\":\"success\"}";
        } catch (Exception e) {
            log.error("处理支付回调异常: {}", e.getMessage());
            return "{\"code\":1,\"message\":\"internal_error\"}";
        }
    }

    /**
     * 获取当前用户VIP状态
     * GET /api/vip/status
     */
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> getVipStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
        // 用户认证检查
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.success(Map.of("vipLevel", 0, "isVip", false, "expireAt", 0, "dailyQuota", 10));
        }
        
        try {
            Map<String, Object> status = paymentService.getUserVipStatus(principal.getId());
            return ApiResponse.success(status != null ? status : 
                Map.of("vipLevel", 0, "isVip", false, "expireAt", 0, "dailyQuota", 10));
        } catch (Exception e) {
            log.error("获取用户VIP状态失败: userId={}, error={}", principal.getId(), e.getMessage());
            return ApiResponse.success(Map.of("vipLevel", 0, "isVip", false, "expireAt", 0, "dailyQuota", 10));
        }
    }

    /**
     * 验证plan参数有效性
     */
    private boolean isValidPlan(String plan) {
        return plan != null && (plan.equals("basic") || plan.equals("pro") || plan.equals("ultimate"));
    }
}