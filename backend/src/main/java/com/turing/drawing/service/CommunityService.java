package com.turing.drawing.service;

import com.turing.drawing.dto.response.ApiResponse;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.turing.drawing.dto.response.PageResult;
import com.turing.drawing.entity.*;
import com.turing.drawing.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 社区服务 - 首页数据/每日精选/热门排行/主题挑战
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityService {

    private final ChallengeMapper challengeMapper;
    private final ChallengeSubmissionMapper submissionMapper;
    private final UserPromptMapper userPromptMapper;
    private final HistoryMapper historyMapper;
    private final PromptLibraryMapper promptLibraryMapper;
    private final ContentModerationService moderationService;

    // ══════════════════════════════════════════
    //  首页聚合数据
    // ══════════════════════════════════════════

    /**
     * 首页聚合数据 - 一次性返回所有首页模块
     */
    public Map<String, Object> getHomeData() {
        Map<String, Object> data = new HashMap<>();

        // 1. 每日精选 - 从社区取点赞最多的5条公开作品
        data.put("dailyPicks", getDailyPicks(5));

        // 2. 本周热门 - 社区点赞Top10
        data.put("weeklyHot", getWeeklyHot(10));

        // 3. 当前挑战
        data.put("activeChallenge", getActiveChallenge());

        // 4. 最新动态 - 最近20条社区作品
        data.put("latestPosts", getLatestPosts(20));

        return data;
    }

    // ══════════════════════════════════════════
    //  每日精选
    // ══════════════════════════════════════════

    /**
     * 每日精选 - 从社区取点赞最多的作品（仅已通过审核的）
     */
    public List<UserPrompt> getDailyPicks(int limit) {
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getIsPublic, true)
               .eq(UserPrompt::getStatus, "published")
               .in(UserPrompt::getReviewStatus, List.of("ai_pass", "approved")) // 仅审核通过
               .isNotNull(UserPrompt::getImageUrl)
               .ne(UserPrompt::getImageUrl, "")
               .orderByDesc(UserPrompt::getLikeCount)
               .orderByDesc(UserPrompt::getCreatedAt)
               .last("LIMIT " + limit);
        return userPromptMapper.selectList(wrapper);
    }

    // ══════════════════════════════════════════
    //  本周热门
    // ══════════════════════════════════════════

    /**
     * 本周热门排行 - 社区点赞Top10（仅已通过审核的）
     */
    public List<UserPrompt> getWeeklyHot(int limit) {
        LocalDateTime weekStart = LocalDateTime.now().minusDays(7);
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getIsPublic, true)
               .eq(UserPrompt::getStatus, "published")
               .in(UserPrompt::getReviewStatus, List.of("ai_pass", "approved")) // 仅审核通过
               .isNotNull(UserPrompt::getImageUrl)
               .ne(UserPrompt::getImageUrl, "")
               .ge(UserPrompt::getCreatedAt, weekStart)
               .orderByDesc(UserPrompt::getLikeCount)
               .orderByDesc(UserPrompt::getViewCount)
               .last("LIMIT " + limit);
        return userPromptMapper.selectList(wrapper);
    }

    // ══════════════════════════════════════════
    //  最新动态
    // ══════════════════════════════════════════

    /**
     * 最新动态 - 社区实时更新流（仅已通过审核的）
     */
    public PageResult<UserPrompt> getLatestPosts(int pageSize) {
        Page<UserPrompt> p = new Page<>(1, pageSize);
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getIsPublic, true)
               .eq(UserPrompt::getStatus, "published")
               .in(UserPrompt::getReviewStatus, List.of("ai_pass", "approved")) // 仅审核通过
               .isNotNull(UserPrompt::getImageUrl)
               .ne(UserPrompt::getImageUrl, "")
               .orderByDesc(UserPrompt::getCreatedAt);
        IPage<UserPrompt> result = userPromptMapper.selectPage(p, wrapper);
        return PageResult.of(result);
    }

    public PageResult<UserPrompt> getLatestPostsPaged(int page, int pageSize) {
        Page<UserPrompt> p = new Page<>(page, pageSize);
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getIsPublic, true)
               .eq(UserPrompt::getStatus, "published")
               .in(UserPrompt::getReviewStatus, List.of("ai_pass", "approved")) // 仅审核通过
               .isNotNull(UserPrompt::getImageUrl)
               .ne(UserPrompt::getImageUrl, "")
               .orderByDesc(UserPrompt::getCreatedAt);
        IPage<UserPrompt> result = userPromptMapper.selectPage(p, wrapper);
        return PageResult.of(result);
    }

    // ══════════════════════════════════════════
    //  主题挑战
    // ══════════════════════════════════════════

    /**
     * 获取当前活跃挑战
     */
    public Challenge getActiveChallenge() {
        LambdaQueryWrapper<Challenge> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Challenge::getStatus, "active")
               .le(Challenge::getStartAt, LocalDateTime.now())
               .ge(Challenge::getEndAt, LocalDateTime.now())
               .orderByAsc(Challenge::getSortOrder)
               .last("LIMIT 1");
        return challengeMapper.selectOne(wrapper);
    }

    /**
     * 获取所有挑战列表
     */
    public List<Challenge> listChallenges() {
        LambdaQueryWrapper<Challenge> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(Challenge::getSortOrder)
               .orderByDesc(Challenge::getCreatedAt);
        return challengeMapper.selectList(wrapper);
    }

    /**
     * 获取挑战详情
     */
    public Challenge getChallengeDetail(Long id) {
        return challengeMapper.selectById(id);
    }

    /**
     * 获取挑战的投稿列表（仅已通过审核的）
     */
    public PageResult<ChallengeSubmission> listChallengeSubmissions(Long challengeId, int page, int pageSize) {
        Page<ChallengeSubmission> p = new Page<>(page, pageSize);
        LambdaQueryWrapper<ChallengeSubmission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChallengeSubmission::getChallengeId, challengeId)
               .in(ChallengeSubmission::getReviewStatus, List.of("ai_pass", "approved")) // 仅审核通过
               .orderByDesc(ChallengeSubmission::getLikeCount)
               .orderByDesc(ChallengeSubmission::getCreatedAt);
        IPage<ChallengeSubmission> result = submissionMapper.selectPage(p, wrapper);
        return PageResult.of(result);
    }

    // ══════════════════════════════════════════
    //  人工审核管理（Admin API）
    // ══════════════════════════════════════════

    /**
     * 获取待审核列表（user_prompts + challenge_submissions 合并）
     */
    public Map<String, Object> getPendingReviews(int page, int pageSize) {
        Map<String, Object> result = new HashMap<>();

        // 待审核的社区作品
        Page<UserPrompt> promptPage = new Page<>(page, pageSize);
        LambdaQueryWrapper<UserPrompt> pw = new LambdaQueryWrapper<>();
        pw.in(UserPrompt::getReviewStatus, List.of("pending", "ai_warn"))
          .eq(UserPrompt::getIsPublic, true)
          .orderByAsc(UserPrompt::getCreatedAt);
        result.put("pendingPrompts", userPromptMapper.selectPage(promptPage, pw));

        // 待审核的挑战投稿
        Page<ChallengeSubmission> subPage = new Page<>(page, pageSize);
        LambdaQueryWrapper<ChallengeSubmission> sw = new LambdaQueryWrapper<>();
        sw.in(ChallengeSubmission::getReviewStatus, List.of("pending", "ai_warn"))
          .orderByAsc(ChallengeSubmission::getCreatedAt);
        result.put("pendingSubmissions", submissionMapper.selectPage(subPage, sw));

        return result;
    }

    /**
     * 人工审核 — 审核社区作品
     */
    @Transactional
    public boolean reviewUserPrompt(Long promptId, String verdict, Long reviewerId, String reason) {
        LambdaUpdateWrapper<UserPrompt> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(UserPrompt::getId, promptId)
               .set(UserPrompt::getReviewStatus, verdict)
               .set(UserPrompt::getReviewedAt, LocalDateTime.now())
               .set(UserPrompt::getReviewedBy, reviewerId);

        if ("rejected".equals(verdict)) {
            wrapper.set(UserPrompt::getStatus, "hidden");
        } else if ("approved".equals(verdict)) {
            wrapper.set(UserPrompt::getStatus, "published");
        }

        return userPromptMapper.update(null, wrapper) > 0;
    }

    /**
     * 人工审核 — 审核挑战投稿
     */
    @Transactional
    public boolean reviewSubmission(Long submissionId, String verdict, Long reviewerId, String reason) {
        LambdaUpdateWrapper<ChallengeSubmission> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(ChallengeSubmission::getId, submissionId)
               .set(ChallengeSubmission::getReviewStatus, verdict)
               .set(ChallengeSubmission::getReviewedAt, LocalDateTime.now())
               .set(ChallengeSubmission::getReviewedBy, reviewerId);

        if ("rejected".equals(verdict)) {
            wrapper.set(ChallengeSubmission::getRejectReason, reason != null ? reason : "未通过人工审核");
        } else if ("approved".equals(verdict)) {
            // 审核通过后递增参与人数
            ChallengeSubmission sub = submissionMapper.selectById(submissionId);
            if (sub != null && !"ai_pass".equals(sub.getReviewStatus())) {
                challengeMapper.incrementParticipantCount(sub.getChallengeId());
            }
        }

        return submissionMapper.update(null, wrapper) > 0;
    }

    /**
     * 提交挑战作品（含AI内容审核）
     * 审核流程: 文本敏感词扫描 → AI视觉分析 → 综合判定
     */
    @Transactional
    public Long submitChallengeWork(Long challengeId, Long userId, String title,
                                     String promptText, String imageUrl) {
        // 检查是否已投稿
        LambdaQueryWrapper<ChallengeSubmission> existsWrapper = new LambdaQueryWrapper<>();
        existsWrapper.eq(ChallengeSubmission::getChallengeId, challengeId)
                     .eq(ChallengeSubmission::getUserId, userId);
        if (submissionMapper.selectCount(existsWrapper) > 0) {
            throw new RuntimeException("您已参与此挑战，不能重复投稿");
        }

        // ── AI 内容审核 ──
        ContentModerationService.ModerationResult modResult = moderationService.moderateChallengeSubmission(title, promptText, imageUrl);

        String reviewStatus = modResult.toReviewStatus();
        String rejectReason = null;

        if (modResult.isReject()) {
            log.warn("[社区投稿] ❌ 作品被AI拒绝: userId={}, reason={}", userId, modResult.reason);
            throw new RuntimeException("投稿未通过安全审核: " + modResult.reason);
        }
        if (modResult.isWarn()) {
            log.info("[社区投稿] ⚠️ 作品进入人工复审: userId={}, reason={}", userId, modResult.reason);
            reviewStatus = "ai_warn"; // 需要人工复审才能展示
        }
        if (modResult.isPass()) {
            reviewStatus = "ai_pass"; // 自动通过，可直接展示
            log.info("[社区投稿] ✅ 作品AI审核通过: userId={}", userId);
        }

        ChallengeSubmission submission = ChallengeSubmission.builder()
                .challengeId(challengeId)
                .userId(userId)
                .title(title)
                .promptText(promptText)
                .imageUrl(imageUrl)
                .reviewStatus(reviewStatus)          // 新增：审核状态
                .moderationResult(modResult.toJson(new com.fasterxml.jackson.databind.ObjectMapper())) // 新增：审核详情JSON
                .rejectReason(rejectReason)
                .likeCount(0)
                .build();
        submissionMapper.insert(submission);

        // 递增参与人数（仅审核通过时）
        if ("ai_pass".equals(reviewStatus)) {
            challengeMapper.incrementParticipantCount(challengeId);
        } else {
            log.info("[社区投稿] 投稿已提交但需人工复审，暂不增加参与人数");
        }

        return submission.getId();
    }

    /**
     * 为挑战作品点赞
     */
    public void likeSubmission(Long submissionId) {
        submissionMapper.incrementLikeCount(submissionId);
    }
}