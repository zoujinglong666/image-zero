package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.PromptCategory;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 提示词分类 Mapper 接口
 * 迁移自 PromptCategoryRepository
 */
@Mapper
public interface PromptCategoryMapper extends BaseMapper<PromptCategory> {

    /** 根据名称查找分类 */
    @Select("SELECT * FROM prompt_categories WHERE name = #{name}")
    PromptCategory findByName(String name);

    /** 查询所有分类(按排序权重排序) */
    @Select("SELECT * FROM prompt_categories ORDER BY sort_order ASC")
    List<PromptCategory> findAllByOrderBySortOrderAsc();

    /** 检查名称是否存在 */
    @Select("SELECT COUNT(*) > 0 FROM prompt_categories WHERE name = #{name}")
    boolean existsByName(String name);
}