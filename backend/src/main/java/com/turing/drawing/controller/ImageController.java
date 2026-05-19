package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.entity.DrawingTask;
import com.turing.drawing.entity.History;
import com.turing.drawing.mapper.DrawingTaskMapper;
import com.turing.drawing.mapper.HistoryMapper;
import com.turing.drawing.security.UserPrincipal;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 图片AI控制器 - 分析/生成/编辑
 * 对齐前端路由: /api/analyze, /api/generate, /api/edit
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ImageController {

    private final DrawingTaskMapper drawingTaskMapper;
    private final HistoryMapper historyMapper;

    /**
     * 图片分析
     * POST /api/analyze
     * 前端期望: { elapsed, result: ImageAnalysisResult, cached }
     */
    @PostMapping("/analyze")
    public ApiResponse<Map<String, Object>> analyze(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> request) {
        Long userId = principal != null ? principal.getId() : 0L;

        // 创建绘图任务
        DrawingTask task = new DrawingTask();
        task.setUserId(userId);
        task.setType("analyze");
        task.setInputData(request.toString());
        task.setStatus("processing");
        drawingTaskMapper.insert(task);

        // TODO: 调用AI分析服务，返回分析结果
        return ApiResponse.success(Map.of(
                "task_id", task.getId(),
                "elapsed", 0,
                "result", Map.of(
                        "style", "pending",
                        "styleConfidence", 0,
                        "styleDescription", "分析中...",
                        "elements", List.of(),
                        "layout", "unknown",
                        "layoutDescription", "",
                        "colorScheme", List.of(),
                        "primaryColor", "",
                        "prompt", Map.of("chinese", "", "english", "", "keywords", List.of())
                ),
                "cached", false
        ));
    }

    /**
     * 图片生成
     * POST /api/generate
     * 前端期望: { images: [{ url, revised_prompt }] }
     */
    @PostMapping("/generate")
    public ApiResponse<Map<String, Object>> generate(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> request) {
        Long userId = principal != null ? principal.getId() : 0L;

        DrawingTask task = new DrawingTask();
        task.setUserId(userId);
        task.setType("generate");
        task.setInputData(request.toString());
        task.setStatus("processing");
        drawingTaskMapper.insert(task);

        // TODO: 调用AI生成服务，返回生成结果
        return ApiResponse.success(Map.of(
                "task_id", task.getId(),
                "images", List.of(Map.of(
                        "url", "",
                        "revised_prompt", ""
                ))
        ));
    }

    /**
     * 图片编辑
     * POST /api/edit
     * 前端期望: { imageUrl, prompt }
     */
    @PostMapping("/edit")
    public ApiResponse<Map<String, Object>> edit(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> request) {
        Long userId = principal != null ? principal.getId() : 0L;

        DrawingTask task = new DrawingTask();
        task.setUserId(userId);
        task.setType("edit");
        task.setInputData(request.toString());
        task.setStatus("processing");
        drawingTaskMapper.insert(task);

        // TODO: 调用AI编辑服务，返回编辑结果
        return ApiResponse.success(Map.of(
                "task_id", task.getId(),
                "imageUrl", "",
                "prompt", ""
        ));
    }

    /**
     * 查询任务状态
     * GET /api/task/{id}
     */
    @GetMapping("/task/{id}")
    public ApiResponse<DrawingTask> getTaskStatus(@PathVariable Long id) {
        DrawingTask task = drawingTaskMapper.selectById(id);
        if (task == null) return ApiResponse.error("任务不存在");
        return ApiResponse.success(task);
    }

    /**
     * 获取用户历史记录
     * GET /api/history
     */
    @GetMapping("/history")
    public ApiResponse<List<History>> listHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "20") int limit) {
        Long userId = principal != null ? principal.getId() : 0L;
        LambdaQueryWrapper<History> wrapper = new LambdaQueryWrapper<History>()
                .eq(History::getUserId, userId)
                .orderByDesc(History::getCreatedAt)
                .last("LIMIT " + limit);
        return ApiResponse.success(historyMapper.selectList(wrapper));
    }
}