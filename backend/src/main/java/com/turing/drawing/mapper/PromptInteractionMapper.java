package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.PromptInteraction;
import org.apache.ibatis.annotations.Mapper;

/**
 * 提示词交互 Mapper 接口
 * 迁移自 PromptInteractionRepository
 */
@Mapper
public interface PromptInteractionMapper extends BaseMapper<PromptInteraction> {
    // BaseMapper 提供了基本的 CRUD 操作，无需额外方法
}