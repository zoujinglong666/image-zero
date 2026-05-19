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

import java.util.List;

/**
 * 提示词服务 - 分类/列表/搜索/互动/收藏/社区
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PromptService {

    private final PromptCategoryMapper categoryMapper;
    private final PromptLibraryMapper promptLibraryMapper;
    private final PromptFavoriteMapper promptFavoriteMapper;
    private final PromptInteractionMapper interactionMapper;
    private final UserPromptMapper userPromptMapper;
    private final CommunityReportMapper communityReportMapper;

    // ══════════════════════════════════════════
    //  分类
    // ══════════════════════════════════════════

    public List<PromptCategory> listCategories() {
        return categoryMapper.findAllByOrderBySortOrderAsc();
    }

    // ══════════════════════════════════════════
    //  提示词列表/搜索
    // ══════════════════════════════════════════

    public PageResult<PromptLibrary> listPrompts(Long categoryId, String language, String sort,
                                                   int page, int pageSize) {
        Page<PromptLibrary> p = new Page<>(page, pageSize);
        IPage<PromptLibrary> result;

        if (categoryId != null) {
            result = promptLibraryMapper.findByCategoryIdAndStatusOrderBySortOrderAscCreatedAtDesc(
                    p, categoryId, "published");
        } else if ("popular".equals(sort)) {
            result = promptLibraryMapper.findPublishedByPopularity(p);
        } else {
            LambdaQueryWrapper<PromptLibrary> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(PromptLibrary::getStatus, "published")
                   .orderByDesc(PromptLibrary::getCreatedAt);
            result = promptLibraryMapper.selectPage(p, wrapper);
        }

        return PageResult.of(result);
    }

    public PageResult<PromptLibrary> searchPrompts(String keyword, Long categoryId,
                                                     int page, int pageSize) {
        Page<PromptLibrary> p = new Page<>(page, pageSize);
        IPage<PromptLibrary> result = promptLibraryMapper.searchPublished(p, keyword);
        return PageResult.of(result);
    }

    public PromptLibrary getPromptDetail(Long id) {
        // 增加浏览计数
        promptLibraryMapper.incrementViewCount(id);
        return promptLibraryMapper.selectById(id);
    }

    // ══════════════════════════════════════════
    //  互动 (浏览/点赞/复制)
    // ══════════════════════════════════════════

    public void interact(Long promptId, Long userId, String action) {
        switch (action) {
            case "like" -> promptLibraryMapper.incrementLikeCount(promptId);
            case "copy" -> promptLibraryMapper.incrementCopyCount(promptId);
            case "view" -> promptLibraryMapper.incrementViewCount(promptId);
        }

        // 记录互动
        PromptInteraction interaction = PromptInteraction.builder()
                .userId(userId != null ? userId : 0L)
                .promptId(promptId)
                .targetType("library")
                .action(action)
                .build();
        interactionMapper.insert(interaction);
    }

    // ══════════════════════════════════════════
    //  收藏
    // ══════════════════════════════════════════

    public boolean toggleFavorite(Long promptId, Long userId) {
        boolean exists = promptFavoriteMapper.existsByUserIdAndPromptId(userId, promptId);
        if (exists) {
            LambdaQueryWrapper<PromptFavorite> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(PromptFavorite::getUserId, userId).eq(PromptFavorite::getPromptId, promptId);
            promptFavoriteMapper.delete(wrapper);
            promptLibraryMapper.decrementFavoriteCount(promptId);
            return false;
        } else {
            PromptFavorite fav = PromptFavorite.builder()
                    .userId(userId)
                    .promptId(promptId)
                    .build();
            promptFavoriteMapper.insert(fav);
            promptLibraryMapper.incrementFavoriteCount(promptId);
            return true;
        }
    }

    public PageResult<PromptLibrary> listFavorites(Long userId, int page, int pageSize) {
        // 先查收藏列表
        LambdaQueryWrapper<PromptFavorite> favWrapper = new LambdaQueryWrapper<>();
        favWrapper.eq(PromptFavorite::getUserId, userId)
                  .orderByDesc(PromptFavorite::getCreatedAt);
        Page<PromptFavorite> favPage = new Page<>(page, pageSize);
        IPage<PromptFavorite> favResult = promptFavoriteMapper.selectPage(favPage, favWrapper);

        // 转换为 PromptLibrary 分页
        List<PromptLibrary> libraries = favResult.getRecords().stream()
                .map(fav -> promptLibraryMapper.selectById(fav.getPromptId()))
                .filter(java.util.Objects::nonNull)
                .toList();

        PageResult<PromptLibrary> result = new PageResult<>();
        result.setList(libraries);
        PageResult.Pagination pagination = new PageResult.Pagination();
        pagination.setPage(favResult.getCurrent());
        pagination.setPageSize(favResult.getSize());
        pagination.setTotal(favResult.getTotal());
        pagination.setTotalPages(favResult.getPages());
        result.setPagination(pagination);
        return result;
    }

    // ══════════════════════════════════════════
    //  用户自创提示词
    // ══════════════════════════════════════════

    public Long createUserPrompt(UserPrompt userPrompt) {
        userPromptMapper.insert(userPrompt);
        return userPrompt.getId();
    }

    public void updateUserPrompt(UserPrompt userPrompt) {
        userPromptMapper.updateById(userPrompt);
    }

    public void deleteUserPrompt(Long id, Long userId) {
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getId, id).eq(UserPrompt::getUserId, userId);
        userPromptMapper.delete(wrapper);
    }

    public PageResult<UserPrompt> listUserPrompts(Long userId, int page, int pageSize) {
        Page<UserPrompt> p = new Page<>(page, pageSize);
        IPage<UserPrompt> result = userPromptMapper.findByUserIdOrderByCreatedAtDesc(p, userId);
        return PageResult.of(result);
    }

    // ══════════════════════════════════════════
    //  社区
    // ══════════════════════════════════════════

    public PageResult<UserPrompt> listCommunityPosts(String sort, Long categoryId,
                                                       int page, int pageSize) {
        Page<UserPrompt> p = new Page<>(page, pageSize);
        LambdaQueryWrapper<UserPrompt> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserPrompt::getIsPublic, true).eq(UserPrompt::getStatus, "published");
        if (categoryId != null) wrapper.eq(UserPrompt::getCategoryId, categoryId);

        if ("popular".equals(sort)) {
            wrapper.orderByDesc(UserPrompt::getLikeCount).orderByDesc(UserPrompt::getCreatedAt);
        } else if ("most_viewed".equals(sort)) {
            wrapper.orderByDesc(UserPrompt::getViewCount).orderByDesc(UserPrompt::getCreatedAt);
        } else {
            wrapper.orderByDesc(UserPrompt::getCreatedAt);
        }

        IPage<UserPrompt> result = userPromptMapper.selectPage(p, wrapper);
        return PageResult.of(result);
    }

    public void reportPost(Long promptId, Long reporterId, String reason, String description) {
        CommunityReport report = CommunityReport.builder()
                .promptId(promptId)
                .reporterId(reporterId)
                .reason(reason)
                .description(description)
                .build();
        communityReportMapper.insert(report);
    }
}