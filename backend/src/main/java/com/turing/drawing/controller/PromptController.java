package com.turing.drawing.controller;

import com.turing.drawing.dto.response.ApiResponse;
import com.turing.drawing.dto.response.PageResult;
import com.turing.drawing.entity.PromptCategory;
import com.turing.drawing.entity.PromptLibrary;
import com.turing.drawing.entity.UserPrompt;
import com.turing.drawing.security.UserPrincipal;
import com.turing.drawing.service.PromptService;
import com.turing.drawing.service.CosService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * 提示词控制器 - 分类/列表/搜索/详情/互动/收藏/社区
 * 对齐前端路由: /api/prompt/categories, /api/prompt/list, /api/prompt/search 等
 */
@RestController
@RequestMapping("/api/prompt")
@RequiredArgsConstructor
public class PromptController {

    private final PromptService promptService;
    private final CosService cosService;

    // ── 图片上传 ──

    @PostMapping("/upload")
    public ApiResponse<Map<String, Object>> uploadImage(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("image") MultipartFile file) {
        try {
            CosService.UploadResult result = cosService.uploadImage(file, "community");
            return ApiResponse.success(Map.of("url", result.url(), "hash", result.hash()));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            return ApiResponse.error("图片上传失败: " + e.getMessage());
        }
    }

    // ── 分类 ──

    @GetMapping("/categories")
    public ApiResponse<List<PromptCategory>> listCategories() {
        return ApiResponse.success(promptService.listCategories());
    }

    // ── 提示词列表/搜索 ──

    @GetMapping("/list")
    public ApiResponse<PageResult<PromptLibrary>> listPrompts(
            @RequestParam(required = false) Long category_id,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size) {
        return ApiResponse.success(promptService.listPrompts(category_id, language, sort, page, page_size));
    }

    @GetMapping("/search")
    public ApiResponse<PageResult<PromptLibrary>> searchPrompts(
            @RequestParam String q,
            @RequestParam(required = false) Long category_id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size) {
        return ApiResponse.success(promptService.searchPrompts(q, category_id, page, page_size));
    }

    @GetMapping("/{id}")
    public ApiResponse<PromptLibrary> getPromptDetail(@PathVariable Long id) {
        PromptLibrary prompt = promptService.getPromptDetail(id);
        if (prompt == null) return ApiResponse.error("提示词不存在");
        return ApiResponse.success(prompt);
    }

    // ── 互动 ──

    @PostMapping("/{id}/interact")
    public ApiResponse<Void> interact(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Long userId = principal != null ? principal.getId() : 0L;
        promptService.interact(id, userId, body.get("action"));
        return ApiResponse.success();
    }

    // ── 收藏 ──

    @PostMapping("/{id}/favorite")
    public ApiResponse<Map<String, Object>> toggleFavorite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        boolean isFav = promptService.toggleFavorite(id, principal.getId());
        return ApiResponse.success(Map.of("is_favorited", isFav));
    }

    @GetMapping("/favorites/list")
    public ApiResponse<PageResult<PromptLibrary>> listFavorites(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size) {
        return ApiResponse.success(promptService.listFavorites(principal.getId(), page, page_size));
    }

    // ── 用户自创提示词 ──

    @PostMapping("/mine")
    public ApiResponse<Map<String, Object>> createUserPrompt(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UserPrompt userPrompt) {
        userPrompt.setUserId(principal.getId());
        Long id = promptService.createUserPrompt(userPrompt);
        return ApiResponse.success(Map.of("id", id));
    }

    @PutMapping("/mine/{id}")
    public ApiResponse<Void> updateUserPrompt(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody UserPrompt userPrompt) {
        userPrompt.setId(id);
        userPrompt.setUserId(principal.getId());
        promptService.updateUserPrompt(userPrompt);
        return ApiResponse.success();
    }

    @DeleteMapping("/mine/{id}")
    public ApiResponse<Void> deleteUserPrompt(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        promptService.deleteUserPrompt(id, principal.getId());
        return ApiResponse.success();
    }

    @GetMapping("/mine/list")
    public ApiResponse<PageResult<UserPrompt>> listUserPrompts(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size) {
        return ApiResponse.success(promptService.listUserPrompts(principal.getId(), page, page_size));
    }

    // ── 社区 ──

    @PostMapping("/community")
    public ApiResponse<Map<String, Object>> createCommunityPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UserPrompt userPrompt) {
        userPrompt.setUserId(principal.getId());
        userPrompt.setIsPublic(true);
        userPrompt.setStatus("published");
        Long id = promptService.createUserPrompt(userPrompt);
        return ApiResponse.success(Map.of("id", id));
    }

    @GetMapping("/community")
    public ApiResponse<PageResult<UserPrompt>> listCommunityPosts(
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(required = false) Long category_id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int page_size) {
        return ApiResponse.success(promptService.listCommunityPosts(sort, category_id, page, page_size));
    }

    @PostMapping("/community/{id}/like")
    public ApiResponse<Map<String, Object>> toggleCommunityLike(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        // TODO: 实现社区点赞逻辑
        return ApiResponse.success(Map.of("is_liked", true, "like_count", 1));
    }

    @PostMapping("/community/{id}/report")
    public ApiResponse<Void> reportCommunityPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Long reporterId = principal != null ? principal.getId() : 0L;
        promptService.reportPost(id, reporterId, body.get("reason"), body.get("description"));
        return ApiResponse.success();
    }

    @DeleteMapping("/community/{id}")
    public ApiResponse<Void> deleteCommunityPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        promptService.deleteUserPrompt(id, principal.getId());
        return ApiResponse.success();
    }
}