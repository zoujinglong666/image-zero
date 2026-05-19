package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.turing.drawing.entity.History;
import org.apache.ibatis.annotations.*;

/**
 * 历史记录 Mapper 接口
 * 迁移自 HistoryRepository
 */
@Mapper
public interface HistoryMapper extends BaseMapper<History> {

    /** 根据用户ID分页查询 */
    @Select("SELECT * FROM history WHERE user_id = #{userId} ORDER BY created_at DESC")
    IPage<History> findByUserIdOrderByCreatedAtDesc(Page<History> page, Long userId);

    /** 根据用户ID和类型分页查询 */
    @Select("SELECT * FROM history WHERE user_id = #{userId} AND type = #{type} ORDER BY created_at DESC")
    IPage<History> findByUserIdAndTypeOrderByCreatedAtDesc(Page<History> page, Long userId, String type);

    /** 查询用户收藏 */
    @Select("SELECT * FROM history WHERE user_id = #{userId} AND favorite = 1 ORDER BY created_at DESC")
    IPage<History> findByUserIdAndFavoriteTrueOrderByCreatedAtDesc(Page<History> page, Long userId);

    /** 查询公开历史(画廊) */
    @Select("SELECT * FROM history WHERE is_public = 1 ORDER BY created_at DESC")
    IPage<History> findByIsPublicTrueOrderByCreatedAtDesc(Page<History> page);

    /** 统计用户历史数量 */
    @Select("SELECT COUNT(*) FROM history WHERE user_id = #{userId}")
    long countByUserId(Long userId);

    /**
     * 切换收藏状态
     */
    @Update("UPDATE history SET favorite = #{favorite}, updated_at = NOW() WHERE id = #{id} AND user_id = #{userId}")
    void updateFavorite(Long id, Long userId, Boolean favorite);

    /**
     * 切换公开状态
     */
    @Update("UPDATE history SET is_public = #{isPublic}, updated_at = NOW() WHERE id = #{id} AND user_id = #{userId}")
    void updatePublicStatus(Long id, Long userId, Boolean isPublic);

    /**
     * 搜索用户历史（按提示词关键词）
     */
    @Select("SELECT * FROM history WHERE user_id = #{userId} AND " +
            "(prompt_cn LIKE CONCAT('%', #{keyword}, '%') OR prompt_en LIKE CONCAT('%', #{keyword}, '%')) " +
            "ORDER BY created_at DESC")
    IPage<History> searchByKeyword(Page<History> page, Long userId, String keyword);
}