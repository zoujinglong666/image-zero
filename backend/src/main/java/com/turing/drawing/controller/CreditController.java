package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.CreditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 积分充值控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;

    /** GET /api/credits/packs — 积分包列表 */
    @GetMapping("/packs")
    public ApiResponse<Map<String, CreditService.CreditPack>> listPacks() {
        return ApiResponse.success(creditService.listPacks());
    }

    /** GET /api/credits/balance — 积分余额 */
    @GetMapping("/balance")
    public ApiResponse<Map<String, Object>> getBalance(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.success(Map.of("balance", 0));
        }
        var credit = creditService.getOrCreateCredit(principal.getId());
        return ApiResponse.success(Map.of("balance", credit.getBalance(), "totalEarned", credit.getTotalEarned(), "totalSpent", credit.getTotalSpent()));
    }

    /** POST /api/credits/order — 创建充值订单 */
    @PostMapping("/order")
    public ApiResponse<Map<String, Object>> createOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> request) {
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.error(401, "请先登录");
        }
        String packId = request.get("packId");
        if (packId == null || packId.isBlank()) return ApiResponse.error("缺少 packId 参数");
        return ApiResponse.success(creditService.createCreditOrder(principal.getId(), packId));
    }
}
