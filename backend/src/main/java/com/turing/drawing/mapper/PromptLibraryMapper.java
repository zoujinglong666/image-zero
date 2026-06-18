package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.turing.drawing.entity.PromptLibrary;
import org.apache.ibatis.annotations.*;

/**
 * 提示词库 Mapper 接口
 * 迁移自 PromptLibraryRepository
 */
@Mapper
public interface PromptLibraryMapper extends BaseMapper<PromptLibrary> {

    /** 根据分类分页查询 */
    @Select("SELECT * FROM prompt_library WHERE category_id = #{categoryId} ORDER BY sort_order ASC, created_at DESC")
    IPage<PromptLibrary> findByCategoryIdOrderBySortOrderAscCreatedAtDesc(Page<PromptLibrary> page, Long categoryId);

    /** 根据分类和状态查询(已发布) */
    @Select("SELECT * FROM prompt_library WHERE category_id = #{categoryId} AND status = #{status} ORDER BY sort_order ASC, created_at DESC")
    IPage<PromptLibrary> findByCategoryIdAndStatusOrderBySortOrderAscCreatedAtDesc(
            Page<PromptLibrary> page, Long categoryId, String status);

    /** 根据promptHash查询(去重) */
    @Select("SELECT * FROM prompt_library WHERE prompt_hash = #{promptHash}")
    PromptLibrary findByPromptHash(String promptHash);

    /** 检查promptHash是否已存在 */
    @Select("SELECT COUNT(*) > 0 FROM prompt_library WHERE prompt_hash = #{promptHash}")
    boolean existsByPromptHash(String promptHash);

    /**
     * 搜索提示词（按标题或内容关键词）
     */
    @Select("SELECT * FROM prompt_library WHERE status = 'published' AND " +
            "(title LIKE CONCAT('%', #{keyword}, '%') OR prompt_text LIKE CONCAT('%', #{keyword}, '%') OR content_cn LIKE CONCAT('%', #{keyword}, '%')) " +
            "ORDER BY view_count DESC, created_at DESC")
    IPage<PromptLibrary> searchPublished(Page<PromptLibrary> page, String keyword);

    /**
     * 按热度排序查询已发布提示词
     */
    @Select("SELECT * FROM prompt_library WHERE status = 'published' " +
            "ORDER BY view_count DESC, like_count DESC, created_at DESC")
    IPage<PromptLibrary> findPublishedByPopularity(Page<PromptLibrary> page);

    /**
     * 增加浏览计数
     */
    @Update("UPDATE prompt_library SET view_count = view_count + 1 WHERE id = #{id}")
    void incrementViewCount(Long id);

    /**
     * 增加点赞计数
     */
    @Update("UPDATE prompt_library SET like_count = like_count + 1 WHERE id = #{id}")
    void incrementLikeCount(Long id);

    /**
     * 减少点赞计数
     */
    @Update("UPDATE prompt_library SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE id = #{id}")
    void decrementLikeCount(Long id);

    /**
     * 增加复制计数
     */
    @Update("UPDATE prompt_library SET copy_count = copy_count + 1 WHERE id = #{id}")
    void incrementCopyCount(Long id);

    /**
     * 增加收藏计数
     */
    @Update("UPDATE prompt_library SET favorite_count = favorite_count + 1 WHERE id = #{id}")
    void incrementFavoriteCount(Long id);

    /**
     * 减少收藏计数
     */
    @Update("UPDATE prompt_library SET favorite_count = CASE WHEN favorite_count > 0 THEN favorite_count - 1 ELSE 0 END WHERE id = #{id}")
    void decrementFavoriteCount(Long id);
}