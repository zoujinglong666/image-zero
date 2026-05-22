package com.turing.drawing.service;

import ai.z.openapi.ZhipuAiClient;
import ai.z.openapi.service.model.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.*;

/**
 * AI模型调用服务 — 统一抽象层
 * 支持 智谱AI GLM-4.6V-Flash（首选）、OpenAI (GPT-4o / DALL-E 3)、Google Gemini
 * 提供图片分析（反推提示词）、图片生成、图片编辑三大能力
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final RestTemplate restTemplate = createRestTemplate();
    private final ObjectMapper objectMapper;

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);   // 连接超时 30s
        factory.setReadTimeout(300000);     // 读取超时 300s (5min)
        return new RestTemplate(factory);
    }

    /** 智谱AI API Key */
    @Value("${zhipu.api-key:}")
    private String zhipuApiKey;

    @Value("${openai.api-key:}")
    private String openaiApiKey;

    @Value("${openai.base-url:https://api.openai.com/v1}")
    private String openaiBaseUrl;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.generate-model:gemini-3.1-flash-image-preview}")
    private String geminiGenerateModel;

    /** 硅基流动 API Key（Qwen2-VL 等免费视觉模型） */
    @Value("${siliconflow.api-key:}")
    private String siliconflowApiKey;

    @Value("${siliconflow.base-url:https://api.siliconflow.cn/v1}")
    private String siliconflowBaseUrl;

    @Value("${siliconflow.analyze-model:Qwen/Qwen2-VL-7B-Instruct}")
    private String siliconflowAnalyzeModel;

    @Value("${siliconflow.generate-model:Kwai-Kolors/Kolors}")
    private String siliconflowGenerateModel;

    /** 小米 MiMo API Key（多模态视觉模型，OpenAI兼容格式，认证用 api-key header） */
    @Value("${mimo.api-key:}")
    private String mimoApiKey;

    @Value("${mimo.base-url:https://api.xiaomimimo.com/v1}")
    private String mimoBaseUrl;

    @Value("${mimo.analyze-model:mimo-v2.5}")
    private String mimoAnalyzeModel;

    /** 分析用的默认模型 */
    @Value("${ai.analyze-model:glm-4.6v-flash}")
    private String defaultAnalyzeModel;

    /** 生成用的默认模型 */
    @Value("${ai.generate-model:dall-e-3}")
    private String defaultGenerateModel;

    /** 智谱图片生成默认模型 */
    @Value("${zhipu.generate-model:cogview-3-flash}")
    private String zhipuGenerateModel;

    @Value("${cos.upload-dir:./uploads}")
    private String localUploadDir;

    // ══════════════════════════════════════════════════════
    //  图片分析 — 反推提示词
    // ══════════════════════════════════════════════════════

    /**
     * 分析图片，反推AI绘画提示词
     *
     * @param imageUrl 图片URL或base64
     * @param provider 指定服务商(zhipu/openai/gemini)，null则自动选择
     * @return 分析结果 { imageUrl, result: { style, styleConfidence, styleDescription, elements, layout,
     *         layoutDescription, colorScheme, primaryColor, prompt: { chinese, english, keywords } } }
     */
    public Map<String, Object> analyzeImage(String imageUrl, String provider) {
        imageUrl = normalizeImageInput(imageUrl);
        String useProvider = resolveProvider(provider);
        log.info("[AI分析] 使用 {} 服务, 图片长度={}", useProvider, imageUrl.length());

        return switch (useProvider) {
            case "mimo" -> analyzeWithMimo(imageUrl);
            case "zhipu" -> analyzeWithZhipu(imageUrl);
            case "siliconflow" -> analyzeWithSiliconFlow(imageUrl);
            case "gemini" -> analyzeWithGemini(imageUrl);
            default -> analyzeWithOpenAI(imageUrl);
        };
    }

    /**
     * 智谱 AI GLM-4.6V-Flash 分析图片（官方 zai-sdk，免费模型）
     * 遇到 429 限流时最多重试 3 次（指数退避），全部失败后 fallback 到 OpenAI 兼容层
     */
    private Map<String, Object> analyzeWithZhipu(String imageUrl) {
        if (zhipuApiKey == null || zhipuApiKey.isBlank()) {
            log.warn("[ZhipuAI] API Key 未配置，降级到 OpenAI 兼容层");
            return analyzeWithOpenAI(imageUrl);
        }

        ZhipuAiClient client = ZhipuAiClient.builder()
                .ofZHIPU()
                .apiKey(zhipuApiKey)
                .build();

        String textPrompt = buildAnalyzeSystemPrompt();

        MessageContent imagePart = MessageContent.builder()
                .type("image_url")
                .imageUrl(ImageUrl.builder().url(imageUrl).build())
                .build();

        MessageContent textPart = MessageContent.builder()
                .type("text")
                .text(textPrompt)
                .build();

        ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                .model(defaultAnalyzeModel)
                .messages(List.of(
                        ChatMessage.builder()
                                .role(ChatMessageRole.USER.value())
                                .content(List.of(imagePart, textPart))
                                .build()
                ))
                .build();

        int maxRetries = 3;
        int[] retryDelaysSec = {3, 8, 20};

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                ChatCompletionResponse response = client.chat().createChatCompletion(request);

                if (!response.isSuccess()) {
                    int code = response.getCode();
                    log.warn("[ZhipuAI] 第{}/{}次失败: code={}, msg={}", attempt, maxRetries, code, response.getMsg());

                    // 429 限流 — 等待后重试
                    if (code == 429 && attempt < maxRetries) {
                        int delay = retryDelaysSec[attempt - 1];
                        log.warn("[ZhipuAI] 429限流，{}秒后重试...", delay);
                        Thread.sleep(delay * 1000L);
                        continue;
                    }
                    // 其他错误或重试耗尽 — fallback
                    log.warn("[ZhipuAI] 失败，fallback 到 OpenAI 兼容层");
                    return analyzeWithOpenAI(imageUrl);
                }

                Object messageObj = response.getData().getChoices().get(0).getMessage();
                String content = "";

                if (messageObj instanceof Map<?, ?> msgMap) {
                    Object raw = msgMap.get("content");
                    content = raw != null ? raw.toString() : "";
                } else {
                    try {
                        content = (String) messageObj.getClass().getMethod("getContent").invoke(messageObj);
                    } catch (Exception ex) {
                        content = messageObj.toString();
                    }
                }

                if (content == null || content.isBlank()) {
                    log.error("[ZhipuAI] 响应 content 为空，fallback 到 OpenAI 兼容层");
                    return analyzeWithOpenAI(imageUrl);
                }

                log.info("[ZhipuAI] 第{}次成功, content 前100字: {}",
                        attempt, content.length() > 100 ? content.substring(0, 100) : content);

                content = content.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();

                @SuppressWarnings("unchecked")
                Map<String, Object> analysisResult = objectMapper.readValue(content, Map.class);
                return Map.of("imageUrl", imageUrl, "result", analysisResult);

            } catch (ai.z.openapi.service.model.ZAiHttpException e) {
                // SDK 抛出的 HTTP 异常（429 等）
                String msg = e.getMessage() != null ? e.getMessage() : "";
                boolean is429 = msg.contains("429") || msg.contains("overloaded") || msg.contains("rate");
                if (is429 && attempt < maxRetries) {
                    int delay = retryDelaysSec[attempt - 1];
                    log.warn("[ZhipuAI] 429限流(异常)，{}秒后重试 ({}/{}): {}", delay, attempt, maxRetries, msg);
                    try { Thread.sleep(delay * 1000L); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
                } else {
                    log.error("[ZhipuAI] 异常，fallback 到 OpenAI 兼容层: {}", msg);
                    return analyzeWithOpenAI(imageUrl);
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("[ZhipuAI] 第{}次未知异常，fallback 到 SiliconFlow: {}", attempt, e.getMessage(), e);
                return analyzeWithSiliconFlow(imageUrl);
            }
        }

        log.warn("[ZhipuAI] 重试{}次全部失败，最终 fallback 到 SiliconFlow", maxRetries);
        return analyzeWithSiliconFlow(imageUrl);
    }

    /**
     * 小米 MiMo 分析图片（OpenAI兼容格式，认证用 api-key 自定义Header）
     * 模型: mimo-v2.5 / mimo-v2-omni
     * 文档: https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding
     */
    private Map<String, Object> analyzeWithMimo(String imageUrl) {
        if (mimoApiKey == null || mimoApiKey.isBlank()) {
            log.warn("[MiMo] API Key 未配置，降级到智谱 AI");
            return analyzeWithZhipu(imageUrl);
        }

        int maxRetries = 3;
        int[] retryDelaysSec = {3, 8, 20};

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String systemPrompt = buildAnalyzeSystemPrompt();
                Object userContent = buildAnalyzeUserContent(imageUrl);

                Map<String, Object> requestBody = Map.of(
                        "model", mimoAnalyzeModel,
                        "messages", List.of(
                                Map.of("role", "system", "content", systemPrompt),
                                Map.of("role", "user", "content", userContent)
                        ),
                        "max_tokens", 2000,
                        "temperature", 0.3
                );

                // ⚠️ 小米 MiMo 用自定义 api-key Header，不是 Authorization: Bearer！
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("api-key", mimoApiKey);

                HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
                ResponseEntity<String> response = restTemplate.exchange(
                        mimoBaseUrl + "/chat/completions", HttpMethod.POST, entity, String.class);

                String responseBody = response.getBody();

                if (responseBody == null || responseBody.isBlank()) {
                    log.warn("[MiMo] 第{}次响应体为空，重试", attempt);
                    continue;
                }

                log.info("[MiMo] 第{}次成功! 状态={}, body长度={}",
                        attempt, response.getStatusCode(), responseBody.length());

                return parseAnalyzeResponse(responseBody, imageUrl);

            } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                if (attempt < maxRetries) {
                    int delay = retryDelaysSec[attempt - 1];
                    log.warn("[MiMo] 429限流! {}秒后重试 ({}/{})", delay, attempt, maxRetries);
                    try { Thread.sleep(delay * 1000L); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt(); break;
                    }
                } else {
                    log.error("[MiMo] 429限流重试耗尽! fallback到智谱AI: {}", e.getResponseBodyAsString());
                    return analyzeWithZhipu(imageUrl); // 小米限流 → 降级到智谱
                }
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                log.error("[MiMo] HTTP错误 {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
                return analyzeWithZhipu(imageUrl); // 其他错误 → 降级到智谱
            } catch (Exception e) {
                log.error("[MiMo] 第{}次异常: {}", attempt, e.getMessage(), e);
                if (attempt == maxRetries) return analyzeWithZhipu(imageUrl);
            }
        }
        return analyzeWithZhipu(imageUrl);
    }

    /**
     * 硅基流动 Qwen2-VL 分析图片（OpenAI 兼容层，免费，并发限制更宽松）
     * 作为智谱 AI 429 限流后的首选 fallback
     */
    private Map<String, Object> analyzeWithSiliconFlow(String imageUrl) {
        if (siliconflowApiKey == null || siliconflowApiKey.isBlank()) {
            log.warn("[SiliconFlow] API Key 未配置，降级到 OpenAI 兼容层");
            return analyzeWithOpenAI(imageUrl);
        }

        int maxRetries = 3;
        int[] retryDelaysSec = {5, 15, 30};

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                Object userContent = buildAnalyzeUserContent(imageUrl);

                Map<String, Object> requestBody = Map.of(
                        "model", siliconflowAnalyzeModel,
                        "messages", List.of(
                                Map.of("role", "user", "content", userContent)
                        ),
                        "max_tokens", 2000,
                        "temperature", 0.3
                );

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(siliconflowApiKey);

                HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
                ResponseEntity<String> response = restTemplate.exchange(
                        siliconflowBaseUrl + "/chat/completions", HttpMethod.POST, entity, String.class);

                String responseBody = response.getBody();
                if (responseBody == null || responseBody.isBlank()) {
                    log.warn("[SiliconFlow] 第{}次响应体为空，重试", attempt);
                    continue;
                }

                log.info("[SiliconFlow] 第{}次成功, body长度={}", attempt, responseBody.length());
                return parseAnalyzeResponse(responseBody, imageUrl);

            } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                if (attempt < maxRetries) {
                    int delay = retryDelaysSec[attempt - 1];
                    log.warn("[SiliconFlow] 429限流! {}秒后重试 ({}/{})", delay, attempt, maxRetries);
                    try { Thread.sleep(delay * 1000L); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt(); break;
                    }
                } else {
                    log.error("[SiliconFlow] 429限流重试耗尽: {}", e.getResponseBodyAsString());
                    return buildFallbackAnalysis();
                }
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                log.error("[SiliconFlow] HTTP错误 {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
                return buildFallbackAnalysis();
            } catch (Exception e) {
                log.error("[SiliconFlow] 第{}次异常: {}", attempt, e.getMessage(), e);
                if (attempt == maxRetries) return buildFallbackAnalysis();
            }
        }
        return buildFallbackAnalysis();
    }

    /**
     * OpenAI Vision 分析图片（含429自动重试）
     */
    private Map<String, Object> analyzeWithOpenAI(String imageUrl) {
        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            log.warn("OpenAI API Key 未配置，返回降级分析结果");
            return buildFallbackAnalysis();
        }

        int maxRetries = 3;
        int[] retryDelaysSec = {5, 10, 15}; // 递增等待时间

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
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

                String responseBody = response.getBody();
                log.info("[AI分析] 第{}次尝试成功! 状态={}, body长度={}",
                        attempt, response.getStatusCode(),
                        responseBody != null ? responseBody.length() : 0);

                // 空响应体检查
                if (responseBody == null || responseBody.isBlank()) {
                    log.error("[AI分析] OpenRouter返回空响应! status={}", response.getStatusCode());
                    continue; // 重试
                }

                return parseAnalyzeResponse(responseBody, imageUrl);

            } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                // 429 限流 — 自动重试（指数退避）
                if (attempt < maxRetries) {
                    int delay = retryDelaysSec[attempt - 1];
                    log.warn("[AI分析] 429限流! 第{}/{}次尝试，等待{}秒后重试...", attempt, maxRetries, delay);
                    try { Thread.sleep(delay * 1000L); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    log.error("[AI分析] 429限流! 已重试{}次仍失败: {}", maxRetries, e.getResponseBodyAsString());
                    return buildFallbackAnalysis();
                }
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                log.error("OpenAI分析失败, 状态码={}, 响应体={}", e.getStatusCode(), e.getResponseBodyAsString(), e);
                return buildFallbackAnalysis(); // 非429错误不重试
            } catch (Exception e) {
                log.error("OpenAI分析失败(第{}次)", attempt, e);
                if (attempt == maxRetries) return buildFallbackAnalysis();
            }
        }
        return buildFallbackAnalysis();
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
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("Gemini分析失败, 状态码={}, 响应体={}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            return buildFallbackAnalysis();
        } catch (Exception e) {
            log.error("Gemini分析失败", e);
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
        String generationProvider = resolveGenerationProvider(provider);
        String useModel = resolveGenerationModel(generationProvider, model);
        log.info("[AI生成] provider={}, model={}, prompt长度={}, baseUrl={}",
                generationProvider, useModel, prompt.length(), openaiBaseUrl);

        return switch (generationProvider) {
            case "zhipu" -> generateWithZhipu(prompt, width, height, useModel);
            case "siliconflow" -> generateWithSiliconFlow(prompt, width, height, useModel);
            case "gemini" -> generateWithGemini(prompt, useModel);
            case "pollinations" -> generateWithPollinations(prompt, width, height);
            default -> generateWithOpenAI(prompt, width, height, useModel);
        };
    }

    private Map<String, Object> generateWithOpenAI(String prompt, Integer width, Integer height, String model) {
        if (openaiBaseUrl != null && openaiBaseUrl.contains("openrouter.ai")) {
            log.warn("[AI生成] OpenRouter 不支持 /images/generations，改用 Pollinations");
            return generateWithPollinations(prompt, width, height);
        }

        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            log.warn("[AI生成] OpenAI API Key 未配置，改用 Pollinations");
            return generateWithPollinations(prompt, width, height);
        }

        try {
            String size = mapSize(width, height);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
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
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("[AI生成] OpenAI兼容接口失败, 状态码={}, 响应体={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AI生成] OpenAI兼容接口异常", e);
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> generateWithZhipu(String prompt, Integer width, Integer height, String model) {
        if (zhipuApiKey == null || zhipuApiKey.isBlank()) {
            log.warn("[AI生成] 智谱 API Key 未配置，改用 Pollinations");
            return generateWithPollinations(prompt, width, height);
        }

        try {
            String size = mapSize(width, height);
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("prompt", prompt);
            requestBody.put("size", size);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(zhipuApiKey);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    "https://open.bigmodel.cn/api/paas/v4/images/generations",
                    HttpMethod.POST,
                    entity,
                    String.class);

            return parseGenerateResponse(response.getBody());
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("[AI生成] 智谱接口失败, 状态码={}, 响应体={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), e);

            if (e.getStatusCode().is5xxServerError()) {
                log.warn("[AI生成] 智谱上游 5xx，改用 Pollinations 兜底");
                return generateWithPollinations(prompt, width, height);
            }
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AI生成] 智谱接口异常", e);
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> generateWithSiliconFlow(String prompt, Integer width, Integer height, String model) {
        if (siliconflowApiKey == null || siliconflowApiKey.isBlank()) {
            log.warn("[AI生成] SiliconFlow API Key 未配置，改用 Pollinations");
            return generateWithPollinations(prompt, width, height);
        }

        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("prompt", prompt);
            requestBody.put("image_size", mapSize(width, height));
            requestBody.put("batch_size", 1);
            requestBody.put("num_inference_steps", 20);
            requestBody.put("guidance_scale", 7.5);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(siliconflowApiKey);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    siliconflowBaseUrl + "/images/generations",
                    HttpMethod.POST,
                    entity,
                    String.class);

            return parseGenerateResponse(response.getBody());
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("[AI生成] SiliconFlow接口失败, 状态码={}, 响应体={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AI生成] SiliconFlow接口异常", e);
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> generateWithGemini(String prompt, String model) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("[AI生成] Gemini API Key 未配置，改用 Pollinations");
            return generateWithPollinations(prompt, null, null);
        }

        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(Map.of("text", prompt))
                    )),
                    "generationConfig", Map.of(
                            "responseModalities", List.of("TEXT", "IMAGE")
                    )
            );

            String url = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                    model,
                    geminiApiKey);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            return parseGeminiGenerateResponse(response.getBody(), prompt);
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("[AI生成] Gemini接口失败, 状态码={}, 响应体={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AI生成] Gemini接口异常", e);
            throw new RuntimeException("图片生成失败: " + e.getMessage(), e);
        }
    }

    /**
     * Pollinations.ai 免费图片生成（OpenRouter 等不兼容 /images/generations 时的 fallback）
     */
    private Map<String, Object> generateWithPollinations(String prompt, Integer width, Integer height) {
        try {
            int w = width != null ? width : 1024;
            int h = height != null ? height : 1024;
            String encodedPrompt = URLEncoder.encode(prompt, StandardCharsets.UTF_8);
            String imageUrl = String.format(
                    "https://image.pollinations.ai/prompt/%s?width=%d&height=%d&nologo=true&seed=%d&enhance=true",
                    encodedPrompt, w, h, new Random().nextInt(1000000));
            log.info("[Pollinations] 生成图片URL: {}", imageUrl);

            List<Map<String, Object>> images = List.of(Map.of(
                    "url", imageUrl,
                    "revised_prompt", prompt
            ));
            return Map.of("images", images);
        } catch (Exception e) {
            log.error("Pollinations生成失败", e);
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
            log.error("图片编辑失败", e);
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

    private String normalizeImageInput(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new RuntimeException("图片地址为空");
        }
        if (imageUrl.startsWith("data:")) {
            return imageUrl;
        }
        if (imageUrl.startsWith("/uploads/")) {
            return toDataUrlFromLocalUploadPath(imageUrl);
        }
        try {
            URI uri = URI.create(imageUrl);
            String host = uri.getHost();
            String path = uri.getPath();
            if (path != null && path.startsWith("/uploads/") && isLocalHost(host)) {
                return toDataUrlFromLocalUploadPath(path);
            }
        } catch (Exception e) {
            log.warn("[AI分析] 图片地址解析失败，按原始地址继续: {}", imageUrl);
        }
        return imageUrl;
    }

    private boolean isLocalHost(String host) {
        if (host == null || host.isBlank()) {
            return false;
        }
        return "localhost".equalsIgnoreCase(host)
                || "127.0.0.1".equals(host)
                || "0.0.0.0".equals(host)
                || "::1".equals(host);
    }

    private String toDataUrlFromLocalUploadPath(String uploadPath) {
        String relativePath = uploadPath.replaceFirst("^/uploads/", "");
        Path uploadRoot = Paths.get(localUploadDir).toAbsolutePath().normalize();
        Path filePath = uploadRoot.resolve(relativePath).normalize();
        if (!filePath.startsWith(uploadRoot)) {
            throw new RuntimeException("图片路径非法: " + uploadPath);
        }
        if (!Files.exists(filePath)) {
            throw new RuntimeException("图片文件不存在: " + uploadPath);
        }
        try {
            byte[] bytes = Files.readAllBytes(filePath);
            String mimeType = Files.probeContentType(filePath);
            if (mimeType == null || !mimeType.startsWith("image/")) {
                mimeType = guessMimeType(filePath);
            }
            return "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (IOException e) {
            throw new RuntimeException("读取本地图片失败: " + uploadPath, e);
        }
    }

    private String guessMimeType(Path filePath) {
        String fileName = filePath.getFileName().toString().toLowerCase(Locale.ROOT);
        if (fileName.endsWith(".png")) return "image/png";
        if (fileName.endsWith(".webp")) return "image/webp";
        if (fileName.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }

    // ══════════════════════════════════════════════════════
    //  响应解析
    // ══════════════════════════════════════════════════════

    private Map<String, Object> parseAnalyzeResponse(String responseBody, String imageUrl) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);

            // 检查 OpenRouter 错误格式
            JsonNode errorNode = root.path("error");
            if (errorNode.isObject() && !errorNode.isNull()) {
                String errMsg = errorNode.path("message").asText("未知错误");
                log.error("[AI分析] OpenRouter返回错误: {}", errMsg);
                return buildFallbackAnalysis();
            }

            JsonNode messageNode = root.path("choices").path(0).path("message");

            // 优先取 content，如果为空则取 reasoning（兼容 DeepSeek-R1 / OpenRouter reasoning 模型）
            String content = messageNode.path("content").asText("");
            if (content.isBlank()) {
                // 尝试从 reasoning_details 或 reasoning 字段提取
                JsonNode reasoningDetails = messageNode.path("reasoning_details");
                if (reasoningDetails.isArray() && !reasoningDetails.isEmpty()) {
                    content = reasoningDetails.path(0).path("text").asText("");
                }
                if (content.isBlank()) {
                    content = messageNode.path("reasoning").asText("");
                }
            }

            if (content.isBlank()) {
                log.error("OpenAI分析响应 content 为空, 响应体={}", responseBody);
                return buildFallbackAnalysis();
            }

            log.debug("[AI分析] 原始响应内容(前200字): {}", content.length() > 200 ? content.substring(0, 200) : content);

            // 清理可能的markdown代码块标记
            content = content.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();

            @SuppressWarnings("unchecked")
            Map<String, Object> analysisResult = objectMapper.readValue(content, Map.class);

            return Map.of("imageUrl", imageUrl, "result", analysisResult);
        } catch (Exception e) {
            log.error("解析OpenAI分析响应失败, 响应体={}", responseBody, e);
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
            log.error("解析Gemini分析响应失败, 响应体={}", responseBody, e);
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
            log.error("解析生成响应失败, 响应体={}", responseBody, e);
            throw new RuntimeException("解析AI生成响应失败: " + e.getMessage());
        }
    }

    private Map<String, Object> parseGeminiGenerateResponse(String responseBody, String prompt) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            List<Map<String, Object>> images = new ArrayList<>();

            for (JsonNode part : parts) {
                JsonNode inlineData = part.path("inlineData");
                if (inlineData.isMissingNode() || inlineData.isNull()) {
                    inlineData = part.path("inline_data");
                }
                if (inlineData.isObject()) {
                    String mimeType = inlineData.path("mimeType").asText("");
                    if (mimeType.isBlank()) {
                        mimeType = inlineData.path("mime_type").asText("image/png");
                    }
                    String base64 = inlineData.path("data").asText("");
                    if (!base64.isBlank()) {
                        images.add(Map.of(
                                "url", "data:" + mimeType + ";base64," + base64,
                                "revised_prompt", prompt
                        ));
                    }
                }
            }

            if (images.isEmpty()) {
                throw new RuntimeException("Gemini 未返回图片数据");
            }
            return Map.of("images", images);
        } catch (Exception e) {
            log.error("解析Gemini生成响应失败, 响应体={}", responseBody, e);
            throw new RuntimeException("解析Gemini生成响应失败: " + e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════
    //  工具方法
    // ══════════════════════════════════════════════════════

    private String resolveProvider(String provider) {
        if (provider != null && !provider.isBlank()) return provider;
        // 优先顺序：小米MiMo > 智谱AI（免费视觉模型）> 硅基流动（免费，限流更宽松）> OpenAI > Gemini
        if (mimoApiKey != null && !mimoApiKey.isBlank()) return "mimo";
        if (zhipuApiKey != null && !zhipuApiKey.isBlank()) return "zhipu";
        if (siliconflowApiKey != null && !siliconflowApiKey.isBlank()) return "siliconflow";
        if (openaiApiKey != null && !openaiApiKey.isBlank()) return "openai";
        if (geminiApiKey != null && !geminiApiKey.isBlank()) return "gemini";
        return "mimo"; // 默认小米，会在调用时检查 key 并降级
    }

    private String resolveGenerationProvider(String provider) {
        if (provider != null && !provider.isBlank()) {
            return switch (provider) {
                case "zhipu", "openai", "pollinations", "siliconflow", "gemini" -> provider;
                case "mimo" -> resolvePreferredRenderableProvider();
                default -> resolvePreferredRenderableProvider();
            };
        }
        return resolvePreferredRenderableProvider();
    }

    private String resolveGenerationModel(String provider, String model) {
        if (model != null && !model.isBlank()) {
            return model;
        }
        if ("zhipu".equals(provider)) {
            if (defaultGenerateModel != null && defaultGenerateModel.startsWith("cogview")) {
                return defaultGenerateModel;
            }
            return zhipuGenerateModel;
        }
        if ("siliconflow".equals(provider)) {
            if (defaultGenerateModel != null && defaultGenerateModel.contains("/")) {
                return defaultGenerateModel;
            }
            return siliconflowGenerateModel;
        }
        if ("gemini".equals(provider)) {
            if (defaultGenerateModel != null && defaultGenerateModel.startsWith("gemini")) {
                return defaultGenerateModel;
            }
            return geminiGenerateModel;
        }
        return defaultGenerateModel;
    }

    private String resolvePreferredRenderableProvider() {
        if (openaiBaseUrl != null && openaiBaseUrl.contains("openrouter.ai")) {
            return "pollinations";
        }
        if (openaiBaseUrl != null && openaiBaseUrl.contains("open.bigmodel.cn")) {
            return "zhipu";
        }
        if (siliconflowApiKey != null && !siliconflowApiKey.isBlank()) {
            return "siliconflow";
        }
        if (zhipuApiKey != null && !zhipuApiKey.isBlank()) {
            return "zhipu";
        }
        if (openaiApiKey != null && !openaiApiKey.isBlank()) {
            return "openai";
        }
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            return "gemini";
        }
        return "pollinations";
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
