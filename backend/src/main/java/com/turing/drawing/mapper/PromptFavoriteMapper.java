package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.turing.drawing.entity.PromptFavorite;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * 提示词收藏 Mapper 接口
 * 迁移自 PromptFavoriteRepository
 */
@Mapper
public interface PromptFavoriteMapper extends BaseMapper<PromptFavorite> {

    /** 根据用户ID分页查询收藏 */
    @Select("SELECT * FROM prompt_favorites WHERE user_id = #{userId} ORDER BY created_at DESC")
    IPage<PromptFavorite> findByUserIdOrderByCreatedAtDesc(Page<PromptFavorite> page, Long userId);

    /** 检查用户是否已收藏该提示词 */
    @Select("SELECT COUNT(*) > 0 FROM prompt_favorites WHERE user_id = #{userId} AND prompt_id = #{promptId}")
    boolean existsByUserIdAndPromptId(Long userId, Long promptId);
}