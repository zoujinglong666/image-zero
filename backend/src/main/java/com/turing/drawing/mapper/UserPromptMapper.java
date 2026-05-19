package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.turing.drawing.entity.UserPrompt;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * 用户提示词 Mapper 接口
 * 迁移自 UserPromptRepository
 */
@Mapper
public interface UserPromptMapper extends BaseMapper<UserPrompt> {

    /** 根据用户ID分页查询 */
    @Select("SELECT * FROM user_prompts WHERE user_id = #{userId} ORDER BY created_at DESC")
    IPage<UserPrompt> findByUserIdOrderByCreatedAtDesc(Page<UserPrompt> page, Long userId);

    /** 统计用户提示词数量 */
    @Select("SELECT COUNT(*) FROM user_prompts WHERE user_id = #{userId}")
    long countByUserId(Long userId);
}