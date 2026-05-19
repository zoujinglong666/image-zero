package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.turing.drawing.dto.response.PageResult;
import com.turing.drawing.entity.*;
import com.turing.drawing.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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
     * 每日精选 - 从社区取点赞最多的作品
     */
    public List<UserPrompt> getDailyPicks(int limit) {
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getIsPublic, true)
               .eq(UserPrompt::getStatus, "published")
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
     * 本周热门排行 - 社区点赞Top10
     */
    public List<UserPrompt> getWeeklyHot(int limit) {
        LocalDateTime weekStart = LocalDateTime.now().minusDays(7);
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getIsPublic, true)
               .eq(UserPrompt::getStatus, "published")
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
     * 最新动态 - 社区实时更新流
     */
    public PageResult<UserPrompt> getLatestPosts(int pageSize) {
        Page<UserPrompt> p = new Page<>(1, pageSize);
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getIsPublic, true)
               .eq(UserPrompt::getStatus, "published")
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
     * 获取挑战的投稿列表
     */
    public PageResult<ChallengeSubmission> listChallengeSubmissions(Long challengeId, int page, int pageSize) {
        Page<ChallengeSubmission> p = new Page<>(page, pageSize);
        LambdaQueryWrapper<ChallengeSubmission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChallengeSubmission::getChallengeId, challengeId)
               .orderByDesc(ChallengeSubmission::getLikeCount)
               .orderByDesc(ChallengeSubmission::getCreatedAt);
        IPage<ChallengeSubmission> result = submissionMapper.selectPage(p, wrapper);
        return PageResult.of(result);
    }

    /**
     * 提交挑战作品
     */
    public Long submitChallengeWork(Long challengeId, Long userId, String title,
                                     String promptText, String imageUrl) {
        // 检查是否已投稿
        LambdaQueryWrapper<ChallengeSubmission> existsWrapper = new LambdaQueryWrapper<>();
        existsWrapper.eq(ChallengeSubmission::getChallengeId, challengeId)
                     .eq(ChallengeSubmission::getUserId, userId);
        if (submissionMapper.selectCount(existsWrapper) > 0) {
            throw new RuntimeException("您已参与此挑战，不能重复投稿");
        }

        ChallengeSubmission submission = ChallengeSubmission.builder()
                .challengeId(challengeId)
                .userId(userId)
                .title(title)
                .promptText(promptText)
                .imageUrl(imageUrl)
                .likeCount(0)
                .build();
        submissionMapper.insert(submission);

        // 递增参与人数
        challengeMapper.incrementParticipantCount(challengeId);

        return submission.getId();
    }

    /**
     * 为挑战作品点赞
     */
    public void likeSubmission(Long submissionId) {
        submissionMapper.incrementLikeCount(submissionId);
    }
}