package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.VipSubscription;
import org.apache.ibatis.annotations.Mapper;

/**
 * VIP订阅 Mapper 接口
 * 迁移自 VipSubscriptionRepository
 */
@Mapper
public interface VipSubscriptionMapper extends BaseMapper<VipSubscription> {
    // BaseMapper 提供了基本的 CRUD 操作，无需额外方法
}