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
 * 协调 AiService（AI调用）+ CosService（图片存储）+ HistoryMapper（记录持久化）
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
     *
     * @param userId    用户ID（0=匿名）
     * @param imageUrl  图片URL或base64
     * @param provider  AI服务商（openai/gemini），null则自动选择
     * @return 分析结果Map，对齐前端 ImageAnalysisResult 格式
     */
    public Map<String, Object> analyzeImage(Long userId, String imageUrl, String provider) {
        long startTime = System.currentTimeMillis();

        // 1. 创建任务记录
        DrawingTask task = DrawingTask.builder()
                .userId(userId)
                .type("analyze")
                .prompt(imageUrl.length() > 500 ? imageUrl.substring(0, 500) : imageUrl)
                .status("processing")
                .provider(provider != null ? provider : "openai")
                .build();
        drawingTaskMapper.insert(task);

        try {
            // 2. 调用AI分析
            Map<String, Object> analysisResult = aiService.analyzeImage(imageUrl, provider);
            long elapsed = System.currentTimeMillis() - startTime;

            // 3. 更新任务状态
            task.setStatus("completed");
            task.setResultUrl((String) analysisResult.get("imageUrl"));
            drawingTaskMapper.updateById(task);

            // 4. 保存历史记录
            saveHistory(userId, "analyze", imageUrl, analysisResult);

            // 5. 返回对齐前端格式的结果
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
     *
     * @param userId    用户ID
     * @param prompt    提示词
     * @param width     宽度
     * @param height    高度
     * @param model     模型名
     * @param provider  AI服务商
     * @return 生成结果 { task_id, images: [{ url, revised_prompt }] }
     */
    public Map<String, Object> generateImage(Long userId, String prompt, Integer width, Integer height,
                                              String model, String provider) {
        // 1. 创建任务记录
        DrawingTask task = DrawingTask.builder()
                .userId(userId)
                .type("generate")
                .prompt(prompt)
                .width(width != null ? width : 1024)
                .height(height != null ? height : 1024)
                .model(model != null ? model : "flux")
                .status("processing")
                .provider(provider != null ? provider : "openai")
                .build();
        drawingTaskMapper.insert(task);

        try {
            // 2. 调用AI生成
            Map<String, Object> genResult = aiService.generateImage(prompt, width, height, model, provider);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> images = (List<Map<String, Object>>) genResult.get("images");

            // 3. 更新任务状态
            task.setStatus("completed");
            if (!images.isEmpty()) {
                task.setResultUrl((String) images.get(0).get("url"));
            }
            drawingTaskMapper.updateById(task);

            // 4. 保存历史记录
            if (!images.isEmpty()) {
                String generatedUrl = (String) images.get(0).get("url");
                saveGenerationHistory(userId, prompt, generatedUrl);
            }

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
     * 编辑图片（基于原图+修改指令）
     *
     * @param userId       用户ID
     * @param originalImage 原图URL
     * @param originalPrompt 原提示词
     * @param modifications 修改指令Map
     * @param provider     AI服务商
     * @return 编辑结果 { task_id, imageUrl, prompt }
     */
    public Map<String, Object> editImage(Long userId, String originalImage, String originalPrompt,
                                          Map<String, Object> modifications, String provider) {
        // 1. 创建任务记录
        DrawingTask task = DrawingTask.builder()
                .userId(userId)
                .type("edit")
                .prompt(originalPrompt)
                .status("processing")
                .provider(provider != null ? provider : "openai")
                .build();
        drawingTaskMapper.insert(task);

        try {
            // 2. 调用AI编辑
            Map<String, Object> editResult = aiService.editImage(originalImage, originalPrompt, modifications, provider);
            String resultUrl = (String) editResult.get("imageUrl");
            String resultPrompt = (String) editResult.get("prompt");

            // 3. 更新任务状态
            task.setStatus("completed");
            task.setResultUrl(resultUrl);
            drawingTaskMapper.updateById(task);

            // 4. 保存历史记录
            saveHistory(userId, "edit", originalImage, editResult);

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
    //  任务查询
    // ══════════════════════════════════════════════════════

    /**
     * 查询任务状态
     */
    public DrawingTask getTaskStatus(Long taskId) {
        return drawingTaskMapper.selectById(taskId);
    }

    /**
     * 获取用户历史记录
     */
    public List<History> listUserHistory(Long userId, int limit) {
        LambdaQueryWrapper<History> wrapper = new LambdaQueryWrapper<History>()
                .eq(History::getUserId, userId)
                .orderByDesc(History::getCreatedAt)
                .last("LIMIT " + limit);
        return historyMapper.selectList(wrapper);
    }

    // ══════════════════════════════════════════════════════
    //  内部方法
    // ══════════════════════════════════════════════════════

    private void saveHistory(Long userId, String type, String imageUrl, Map<String, Object> result) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> promptMap = (Map<String, Object>) result.get("prompt");
            String promptCn = promptMap != null ? (String) promptMap.get("chinese") : "";
            String promptEn = promptMap != null ? (String) promptMap.get("english") : "";
            String style = (String) result.get("style");

            History history = History.builder()
                    .userId(userId)
                    .type(type)
                    .imageUrl(imageUrl.length() > 2000 ? imageUrl.substring(0, 2000) : imageUrl)
                    .promptCn(promptCn)
                    .promptEn(promptEn)
                    .style(style)
                    .build();
            historyMapper.insert(history);
        } catch (Exception e) {
            log.warn("保存历史记录失败: {}", e.getMessage());
        }
    }

    private void saveGenerationHistory(Long userId, String prompt, String generatedUrl) {
        try {
            History history = History.builder()
                    .userId(userId)
                    .type("generate")
                    .promptEn(prompt)
                    .generatedUrl(generatedUrl)
                    .build();
            historyMapper.insert(history);
        } catch (Exception e) {
            log.warn("保存生成历史失败: {}", e.getMessage());
        }
    }
}