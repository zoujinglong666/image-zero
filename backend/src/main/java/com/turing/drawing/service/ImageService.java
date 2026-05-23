package com.turing.drawing.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.turing.drawing.entity.DrawingTask;
import com.turing.drawing.entity.History;
import com.turing.drawing.mapper.DrawingTaskMapper;
import com.turing.drawing.mapper.HistoryMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 图片服务 — 分析/生成/编辑核心业务逻辑
 * 协调 AiService（AI调用）+ CosService（图片存储）
 *
 * v2.0: 移除历史记录保存，聚焦核心 AI 功能
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImageService {

    private final AiService aiService;
    private final CosService cosService;
    private final DrawingTaskMapper drawingTaskMapper;
    private final HistoryMapper historyMapper;

    // ══════════════════════════════════════════════════════
    //  图片分析
    // ══════════════════════════════════════════════════════

    /**
     * 分析图片，返回反推提示词结果
     */
    public Map<String, Object> analyzeImage(Long userId, String imageUrl, String provider) {
        long startTime = System.currentTimeMillis();

        // 1. 创建轻量任务记录（不存图片数据）
        DrawingTask task = DrawingTask.builder()
                .userId(userId)
                .type("analyze")
                .prompt("[image_analyze]")
                .status("processing")
                .provider(provider != null ? provider : "mimo")
                .build();
        drawingTaskMapper.insert(task);

        try {
            // 2. 调用AI分析（核心！）
            Map<String, Object> analysisResult = aiService.analyzeImage(imageUrl, provider);
            long elapsed = System.currentTimeMillis() - startTime;

            // 3. 更新任务状态（只存状态，不存 base64 数据）
            task.setStatus("completed");
            drawingTaskMapper.updateById(task);

            // 4. 直接返回结果，不保存历史
            return Map.of(
                    "task_id", task.getId(),
                    "elapsed", elapsed,
                    "result", analysisResult.get("result"),
                    "cached", false
            );
        } catch (Exception e) {
            log.error("图片分析失败: taskId={}, error={}", task.getId(), e.getMessage());
            task.setStatus("failed");
            task.setErrorMessage(e.getMessage());
            drawingTaskMapper.updateById(task);
            throw new RuntimeException("图片分析失败: " + e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════
    //  图片生成
    // ══════════════════════════════════════════════════════

    /**
     * 根据提示词生成图片
     */
    public Map<String, Object> generateImage(Long userId, String prompt, Integer width, Integer height,
                                              String model, String provider) {
        DrawingTask task = DrawingTask.builder()
                .userId(userId)
                .type("generate")
                .prompt(prompt.length() > 500 ? prompt.substring(0, 500) : prompt)
                .width(width != null ? width : 1024)
                .height(height != null ? height : 1024)
                .model(model != null ? model : "flux")
                .status("processing")
                .provider(provider != null ? provider : "zhipu")
                .build();
        drawingTaskMapper.insert(task);

        try {
            Map<String, Object> genResult = aiService.generateImage(prompt, width, height, model, provider);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> images = (List<Map<String, Object>>) genResult.get("images");

            task.setStatus("completed");
            drawingTaskMapper.updateById(task);

            return Map.of(
                    "task_id", task.getId(),
                    "images", images
            );
        } catch (Exception e) {
            log.error("图片生成失败: taskId={}, error={}", task.getId(), e.getMessage());
            task.setStatus("failed");
            task.setErrorMessage(e.getMessage());
            drawingTaskMapper.updateById(task);
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════
    //  图片编辑
    // ══════════════════════════════════════════════════════

    /**
     * 编辑图片（基于原图+修改指令）— 核心功能
     */
    public Map<String, Object> editImage(Long userId, String originalImage, String originalPrompt,
                                          Map<String, Object> modifications, String provider) {
        // 1. 轻量任务记录
        DrawingTask task = DrawingTask.builder()
                .userId(userId)
                .type("edit")
                .prompt("[image_edit]")
                .status("processing")
                .provider(provider != null ? provider : "mimo")
                .build();
        drawingTaskMapper.insert(task);

        try {
            // 2. 调用AI编辑（核心！）
            Map<String, Object> editResult = aiService.editImage(originalImage, originalPrompt, modifications, provider);
            String resultUrl = (String) editResult.get("imageUrl");
            String resultPrompt = (String) editResult.get("prompt");

            // 3. 只更新状态，不存 base64 到数据库
            task.setStatus("completed");
            drawingTaskMapper.updateById(task);

            // 4. 直接返回结果
            return Map.of(
                    "task_id", task.getId(),
                    "imageUrl", resultUrl != null ? resultUrl : "",
                    "prompt", resultPrompt != null ? resultPrompt : ""
            );
        } catch (Exception e) {
            log.error("图片编辑失败: taskId={}, error={}", task.getId(), e.getMessage());
            task.setStatus("failed");
            task.setErrorMessage(e.getMessage());
            drawingTaskMapper.updateById(task);
            throw new RuntimeException("图片编辑失败: " + e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════
    //  任务查询 & 历史查询（保留只读接口）
    // ══════════════════════════════════════════════════════

    public DrawingTask getTaskStatus(Long taskId) {
        return drawingTaskMapper.selectById(taskId);
    }

    public List<History> listUserHistory(Long userId, int limit) {
        LambdaQueryWrapper<History> wrapper = new LambdaQueryWrapper<History>()
                .eq(History::getUserId, userId)
                .orderByDesc(History::getCreatedAt)
                .last("LIMIT " + limit);
        return historyMapper.selectList(wrapper);
    }
}
