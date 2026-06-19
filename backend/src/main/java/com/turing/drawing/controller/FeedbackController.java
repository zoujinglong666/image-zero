package com.turing.drawing.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.entity.Feedback;
import com.turing.drawing.mapper.FeedbackMapper;
import com.turing.drawing.security.UserPrincipal;
import jakarta.annotation.Resource;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户反馈建议
 */
@Slf4j
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    @Resource
    private FeedbackMapper feedbackMapper;

    /**
     * 提交反馈
     * POST /api/feedback
     * { type: "suggestion"|"bug_report", content: "...", contact?: "..." }
     */
    @PostMapping
    public ApiResponse<?> submit(@RequestBody FeedbackRequest req,
                                  @AuthenticationPrincipal UserPrincipal principal) {
        if (req.getContent() == null || req.getContent().trim().length() < 5) {
            return ApiResponse.error("反馈内容至少需要5个字");
        }
        if (req.getContent().length() > 1000) {
            return ApiResponse.error("反馈内容不超过1000字");
        }

        Feedback feedback = new Feedback();
        feedback.setType(req.getType() != null ? req.getType() : "suggestion");
        feedback.setContent(req.getContent().trim());
        feedback.setContact(req.getContact());
        feedback.setStatus("pending");
        feedback.setCreatedAt(LocalDateTime.now());
        feedback.setUpdatedAt(LocalDateTime.now());

        // 尝试从 JWT 获取 userId，未登录则为 null
        if (principal != null) {
            feedback.setUserId(principal.getId());
        }

        feedbackMapper.insert(feedback);
        log.info("[Feedback] 新反馈 id={} type={} userId={}", feedback.getId(), feedback.getType(), feedback.getUserId());

        return ApiResponse.success("反馈已提交，感谢您的建议！");
    }

    /**
     * 查询自己的反馈记录
     * GET /api/feedback/mine
     */
    @GetMapping("/mine")
    public ApiResponse<List<Feedback>> mine(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ApiResponse.success(List.of());
        }
        Long userId = principal.getId();

        List<Feedback> list = feedbackMapper.selectList(
            new LambdaQueryWrapper<Feedback>()
                .eq(Feedback::getUserId, userId)
                .orderByDesc(Feedback::getCreatedAt)
                .last("LIMIT 20")
        );
        return ApiResponse.success(list);
    }

    @Data
    public static class FeedbackRequest {
        private String type;
        private String content;
        private String contact;
    }
}
