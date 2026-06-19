package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.dto.response.PageResult;
import com.turing.drawing.entity.Challenge;
import com.turing.drawing.entity.ChallengeSubmission;
import com.turing.drawing.entity.UserPrompt;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 社区控制器 - 首页数据/每日精选/热门排行/主题挑战/最新动态
 * 对齐前端路由: /api/community/*
 */
@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    // ══════════════════════════════════════════
    //  首页聚合数据
    // ══════════════════════════════════════════

    /**
     * 首页聚合数据（一次性返回所有模块）
     * GET /api/community/home
     */
    @GetMapping("/home")
    public ApiResponse<Map<String, Object>> getHomeData() {
        return ApiResponse.success(communityService.getHomeData());
    }

    // ══════════════════════════════════════════
    //  每日精选
    // ══════════════════════════════════════════

    /**
     * 每日精选
     * GET /api/community/daily-picks
     */
    @GetMapping("/daily-picks")
    public ApiResponse<List<UserPrompt>> getDailyPicks(
            @RequestParam(defaultValue = "5") int limit) {
        return ApiResponse.success(communityService.getDailyPicks(limit));
    }

    // ══════════════════════════════════════════
    //  本周热门
    // ══════════════════════════════════════════

    /**
     * 本周热门排行
     * GET /api/community/weekly-hot
     */
    @GetMapping("/weekly-hot")
    public ApiResponse<List<UserPrompt>> getWeeklyHot(
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.success(communityService.getWeeklyHot(limit));
    }

    // ══════════════════════════════════════════
    //  最新动态
    // ══════════════════════════════════════════

    /**
     * 最新动态（分页）
     * GET /api/community/latest
     */
    @GetMapping("/latest")
    public ApiResponse<PageResult<UserPrompt>> getLatestPosts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size) {
        return ApiResponse.success(communityService.getLatestPostsPaged(page, page_size));
    }

    // ══════════════════════════════════════════
    //  主题挑战
    // ══════════════════════════════════════════

    /**
     * 获取当前活跃挑战
     * GET /api/community/challenge/active
     */
    @GetMapping("/challenge/active")
    public ApiResponse<Challenge> getActiveChallenge() {
        return ApiResponse.success(communityService.getActiveChallenge());
    }

    /**
     * 获取所有挑战列表
     * GET /api/community/challenges
     */
    @GetMapping("/challenges")
    public ApiResponse<List<Challenge>> listChallenges() {
        return ApiResponse.success(communityService.listChallenges());
    }

    /**
     * 获取挑战详情
     * GET /api/community/challenges/{id}
     */
    @GetMapping("/challenges/{id}")
    public ApiResponse<Challenge> getChallengeDetail(@PathVariable Long id) {
        Challenge challenge = communityService.getChallengeDetail(id);
        if (challenge == null) return ApiResponse.error("挑战不存在");
        return ApiResponse.success(challenge);
    }

    /**
     * 获取挑战投稿列表
     * GET /api/community/challenges/{id}/submissions
     */
    @GetMapping("/challenges/{id}/submissions")
    public ApiResponse<PageResult<ChallengeSubmission>> listChallengeSubmissions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size) {
        return ApiResponse.success(communityService.listChallengeSubmissions(id, page, page_size));
    }

    /**
     * 提交挑战作品
     * POST /api/community/challenges/{id}/submit
     */
    @PostMapping("/challenges/{id}/submit")
    public ApiResponse<Map<String, Object>> submitChallengeWork(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        if (principal == null) {
            return ApiResponse.error(401, "请先登录后再提交作品");
        }
        Long userId = principal.getId();
        Long submissionId = communityService.submitChallengeWork(
                id, userId,
                body.getOrDefault("title", ""),
                body.getOrDefault("prompt_text", ""),
                body.getOrDefault("image_url", "")
        );
        return ApiResponse.success(Map.of("id", submissionId));
    }

    /**
     * 为挑战作品点赞
     * POST /api/community/submissions/{id}/like
     */
    @PostMapping("/submissions/{id}/like")
    public ApiResponse<Void> likeSubmission(@PathVariable Long id) {
        communityService.likeSubmission(id);
        return ApiResponse.success();
    }

    // ══════════════════════════════════════════
    //  内容审核管理（Admin API）
    // ══════════════════════════════════════════

    /**
     * 获取待审核内容列表
     * GET /api/community/admin/pending-reviews
     */
    @GetMapping("/admin/pending-reviews")
    public ApiResponse<Map<String, Object>> getPendingReviews(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size) {
        return ApiResponse.success(communityService.getPendingReviews(page, page_size));
    }

    /**
     * 人工审核 — 社区作品
     * POST /api/community/admin/review/prompt/{id}
     */
    @PostMapping("/admin/review/prompt/{id}")
    public ApiResponse<Void> reviewPrompt(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String verdict = body.get("verdict");
        String reason = body.getOrDefault("reason", "");
        if (!List.of("approved", "rejected").contains(verdict)) {
            return ApiResponse.error("verdict 必须是 approved 或 rejected");
        }
        Long reviewerId = principal != null ? principal.getId() : 0L;
        boolean ok = communityService.reviewUserPrompt(id, verdict, reviewerId, reason);
        if (!ok) return ApiResponse.error("审核失败，记录不存在");
        return ApiResponse.success();
    }

    /**
     * 人工审核 — 挑战投稿
     * POST /api/community/admin/review/submission/{id}
     */
    @PostMapping("/admin/review/submission/{id}")
    public ApiResponse<Void> reviewSubmission(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String verdict = body.get("verdict");
        String reason = body.getOrDefault("reason", "");
        if (!List.of("approved", "rejected").contains(verdict)) {
            return ApiResponse.error("verdict 必须是 approved 或 rejected");
        }
        Long reviewerId = principal != null ? principal.getId() : 0L;
        boolean ok = communityService.reviewSubmission(id, verdict, reviewerId, reason);
        if (!ok) return ApiResponse.error("审核失败，记录不存在");
        return ApiResponse.success();
    }
}