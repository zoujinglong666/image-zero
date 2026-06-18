package com.turing.drawing.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.turing.drawing.entity.UserPrompt;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 内容审核服务 — AI视觉审核 + 敏感词过滤 + 人工审核支撑
 *
 * 审核流程:
 *   1. 文本敏感词扫描（本地，毫秒级）
 *   2. AI视觉分析（MiMo/智谱，秒级）
 *   3. 综合判定 → pass / warn / reject
 *
 * 目标表: user_prompts, challenge_submissions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContentModerationService {

    private final AiService aiService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${mimo.api-key:}")
    private String mimoApiKey;

    @Value("${mimo.base-url:https://api.xiaomimimo.com/v1}")
    private String mimoBaseUrl;

    // ══════════════════════════════════════════
    //  公开入口 — 提交内容审核
    // ══════════════════════════════════════════

    /**
     * 审核社区作品（user_prompts）
     *
     * @return ModerationResult 包含 verdict + reason + categories
     */
    public ModerationResult moderateUserPrompt(UserPrompt prompt) {
        log.info("[内容审核] 开始审核 user_prompt#{}", prompt.getId());

        // Step 1: 文本敏感词检查（同步，极快）
        TextScanResult textResult = scanText(prompt.getTitle(), prompt.getPromptText(), prompt.getTags());
        if (textResult.blocked) {
            log.warn("[内容审核] ❌ 文本敏感词拦截: categories={}, words={}", textResult.categories, textResult.matchedWords);
            return ModerationResult.reject("文本含违规内容: " + String.join(", ", textResult.matchedWords),
                    textResult.categories);
        }
        if (textResult.warned) {
            log.info("[内容审核] ⚠️ 文本敏感词预警: categories={}", textResult.categories);
        }

        // Step 2: AI 视觉审核（如果有图片）
        AiVerdict aiVerdict = AiVerdict.pass();
        if (prompt.getImageUrl() != null && !prompt.getImageUrl().isBlank()
                && !prompt.getImageUrl().startsWith("[")) { // 排除 base64 标记
            try {
                aiVerdict = analyzeImageSafety(prompt.getImageUrl());
                log.info("[内容审核] AI视觉判定: verdict={}, confidence={}", aiVerdict.verdict, aiVerdict.confidence);
            } catch (Exception e) {
                log.error("[内容审核] AI视觉审核异常，降级为人工复审: {}", e.getMessage(), e);
                aiVerdict = new AiVerdict("warn", 0.0, "AI审核异常，需人工复审", List.of("ai_error"));
            }
        }

        // Step 3: 综合判定
        return combineVerdicts(textResult, aiVerdict);
    }

    /**
     * 审核挑战投稿（challenge_submission）
     */
    public ModerationResult moderateChallengeSubmission(String title, String promptText, String imageUrl) {
        log.info("[内容审核] 开始审核挑战投稿: title={}", title);

        // Step 1: 文本扫描
        TextScanResult textResult = scanText(title, promptText, "");
        if (textResult.blocked) {
            return ModerationResult.reject("文本含违规内容: " + String.join(", ", textResult.matchedWords),
                    textResult.categories);
        }

        // Step 2: AI视觉
        AiVerdict aiVerdict = AiVerdict.pass();
        if (imageUrl != null && !imageUrl.isBlank() && !imageUrl.startsWith("[")) {
            try {
                aiVerdict = analyzeImageSafety(imageUrl);
            } catch (Exception e) {
                log.error("[内容审核] 挑战投稿AI审核异常: {}", e.getMessage(), e);
                aiVerdict = new AiVerdict("warn", 0.0, "AI审核异常", List.of("ai_error"));
            }
        }

        return combineVerdicts(textResult, aiVerdict);
    }

    // ══════════════════════════════════════════
    //  Step 1: 本地文本敏感词扫描
    // ══════════════════════════════════════════

    /**
     * 多字段文本敏感词扫描
     * 返回结果包含是否拦截/预警、命中分类、命中的词
     */
    public TextScanResult scanText(String title, String promptText, String tags) {
        StringBuilder fullText = new StringBuilder();
        if (title != null) fullText.append(title).append(" ");
        if (promptText != null) fullText.append(promptText).append(" ");
        if (tags != null) fullText.append(tags);

        String text = fullText.toString().toLowerCase();

        Set<String> matchedCategories = new LinkedHashSet<>();
        List<String> matchedWords = new ArrayList<>();
        boolean blocked = false;  // level >= 2 直接拦截
        boolean warned = false;  // level == 1 预警

        // 内置基础敏感词库（后续可扩展到数据库）
        Map<String, Integer> sensitiveDict = getSensitiveDictionary();

        for (Map.Entry<String, Integer> entry : sensitiveDict.entrySet()) {
            String word = entry.getKey().toLowerCase();
            int level = entry.getValue();
            if (text.contains(word)) {
                matchedWords.add(word);
                if (level >= 2) blocked = true;
                else warned = true;
                // 推断分类
                if (level >= 2) matchedCategories.add("text_violation");
                else matchedCategories.add("text_suspicious");
            }
        }

        return new TextScanResult(blocked, warned, new ArrayList<>(matchedCategories), matchedWords);
    }

    /**
     * 基础敏感词字典 — 后续可从 sensitive_words 表加载
     */
    private Map<String, Integer> getSensitiveDictionary() {
        Map<String, Integer> dict = new LinkedHashMap<>();

        // NSFW 级别3（严重）
        dict.put("色情", 3); dict.put("裸体", 3); dict.put("淫秽", 3); dict.put("黄片", 3);
        dict.put("做爱", 2); dict.put("性交", 2); dict.put("黄色", 2);

        // 暴力 级别2-3
        dict.put("杀人", 3); dict.put("血腥", 2); dict.put("恐怖", 1);
        dict.put("自残", 2); dict.put("自杀", 2); dict.put("暴力", 2);

        // 违法/诈骗 级别3
        dict.put("代开发票", 3); dict.put("博彩", 3); dict.put("赌博", 3);
        dict.put("刷单", 2); dict.put("违禁品", 2);

        // 广告引流 级别1-2
        dict.put("加微信", 1); dict.put("加QQ", 1); dict.put("QQ群", 1);
        dict.put("联系方式", 1); dict.put("代写", 1);

        // 版权问题 级别1
        dict.put("盗版", 1); dict.put("破解", 1); dict.put("破解版", 1);

        return dict;
    }

    // ══════════════════════════════════════════
    //  Step 2: AI 视觉安全审核
    // ══════════════════════════════════════════

    /**
     * 使用 AI 视觉模型判断图片安全性
     * 优先使用 MiMo，fallback 到通用 OpenAI 兼容接口
     */
    public AiVerdict analyzeImageSafety(String imageUrl) throws Exception {
        if (mimoApiKey == null || mimoApiKey.isBlank()) {
            log.warn("[内容审核] MiMo Key 未配置，使用降级模式");
            return new AiVerdict("warn", 0.5, "AI审核服务未完全配置，需人工复审", List.of("config_incomplete"));
        }

        // 构建安全审核专用 Prompt
        String systemPrompt = buildModerationSystemPrompt();

        // 构建请求体（OpenAI 兼容格式）
        Object userContent = aiService.buildAnalyzeUserContent(imageUrl);

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", "mimo-v2.5");
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userContent)
        ));
        requestBody.put("max_tokens", 500);
        requestBody.put("temperature", 0.1); // 低温度确保稳定输出

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", mimoApiKey); // MiMo 自定义 Header

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        log.info("[内容审核] 发送AI视觉安全审核请求...");
        ResponseEntity<Map> response = restTemplate.exchange(
                mimoBaseUrl + "/chat/completions",
                HttpMethod.POST,
                entity,
                Map.class
        );

        // 解析响应
        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("choices")) {
            throw new RuntimeException("AI返回空响应");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("AI返回无choices");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        String content = (String) message.get("content");

        log.info("[内容审核] AI原始响应: {}", content);

        // 解析 JSON 判定
        return parseAiVerdict(content);
    }

    /**
     * 构建安全审核系统 Prompt
     * 要求 AI 以结构化 JSON 返回安全判定
     */
    private String buildModerationSystemPrompt() {
        return """
                你是一个专业的内容安全审核AI。请分析用户上传的图片，判断其是否适合在公开社区展示。

                你必须严格以以下JSON格式回复（不要添加任何其他文字）：
                {
                  "verdict": "pass|warn|reject",
                  "confidence": 0.00-1.00,
                  "categories": ["分类列表"],
                  "reason": "简短原因说明"
                }

                审核标准（命中任一即标记）：

                【reject - 必须拒绝】
                - NSFW/色情内容：裸露、性暗示、淫秽
                - 暴力血腥：明显暴力行为、大量血液、残肢
                - 非法内容：毒品使用、武器制造、违法活动
                - 个人隐私：身份证件、人脸清晰照（非艺术创作）

                【warn - 需要人工复核】
                - 性感但不露骨：比基尼、紧身衣、暧昧姿势
                - 轻微暴力：打斗场景、武器展示（非真实）
                - 争议内容：政治相关、宗教敏感、可能引起争议
                - 版权风险：明显的水印/Logo、知名IP角色
                - 低质量/无关：模糊不清、与平台主题无关

                【pass - 安全通过】
                - AI生成艺术图、风景、静物、抽象画
                - 人物肖像（艺术风格，非性暗示）
                - 动物、植物、建筑、产品设计
                - 符合社区规范的创意作品

                注意事项：
                - confidence 低于 0.7 时自动降级为 warn
                - categories 使用英文小写: nsfw, violence, privacy, copyright, spam, low_quality, controversial, safe
                - reason 用中文，简洁明了
                """;
    }

    /**
     * 解析 AI 返回的 JSON 判定
     */
    private AiVerdict parseAiVerdict(String content) {
        try {
            // 尝试提取 JSON（可能被 markdown 代码块包裹）
            String jsonStr = content.trim();
            if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
            }

            Map<String, Object> result = objectMapper.readValue(jsonStr,
                    new TypeReference<Map<String, Object>>() {});

            String verdict = (String) result.getOrDefault("verdict", "warn");
            double confidence = ((Number) result.getOrDefault("confidence", 0.5)).doubleValue();

            @SuppressWarnings("unchecked")
            List<String> categories = (List<String>) result.getOrDefault("categories", List.of());
            String reason = (String) result.getOrDefault("reason", "");

            // 置信度保护：低置信度自动降级
            if ("pass".equals(verdict) && confidence < 0.7) {
                verdict = "warn";
                reason = reason + " [置信度过低，降级为人工复审]";
            }

            return new AiVerdict(verdict, confidence, reason, categories);
        } catch (Exception e) {
            log.warn("[内容审核] AI响应JSON解析失败，降级为warn: raw={}", content);
            return new AiVerdict("warn", 0.0, "AI响应格式异常，需人工复审", List.of("parse_error"));
        }
    }

    // ══════════════════════════════════════════
    //  Step 3: 综合判定
    // ══════════════════════════════════════════

    /**
     * 合并文本扫描和 AI 视觉的结果，给出最终判定
     */
    private ModerationResult combineVerdicts(TextScanResult textResult, AiVerdict aiVerdict) {
        // 如果任一环节 reject → 最终 reject
        if (textResult.blocked || "reject".equals(aiVerdict.verdict)) {
            Set<String> allCategories = new LinkedHashSet<>(textResult.categories);
            allCategories.addAll(aiVerdict.categories);
            String reason = textResult.blocked
                    ? "文本违规: " + String.join(", ", textResult.matchedWords)
                    : aiVerdict.reason;
            return ModerationResult.reject(reason, new ArrayList<>(allCategories));
        }

        // 如果任一 warn → 最终 warn（需要人工复审）
        if (textResult.warned || "warn".equals(aiVerdict.verdict)) {
            Set<String> allCategories = new LinkedHashSet<>(textResult.categories);
            allCategories.addAll(aiVerdict.categories);
            String reason = textResult.warned
                    ? "文本疑似违规: " + String.join(", ", textResult.matchedWords)
                    : (aiVerdict.reason != null ? aiVerdict.reason : "需要人工复审");
            return ModerationResult.warn(reason, new ArrayList<>(allCategories));
        }

        // 全部 pass → 自动通过
        return ModerationResult.pass();
    }

    // ══════════════════════════════════════════
    //  数据结构
    // ══════════════════════════════════════════

    /** 审核最终结果 */
    public static class ModerationResult {
        public final String verdict;      // pass / warn / reject
        public final String reason;       // 原因说明
        public final List<String> categories; // 命中分类
        public final LocalDateTime reviewedAt;

        private ModerationResult(String verdict, String reason, List<String> categories) {
            this.verdict = verdict;
            this.reason = reason;
            this.categories = categories;
            this.reviewedAt = LocalDateTime.now();
        }

        public static ModerationResult pass() {
            return new ModerationResult("pass", "审核通过", List.of("safe"));
        }

        public static ModerationResult warn(String reason, List<String> categories) {
            return new ModerationResult("warn", reason, categories);
        }

        public static ModerationResult reject(String reason, List<String> categories) {
            return new ModerationResult("reject", reason, categories);
        }

        /** 转换为数据库 review_status 字段值 */
        public String toReviewStatus() {
            return switch (verdict) {
                case "pass" -> "ai_pass";
                case "warn" -> "ai_warn";
                case "reject" -> "ai_reject";
                default -> "pending";
            };
        }

        /** 序列化为 JSON 存入 moderation_result 字段 */
        public String toJson(ObjectMapper mapper) {
            try {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("verdict", verdict);
                map.put("reason", reason);
                map.put("categories", categories);
                map.put("reviewedAt", reviewedAt.toString());
                return mapper.writeValueAsString(map);
            } catch (Exception e) {
                return "{\"verdict\":\"" + verdict + "\",\"reason\":\"" + reason + "\"}";
            }
        }

        public boolean isPass() { return "pass".equals(verdict); }
        public boolean isWarn() { return "warn".equals(verdict); }
        public boolean isReject() { return "reject".equals(verdict); }
    }

    /** 文本扫描结果 */
    public record TextScanResult(
            boolean blocked,      // 是否应该直接拦截
            boolean warned,       // 是否需要预警
            List<String> categories,
            List<String> matchedWords
    ) {}

    /** AI 视觉判定结果 */
    public record AiVerdict(
            String verdict,          // pass/warn/reject
            double confidence,       // 0.0-1.0
            String reason,           // 原因
            List<String> categories  // 命中分类
    ) {
        public static AiVerdict pass() {
            return new AiVerdict("pass", 0.95, "图片内容安全", List.of("safe"));
        }
    }
}
