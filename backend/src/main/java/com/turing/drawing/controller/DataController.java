package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.dto.response.PageResult;
import com.turing.drawing.entity.History;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.DataService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 数据控制器 - 历史记录/偏好/用户信息
 * 对齐前端路由: /api/data/history, /api/data/preferences, /api/data/profile
 */
@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
public class DataController {

    private final DataService dataService;

    // ── 历史记录 ──

    @GetMapping("/history")
    public ApiResponse<PageResult<History>> listHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean favorite,
            @RequestParam(required = false) String keyword) {
        Long userId = principal != null ? principal.getId() : 0L;
        PageResult<History> result = dataService.listHistory(userId, page, pageSize, type, favorite, keyword);
        return ApiResponse.success(result);
    }

    @PostMapping("/history")
    public ApiResponse<Map<String, Object>> createHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody History history) {
        if (principal != null) history.setUserId(principal.getId());
        Long id = dataService.createHistory(history);
        return ApiResponse.success(Map.of("id", id));
    }

    @PutMapping("/history/{id}/favorite")
    public ApiResponse<Map<String, Object>> toggleFavorite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        boolean fav = dataService.toggleFavorite(id, principal.getId());
        return ApiResponse.success(Map.of("id", id, "favorite", fav));
    }

    @DeleteMapping("/history/{id}")
    public ApiResponse<Void> deleteHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        dataService.deleteHistory(id, principal.getId());
        return ApiResponse.success();
    }

    @DeleteMapping("/history")
    public ApiResponse<Map<String, Object>> clearAllHistory(
            @AuthenticationPrincipal UserPrincipal principal) {
        int deleted = dataService.clearAllHistory(principal.getId());
        return ApiResponse.success(Map.of("deleted", deleted));
    }

    // ── 用户偏好 ──

    @GetMapping("/preferences")
    public ApiResponse<Map<String, String>> getPreferences(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 0L;
        Map<String, String> prefs = dataService.getPreferences(userId);
        return ApiResponse.success(prefs);
    }

    @PutMapping("/preferences")
    public ApiResponse<Map<String, String>> updatePreferences(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> prefs) {
        dataService.updatePreferences(principal.getId(), prefs);
        return ApiResponse.success(prefs);
    }

    // ── 用户信息 ──

    @GetMapping("/profile")
    public ApiResponse<Map<String, Object>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 0L;
        Map<String, Object> profile = dataService.getProfile(userId);
        return ApiResponse.success(profile);
    }

    @PutMapping("/profile")
    public ApiResponse<Void> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> fields) {
        dataService.updateProfile(principal.getId(), fields.get("nickname"), fields.get("avatarUrl"));
        return ApiResponse.success();
    }
}