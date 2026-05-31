package com.turing.drawing.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.CreditService;
import com.turing.drawing.service.PaymentService;
import com.turing.drawing.service.WechatPayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/**
 * 支付与VIP控制器
 * 对齐前端路由: /api/payment/plans, /api/payment/order, /api/payment/callback, /api/vip/status
 *
 * 积分充值路由: /api/credits/packs, /api/credits/balance, /api/credits/order
 * （积分回调也走同一条 /api/payment/callback 路径，通过 out_trade_no 前缀区分）
 */
@Slf4j
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final CreditService creditService;
    private final WechatPayService wechatPayService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.error(401, "请先登录");
        }
        if (request == null) {
            return ApiResponse.error("请求参数不能为空");
        }
        String plan = request.get("plan");
        if (plan == null || plan.isBlank()) {
            return ApiResponse.error("缺少 plan 参数");
        }
        if (!isValidPlan(plan)) {
            return ApiResponse.error("无效的 plan 参数");
        }
        try {
            Map<String, Object> result = paymentService.createOrder(principal.getId(), plan);
            return ApiResponse.success(result);
        } catch (IllegalArgumentException e) {
            log.warn("创建订单参数错误: userId={}, plan={}, error={}", principal.getId(), plan, e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (IllegalStateException e) {
            log.error("创建订单失败（配置问题）: userId={}, plan={}, error={}", principal.getId(), plan, e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("创建订单失败: userId={}, plan={}, error={}", principal.getId(), plan, e.getMessage());
            return ApiResponse.error("创建订单失败，请稍后重试");
        }
    }

    /**
     * 微信支付回调（微信服务器调用）
     * POST /api/payment/callback
     *
     * 微信 V3 回调 Header 包含：
     *   Wechatpay-Signature  签名
     *   Wechatpay-Timestamp  时间戳
     *   Wechatpay-Nonce      随机串
     *   Wechatpay-Serial     微信平台证书序列号
     *
     *  根据 out_trade_no 前缀分派：
     *    VIP 开头 → PaymentService.handleVipPaymentCallback(）
     *    CR  开头 → CreditService.handleCreditPaymentCallback(）
     */
    @PostMapping("/callback")
    public String handleCallback(HttpServletRequest request) {
        try {
            // 1. 读取请求体和签名头
            String body = readRequestBody(request);
            if (body == null || body.isBlank()) {
                log.warn("[支付回调] 请求体为空");
                return buildCallbackResponse(400, "invalid_request");
            }

            String signature = request.getHeader("Wechatpay-Signature");
            String timestamp = request.getHeader("Wechatpay-Timestamp");
            String nonce     = request.getHeader("Wechatpay-Nonce");
            String serial    = request.getHeader("Wechatpay-Serial");

            log.info("[支付回调] 收到回调: serial={}, timestamp={}, nonce={}, bodyLen={}",
                    serial, timestamp, nonce, body.length());

            // 2. 验签 + 解密
            Map<String, Object> notifyData = wechatPayService.verifyAndDecryptCallback(
                    body, signature, timestamp, nonce);

            String outTradeNo = (String) notifyData.get("out_trade_no");
            String tradeState = (String) notifyData.get("trade_state");
            String transactionId = (String) notifyData.get("transaction_id");

            log.info("[支付回调] out_trade_no={}, trade_state={}, transaction_id={}",
                    outTradeNo, tradeState, transactionId);

            if (!"SUCCESS".equals(tradeState)) {
                log.info("[支付回调] 订单未支付成功，忽略: trade_state={}", tradeState);
                return buildCallbackResponse(0, "success");   // 仍需返回成功，避免微信重试
            }

            // 3. 根据 out_trade_no 前缀分派处理
            if (outTradeNo != null && outTradeNo.startsWith("VIP")) {
                paymentService.handleVipPaymentCallback(notifyData);
            } else if (outTradeNo != null && outTradeNo.startsWith("CR")) {
                creditService.handleCreditPaymentCallback(notifyData);
            } else {
                log.warn("[支付回调] 未知的 out_trade_no 前缀: {}", outTradeNo);
            }

            // 4. 返回成功给微信（否则微信会重试）
            return buildCallbackResponse(0, "success");

        } catch (SecurityException e) {
            log.error("[支付回调] 签名验证失败: {}", e.getMessage());
            return buildCallbackResponse(401, "sign_verify_failed");
        } catch (Exception e) {
            log.error("[支付回调] 处理异常", e);
            return buildCallbackResponse(500, "internal_error");
        }
    }

    /**
     * 获取当前用户VIP状态
     * GET /api/vip/status
     */
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> getVipStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
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

    // ═════════════════════════════════════════════════════
    //  工具方法
    // ═════════════════════════════════════════════════════

    private String readRequestBody(HttpServletRequest request) {
        try (java.io.BufferedReader reader = request.getReader()) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("[支付回调] 读取请求体失败", e);
            return null;
        }
    }

    /**
     * 构造微信支付回调响应（JSON 格式）
     * 微信要求：{ "code": 0, "message": "success" }
     */
    private String buildCallbackResponse(int code, String message) {
        try {
            return objectMapper.writeValueAsString(Map.of("code", code, "message", message));
        } catch (JsonProcessingException e) {
            return "{\"code\":" + code + ",\"message\":\"" + message + "\"}";
        }
    }

    private boolean isValidPlan(String plan) {
        return plan != null && (plan.equals("basic") || plan.equals("pro") || plan.equals("ultimate"));
    }
}
