package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.CommunityReport;
import org.apache.ibatis.annotations.Mapper;

/**
 * 社区举报 Mapper 接口
 * 迁移自 CommunityReportRepository
 */
@Mapper
public interface CommunityReportMapper extends BaseMapper<CommunityReport> {
    // BaseMapper 提供了基本的 CRUD 操作，无需额外方法
}