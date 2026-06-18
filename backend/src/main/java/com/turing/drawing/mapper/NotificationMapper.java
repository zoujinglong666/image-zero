package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.turing.drawing.entity.Notification;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 站内信通知 Mapper
 */
@Mapper
public interface NotificationMapper extends BaseMapper<Notification> {

    /**
     * 标记用户全部通知为已读
     */
    @Update("UPDATE notifications SET is_read = true, updated_at = NOW() WHERE user_id = #{userId} AND is_read = false")
    int markAllRead(@Param("userId") Long userId);

    /**
     * 标记单条通知为已读
     */
    @Update("UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = #{id} AND user_id = #{userId} AND is_read = false")
    int markRead(@Param("userId") Long userId, @Param("id") Long id);
}