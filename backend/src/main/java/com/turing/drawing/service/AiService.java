package com.turing.drawing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * AI模型调用服务 — 统一抽象层
 * 支持 OpenAI (GPT-4o / DALL-E 3) 和 Google Gemini
 * 提供图片分析（反推提示词）、图片生成、图片编辑三大能力
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;

    @Value("${openai.api-key:}")
    private String openaiApiKey;

    @Value("${openai.base-url:https://api.openai.com/v1}")
    private String openaiBaseUrl;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    /** 分析用的默认模型 */
    @Value("${ai.analyze-model:gpt-4o}")
    private String defaultAnalyzeModel;

    /** 生成用的默认模型 */
    @Value("${ai.generate-model:dall-e-3}")
    private String defaultGenerateModel;

    // ══════════════════════════════════════════════════════
    //  图片分析 — 反推提示词
    // ══════════════════════════════════════════════════════

    /**
     * 分析图片，反推AI绘画提示词
     *
     * @param imageUrl 图片URL或base64
     * @param provider 指定服务商(openai/gemini)，null则自动选择
     * @return 分析结果 { imageUrl, result: { style, styleConfidence, styleDescription, elements, layout,
     *         layoutDescription, colorScheme, primaryColor, prompt: { chinese, english, keywords } } }
     */
    public Map<String, Object> analyzeImage(String imageUrl, String provider) {
        String useProvider = resolveProvider(provider);
        log.info("[AI分析] 使用 {} 服务, 图片长度={}", useProvider, imageUrl.length());

        return switch (useProvider) {
            case "gemini" -> analyzeWithGemini(imageUrl);
            default -> analyzeWithOpenAI(imageUrl);
        };
    }

    /**
     * OpenAI Vision 分析图片
     */
    private Map<String, Object> analyzeWithOpenAI(String imageUrl) {
        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            log.warn("OpenAI API Key 未配置，返回降级分析结果");
            return buildFallbackAnalysis();
        }

        try {
            String systemPrompt = buildAnalyzeSystemPrompt();
            Object userContent = buildAnalyzeUserContent(imageUrl);

            Map<String, Object> requestBody = Map.of(
                    "model", defaultAnalyzeModel,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userContent)
                    ),
                    "max_tokens", 2000,
                    "temperature", 0.3
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openaiApiKey);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    openaiBaseUrl + "/chat/completions", HttpMethod.POST, entity, String.class);

            return parseAnalyzeResponse(response.getBody(), imageUrl);
        } catch (Exception e) {
            log.error("OpenAI分析失败: {}", e.getMessage());
            return buildFallbackAnalysis();
        }
    }

    /**
     * Gemini 分析图片
     */
    private Map<String, Object> analyzeWithGemini(String imageUrl) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("Gemini API Key 未配置，返回降级分析结果");
            return buildFallbackAnalysis();
        }

        try {
            String prompt = buildAnalyzeSystemPrompt();

            Map<String, Object> imagePart;
            if (imageUrl.startsWith("data:")) {
                // base64格式
                String[] parts = imageUrl.split(",", 2);
                String mimeType = parts[0].contains("png") ? "image/png" : "image/jpeg";
                imagePart = Map.of("inline_data", Map.of("mime_type", mimeType, "data", parts[1]));
            } else {
                // URL格式
                imagePart = Map.of("file_data", Map.of("file_uri", imageUrl));
            }

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(
                                    Map.of("text", prompt),
                                    imagePart
                            )
                    )),
                    "generationConfig", Map.of(
                            "temperature", 0.3,
                            "maxOutputTokens", 2000
                    )
            );

            String url = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s",
                    geminiApiKey);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            return parseGeminiAnalyzeResponse(response.getBody(), imageUrl);
        } catch (Exception e) {
            log.error("Gemini分析失败: {}", e.getMessage());
            return buildFallbackAnalysis();
        }
    }

    // ══════════════════════════════════════════════════════
    //  图片生成
    // ══════════════════════════════════════════════════════

    /**
     * 生成图片（DALL-E 3）
     */
    public Map<String, Object> generateImage(String prompt, Integer width, Integer height,
                                              String model, String provider) {
        String useModel = model != null ? model : defaultGenerateModel;
        log.info("[AI生成] model={}, prompt长度={}", useModel, prompt.length());

        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            log.warn("OpenAI API Key 未配置，无法生成图片");
            throw new RuntimeException("AI服务未配置，无法生成图片");
        }

        try {
            // DALL-E 3 尺寸映射
            String size = mapSize(width, height);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", useModel);
            requestBody.put("prompt", prompt);
            requestBody.put("n", 1);
            requestBody.put("size", size);
            requestBody.put("quality", "standard");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openaiApiKey);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    openaiBaseUrl + "/images/generations", HttpMethod.POST, entity, String.class);

            return parseGenerateResponse(response.getBody());
        } catch (Exception e) {
            log.error("图片生成失败: {}", e.getMessage());
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════
    //  图片编辑
    // ══════════════════════════════════════════════════════

    /**
     * 编辑图片 — 通过AI理解修改指令，重新生成提示词并生成新图
     */
    public Map<String, Object> editImage(String originalImage, String originalPrompt,
                                          Map<String, Object> modifications, String provider) {
        String useProvider = resolveProvider(provider);
        log.info("[AI编辑] 使用 {} 服务", useProvider);

        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            throw new RuntimeException("AI服务未配置，无法编辑图片");
        }

        try {
            // 构建编辑指令描述
            String editInstruction = buildEditInstruction(originalPrompt, modifications);

            // 先分析原图获取基础提示词（如果有原图URL）
            String enhancedPrompt = originalPrompt;
            if (originalImage != null && !originalImage.isBlank()) {
                try {
                    Map<String, Object> analysisResult = analyzeImage(originalImage, useProvider);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> promptResult = (Map<String, Object>) ((Map<String, Object>) analysisResult.get("result")).get("prompt");
                    if (promptResult != null && promptResult.get("english") != null) {
                        enhancedPrompt = (String) promptResult.get("english");
                    }
                } catch (Exception e) {
                    log.warn("编辑时分析原图失败，使用原始提示词: {}", e.getMessage());
                }
            }

            // 基于编辑指令重新生成
            String finalPrompt = enhancedPrompt + "\n\nModification instructions: " + editInstruction;
            Map<String, Object> genResult = generateImage(finalPrompt, null, null, null, provider);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> images = (List<Map<String, Object>>) genResult.get("images");
            String resultUrl = images.isEmpty() ? "" : (String) images.get(0).get("url");

            return Map.of(
                    "imageUrl", resultUrl,
                    "prompt", finalPrompt
            );
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("图片编辑失败: {}", e.getMessage());
            throw new RuntimeException("图片编辑失败: " + e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════
    //  Prompt 构建
    // ══════════════════════════════════════════════════════

    private String buildAnalyzeSystemPrompt() {
        return """
                你是一个专业的AI绘画提示词反推专家。根据用户提供的图片，分析并生成高质量的AI绘画提示词。
                
                请按以下JSON格式返回分析结果（不要包含markdown代码块标记）：
                {
                  "style": "风格类型(flat/skeuomorphic/tech/minimal/illustration/3d/watercolor/pixel/other)",
                  "styleConfidence": 0.95,
                  "styleDescription": "风格详细描述",
                  "elements": [
                    {"type": "元素类型", "label": "标签", "description": "描述", "confidence": 0.9}
                  ],
                  "layout": "布局类型(grid/flex-row/flex-column/absolute/masonry/circular)",
                  "layoutDescription": "布局描述",
                  "colorScheme": [
                    {"hex": "#FFFFFF", "name": "颜色名", "ratio": 0.3}
                  ],
                  "primaryColor": "#主色",
                  "prompt": {
                    "chinese": "中文提示词，详细描述画面内容、风格、构图、色彩等",
                    "english": "English prompt for AI image generation, detailed and professional",
                    "keywords": [
                      {"keyword": "关键词", "weight": 1.2, "category": "style/element/color/layout/quality/other"}
                    ]
                  }
                }
                
                要求：
                1. 中文提示词应详细描述画面内容、风格、构图、色彩
                2. 英文提示词应适合直接输入Midjourney/Stable Diffusion/DALL-E等AI绘图工具
                3. 关键词权重范围1.0-2.0，格式为(keyword:weight)
                4. 颜色方案提取3-5个主要颜色
                5. 至少分析3个画面元素
                """;
    }

    private Object buildAnalyzeUserContent(String imageUrl) {
        if (imageUrl.startsWith("data:")) {
            // base64图片
            String mimeType = imageUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
            return List.of(
                    Map.of("type", "text", "text", "请分析这张图片，反推AI绘画提示词："),
                    Map.of("type", "image_url",
                            "image_url", Map.of("url", imageUrl, "detail", "high"))
            );
        } else {
            // URL图片
            return List.of(
                    Map.of("type", "text", "text", "请分析这张图片，反推AI绘画提示词："),
                    Map.of("type", "image_url",
                            "image_url", Map.of("url", imageUrl, "detail", "high"))
            );
        }
    }

    private String buildEditInstruction(String originalPrompt, Map<String, Object> modifications) {
        StringBuilder sb = new StringBuilder();
        sb.append("Original prompt: ").append(originalPrompt).append("\n");
        if (modifications != null) {
            modifications.forEach((key, value) -> {
                if (value != null) {
                    sb.append("- ").append(key).append(": ").append(value).append("\n");
                }
            });
        }
        return sb.toString();
    }

    // ══════════════════════════════════════════════════════
    //  响应解析
    // ══════════════════════════════════════════════════════

    private Map<String, Object> parseAnalyzeResponse(String responseBody, String imageUrl) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("choices").path(0).path("message").path("content").asText();

            // 清理可能的markdown代码块标记
            content = content.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();

            @SuppressWarnings("unchecked")
            Map<String, Object> analysisResult = objectMapper.readValue(content, Map.class);

            return Map.of("imageUrl", imageUrl, "result", analysisResult);
        } catch (Exception e) {
            log.error("解析OpenAI分析响应失败: {}", e.getMessage());
            return buildFallbackAnalysis();
        }
    }

    private Map<String, Object> parseGeminiAnalyzeResponse(String responseBody, String imageUrl) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();

            content = content.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();

            @SuppressWarnings("unchecked")
            Map<String, Object> analysisResult = objectMapper.readValue(content, Map.class);

            return Map.of("imageUrl", imageUrl, "result", analysisResult);
        } catch (Exception e) {
            log.error("解析Gemini分析响应失败: {}", e.getMessage());
            return buildFallbackAnalysis();
        }
    }

    private Map<String, Object> parseGenerateResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode dataArray = root.path("data");

            List<Map<String, Object>> images = new ArrayList<>();
            for (JsonNode item : dataArray) {
                images.add(Map.of(
                        "url", item.path("url").asText(""),
                        "revised_prompt", item.path("revised_prompt").asText("")
                ));
            }

            return Map.of("images", images);
        } catch (Exception e) {
            log.error("解析生成响应失败: {}", e.getMessage());
            throw new RuntimeException("解析AI生成响应失败");
        }
    }

    // ══════════════════════════════════════════════════════
    //  工具方法
    // ══════════════════════════════════════════════════════

    private String resolveProvider(String provider) {
        if (provider != null && !provider.isBlank()) return provider;
        // 优先使用已配置的OpenAI，其次Gemini
        if (openaiApiKey != null && !openaiApiKey.isBlank()) return "openai";
        if (geminiApiKey != null && !geminiApiKey.isBlank()) return "gemini";
        return "openai"; // 默认，会在调用时返回降级结果
    }

    private String mapSize(Integer width, Integer height) {
        int w = width != null ? width : 1024;
        int h = height != null ? height : 1024;
        // DALL-E 3 支持的尺寸
        if (w == 1792 || h == 1792) return "1792x1024";
        if (w == 1024 && h == 1792) return "1024x1792";
        return "1024x1024";
    }

    /**
     * 降级分析结果（AI服务不可用时）
     */
    private Map<String, Object> buildFallbackAnalysis() {
        return Map.of(
                "imageUrl", "",
                "result", Map.of(
                        "style", "other",
                        "styleConfidence", 0,
                        "styleDescription", "AI服务暂不可用，请稍后重试",
                        "elements", List.of(),
                        "layout", "unknown",
                        "layoutDescription", "",
                        "colorScheme", List.of(),
                        "primaryColor", "",
                        "prompt", Map.of(
                                "chinese", "AI服务暂不可用",
                                "english", "AI service temporarily unavailable",
                                "keywords", List.of()
                        )
                )
        );
    }
}