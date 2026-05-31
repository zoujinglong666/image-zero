package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.DailyTaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 每日任务控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/daily")
@RequiredArgsConstructor
public class DailyTaskController {

    private final DailyTaskService dailyTaskService;

    /** POST /api/daily/checkin — 每日签到 */
    @PostMapping("/checkin")
    public ApiResponse<Map<String, Object>> checkin(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.getId() == null || principal.getId() <= 0) {
            return ApiResponse.error(401, "请先登录");
        }
        return ApiResponse.success(dailyTaskService.checkin(principal.getId()));
    }

    /** GET /api/daily/status — 今日签到状态 */
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> status(@AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : 0L;
        return ApiResponse.success(dailyTaskService.getTodayStatus(userId));
    }
}
