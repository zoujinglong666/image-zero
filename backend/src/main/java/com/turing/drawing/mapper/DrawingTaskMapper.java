package com.turing.drawing.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.turing.drawing.entity.DrawingTask;
import org.apache.ibatis.annotations.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 绘画任务 Mapper 接口
 * 迁移自 DrawingTaskRepository
 */
@Mapper
public interface DrawingTaskMapper extends BaseMapper<DrawingTask> {

    /** 根据providerTaskId查询 */
    @Select("SELECT * FROM drawing_tasks WHERE provider_task_id = #{providerTaskId}")
    DrawingTask findByProviderTaskId(String providerTaskId);

    /** 根据用户ID分页查询 */
    @Select("SELECT * FROM drawing_tasks WHERE user_id = #{userId} ORDER BY created_at DESC")
    IPage<DrawingTask> findByUserIdOrderByCreatedAtDesc(Page<DrawingTask> page, Long userId);

    /** 根据用户ID和状态查询 */
    @Select("SELECT * FROM drawing_tasks WHERE user_id = #{userId} AND status = #{status}")
    List<DrawingTask> findByUserIdAndStatus(Long userId, String status);

    /** 统计指定状态的任务数 */
    @Select("SELECT COUNT(*) FROM drawing_tasks WHERE status = #{status}")
    long countByStatus(String status);

    /** 统计用户任务数 */
    @Select("SELECT COUNT(*) FROM drawing_tasks WHERE user_id = #{userId}")
    long countByUserId(Long userId);

    /**
     * 查询超时的待处理任务
     */
    @Select("SELECT * FROM drawing_tasks WHERE status = #{status} AND created_at < #{timeout}")
    List<DrawingTask> findTimeoutTasks(String status, LocalDateTime timeout);

    /**
     * 更新任务状态
     */
    @Update("UPDATE drawing_tasks SET status = #{status}, updated_at = NOW() WHERE id = #{id}")
    void updateStatus(Long id, String status);

    /**
     * 批量更新超时任务状态为失败
     */
    @Update("UPDATE drawing_tasks SET status = 'failed', updated_at = NOW() " +
            "WHERE status = #{oldStatus} AND created_at < #{timeout}")
    void batchTimeoutTasks(String oldStatus, LocalDateTime timeout);
}