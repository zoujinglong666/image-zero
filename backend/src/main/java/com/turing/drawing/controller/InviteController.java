package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.InviteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 邀请裂变控制器
 * 对齐前端路由: /api/invite/**
 */
@Slf4j
@RestController
@RequestMapping("/api/invite")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    /**
     * 获取用户邀请码和统计
     * GET /api/invite/info
     */
    @GetMapping("/info")
    public ApiResponse<Map<String, Object>> getInviteInfo(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.error(401, "请先登录");
        }

        Map<String, Object> stats = inviteService.getInviteStats(principal.getId());
        return ApiResponse.success(stats);
    }

    /**
     * 通过邀请码查询邀请人（前端分享时用于生成分享链接）
     * GET /api/invite/code/{code}
     */
    @GetMapping("/code/{code}")
    public ApiResponse<Map<String, Object>> getInviterByCode(@PathVariable String code) {
        var user = inviteService.findByInviteCode(code);
        if (user == null) {
            return ApiResponse.error("无效的邀请码");
        }
        return ApiResponse.success(Map.of(
                "nickname", user.getNickname() != null ? user.getNickname() : "用户" + user.getId(),
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
        ));
    }
}
