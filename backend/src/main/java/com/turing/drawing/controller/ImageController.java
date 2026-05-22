package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.entity.DrawingTask;
import com.turing.drawing.entity.History;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.CosService;
import com.turing.drawing.service.ImageService;
import com.turing.drawing.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 图片AI控制器 - 分析/生成/编辑
 * 对齐前端路由: /api/analyze, /api/generate, /api/edit
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;
    private final CosService cosService;
    private final PaymentService paymentService;

    /**
     * 图片分析 — 反推AI绘画提示词
     * POST /api/analyze
     * 前端期望: { elapsed, result: ImageAnalysisResult, cached }
     */
    @PostMapping("/analyze")
    public ApiResponse<Map<String, Object>> analyze(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> request) {
        Long userId = principal != null ? principal.getId() : 0L;

        // 额度检查（匿名用户也可试用，但受限制流）
        if (userId > 0 && !paymentService.checkQuota(userId)) {
            return ApiResponse.error(403, "今日免费额度已用完，升级VIP获取更多次数");
        }

        String imageUrl = (String) request.get("imageUrl");
        String provider = (String) request.get("provider");

        if (imageUrl == null || imageUrl.isBlank()) {
            return ApiResponse.error("缺少 imageUrl 参数");
        }

        Map<String, Object> result = imageService.analyzeImage(userId, imageUrl, provider);

        // 消耗额度
        if (userId > 0) {
            paymentService.consumeQuota(userId);
        }

        return ApiResponse.success(result);
    }

    /**
     * 图片上传 — 接收前端文件，存到本地/COS，返回可访问URL
     * POST /api/upload (multipart/form-data)
     * 返回: { url: "/uploads/analyze/xxx.jpg" }
     */
    @PostMapping("/upload")
    public ApiResponse<Map<String, String>> upload(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        if (file.isEmpty()) {
            return ApiResponse.error("上传文件为空");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ApiResponse.error("仅支持图片文件（jpg/png/webp）");
        }

        if (file.getSize() > 10 * 1024 * 1024) {
            return ApiResponse.error("图片大小不能超过 10MB");
        }

        CosService.UploadResult result = cosService.uploadImage(file, "analyze");
        log.info("[上传] 文件={}, URL={}", file.getOriginalFilename(), result.url());
        return ApiResponse.success(Map.of("url", result.url()));
    }

    /**
     * 图片生成 — 根据提示词生成图片
     * POST /api/generate
     * 前端期望: { images: [{ url, revised_prompt }] }
     */
    @PostMapping("/generate")
    public ApiResponse<Map<String, Object>> generate(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> request) {
        Long userId = principal != null ? principal.getId() : 0L;

        // 额度检查（生成需要VIP）
        if (userId > 0 && !paymentService.checkQuota(userId)) {
            return ApiResponse.error(403, "今日免费额度已用完，升级VIP获取更多次数");
        }

        String prompt = (String) request.get("prompt");
        Integer width = request.get("width") != null ? ((Number) request.get("width")).intValue() : null;
        Integer height = request.get("height") != null ? ((Number) request.get("height")).intValue() : null;
        String model = (String) request.get("model");
        String provider = (String) request.get("provider");

        if (prompt == null || prompt.isBlank()) {
            return ApiResponse.error("缺少 prompt 参数");
        }

        Map<String, Object> result = imageService.generateImage(userId, prompt, width, height, model, provider);

        // 消耗额度
        if (userId > 0) {
            paymentService.consumeQuota(userId);
        }

        return ApiResponse.success(result);
    }

    /**
     * 图片编辑 — 基于原图+修改指令
     * POST /api/edit
     * 前端期望: { imageUrl, prompt }
     */
    @PostMapping("/edit")
    public ApiResponse<Map<String, Object>> edit(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> request) {
        Long userId = principal != null ? principal.getId() : 0L;

        // 额度检查
        if (userId > 0 && !paymentService.checkQuota(userId)) {
            return ApiResponse.error(403, "今日免费额度已用完，升级VIP获取更多次数");
        }

        String originalImage = (String) request.get("originalImage");
        String originalPrompt = (String) request.get("originalPrompt");
        String provider = (String) request.get("provider");

        @SuppressWarnings("unchecked")
        Map<String, Object> modifications = (Map<String, Object>) request.get("modifications");

        if (originalPrompt == null || originalPrompt.isBlank()) {
            return ApiResponse.error("缺少 originalPrompt 参数");
        }

        Map<String, Object> result = imageService.editImage(userId, originalImage, originalPrompt, modifications, provider);

        // 消耗额度
        if (userId > 0) {
            paymentService.consumeQuota(userId);
        }

        return ApiResponse.success(result);
    }

    /**
     * 查询任务状态
     * GET /api/task/{id}
     */
    @GetMapping("/task/{id}")
    public ApiResponse<DrawingTask> getTaskStatus(@PathVariable Long id) {
        DrawingTask task = imageService.getTaskStatus(id);
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
        return ApiResponse.success(imageService.listUserHistory(userId, limit));
    }
}
